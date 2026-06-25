import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from './db.js';
import { config } from './config.js';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    // Obter dados de permissão atualizados em tempo real do banco
    const dbUser = db.prepare('SELECT id, email, role, isAdmin FROM users WHERE id = ?').get(decoded.id) as any;
    if (!dbUser) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      isAdmin: !!dbUser.isAdmin
    } as any;

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, isAdmin: !!user.isAdmin }, config.jwtSecret, { expiresIn: '7d' });
  
  // Calculate credits (chat + lab)
  const chatCr = db.prepare(`SELECT SUM(creditsUsed) as total FROM messages WHERE userId = ? AND createdAt >= DATETIME('now', '-30 days')`).get(user.id) as { total: number };
  const labCr = db.prepare(`SELECT SUM(creditsUsed) as total FROM lab_messages WHERE userId = ? AND createdAt >= DATETIME('now', '-30 days')`).get(user.id) as { total: number };
  user.creditsMonthly = (chatCr?.total || 0) + (labCr?.total || 0);
  user.institutions = (db.prepare('SELECT institutionId FROM user_institutions WHERE userId = ?').all(user.id) as { institutionId: string }[]).map(r => r.institutionId);

  delete user.password;
  res.json({ user, token });
};

export const register = async (req: AuthRequest, res: Response) => {
  const { name, email, password, inviteCode } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  const isAdminCreation = req.user && (req.user.role === 'admin' || (req.user as any).isAdmin);

  if (!isAdminCreation) {
    if (!inviteCode) {
      return res.status(403).json({ error: 'O cadastro só é permitido através de um convite/QR code de sala de aula.' });
    }
    // Verificar se a sala existe
    const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(inviteCode) as any;
    if (!classroom) {
      return res.status(400).json({ error: 'Código de convite inválido ou sala não encontrada.' });
    }
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase();
    const isAdmin = (email.toLowerCase() === superAdminEmail) ? 1 : 0;
    const role = isAdmin ? 'admin' : 'user';

    db.prepare(`
      INSERT INTO users (id, name, email, password, role, isAdmin, lastResetProfessor, lastResetTutor, lastResetColega, classroomId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, 
      name, 
      email.toLowerCase(), 
      hashedPassword, 
      role,
      isAdmin,
      new Date().toISOString(), 
      new Date().toISOString(), 
      new Date().toISOString(),
      inviteCode || null
    );

    // Automatic Provisioning by Classroom or Domain fallback
    if (inviteCode) {
      const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(inviteCode) as any;
      if (classroom) {
        db.prepare('INSERT OR IGNORE INTO user_institutions (userId, institutionId) VALUES (?, ?)').run(userId, classroom.institutionId);
        // Associar o aluno recém-cadastrado na tabela N:N de salas de aula
        db.prepare('INSERT OR IGNORE INTO user_classrooms (userId, classroomId, role) VALUES (?, ?, ?)')
          .run(userId, inviteCode, 'student');
      }
    } else {
      const domain = '@' + email.split('@')[1];
      const institution = db.prepare('SELECT id FROM institutions WHERE domain = ?').get(domain) as { id: string };
      if (institution) {
        db.prepare('INSERT OR IGNORE INTO user_institutions (userId, institutionId) VALUES (?, ?)').run(userId, institution.id);
      }
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    user.creditsMonthly = 0;
    user.institutions = (db.prepare('SELECT institutionId FROM user_institutions WHERE userId = ?').all(userId) as { institutionId: string }[]).map(r => r.institutionId);
    delete user.password;

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, isAdmin: !!user.isAdmin }, config.jwtSecret, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUserData = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  
  const updates = req.body;
  const allowedFields = ['name', 'themeMode', 'accentColor', 'tokensProfessor', 'lastResetProfessor', 'tokensTutor', 'lastResetTutor', 'tokensColega', 'lastResetColega'];
  
  const filteredUpdates: any = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) filteredUpdates[field] = updates[field];
  }

  if (Object.keys(filteredUpdates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  const query = `UPDATE users SET ${Object.keys(filteredUpdates).map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
  db.prepare(query).run(...Object.values(filteredUpdates), req.user.id);
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  
  // Recalculate credits (chat + lab)
  const chatCr2 = db.prepare(`SELECT SUM(creditsUsed) as total FROM messages WHERE userId = ? AND createdAt >= DATETIME('now', '-30 days')`).get(req.user.id) as { total: number };
  const labCr2 = db.prepare(`SELECT SUM(creditsUsed) as total FROM lab_messages WHERE userId = ? AND createdAt >= DATETIME('now', '-30 days')`).get(req.user.id) as { total: number };
  user.creditsMonthly = (chatCr2?.total || 0) + (labCr2?.total || 0);

  delete user.password;
  res.json(user);
};
