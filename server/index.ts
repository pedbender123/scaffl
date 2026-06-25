import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import db from './db.js';
import * as auth from './auth.js';
import * as ai from './ai.js';
import { runSimAgent } from './labAI.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { compressProjectContext } from './labContextCompressor.js';
import { getUserCreditLimit } from './ai.js';
import { validateConfig, config } from './config.js';
import { encryptSecret } from './crypto/secrets.js';
import { getActiveKey, invalidateKeyCache } from './providers/registry.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });
validateConfig();

const app = express();
const PORT = process.env.PORT || 3001;

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Global Rate Limiter: 10 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  message: { error: 'Limite de requisições excedido. Tente novamente em um minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => 'global_app_limiter', // Global limit for the whole app
});
const requireAdmin = (req: any, res: express.Response, next: express.NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
  }
  next();
};

// Helper to get user's institution IDs
const getUserInstitutionIds = (userId: string): string[] => {
  const rows = db.prepare('SELECT institutionId FROM user_institutions WHERE userId = ?').all(userId) as { institutionId: string }[];
  return rows.map(r => r.institutionId);
};

// Auth Routes
app.post('/api/auth/register', auth.register);
app.post('/api/auth/login', auth.login);
app.get('/api/auth/me', auth.authenticate, (req: any, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Calculate aggregate monthly credits (chat + lab, last 30 days)
  const chatCredits = db.prepare(`SELECT SUM(creditsUsed) as total FROM messages WHERE userId = ? AND createdAt >= DATETIME('now', '-30 days')`).get(req.user.id) as { total: number };
  const labCredits = db.prepare(`SELECT SUM(creditsUsed) as total FROM lab_messages WHERE userId = ? AND createdAt >= DATETIME('now', '-30 days')`).get(req.user.id) as { total: number };
  user.creditsMonthly = (chatCredits?.total || 0) + (labCredits?.total || 0);

  user.institutions = getUserInstitutionIds(user.id);
  delete user.password;
  res.json(user);
});
app.patch('/api/auth/user', auth.authenticate, auth.updateUserData);

// Admin: Management Routes
app.get('/api/admin/institutions', auth.authenticate, requireAdmin, (req, res) => {
  const institutions = db.prepare('SELECT * FROM institutions ORDER BY name ASC').all();
  res.json(institutions);
});

app.post('/api/admin/institutions', auth.authenticate, requireAdmin, (req, res) => {
  const { name, domain } = req.body;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO institutions (id, name, domain) VALUES (?, ?, ?)').run(id, name, domain);
  res.json({ id, name, domain });
});

app.post('/api/admin/users', auth.authenticate, requireAdmin, auth.register);

app.get('/api/admin/users', auth.authenticate, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, isAdmin, createdAt FROM users').all() as any[];
  for (const u of users) {
    u.institutions = getUserInstitutionIds(u.id);
  }
  res.json(users);
});

app.post('/api/admin/users/:userId/institutions', auth.authenticate, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const { institutionId } = req.body;
  try {
    db.prepare('INSERT INTO user_institutions (userId, institutionId) VALUES (?, ?)').run(userId, institutionId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Vínculo já existe ou instituição inválida.' });
  }
});

app.delete('/api/admin/users/:userId/institutions/:institutionId', auth.authenticate, requireAdmin, (req, res) => {
  const { userId, institutionId } = req.params;
  db.prepare('DELETE FROM user_institutions WHERE userId = ? AND institutionId = ?').run(userId, institutionId);
  res.json({ success: true });
});

// Admin: Classrooms Management
app.get('/api/admin/institutions/:institutionId/classrooms', auth.authenticate, requireAdmin, (req, res) => {
  const { institutionId } = req.params;
  const classrooms = db.prepare('SELECT * FROM classrooms WHERE institutionId = ? ORDER BY name ASC').all(institutionId);
  res.json(classrooms);
});

app.post('/api/admin/institutions/:institutionId/classrooms', auth.authenticate, requireAdmin, (req, res) => {
  const { institutionId } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da sala é obrigatório' });
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO classrooms (id, name, institutionId) VALUES (?, ?, ?)').run(id, name, institutionId);
  res.json({ id, name, institutionId });
});

app.patch('/api/admin/classrooms/:classroomId', auth.authenticate, requireAdmin, (req, res) => {
  const { classroomId } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da sala é obrigatório' });
  db.prepare('UPDATE classrooms SET name = ? WHERE id = ?').run(name, classroomId);
  res.json({ id: classroomId, name });
});

app.delete('/api/admin/classrooms/:classroomId', auth.authenticate, requireAdmin, (req, res) => {
  const { classroomId } = req.params;
  db.prepare('DELETE FROM classrooms WHERE id = ?').run(classroomId);
  res.json({ success: true });
});

// Public: Get invite info
app.get('/api/auth/invite/:inviteCode', (req, res) => {
  const { inviteCode } = req.params;
  const classroom = db.prepare('SELECT c.name as className, i.name as instName FROM classrooms c JOIN institutions i ON c.institutionId = i.id WHERE c.id = ?').get(inviteCode) as any;
  if (!classroom) return res.status(404).json({ error: 'Código de convite inválido ou sala não encontrada.' });
  res.json(classroom);
});

// Personas Routes (Filtered by user institutions)
app.get('/api/personas', auth.authenticate, (req: any, res) => {
  // Admins see everything; regular users see public + their institutions
  if (req.user.isAdmin) {
    const personas = db.prepare(`
      SELECT p.*, i.name as institutionName
      FROM personas p
      LEFT JOIN institutions i ON p.institutionId = i.id
      ORDER BY p.createdAt DESC
    `).all();
    return res.json(personas);
  }

  const instIds = getUserInstitutionIds(req.user.id);
  let where = "p.institutionId IS NULL OR p.isGenerico = 1 OR p.institutionId = 'scaffl' OR p.institutionId = 'global'";
  if (instIds.length > 0) {
    const placeholders = instIds.map(() => '?').join(',');
    where += ` OR p.institutionId IN (${placeholders})`;
  }

  const personas = db.prepare(`
    SELECT p.*, i.name as institutionName
    FROM personas p
    LEFT JOIN institutions i ON p.institutionId = i.id
    WHERE ${where}
    ORDER BY p.createdAt DESC
  `).all(...instIds);
  res.json(personas);
});

app.post('/api/personas', auth.authenticate, requireAdmin, (req: any, res) => {
  const { nome, descricao, saudacao, documentoPedagogico, isGenerico, institutionId, imageUrl } = req.body;
  if (!isGenerico && !institutionId) return res.status(400).json({ error: 'Instituição é obrigatória para este tipo de persona.' });

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO personas (id, userId, institutionId, nome, descricao, saudacao, documentoPedagogico, isGenerico, imageUrl)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, isGenerico ? null : institutionId, nome, descricao, saudacao, documentoPedagogico, isGenerico ? 1 : 0, imageUrl || '');

  const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(id);
  res.json(persona);
});

