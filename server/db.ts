import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

import fs from 'fs';
import path from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || join(__dirname, 'tutorai.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS institutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT UNIQUE, -- e.g. @example.com
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    isAdmin INTEGER DEFAULT 0,
    themeMode TEXT DEFAULT 'dark',
    accentColor TEXT DEFAULT 'blue',
    tokensProfessor INTEGER DEFAULT 0,
    lastResetProfessor TEXT,
    tokensTutor INTEGER DEFAULT 0,
    lastResetTutor TEXT,
    tokensColega INTEGER DEFAULT 0,
    lastResetColega TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_institutions (
    userId TEXT NOT NULL,
    institutionId TEXT NOT NULL,
    PRIMARY KEY (userId, institutionId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (institutionId) REFERENCES institutions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    institutionId TEXT, -- NULL means public (Tutor Genérico)
    nome TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    saudacao TEXT DEFAULT '',
    documentoPedagogico TEXT DEFAULT '',
    isGenerico INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (institutionId) REFERENCES institutions(id)
  );

  CREATE TABLE IF NOT EXISTS disciplinas (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    institutionId TEXT NOT NULL,
    nome TEXT NOT NULL,
    conteudo TEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (institutionId) REFERENCES institutions(id)
  );

  CREATE TABLE IF NOT EXISTS persona_disciplina (
    personaId TEXT NOT NULL,
    disciplinaId TEXT NOT NULL,
    PRIMARY KEY (personaId, disciplinaId),
    FOREIGN KEY (personaId) REFERENCES personas(id) ON DELETE CASCADE,
    FOREIGN KEY (disciplinaId) REFERENCES disciplinas(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    persona TEXT NOT NULL,
    personaDbId TEXT,
    disciplinaId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chatId TEXT NOT NULL,
    userId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tokensUsed INTEGER DEFAULT 0,
    creditsUsed INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chatId) REFERENCES chats(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS lab_projects (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    institutionId TEXT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    htmlContent TEXT DEFAULT '',
    isPublic INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS lab_messages (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    userId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tokensUsed INTEGER DEFAULT 0,
    creditsUsed INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projectId) REFERENCES lab_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

// Create classrooms table
db.exec(`
  CREATE TABLE IF NOT EXISTS classrooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    institutionId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institutionId) REFERENCES institutions(id) ON DELETE CASCADE
  );
`);

// Migration: add classroomId to users table if not exists
const userCols = db.prepare("PRAGMA table_info(users)").all() as any[];
const classroomIdCol = userCols.find((c: any) => c.name === 'classroomId');
if (!classroomIdCol) {
  db.exec(`ALTER TABLE users ADD COLUMN classroomId TEXT REFERENCES classrooms(id) ON DELETE SET NULL;`);
}

// Migration: make lab_projects.institutionId nullable (recreate if still NOT NULL)
const labCols = db.prepare("PRAGMA table_info(lab_projects)").all() as any[];
const instCol = labCols.find((c: any) => c.name === 'institutionId');
if (instCol && instCol.notnull === 1) {
  db.exec(`
    PRAGMA foreign_keys=off;
    CREATE TABLE lab_projects_new (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      institutionId TEXT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      htmlContent TEXT DEFAULT '',
      isPublic INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
    INSERT INTO lab_projects_new SELECT * FROM lab_projects;
    DROP TABLE lab_projects;
    ALTER TABLE lab_projects_new RENAME TO lab_projects;
    PRAGMA foreign_keys=on;
  `);
}

// Add imageUrl to personas if not already present
const personaCols = db.prepare("PRAGMA table_info(personas)").all() as any[];
if (!personaCols.find((c: any) => c.name === 'imageUrl')) {
  db.exec("ALTER TABLE personas ADD COLUMN imageUrl TEXT DEFAULT ''");
}

// Security test tables
db.exec(`
  CREATE TABLE IF NOT EXISTS security_test_runs (
    id TEXT PRIMARY KEY,
    totalTests INTEGER DEFAULT 0,
    passed INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS security_test_results (
    id TEXT PRIMARY KEY,
    runId TEXT NOT NULL,
    testId TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    details TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (runId) REFERENCES security_test_runs(id) ON DELETE CASCADE
  );
`);

// AVA, Activities and Notifications tables
db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    dueDate TEXT NOT NULL,
    institutionId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institutionId) REFERENCES institutions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_classrooms (
    activityId TEXT NOT NULL,
    classroomId TEXT NOT NULL,
    PRIMARY KEY (activityId, classroomId),
    FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (classroomId) REFERENCES classrooms(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'activity',
    targetClassroomId TEXT,
    referenceId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (targetClassroomId) REFERENCES classrooms(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_notifications_status (
    userId TEXT NOT NULL,
    notificationId TEXT NOT NULL,
    seen INTEGER DEFAULT 0,
    dismissed INTEGER DEFAULT 0,
    PRIMARY KEY (userId, notificationId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (notificationId) REFERENCES notifications(id) ON DELETE CASCADE
  );
`);

// Migration: create user_classrooms table and migrate legacy data
db.exec(`
  CREATE TABLE IF NOT EXISTS user_classrooms (
    userId TEXT NOT NULL,
    classroomId TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (userId, classroomId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (classroomId) REFERENCES classrooms(id) ON DELETE CASCADE
  );
`);

// Migrar dados legados de users.classroomId para a nova tabela user_classrooms
const legacyUsersWithClass = db.prepare("SELECT id, classroomId, role FROM users WHERE classroomId IS NOT NULL").all() as { id: string, classroomId: string, role: string }[];
for (const u of legacyUsersWithClass) {
  const isTeacher = u.role === 'admin' ? 'teacher' : 'student';
  db.prepare(`
    INSERT OR IGNORE INTO user_classrooms (userId, classroomId, role)
    VALUES (?, ?, ?)
  `).run(u.id, u.classroomId, isTeacher);
}


// Migration: add classroomId to disciplinas table if not exists
const discCols = db.prepare("PRAGMA table_info(disciplinas)").all() as any[];
if (!discCols.find((c: any) => c.name === 'classroomId')) {
  db.exec("ALTER TABLE disciplinas ADD COLUMN classroomId TEXT REFERENCES classrooms(id) ON DELETE CASCADE");
}

// ai_models: model registry with cost-per-token data used for credit calculation
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_models (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    display_name TEXT NOT NULL,
    input_cost_per_1m REAL NOT NULL DEFAULT 0,
    input_cached_cost_per_1m REAL NOT NULL DEFAULT 0,
    output_cost_per_1m REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'BRL',
    enabled INTEGER NOT NULL DEFAULT 1,
    is_default INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT
  );
`);

// provider_credentials: encrypted API keys for each AI provider
db.exec(`
  CREATE TABLE IF NOT EXISTS provider_credentials (
    provider TEXT PRIMARY KEY,
    encrypted_key TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    key_last4 TEXT NOT NULL,
    base_url TEXT,
    updated_by TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed ai_models on first run (table empty = fresh install)
const modelCount = (db.prepare('SELECT COUNT(*) as n FROM ai_models').get() as { n: number }).n;
if (modelCount === 0) {
  const seedPath = join(__dirname, 'providers', 'models.seed.json');
  if (fs.existsSync(seedPath)) {
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const insertModel = db.prepare(`
      INSERT OR IGNORE INTO ai_models
        (id, provider, display_name, input_cost_per_1m, input_cached_cost_per_1m, output_cost_per_1m, currency, enabled, is_default)
      VALUES
        (@id, @provider, @display_name, @input_cost_per_1m, @input_cached_cost_per_1m, @output_cost_per_1m, @currency, @enabled, @is_default)
    `);
    for (const m of seed.models) {
      insertModel.run({
        id:                    m.id,
        provider:              m.provider,
        display_name:          m.display_name,
        input_cost_per_1m:     m.input_cost_per_1m,
        input_cached_cost_per_1m: m.input_cached_cost_per_1m ?? 0,
        output_cost_per_1m:    m.output_cost_per_1m,
        currency:              m.currency,
        enabled:               m.enabled ? 1 : 0,
        is_default:            m.is_default ? 1 : 0,
      });
    }
    console.log(`[db] Seeded ${seed.models.length} models from models.seed.json`);
  }
}

// SimAgent migration: add new columns idempotently
import { runSimAgentMigration } from './migrations/add_simagent_columns.js';
runSimAgentMigration(db);

// Onda 2: quota system columns
const _quotaCols = db.prepare("PRAGMA table_info(users)").all() as any[];
const _quotaMigrations: { name: string; sql: string }[] = [
  { name: 'plan',                    sql: "ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'" },
  { name: 'lab_req_today',           sql: "ALTER TABLE users ADD COLUMN lab_req_today INTEGER DEFAULT 0" },
  { name: 'lab_req_today_reset',     sql: "ALTER TABLE users ADD COLUMN lab_req_today_reset TEXT" },
  { name: 'lab_req_week',            sql: "ALTER TABLE users ADD COLUMN lab_req_week INTEGER DEFAULT 0" },
  { name: 'lab_req_week_reset',      sql: "ALTER TABLE users ADD COLUMN lab_req_week_reset TEXT" },
  { name: 'petrus_credits_week',     sql: "ALTER TABLE users ADD COLUMN petrus_credits_week INTEGER DEFAULT 0" },
  { name: 'petrus_credits_week_reset', sql: "ALTER TABLE users ADD COLUMN petrus_credits_week_reset TEXT" },
];
for (const m of _quotaMigrations) {
  if (!_quotaCols.find((c: any) => c.name === m.name)) db.exec(m.sql);
}

// Quota metrics table for instrumentation (RPM, 429s, spills, fallbacks)
db.exec(`
  CREATE TABLE IF NOT EXISTS quota_metrics (
    id TEXT PRIMARY KEY,
    ts DATETIME DEFAULT CURRENT_TIMESTAMP,
    surface TEXT NOT NULL,
    event TEXT NOT NULL,
    model TEXT,
    userId TEXT,
    credits INTEGER DEFAULT 0
  );
`);

// Ensure system user exists
db.prepare(`
  INSERT OR IGNORE INTO users (id, name, email, password, role, isAdmin)
  VALUES (?, ?, ?, ?, ?, ?)
`).run('system', 'System', 'system@scaffl.edu', 'internal', 'admin', 1);

// Seed Super Admin from Environment Variables if configured
const superEmail = process.env.SUPER_ADMIN_EMAIL;
const superPassword = process.env.ADMIN_PASSWORD;
if (superEmail && superPassword) {
  const hashedPassword = bcrypt.hashSync(superPassword, 10);
  db.prepare(`
    INSERT INTO users (id, name, email, password, role, isAdmin, lastResetProfessor, lastResetTutor, lastResetColega)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      password = excluded.password,
      role = 'admin',
      isAdmin = 1
  `).run(
    'super-admin',
    'Super Admin',
    superEmail.toLowerCase(),
    hashedPassword,
    'admin',
    1,
    new Date().toISOString(),
    new Date().toISOString(),
    new Date().toISOString()
  );
}

// Update Petrus instructions with Lab Simulators Guidelines
db.prepare(`
  UPDATE personas
  SET documentoPedagogico = 'Você é o Petrus, um tutor de IA amigável e direto da plataforma Scaffl. Seu objetivo principal é guiar o aprendizado de forma ativa: nunca dê a resposta pronta ao aluno. Em vez disso, valide brevemente a iniciativa dele, explique conceitos complexos usando analogias simples do cotidiano e termine sempre com uma pergunta socrática que o estimule a dar o próximo passo sozinho. Se o aluno errar, não o corrija de forma seca; use o erro como oportunidade de reflexão, sugerindo uma nova perspectiva. Mantenha suas interações extremamente concisas, respondendo em no máximo dois ou três parágrafos curtos e objetivos. Além disso, você tem conhecimento de que os alunos constroem simuladores interativos de ciências na aba Laboratório através da IA escritora de código do Scaffl. Quando um aluno pedir ajuda sobre como projetar, estruturar ou formular prompts para criar bons simuladores, oriente-o a fazer pedidos curtos e em etapas incrementais no chat do lab (por exemplo, pedir para criar o esqueleto básico, depois adicionar a animação física e por fim aplicar os estilos). Guie-o a especificar claramente: 1) O fenômeno físico ou químico exato (ex: termodinâmica, combustão); 2) Controles que deseja (sliders para alterar variáveis, botões de disparar/reiniciar, checkboxes); 3) Como deve ser a visualização gráfica no canvas (movimento fluido de partículas, vetores de força e rastros de trajetórias coloridas); e 4) Pedir um visual moderno com fundo escuro elegante.'
  WHERE id = 'petrus'
`).run();

export default db;
