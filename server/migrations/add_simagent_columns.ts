import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../tutorai.db');

export function runSimAgentMigration(db: InstanceType<typeof Database>): void {
  const labProjectCols = db.prepare('PRAGMA table_info(lab_projects)').all() as any[];
  const colNames = labProjectCols.map((c: any) => c.name);

  if (!colNames.includes('code_index')) {
    db.exec(`ALTER TABLE lab_projects ADD COLUMN code_index TEXT DEFAULT '{}'`);
  }
  if (!colNames.includes('project_context')) {
    db.exec(`ALTER TABLE lab_projects ADD COLUMN project_context TEXT DEFAULT ''`);
  }
  if (!colNames.includes('turn_count')) {
    db.exec(`ALTER TABLE lab_projects ADD COLUMN turn_count INTEGER DEFAULT 0`);
  }

  const labMsgCols = db.prepare('PRAGMA table_info(lab_messages)').all() as any[];
  const msgColNames = labMsgCols.map((c: any) => c.name);

  if (!msgColNames.includes('edit_plan')) {
    db.exec(`ALTER TABLE lab_messages ADD COLUMN edit_plan TEXT DEFAULT NULL`);
  }
  if (!msgColNames.includes('edit_scope')) {
    db.exec(`ALTER TABLE lab_messages ADD COLUMN edit_scope TEXT DEFAULT NULL`);
  }
  if (!msgColNames.includes('patched_functions')) {
    db.exec(`ALTER TABLE lab_messages ADD COLUMN patched_functions TEXT DEFAULT NULL`);
  }
  if (!msgColNames.includes('tokensUsed')) {
    db.exec(`ALTER TABLE lab_messages ADD COLUMN tokensUsed INTEGER DEFAULT 0`);
  }
  if (!msgColNames.includes('creditsUsed')) {
    db.exec(`ALTER TABLE lab_messages ADD COLUMN creditsUsed INTEGER DEFAULT 0`);
  }
  if (!msgColNames.includes('imageUrl')) {
    db.exec(`ALTER TABLE lab_messages ADD COLUMN imageUrl TEXT DEFAULT NULL`);
  }

  // Ratings & Feedback
  if (!colNames.includes('feedback_creator')) {
    db.exec(`ALTER TABLE lab_projects ADD COLUMN feedback_creator INTEGER DEFAULT 0`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS lab_project_ratings (
      projectId TEXT NOT NULL,
      userId TEXT NOT NULL,
      stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (projectId, userId),
      FOREIGN KEY (projectId) REFERENCES lab_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}