app.put('/api/personas/:id', auth.authenticate, requireAdmin, (req: any, res) => {
  const { id } = req.params;
  const { nome, descricao, saudacao, documentoPedagogico, isGenerico, institutionId, imageUrl } = req.body;
  db.prepare(`
    UPDATE personas
    SET nome = ?, descricao = ?, saudacao = ?, documentoPedagogico = ?, isGenerico = ?, institutionId = ?, imageUrl = ?
    WHERE id = ?
  `).run(nome, descricao, saudacao, documentoPedagogico, isGenerico ? 1 : 0, isGenerico ? null : (institutionId || null), imageUrl || '', id);
  const persona = db.prepare(`
    SELECT p.*, i.name as institutionName
    FROM personas p LEFT JOIN institutions i ON p.institutionId = i.id
    WHERE p.id = ?
  `).get(id);
  res.json(persona);
});

app.delete('/api/personas/:id', auth.authenticate, (req: any, res) => {
  const { id } = req.params;

  const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(id) as any;
  if (!persona) return res.status(404).json({ error: 'Persona não encontrada.' });
  if (persona.userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Não autorizado.' });
  }

  const deleteTx = db.transaction(() => {
    const chats = db.prepare('SELECT id FROM chats WHERE personaDbId = ?').all(id) as { id: string }[];
    const deleteMsgs = db.prepare('DELETE FROM messages WHERE chatId = ?');
    for (const c of chats) {
      deleteMsgs.run(c.id);
    }
    db.prepare('DELETE FROM chats WHERE personaDbId = ?').run(id);
    db.prepare('DELETE FROM persona_disciplina WHERE personaId = ?').run(id);
    db.prepare('DELETE FROM personas WHERE id = ?').run(id);
  });

  try {
    deleteTx();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao deletar persona.' });
  }
});

// Disciplinas Routes (Filtered by user institutions)
app.get('/api/disciplinas', auth.authenticate, (req: any, res) => {
  let disciplinas: any[];

  if (req.user.isAdmin) {
    // Admins see all disciplinas
    disciplinas = db.prepare(`
      SELECT d.*, i.name as institutionName
      FROM disciplinas d
      LEFT JOIN institutions i ON d.institutionId = i.id
      ORDER BY d.createdAt DESC
    `).all() as any[];
  } else {
    const instIds = getUserInstitutionIds(req.user.id);
    
    let query = `
      SELECT d.*, i.name as institutionName
      FROM disciplinas d
      LEFT JOIN institutions i ON d.institutionId = i.id
      WHERE d.institutionId = 'scaffl' OR d.institutionId = 'global'
    `;
    
    if (instIds.length > 0) {
      const placeholders = instIds.map(() => '?').join(',');
      query += ` OR d.institutionId IN (${placeholders})`;
    }
    
    query += ` ORDER BY d.createdAt DESC`;
    
    disciplinas = db.prepare(query).all(...instIds) as any[];
  }

  for (const d of disciplinas) {
    const professors = db.prepare('SELECT personaId FROM persona_disciplina WHERE disciplinaId = ?').all(d.id) as { personaId: string }[];
    d.professores_vinculados = professors.map(p => p.personaId);
  }

  res.json(disciplinas);
});

app.post('/api/disciplinas', auth.authenticate, requireAdmin, (req: any, res) => {
  const { nome, conteudo, professores_vinculados, institutionId } = req.body;
  if (!institutionId) return res.status(400).json({ error: 'Instituição é obrigatória.' });

  const id = crypto.randomUUID();
  
  const insert = db.transaction(() => {
    db.prepare('INSERT INTO disciplinas (id, userId, institutionId, nome, conteudo) VALUES (?, ?, ?, ?, ?)').run(id, req.user.id, institutionId, nome, conteudo);
    if (professores_vinculados && Array.isArray(professores_vinculados)) {
      const stmt = db.prepare('INSERT INTO persona_disciplina (personaId, disciplinaId) VALUES (?, ?)');
      for (const pId of professores_vinculados) {
        stmt.run(pId, id);
      }
    }
  });
  insert();
  
  const disciplina = db.prepare('SELECT * FROM disciplinas WHERE id = ?').get(id) as any;
  disciplina.professores_vinculados = professores_vinculados;
  res.json(disciplina);
});

