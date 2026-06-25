import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'tutorai.db');
const db = new Database(dbPath);

console.log('Iniciando atualização corretiva dos chats do Petrus...');

const res = db.prepare(`
  UPDATE chats
  SET disciplinaId = 'scaffl-docs'
  WHERE personaDbId = 'petrus'
`).run();

console.log(`Chats atualizados com sucesso: ${res.changes}`);
db.close();
