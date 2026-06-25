import { describe, it } from 'node:test';
import assert from 'node:assert';
import db from './db.js';
import { register } from './auth.js';

// Funções idênticas às usadas pelas ferramentas do Gemini no backend
function queryDisciplinas(userId: string) {
  const classrooms = db.prepare('SELECT classroomId FROM user_classrooms WHERE userId = ?').all(userId) as { classroomId: string }[];
  let query = `SELECT id, nome FROM disciplinas WHERE institutionId = 'scaffl' OR institutionId = 'global'`;
  const params: any[] = [];
  if (classrooms.length > 0) {
    const placeholders = classrooms.map(() => '?').join(', ');
    query += ` OR classroomId IN (${placeholders})`;
    params.push(...classrooms.map(c => c.classroomId));
  }
  return db.prepare(query).all(...params);
}

function queryDisciplinaConteudo(disciplinaId: string) {
  const disc = db.prepare('SELECT nome, conteudo FROM disciplinas WHERE id = ?').get(disciplinaId) as any;
  if (!disc) return { error: `Disciplina "${disciplinaId}" não encontrada.` };
  return { nome: disc.nome, conteudo: disc.conteudo };
}

function queryAtividades(userId: string) {
  const classrooms = db.prepare('SELECT classroomId FROM user_classrooms WHERE userId = ?').all(userId) as { classroomId: string }[];
  if (classrooms.length === 0) return [];
  const placeholders = classrooms.map(() => '?').join(', ');
  return db.prepare(`
    SELECT a.id, a.title, a.description, a.dueDate
    FROM activities a
    JOIN activity_classrooms ac ON a.id = ac.activityId
    WHERE ac.classroomId IN (${placeholders})
    ORDER BY a.dueDate ASC
  `).all(...classrooms.map(c => c.classroomId));
}

describe('AVA, Activities and IA Tools Integration Tests', () => {
  const testUserId = 'test-student-id';
  const testClassroomId = 'test-class-id';
  const testInstId = 'test-inst-id';
  const testDiscId = 'test-disc-id';
  const testActivityId = 'test-act-id';

  it('Setup: should prepare temporary test database rows', () => {
    try {
      // Limpar quaisquer restos de testes anteriores
      db.prepare('DELETE FROM user_notifications_status WHERE userId = ?').run(testUserId);
      db.prepare('DELETE FROM user_classrooms WHERE userId = ?').run(testUserId);
      db.prepare('DELETE FROM activity_classrooms WHERE classroomId = ?').run(testClassroomId);
      db.prepare('DELETE FROM activities WHERE id = ?').run(testActivityId);
      db.prepare('DELETE FROM disciplinas WHERE id = ?').run(testDiscId);
      db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
      db.prepare('DELETE FROM classrooms WHERE id = ?').run(testClassroomId);
      db.prepare('DELETE FROM institutions WHERE id = ?').run(testInstId);

      // Inserir registros
      db.prepare('INSERT INTO institutions (id, name, domain) VALUES (?, ?, ?)')
        .run(testInstId, 'Test Institution', 'test.edu');

      db.prepare('INSERT INTO classrooms (id, name, institutionId) VALUES (?, ?, ?)')
        .run(testClassroomId, 'Test Class A', testInstId);

      db.prepare('INSERT INTO users (id, name, email, password, role, isAdmin, classroomId) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(testUserId, 'Test Student', 'student@test.edu', 'pass', 'user', 0, testClassroomId);

      db.prepare('INSERT INTO user_classrooms (userId, classroomId, role) VALUES (?, ?, ?)')
        .run(testUserId, testClassroomId, 'student');

      db.prepare('INSERT INTO disciplinas (id, userId, institutionId, nome, conteudo, classroomId) VALUES (?, ?, ?, ?, ?, ?)')
        .run(testDiscId, 'system', testInstId, 'Calculo I', 'Limite, derivada e integral', testClassroomId);

      // Inserir atividade e associar à sala
      db.prepare('INSERT INTO activities (id, title, description, dueDate, institutionId) VALUES (?, ?, ?, ?, ?)')
        .run(testActivityId, 'Tarefa 1', 'Desc 1', '2026-12-31T23:59:59Z', testInstId);

      db.prepare('INSERT INTO activity_classrooms (activityId, classroomId) VALUES (?, ?)')
        .run(testActivityId, testClassroomId);
        
      assert.ok(true, 'Setup executado com sucesso.');
    } catch (err: any) {
      console.error('SETUP ERROR DETAILED:', err);
      throw err;
    }
  });

  it('Tool: queryDisciplinas should retrieve global plus classroom-specific subjects', () => {
    const list = queryDisciplinas(testUserId);
    const disc = list.find((d: any) => d.id === testDiscId);
    assert.ok(disc, 'Disciplina vinculada à sala do aluno deve ser retornada.');
    assert.strictEqual(disc.nome, 'Calculo I');
  });

  it('Tool: queryDisciplinaConteudo should return correct syllabus content', () => {
    const res = queryDisciplinaConteudo(testDiscId);
    assert.strictEqual(res.nome, 'Calculo I');
    assert.strictEqual(res.conteudo, 'Limite, derivada e integral');
  });

  it('Tool: queryAtividades should return active tasks for user classroom', () => {
    const list = queryAtividades(testUserId);
    const act = list.find((a: any) => a.id === testActivityId);
    assert.ok(act, 'Atividade da sala do aluno deve ser retornada.');
    assert.strictEqual(act.title, 'Tarefa 1');
  });

  it('Auth: register function should link user to user_classrooms upon creation with inviteCode', async () => {
    const mockReq = {
      body: {
        name: 'Register Test Student',
        email: 'regstudent@test.edu',
        password: 'securepassword123',
        inviteCode: testClassroomId
      }
    } as any;

    let responseData: any = null;
    let responseStatus: number = 200;
    const mockRes = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        responseData = data;
        return mockRes;
      }
    } as any;

    await register(mockReq, mockRes);

    assert.strictEqual(responseStatus, 200, 'Cadastro deve retornar status 200.');
    assert.ok(responseData && responseData.user, 'Resposta deve conter objeto de usuário.');

    // Verificar se foi inserido na tabela user_classrooms
    const linkage = db.prepare('SELECT * FROM user_classrooms WHERE userId = ? AND classroomId = ?').get(responseData.user.id, testClassroomId) as any;
    assert.ok(linkage, 'O usuário recém-cadastrado deve estar associado na tabela user_classrooms.');
    assert.strictEqual(linkage.role, 'student', 'A role associada ao usuário deve ser student.');

    // Limpar o usuário de teste de cadastro
    db.prepare('DELETE FROM user_classrooms WHERE userId = ?').run(responseData.user.id);
    db.prepare('DELETE FROM user_institutions WHERE userId = ?').run(responseData.user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(responseData.user.id);
  });

  it('Cleanup: should remove all temporary test rows', () => {
    db.prepare('DELETE FROM user_notifications_status WHERE userId = ?').run(testUserId);
    db.prepare('DELETE FROM user_classrooms WHERE userId = ?').run(testUserId);
    db.prepare('DELETE FROM activity_classrooms WHERE classroomId = ?').run(testClassroomId);
    db.prepare('DELETE FROM activities WHERE id = ?').run(testActivityId);
    db.prepare('DELETE FROM disciplinas WHERE id = ?').run(testDiscId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    db.prepare('DELETE FROM classrooms WHERE id = ?').run(testClassroomId);
    db.prepare('DELETE FROM institutions WHERE id = ?').run(testInstId);
    assert.ok(true, 'Limpeza concluída.');
  });
});