app.put('/api/disciplinas/:id', auth.authenticate, requireAdmin, (req: any, res) => {
  const { id } = req.params;
  const { nome, conteudo, professores_vinculados = [] } = req.body;
  
  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE disciplinas 
      SET nome = ?, conteudo = ?
      WHERE id = ? AND userId = ?
    `).run(nome, conteudo, id, req.user.id);

    db.prepare('DELETE FROM persona_disciplina WHERE disciplinaId = ?').run(id);
    const insertVinculo = db.prepare('INSERT INTO persona_disciplina (personaId, disciplinaId) VALUES (?, ?)');
    for (const pId of professores_vinculados) {
      insertVinculo.run(pId, id);
    }
  });

  transaction();

  const disciplina = db.prepare('SELECT * FROM disciplinas WHERE id = ?').get(id);
  res.json({ ...disciplina as any, professores_vinculados });
});

app.delete('/api/disciplinas/:id', auth.authenticate, (req: any, res) => {
  const { id } = req.params;

  const disciplina = db.prepare('SELECT * FROM disciplinas WHERE id = ?').get(id) as any;
  if (!disciplina) return res.status(404).json({ error: 'Disciplina não encontrada.' });
  if (disciplina.userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Não autorizado.' });
  }

  const deleteTx = db.transaction(() => {
    const chats = db.prepare('SELECT id FROM chats WHERE disciplinaId = ?').all(id) as { id: string }[];
    const deleteMsgs = db.prepare('DELETE FROM messages WHERE chatId = ?');
    for (const c of chats) {
      deleteMsgs.run(c.id);
    }
    db.prepare('DELETE FROM chats WHERE disciplinaId = ?').run(id);
    db.prepare('DELETE FROM persona_disciplina WHERE disciplinaId = ?').run(id);
    db.prepare('DELETE FROM disciplinas WHERE id = ?').run(id);
  });

  try {
    deleteTx();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao deletar disciplina.' });
  }
});

// Chat Routes
app.get('/api/chats', auth.authenticate, (req: any, res) => {
  const chats = db.prepare('SELECT * FROM chats WHERE userId = ? ORDER BY updatedAt DESC').all(req.user.id);
  res.json(chats);
});

app.post('/api/chats', auth.authenticate, (req: any, res) => {
  const { professorId, disciplinaId } = req.body;

  if (!professorId) {
    return res.status(400).json({ error: 'professorId é obrigatório.' });
  }

  // Find persona in DB
  const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(professorId) as any;
  if (!persona) {
    return res.status(404).json({ error: `Professor "${professorId}" não encontrado.` });
  }

  let finalDisciplinaId = disciplinaId || null;
  if (!finalDisciplinaId) {
    const vinculo = db.prepare('SELECT disciplinaId FROM persona_disciplina WHERE personaId = ? LIMIT 1').get(professorId) as { disciplinaId: string } | undefined;
    if (vinculo) {
      finalDisciplinaId = vinculo.disciplinaId;
    }
  }

  const chatId = crypto.randomUUID();
  const title = `Conversa com ${persona.nome}`;

  db.prepare(`
    INSERT INTO chats (id, userId, title, persona, personaDbId, disciplinaId)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(chatId, req.user.id, title, professorId, persona.id, finalDisciplinaId);

  // Insert greeting
  const greetingId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO messages (id, chatId, userId, role, content)
    VALUES (?, ?, ?, ?, ?)
  `).run(greetingId, chatId, req.user.id, 'model', persona.saudacao);

  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
  res.json({ chat, greetingMessage: db.prepare('SELECT * FROM messages WHERE id = ?').get(greetingId) });
});

app.get('/api/chats/:chatId/messages', auth.authenticate, (req: any, res) => {
  const { chatId } = req.params;
  const messages = db.prepare('SELECT * FROM messages WHERE chatId = ? AND userId = ? ORDER BY createdAt ASC').all(chatId, req.user.id);
  res.json(messages);
});

app.post('/api/chats/:chatId/messages', auth.authenticate, limiter, async (req: any, res) => {
  const { chatId } = req.params;
  const { content, provider = 'google' } = req.body;
  const userId = req.user.id;

  try {
    const chat = db.prepare('SELECT * FROM chats WHERE id = ? AND userId = ?').get(chatId, userId) as any;
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    // Store user message
    const userMsgId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO messages (id, chatId, userId, role, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(userMsgId, chatId, userId, 'user', content);

    // Get previous messages for context (excluding the one just inserted)
    const history = db.prepare('SELECT role, content FROM messages WHERE chatId = ? ORDER BY createdAt ASC').all(chatId) as any[];

    // Call AI with chatId to let it fetch persona/disciplina from DB
    const response = await ai.generateChatResponse(history.slice(0, -1), content, chatId, userId, provider);

    // Store model response
    const modelMsgId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO messages (id, chatId, userId, role, content, tokensUsed, creditsUsed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(modelMsgId, chatId, userId, 'model', response.text, response.tokensUsed, response.creditsUsed);

    // Update chat updatedAt
    db.prepare('UPDATE chats SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(chatId);

    res.json({
      userMessage: db.prepare('SELECT * FROM messages WHERE id = ?').get(userMsgId),
      modelMessage: db.prepare('SELECT * FROM messages WHERE id = ?').get(modelMsgId)
    });
  } catch (err: any) {
    console.error(err);
    const errorMessage = err.message.includes('Limite') ? err.message : 'Falha ao gerar resposta do tutor.';
    res.status(500).json({ error: errorMessage });
  }
});

// ==================== LAB ROUTES ====================

// GET /api/lab/projects — Meus projetos + projetos públicos da instituição
app.get('/api/lab/projects', auth.authenticate, (req: any, res) => {
  const userId = req.user.id;
  // Busca instituições do usuário
  const userInstitutions = db.prepare(
    `SELECT institutionId FROM user_institutions WHERE userId = ?`
  ).all(userId) as { institutionId: string }[];
  const instIds = userInstitutions.map(r => r.institutionId);

  let projects: any[];
  if (instIds.length === 0) {
    // Sem instituição: só projetos próprios
    projects = db.prepare(`
      SELECT p.*, u.name as authorName,
             (SELECT AVG(stars) FROM lab_project_ratings WHERE projectId = p.id) as avgStars,
             p.feedback_creator as feedbackCreator
      FROM lab_projects p
      JOIN users u ON p.userId = u.id
      WHERE p.userId = ?
      ORDER BY p.updatedAt DESC
    `).all(userId) as any[];
  } else {
    const placeholders = instIds.map(() => '?').join(',');
    projects = db.prepare(`
      SELECT p.*, u.name as authorName,
             (SELECT AVG(stars) FROM lab_project_ratings WHERE projectId = p.id) as avgStars,
             p.feedback_creator as feedbackCreator
      FROM lab_projects p
      JOIN users u ON u.id = p.userId
      WHERE p.userId = ? OR (p.isPublic = 1 AND p.institutionId IN (${placeholders}))
      ORDER BY p.updatedAt DESC
    `).all(userId, ...instIds) as any[];
  }

  res.json(projects);
});

// POST /api/lab/projects — Criar novo projeto
app.post('/api/lab/projects', auth.authenticate, (req: any, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'A plataforma de simuladores foi finalizada e novas criações estão bloqueadas.' });
  }
  const userId = req.user.id;
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title é obrigatório.' });

  // Checar limite de projetos do tier do usuário
  const { projectLimit } = getUserCreditLimit(userId);
  const projectCount = (db.prepare(`SELECT COUNT(*) as cnt FROM lab_projects WHERE userId = ?`).get(userId) as { cnt: number }).cnt;
  if (projectCount >= projectLimit) {
    return res.status(403).json({ error: `Limite de ${projectLimit} projetos atingido para o seu plano.` });
  }

  // Usuário sem instituição: projeto pessoal (não público)
  const userInstIds = getUserInstitutionIds(userId);
  const institutionId = userInstIds[0] || null;
  const isPublic = institutionId ? 1 : 0;

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO lab_projects (id, userId, institutionId, title, isPublic) VALUES (?, ?, ?, ?, ?)`
  ).run(id, userId, institutionId, title, isPublic);

  const project = db.prepare(`SELECT lp.*, u.name as authorName FROM lab_projects lp JOIN users u ON u.id = lp.userId WHERE lp.id = ?`).get(id);
  res.status(201).json(project);
});

// GET /api/lab/projects/:id — Projeto + mensagens
app.get('/api/lab/projects/:id', auth.authenticate, (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const project = db.prepare(`
    SELECT p.*, u.name as authorName,
           (SELECT AVG(stars) FROM lab_project_ratings WHERE projectId = p.id) as avgStars,
           p.feedback_creator as feedbackCreator
    FROM lab_projects p 
    JOIN users u ON u.id = p.userId 
    WHERE p.id = ?
  `).get(id) as any;
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });

  // Verifica acesso: dono ou mesma instituição (público)
  const isOwner = project.userId === userId;
  const hasInstitution = db.prepare(
    `SELECT 1 FROM user_institutions WHERE userId = ? AND institutionId = ?`
  ).get(userId, project.institutionId);
  if (!isOwner && (!project.isPublic || !hasInstitution)) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const messages = db.prepare(
    `SELECT * FROM lab_messages WHERE projectId = ? ORDER BY createdAt ASC`
  ).all(id);

  res.json({ ...project, messages });
});

// PUT /api/lab/projects/:id/title — Renomear projeto
app.put('/api/lab/projects/:id/title', auth.authenticate, (req: any, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'A plataforma de simuladores foi finalizada e edições estão bloqueadas.' });
  }
  const userId = req.user.id;
  const { id } = req.params;
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title é obrigatório.' });

  const project = db.prepare(`SELECT userId FROM lab_projects WHERE id = ?`).get(id) as any;
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  if (project.userId !== userId) return res.status(403).json({ error: 'Acesso negado.' });

  db.prepare(`UPDATE lab_projects SET title = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(title, id);
  res.json({ ok: true });
});

// DELETE /api/lab/projects/:id — Deletar projeto
app.delete('/api/lab/projects/:id', auth.authenticate, (req: any, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'A plataforma de simuladores foi finalizada e edições estão bloqueadas.' });
  }
  const userId = req.user.id;
  const { id } = req.params;

  const project = db.prepare(`SELECT userId FROM lab_projects WHERE id = ?`).get(id) as any;
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  if (project.userId !== userId && !req.user.isAdmin) return res.status(403).json({ error: 'Acesso negado.' });

  db.prepare(`DELETE FROM lab_projects WHERE id = ?`).run(id);
  res.json({ ok: true });
});

app.post('/api/lab/projects/:id/messages', auth.authenticate, limiter, async (req: any, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'A plataforma de simuladores foi finalizada e novas edições estão bloqueadas.' });
  }
  const userId = req.user.id;
  const { id: projectId } = req.params;
  const { content, modelToUse, userImageUrl } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content é obrigatório.' });

  const rawProject = db.prepare(`
    SELECT id, userId, institutionId, title, description, htmlContent, isPublic,
           code_index as codeIndex, project_context as projectContext, turn_count as turnCount,
           createdAt, updatedAt
    FROM lab_projects WHERE id = ?
  `).get(projectId) as any;

  if (!rawProject) return res.status(404).json({ error: 'Projeto não encontrado.' });
  if (rawProject.userId !== userId) return res.status(403).json({ error: 'Apenas o dono pode editar o projeto.' });

  const project = {
    ...rawProject,
    codeIndex: JSON.parse(rawProject.codeIndex || '{}'),
    projectContext: rawProject.projectContext || '',
    turnCount: rawProject.turnCount || 0,
  };

  const recentMessages = (db.prepare(`
    SELECT role, content FROM lab_messages
    WHERE projectId = ?
    ORDER BY createdAt DESC LIMIT 8
  `).all(projectId) as any[]).reverse();

  let savedImageUrl: string | null = null;
  if (userImageUrl) {
    try {
      const base64Data = userImageUrl.includes('base64,')
        ? userImageUrl.split('base64,')[1]
        : userImageUrl;
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `screenshot_${crypto.randomUUID()}.jpg`;
      const filepath = join(uploadsDir, filename);
      fs.writeFileSync(filepath, buffer);
      savedImageUrl = `/uploads/${filename}`;
    } catch (imgErr) {
      console.error('Erro ao salvar desenho:', imgErr);
    }
  }

  // Verifica limite de créditos de IA mensal (soma chat + lab)
  const monthlyChat = db.prepare(`
    SELECT SUM(creditsUsed) as total FROM messages
    WHERE userId = ? AND createdAt >= DATETIME('now', '-30 days')
  `).get(userId) as { total: number };
  const monthlyLab = db.prepare(`
    SELECT SUM(creditsUsed) as total FROM lab_messages
    WHERE userId = ? AND createdAt >= DATETIME('now', '-30 days')
  `).get(userId) as { total: number };
  const currentMonthlyTotal = (monthlyChat?.total || 0) + (monthlyLab?.total || 0);

  const { creditLimit } = getUserCreditLimit(userId);
  if (currentMonthlyTotal > creditLimit) {
    const limitLabel = creditLimit >= 1_000_000 ? '1M' : '100k';
    return res.status(402).json({ error: `Limite mensal de ${limitLabel} créditos de IA atingido.` });
  }

  // Salva mensagem do usuário
  const userMsgId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO lab_messages (id, projectId, userId, role, content, imageUrl) VALUES (?, ?, ?, 'user', ?, ?)`
  ).run(userMsgId, projectId, userId, content.trim(), savedImageUrl);

  try {
    const agentResult = await runSimAgent({
      project,
      userMessage: content.trim(),
      recentMessages,
      modelToUse,
      userImageUrl,
    });

    // Salva resposta do assistente
    const assistantMsgId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO lab_messages (id, projectId, userId, role, content, tokensUsed, creditsUsed, edit_plan, edit_scope, patched_functions)
      VALUES (?, ?, ?, 'assistant', ?, ?, ?, ?, ?, ?)
    `).run(
      assistantMsgId,
      projectId,
      userId,
      agentResult.explanation,
      agentResult.tokensUsed,
      agentResult.creditsUsed,
      agentResult.editPlan ? JSON.stringify(agentResult.editPlan) : null,
      agentResult.editScope,
      JSON.stringify(agentResult.patchedFunctions),
    );

    // Atualiza projeto com novo HTML, codeIndex, project_context e incrementa turnCount
    db.prepare(`
      UPDATE lab_projects
      SET htmlContent = ?,
          code_index = ?,
          project_context = ?,
          turn_count = turn_count + 1,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      agentResult.htmlContent,
      JSON.stringify(agentResult.codeIndex),
      agentResult.projectContext,
      projectId,
    );

    res.json({
      userMessage: db.prepare(`SELECT * FROM lab_messages WHERE id = ?`).get(userMsgId),
      assistantMessage: db.prepare(`SELECT * FROM lab_messages WHERE id = ?`).get(assistantMsgId),
      htmlContent: agentResult.htmlContent,
      editScope: agentResult.editScope,
      patchedFunctions: agentResult.patchedFunctions,
    });

    // Comprimir contexto de forma assíncrona, sem bloquear resposta
    const genAIForCompressor = new GoogleGenerativeAI((process.env.GEMINI_API_KEY || '').trim());
    compressProjectContext({ genAI: genAIForCompressor, projectId, db }).catch(console.error);

  } catch (err: any) {
    console.error(err);
    const errorMessage = err.message?.includes('Limite') ? err.message : 'Falha ao gerar resposta do Lab Agent.';
    
    // Grava uma resposta de falha do assistente no banco de dados, para que a mensagem de input do aluno nunca seja descartada da pesquisa científica
    const assistantErrorMsgId = crypto.randomUUID();
    try {
      db.prepare(`
        INSERT INTO lab_messages (id, projectId, userId, role, content, tokensUsed, creditsUsed, edit_scope)
        VALUES (?, ?, ?, 'assistant', ?, 0, 0, 'error')
      `).run(
        assistantErrorMsgId,
        projectId,
        userId,
        `[FALHA DE PROCESSAMENTO DA IA]: ${errorMessage}`
      );
    } catch (dbErr) {
      console.error('Erro ao gravar mensagem de erro do assistente no banco:', dbErr);
    }

    res.status(500).json({ error: errorMessage });
  }
});

// POST /api/lab/projects/:id/rate — Avaliar com estrelas (1-5)
app.post('/api/lab/projects/:id/rate', auth.authenticate, (req: any, res) => {
  const { id: projectId } = req.params;
  const { stars } = req.body;
  const userId = req.user.id;

  if (typeof stars !== 'number' || stars < 1 || stars > 5) {
    return res.status(400).json({ error: 'Estrelas devem ser entre 1 e 5.' });
  }

  const project = db.prepare('SELECT userId FROM lab_projects WHERE id = ?').get(projectId) as any;
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  if (project.userId === userId) return res.status(400).json({ error: 'Você não pode avaliar seu próprio projeto.' });

  db.prepare(`
    INSERT INTO lab_project_ratings (projectId, userId, stars)
    VALUES (?, ?, ?)
    ON CONFLICT(projectId, userId) DO UPDATE SET stars = excluded.stars
  `).run(projectId, userId, stars);

  res.json({ ok: true });
});

// POST /api/lab/projects/:id/feedback — Feedback do criador (like/dislike)
app.post('/api/lab/projects/:id/feedback', auth.authenticate, (req: any, res) => {
  const { id: projectId } = req.params;
  const { type } = req.body; // 'like' | 'dislike'
  const userId = req.user.id;

  const project = db.prepare('SELECT userId FROM lab_projects WHERE id = ?').get(projectId) as any;
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  if (project.userId !== userId) return res.status(403).json({ error: 'Apenas o dono pode dar feedback de objetivo.' });

  const value = type === 'like' ? 1 : -1;
  db.prepare('UPDATE lab_projects SET feedback_creator = ? WHERE id = ?').run(value, projectId);

  res.json({ ok: true });
});

// ==================== SECURITY ROUTES (Admin only) ====================

app.get('/api/admin/security/runs', auth.authenticate, requireAdmin, (req, res) => {
  const runs = db.prepare(
    'SELECT * FROM security_test_runs ORDER BY createdAt DESC LIMIT 20'
  ).all();
  res.json(runs);
});

app.get('/api/admin/security/runs/:runId', auth.authenticate, requireAdmin, (req, res) => {
  const { runId } = req.params;
  const run = db.prepare('SELECT * FROM security_test_runs WHERE id = ?').get(runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  const results = db.prepare(
    'SELECT * FROM security_test_results WHERE runId = ? ORDER BY severity ASC'
  ).all(runId);
  res.json({ ...run as any, results });
});

// ==================== IA USAGE ROUTE (Admin only) ====================

app.get('/api/admin/ia-usage', auth.authenticate, requireAdmin, (req: any, res) => {
  try {
    // 1. Custos Consolidados Gerais (Chat e Lab)
    const chatSum = db.prepare(`SELECT SUM(creditsUsed) as total FROM messages`).get() as { total: number | null };
    const labSum = db.prepare(`SELECT SUM(creditsUsed) as total FROM lab_messages`).get() as { total: number | null };
    
    const creditsChat = chatSum?.total || 0;
    const creditsLab = labSum?.total || 0;
    const creditsTotal = creditsChat + creditsLab;
    
    const reaisChat = creditsChat / 1_000_000;
    const reaisLab = creditsLab / 1_000_000;
    const reaisTotal = creditsTotal / 1_000_000;
    
    const spendCap = config.spendCap;
    const externalInitialSpend = config.externalInitialSpend;
    const grandTotalReais = reaisTotal + externalInitialSpend;

    // 2. Custos por Instituição
    const instChat = db.prepare(`
      SELECT ui.institutionId, i.name, SUM(m.creditsUsed) as totalCredits
      FROM messages m
      JOIN user_institutions ui ON m.userId = ui.userId
      JOIN institutions i ON ui.institutionId = i.id
      GROUP BY ui.institutionId
    `).all() as any[];

    const instLab = db.prepare(`
      SELECT ui.institutionId, i.name, SUM(lm.creditsUsed) as totalCredits
      FROM lab_messages lm
      JOIN user_institutions ui ON lm.userId = ui.userId
      JOIN institutions i ON ui.institutionId = i.id
      GROUP BY ui.institutionId
    `).all() as any[];

    const institutionsMap = new Map<string, { id: string, name: string, chatCredits: number, labCredits: number }>();
    instChat.forEach(c => {
      institutionsMap.set(c.institutionId, { id: c.institutionId, name: c.name, chatCredits: c.totalCredits, labCredits: 0 });
    });
    instLab.forEach(l => {
      const existing = institutionsMap.get(l.institutionId);
      if (existing) {
        existing.labCredits = l.totalCredits;
      } else {
        institutionsMap.set(l.institutionId, { id: l.institutionId, name: l.name, chatCredits: 0, labCredits: l.totalCredits });
      }
    });

    const institutions = Array.from(institutionsMap.values()).map(inst => {
      const totalCredits = inst.chatCredits + inst.labCredits;
      return {
        id: inst.id,
        name: inst.name,
        chatCredits: inst.chatCredits,
        labCredits: inst.labCredits,
        totalCredits,
        totalReais: totalCredits / 1_000_000
      };
    });

    // 3. Custos por Sala de Aula
    const classChat = db.prepare(`
      SELECT uc.classroomId, c.name, SUM(m.creditsUsed) as totalCredits
      FROM messages m
      JOIN user_classrooms uc ON m.userId = uc.userId
      JOIN classrooms c ON uc.classroomId = c.id
      GROUP BY uc.classroomId
    `).all() as any[];

    const classLab = db.prepare(`
      SELECT uc.classroomId, c.name, SUM(lm.creditsUsed) as totalCredits
      FROM lab_messages lm
      JOIN user_classrooms uc ON lm.userId = uc.userId
      JOIN classrooms c ON uc.classroomId = c.id
      GROUP BY uc.classroomId
    `).all() as any[];

    const classroomsMap = new Map<string, { id: string, name: string, chatCredits: number, labCredits: number }>();
    classChat.forEach(c => {
      classroomsMap.set(c.classroomId, { id: c.classroomId, name: c.name, chatCredits: c.totalCredits, labCredits: 0 });
    });
    classLab.forEach(l => {
      const existing = classroomsMap.get(l.classroomId);
      if (existing) {
        existing.labCredits = l.totalCredits;
      } else {
        classroomsMap.set(l.classroomId, { id: l.classroomId, name: l.name, chatCredits: 0, labCredits: l.totalCredits });
      }
    });

    const classrooms = Array.from(classroomsMap.values()).map(cls => {
      const totalCredits = cls.chatCredits + cls.labCredits;
      return {
        id: cls.id,
        name: cls.name,
        chatCredits: cls.chatCredits,
        labCredits: cls.labCredits,
        totalCredits,
        totalReais: totalCredits / 1_000_000
      };
    });

    // 4. Maiores Consumidores
    const userChat = db.prepare(`
      SELECT m.userId, u.name, u.email, SUM(m.creditsUsed) as totalCredits
      FROM messages m
      JOIN users u ON m.userId = u.id
      GROUP BY m.userId
    `).all() as any[];

    const userLab = db.prepare(`
      SELECT lm.userId, u.name, u.email, SUM(lm.creditsUsed) as totalCredits
      FROM lab_messages lm
      JOIN users u ON lm.userId = u.id
      GROUP BY lm.userId
    `).all() as any[];

    const usersMap = new Map<string, { id: string, name: string, email: string, chatCredits: number, labCredits: number }>();
    userChat.forEach(u => {
      usersMap.set(u.userId, { id: u.userId, name: u.name, email: u.email, chatCredits: u.totalCredits, labCredits: 0 });
    });
    userLab.forEach(l => {
      const existing = usersMap.get(l.userId);
      if (existing) {
        existing.labCredits = l.totalCredits;
      } else {
        usersMap.set(l.userId, { id: l.userId, name: l.name, email: l.email, chatCredits: 0, labCredits: l.totalCredits });
      }
    });

    const topUsers = Array.from(usersMap.values()).map(usr => {
      const totalCredits = usr.chatCredits + usr.labCredits;
      return {
        id: usr.id,
        name: usr.name,
        email: usr.email,
        chatCredits: usr.chatCredits,
        labCredits: usr.labCredits,
        totalCredits,
        totalReais: totalCredits / 1_000_000
      };
    }).sort((a, b) => b.totalCredits - a.totalCredits).slice(0, 30);

    // 5. Métricas Temporais: Gráficos de 24h, 7d e 30d
    const chat24h = db.prepare(`
      SELECT strftime('%Y-%m-%d %H:00:00', createdAt) as period, SUM(creditsUsed) as total
      FROM messages
      WHERE createdAt >= datetime('now', '-24 hours')
      GROUP BY period
    `).all() as any[];

    const lab24h = db.prepare(`
      SELECT strftime('%Y-%m-%d %H:00:00', createdAt) as period, SUM(creditsUsed) as total
      FROM lab_messages
      WHERE createdAt >= datetime('now', '-24 hours')
      GROUP BY period
    `).all() as any[];

    const chat7d = db.prepare(`
      SELECT strftime('%Y-%m-%d', createdAt) as period, SUM(creditsUsed) as total
      FROM messages
      WHERE createdAt >= datetime('now', '-7 days')
      GROUP BY period
    `).all() as any[];

    const lab7d = db.prepare(`
      SELECT strftime('%Y-%m-%d', createdAt) as period, SUM(creditsUsed) as total
      FROM lab_messages
      WHERE createdAt >= datetime('now', '-7 days')
      GROUP BY period
    `).all() as any[];

    const chat30d = db.prepare(`
      SELECT strftime('%Y-%m-%d', createdAt) as period, SUM(creditsUsed) as total
      FROM messages
      WHERE createdAt >= datetime('now', '-30 days')
      GROUP BY period
    `).all() as any[];

    const lab30d = db.prepare(`
      SELECT strftime('%Y-%m-%d', createdAt) as period, SUM(creditsUsed) as total
      FROM lab_messages
      WHERE createdAt >= datetime('now', '-30 days')
      GROUP BY period
    `).all() as any[];

    const mergePeriods = (chatData: any[], labData: any[]) => {
      const map = new Map<string, { period: string, chatCredits: number, labCredits: number }>();
      chatData.forEach(d => {
        map.set(d.period, { period: d.period, chatCredits: d.total || 0, labCredits: 0 });
      });
      labData.forEach(d => {
        const existing = map.get(d.period);
        if (existing) {
          existing.labCredits = d.total || 0;
        } else {
          map.set(d.period, { period: d.period, chatCredits: 0, labCredits: d.total || 0 });
        }
      });
      return Array.from(map.values()).map(p => {
        const total = p.chatCredits + p.labCredits;
        return {
          period: p.period,
          chatCredits: p.chatCredits,
          labCredits: p.labCredits,
          totalCredits: total,
          totalReais: total / 1_000_000
        };
      }).sort((a, b) => a.period.localeCompare(b.period));
    };

    const history24h = mergePeriods(chat24h, lab24h);
    const history7d = mergePeriods(chat7d, lab7d);
    const history30d = mergePeriods(chat30d, lab30d);

    res.json({
      summary: {
        creditsChat,
        creditsLab,
        creditsTotal,
        reaisChat,
        reaisLab,
        reaisTotal,
        spendCap,
        externalInitialSpend,
        grandTotalReais,
      },
      institutions,
      classrooms,
      topUsers,
      history: {
        h24: history24h,
        d7: history7d,
        d30: history30d,
      }
    });

  } catch (err: any) {
    console.error('Error computing IA usage:', err);
    res.status(500).json({ error: 'Erro ao computar uso de IA.' });
  }
});

// ==================== AVA & ACTIVITIES ROUTES ====================

// GET /api/classrooms/my-classes — Obter todas as salas às quais o usuário tem acesso
app.get('/api/classrooms/my-classes', auth.authenticate, (req: any, res) => {
  const userId = req.user.id;

  if (req.user.isAdmin) {
    const classrooms = db.prepare(`
      SELECT c.*, i.name as institutionName
      FROM classrooms c
      JOIN institutions i ON c.institutionId = i.id
      ORDER BY i.name ASC, c.name ASC
    `).all();
    return res.json(classrooms);
  }

  const classrooms = db.prepare(`
    SELECT c.*, i.name as institutionName, uc.role
    FROM classrooms c
    JOIN user_classrooms uc ON c.id = uc.classroomId
    JOIN institutions i ON c.institutionId = i.id
    WHERE uc.userId = ?
    ORDER BY i.name ASC, c.name ASC
  `).all(userId);

  res.json(classrooms);
});

// GET /api/classrooms/my-class — Mural da sala de aula do aluno (com suporte a sala selecionada)
app.get('/api/classrooms/my-class', auth.authenticate, (req: any, res) => {
  const userId = req.user.id;
  const queryClassroomId = req.query.classroomId as string | undefined;

  let targetClassroomId = queryClassroomId;

  if (!targetClassroomId) {
    if (req.user.isAdmin) {
      const firstClass = db.prepare('SELECT id FROM classrooms LIMIT 1').get() as { id: string } | undefined;
      targetClassroomId = firstClass?.id;
    } else {
      const firstClass = db.prepare('SELECT classroomId FROM user_classrooms WHERE userId = ? LIMIT 1').get(userId) as { classroomId: string } | undefined;
      targetClassroomId = firstClass?.classroomId;
    }
  }

  if (!targetClassroomId) {
    return res.json({ classroom: null, disciplinas: [], activities: [] });
  }

  // Verificar acesso se não for admin
  if (!req.user.isAdmin) {
    const hasAccess = db.prepare('SELECT 1 FROM user_classrooms WHERE userId = ? AND classroomId = ?').get(userId, targetClassroomId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Você não tem acesso a esta sala de aula.' });
    }
  }

  const classroom = db.prepare(`
    SELECT c.*, i.name as institutionName
    FROM classrooms c
    JOIN institutions i ON c.institutionId = i.id
    WHERE c.id = ?
  `).get(targetClassroomId);

  if (!classroom) {
    return res.json({ classroom: null, disciplinas: [], activities: [] });
  }

  // Disciplinas associadas a esta classe
  const disciplinas = db.prepare(`
    SELECT d.*, i.name as institutionName
    FROM disciplinas d
    LEFT JOIN institutions i ON d.institutionId = i.id
    WHERE d.classroomId = ?
    ORDER BY d.createdAt DESC
  `).all(targetClassroomId);

  // Atividades associadas a esta classe
  const activities = db.prepare(`
    SELECT a.*
    FROM activities a
    JOIN activity_classrooms ac ON a.id = ac.activityId
    WHERE ac.classroomId = ?
    ORDER BY a.dueDate ASC
  `).all(targetClassroomId);

  res.json({ classroom, disciplinas, activities });
});

// GET /api/classrooms/:classroomId/mural — Mural da sala de aula específica (Admin ou membro)
app.get('/api/classrooms/:classroomId/mural', auth.authenticate, (req: any, res) => {
  const { classroomId } = req.params;
  const userId = req.user.id;

  if (!req.user.isAdmin) {
    const hasAccess = db.prepare('SELECT 1 FROM user_classrooms WHERE userId = ? AND classroomId = ?').get(userId, classroomId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Você não tem acesso a esta sala de aula.' });
    }
  }

  const classroom = db.prepare(`
    SELECT c.*, i.name as institutionName
    FROM classrooms c
    JOIN institutions i ON c.institutionId = i.id
    WHERE c.id = ?
  `).get(classroomId);

  if (!classroom) return res.status(404).json({ error: 'Sala de aula não encontrada.' });

  const disciplinas = db.prepare(`
    SELECT d.*, i.name as institutionName
    FROM disciplinas d
    LEFT JOIN institutions i ON d.institutionId = i.id
    WHERE d.classroomId = ?
    ORDER BY d.createdAt DESC
  `).all(classroomId);

  const activities = db.prepare(`
    SELECT a.*
    FROM activities a
    JOIN activity_classrooms ac ON a.id = ac.activityId
    WHERE ac.classroomId = ?
    ORDER BY a.dueDate ASC
  `).all(classroomId);

  res.json({ classroom, disciplinas, activities });
});

// GET /api/admin/classrooms/:classroomId/users — Listar usuários de uma sala e elegíveis
app.get('/api/admin/classrooms/:classroomId/users', auth.authenticate, requireAdmin, (req, res) => {
  const { classroomId } = req.params;

  const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(classroomId) as { id: string, institutionId: string } | undefined;
  if (!classroom) return res.status(404).json({ error: 'Sala de aula não encontrada.' });

  // Usuários na sala
  const usersInClass = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, uc.role as classRole
    FROM users u
    JOIN user_classrooms uc ON u.id = uc.userId
    WHERE uc.classroomId = ?
  `).all(classroomId);

  // Usuários na mesma instituição fora da sala
  const availableUsers = db.prepare(`
    SELECT u.id, u.name, u.email, u.role
    FROM users u
    JOIN user_institutions ui ON u.id = ui.userId
    WHERE ui.institutionId = ?
      AND u.id NOT IN (SELECT userId FROM user_classrooms WHERE classroomId = ?)
      AND u.id != 'system'
  `).all(classroom.institutionId, classroomId);

  res.json({ usersInClass, availableUsers });
});

// POST /api/admin/classrooms/:classroomId/users — Vincular usuário à sala
app.post('/api/admin/classrooms/:classroomId/users', auth.authenticate, requireAdmin, (req, res) => {
  const { classroomId } = req.params;
  const { userId, role } = req.body;

  if (!userId) return res.status(400).json({ error: 'ID do usuário é obrigatório.' });

  db.prepare(`
    INSERT OR REPLACE INTO user_classrooms (userId, classroomId, role)
    VALUES (?, ?, ?)
  `).run(userId, classroomId, role || 'student');

  res.json({ success: true });
});

// DELETE /api/admin/classrooms/:classroomId/users/:userId — Desvincular usuário da sala
app.delete('/api/admin/classrooms/:classroomId/users/:userId', auth.authenticate, requireAdmin, (req, res) => {
  const { classroomId, userId } = req.params;

  db.prepare('DELETE FROM user_classrooms WHERE userId = ? AND classroomId = ?').run(userId, classroomId);
  res.json({ success: true });
});

// POST /api/activities — Criar atividade (Admin apenas)
app.post('/api/activities', auth.authenticate, requireAdmin, (req: any, res) => {
  const { title, description, dueDate, institutionId, classroomIds } = req.body;

  if (!title || !dueDate || !institutionId || !classroomIds || !Array.isArray(classroomIds)) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
  }

  const activityId = crypto.randomUUID();

  // Inserir atividade
  db.prepare(`
    INSERT INTO activities (id, title, description, dueDate, institutionId)
    VALUES (?, ?, ?, ?, ?)
  `).run(activityId, title, description || '', dueDate, institutionId);

  // Inserir relacionamentos com salas e gerar notificações
  const insertRelation = db.prepare(`
    INSERT INTO activity_classrooms (activityId, classroomId)
    VALUES (?, ?)
  `);

  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, title, content, type, targetClassroomId, referenceId)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const cId of classroomIds) {
    insertRelation.run(activityId, cId);
    
    // Gerar notificação
    const notificationId = crypto.randomUUID();
    const truncatedDesc = description && description.length > 80 ? description.substring(0, 80) + '...' : (description || '');
    insertNotification.run(
      notificationId,
      `Nova atividade: ${title}`,
      `Prazo de entrega: ${new Date(dueDate).toLocaleDateString('pt-BR')}. ${truncatedDesc}`,
      'activity',
      cId,
      activityId
    );
  }

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
  res.json(activity);
});

// GET /api/activities — Listar todas as atividades (Aluno vê da sua sala, Admin vê todas da instituição)
app.get('/api/activities', auth.authenticate, (req: any, res) => {
  if (req.user.isAdmin) {
    const activities = db.prepare(`
      SELECT a.*, i.name as institutionName,
             (SELECT GROUP_CONCAT(c.name, ', ') 
              FROM activity_classrooms ac
              JOIN classrooms c ON ac.classroomId = c.id
              WHERE ac.activityId = a.id) as classroomsList
      FROM activities a
      LEFT JOIN institutions i ON a.institutionId = i.id
      ORDER BY a.createdAt DESC
    `).all();
    return res.json(activities);
  }

  const user = db.prepare('SELECT classroomId FROM users WHERE id = ?').get(req.user.id) as { classroomId: string } | undefined;
  if (!user || !user.classroomId) {
    return res.json([]);
  }

  const activities = db.prepare(`
    SELECT a.*
    FROM activities a
    JOIN activity_classrooms ac ON a.id = ac.activityId
    WHERE ac.classroomId = ?
    ORDER BY a.dueDate ASC
  `).all(user.classroomId);
  
  res.json(activities);
});

// DELETE /api/activities/:id — Remover atividade (Admin apenas)
app.delete('/api/activities/:id', auth.authenticate, requireAdmin, (req: any, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM activities WHERE id = ?').run(id);
  db.prepare('DELETE FROM activity_classrooms WHERE activityId = ?').run(id);
  db.prepare('DELETE FROM notifications WHERE referenceId = ?').run(id);
  res.json({ ok: true });
});

// ==================== NOTIFICATIONS ROUTES ====================

// GET /api/notifications — Buscar notificações do aluno
app.get('/api/notifications', auth.authenticate, (req: any, res) => {
  const userId = req.user.id;
  const user = db.prepare('SELECT classroomId FROM users WHERE id = ?').get(userId) as { classroomId: string } | undefined;

  if (!user || !user.classroomId) {
    return res.json([]);
  }

  // Notificações ativas (onde a atividade vinculada ainda não expirou ou o prazo é futuro)
  const notifications = db.prepare(`
    SELECT n.*, 
           COALESCE(uns.seen, 0) as seen, 
           COALESCE(uns.dismissed, 0) as dismissed,
           a.dueDate
    FROM notifications n
    LEFT JOIN activities a ON n.referenceId = a.id
    LEFT JOIN user_notifications_status uns ON n.id = uns.notificationId AND uns.userId = ?
    WHERE n.targetClassroomId = ? AND (a.dueDate IS NULL OR date(a.dueDate) >= date('now'))
    ORDER BY n.createdAt DESC
  `).all(userId, user.classroomId);

  res.json(notifications);
});

// POST /api/notifications/:id/seen — Marcar notificação como visualizada no pop-up invasivo
app.post('/api/notifications/:id/seen', auth.authenticate, (req: any, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  db.prepare(`
    INSERT INTO user_notifications_status (userId, notificationId, seen)
    VALUES (?, ?, 1)
    ON CONFLICT(userId, notificationId) DO UPDATE SET seen = 1
  `).run(userId, notificationId);

  res.json({ ok: true });
});

// POST /api/notifications/:id/dismiss — Marcar notificação como descartada (some do menu lateral)
app.post('/api/notifications/:id/dismiss', auth.authenticate, (req: any, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  db.prepare(`
    INSERT INTO user_notifications_status (userId, notificationId, dismissed)
    VALUES (?, ?, 1)
    ON CONFLICT(userId, notificationId) DO UPDATE SET dismissed = 1
  `).run(userId, notificationId);

  res.json({ ok: true });
});

// ==================== ADMIN: PROVIDER CREDENTIALS (BYOK) ====================

const ALLOWED_PROVIDERS = ['google', 'openai-compatible', 'anthropic'] as const;
type AllowedProvider = typeof ALLOWED_PROVIDERS[number];

function getEnvKeyLast4(provider: AllowedProvider): string | null {
  const envMap: Record<AllowedProvider, string | undefined> = {
    google: process.env.GEMINI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    'openai-compatible': process.env.OPENAI_API_KEY,
  };
  const k = envMap[provider]?.trim();
  return k ? k.slice(-4) : null;
}

// GET /api/admin/providers — list provider credential status
app.get('/api/admin/providers', auth.authenticate, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT provider, key_last4, base_url, updated_at FROM provider_credentials').all() as any[];
  const credMap = new Map(rows.map((r: any) => [r.provider, r]));

  const providers = ALLOWED_PROVIDERS.map(p => ({
    provider: p,
    configured: credMap.has(p),
    keyLast4: credMap.get(p)?.key_last4 ?? null,
    baseUrl: credMap.get(p)?.base_url ?? null,
    updatedAt: credMap.get(p)?.updated_at ?? null,
    hasEnvFallback: !!getEnvKeyLast4(p),
    envKeyLast4: getEnvKeyLast4(p),
  }));

  res.json(providers);
});

// PUT /api/admin/providers/:provider/credentials — save encrypted API key
app.put('/api/admin/providers/:provider/credentials', auth.authenticate, requireAdmin, (req: any, res) => {
  const { provider } = req.params;
  if (!ALLOWED_PROVIDERS.includes(provider as AllowedProvider)) {
    return res.status(400).json({ error: 'Provider inválido.' });
  }
  const { apiKey, baseUrl } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    return res.status(400).json({ error: 'Chave API inválida (mínimo 10 caracteres).' });
  }

  let encrypted;
  try {
    encrypted = encryptSecret(apiKey.trim());
  } catch (err: any) {
    return res.status(500).json({ error: `Erro ao cifrar chave: ${err.message}` });
  }

  const keyLast4 = apiKey.trim().slice(-4);
  db.prepare(`
    INSERT INTO provider_credentials (provider, encrypted_key, iv, auth_tag, key_last4, base_url, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(provider) DO UPDATE SET
      encrypted_key = excluded.encrypted_key,
      iv            = excluded.iv,
      auth_tag      = excluded.auth_tag,
      key_last4     = excluded.key_last4,
      base_url      = excluded.base_url,
      updated_by    = excluded.updated_by,
      updated_at    = CURRENT_TIMESTAMP
  `).run(provider, encrypted.encrypted, encrypted.iv, encrypted.authTag, keyLast4, baseUrl || null, req.user?.id || null);

  invalidateKeyCache(provider);
  res.json({ ok: true, keyLast4 });
});

// DELETE /api/admin/providers/:provider/credentials — remove stored credentials
app.delete('/api/admin/providers/:provider/credentials', auth.authenticate, requireAdmin, (req, res) => {
  const { provider } = req.params;
  if (!ALLOWED_PROVIDERS.includes(provider as AllowedProvider)) {
    return res.status(400).json({ error: 'Provider inválido.' });
  }
  db.prepare('DELETE FROM provider_credentials WHERE provider = ?').run(provider);
  invalidateKeyCache(provider);
  res.json({ ok: true });
});

// POST /api/admin/providers/:provider/ping — validate key with a real API call
app.post('/api/admin/providers/:provider/ping', auth.authenticate, requireAdmin, async (req, res) => {
  const { provider } = req.params;
  if (!ALLOWED_PROVIDERS.includes(provider as AllowedProvider)) {
    return res.status(400).json({ error: 'Provider inválido.' });
  }

  let activeKey: { key: string; baseUrl?: string };
  try {
    activeKey = getActiveKey(provider);
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: 'Nenhuma credencial configurada para este provider.' });
  }

  const start = Date.now();
  try {
    if (provider === 'google') {
      const genAI = new GoogleGenerativeAI(activeKey.key);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }, { timeout: 10_000 });
      await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] });
    } else if (provider === 'anthropic') {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': activeKey.key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({})) as any;
        throw new Error(body?.error?.message ?? `HTTP ${resp.status}`);
      }
    } else {
      const baseURL = activeKey.baseUrl ?? 'https://api.openai.com/v1';
      const resp = await fetch(`${baseURL}/models`, {
        headers: { Authorization: `Bearer ${activeKey.key}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({})) as any;
        throw new Error(body?.error?.message ?? `HTTP ${resp.status}`);
      }
    }
    res.json({ ok: true, latencyMs: Date.now() - start });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message ?? 'Falha na validação.' });
  }
});

// ==================== ADMIN: AI MODELS ====================

// GET /api/admin/models — list all models in the registry
app.get('/api/admin/models', auth.authenticate, requireAdmin, (req, res) => {
  const models = db.prepare('SELECT * FROM ai_models ORDER BY provider ASC, is_default DESC, id ASC').all();
  res.json(models);
});

// PATCH /api/admin/models/:modelId — toggle enabled/set default/update costs
app.patch('/api/admin/models/:modelId', auth.authenticate, requireAdmin, (req: any, res) => {
  const { modelId } = req.params;
  const { enabled, is_default, input_cost_per_1m, output_cost_per_1m, input_cached_cost_per_1m } = req.body;

  const model = db.prepare('SELECT id FROM ai_models WHERE id = ?').get(modelId);
  if (!model) return res.status(404).json({ error: 'Modelo não encontrado.' });

  if (enabled !== undefined) {
    db.prepare('UPDATE ai_models SET enabled = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?')
      .run(enabled ? 1 : 0, req.user?.id || null, modelId);
  }
  if (is_default) {
    db.prepare('UPDATE ai_models SET is_default = 0').run();
    db.prepare('UPDATE ai_models SET is_default = 1, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?')
      .run(req.user?.id || null, modelId);
  }
  if (input_cost_per_1m !== undefined || output_cost_per_1m !== undefined || input_cached_cost_per_1m !== undefined) {
    const fields: string[] = [];
    const vals: any[] = [];
    if (input_cost_per_1m !== undefined) { fields.push('input_cost_per_1m = ?'); vals.push(input_cost_per_1m); }
    if (input_cached_cost_per_1m !== undefined) { fields.push('input_cached_cost_per_1m = ?'); vals.push(input_cached_cost_per_1m); }
    if (output_cost_per_1m !== undefined) { fields.push('output_cost_per_1m = ?'); vals.push(output_cost_per_1m); }
    fields.push('updated_at = CURRENT_TIMESTAMP', 'updated_by = ?');
    vals.push(req.user?.id || null, modelId);
    db.prepare(`UPDATE ai_models SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  }

  const updated = db.prepare('SELECT * FROM ai_models WHERE id = ?').get(modelId);
  res.json(updated);
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
