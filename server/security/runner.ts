#!/usr/bin/env tsx
// Security test runner — run locally with:
//   cd server && npx tsx security/runner.ts
//
// Requires the server to be running on localhost:3001 (or set BASE_URL env).
// Requires ADMIN_EMAIL + ADMIN_PASSWORD in .env (or env vars directly).

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { SECURITY_TESTS, TestResult } from './securityTests.js';
import Database from 'better-sqlite3';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const DB_PATH = join(dirname(fileURLToPath(import.meta.url)), '../tutorai.db');

const ANSI = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m',
};

function c(color: keyof typeof ANSI, text: string) {
  return `${ANSI[color]}${text}${ANSI.reset}`;
}

async function loginAs(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  const data = await res.json() as any;
  return data.token;
}

async function setupTestUser(inviteCode: string): Promise<{ token: string; userId: string; email: string }> {
  const email = `sectest_runner_${Date.now()}@ucs.br`;
  const password = 'SecTest!9876';
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Security Test User', email, password, inviteCode }),
  });
  if (!regRes.ok) throw new Error(`Failed to create test user: ${await regRes.text()}`);
  const data = await regRes.json() as any;
  return { token: data.token, userId: data.user.id, email };
}

async function setupTestProject(token: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/lab/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'Security Test Project (auto-cleanup)' }),
  });
  if (!res.ok) return '';
  const data = await res.json() as any;
  return data.id || '';
}

function cleanupTestResources(userId: string, testClassroomId: string) {
  try {
    const db = new Database(DB_PATH);
    if (userId) db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    if (testClassroomId) db.prepare('DELETE FROM classrooms WHERE id = ?').run(testClassroomId);
    db.prepare("DELETE FROM institutions WHERE id = 'test_inst_id_security_runner'").run();
    db.close();
  } catch (e) {
    console.error('Failed to cleanup test resources:', e);
  }
}

function saveResultsToDB(runId: string, results: TestResult[]) {
  try {
    const db = new Database(DB_PATH);
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warn').length;
    const errors = results.filter(r => r.status === 'error').length;

    db.prepare(
      'INSERT INTO security_test_runs (id, totalTests, passed, failed, warnings, errors) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(runId, results.length, passed, failed, warnings, errors);

    const insertResult = db.prepare(`
      INSERT INTO security_test_results (id, runId, testId, name, category, severity, status, message, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of results) {
      insertResult.run(crypto.randomUUID(), runId, r.testId, r.name, r.category, r.severity, r.status, r.message, r.details || null);
    }
    db.close();
  } catch (e) {
    console.error('Failed to save results to DB:', e);
  }
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const STATUS_ICON: Record<string, string> = { pass: '✔', fail: '✖', warn: '⚠', error: '?' };
const STATUS_COLOR: Record<string, keyof typeof ANSI> = { pass: 'green', fail: 'red', warn: 'yellow', error: 'yellow' };

async function main() {
  console.log(`\n${c('bold', '═══════════════════════════════════════════════')}`);
  console.log(`${c('cyan', '  TutorAI Security Test Runner')}`);
  console.log(`${c('gray', `  Target: ${BASE_URL}`)}`);
  console.log(`${'═'.repeat(47)}\n`);

  // ── Setup context ──────────────────────────────
  let adminToken = '';
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    try {
      adminToken = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log(c('green', `  ✔ Admin autenticado (${ADMIN_EMAIL})`));
    } catch (e: any) {
      console.log(c('yellow', `  ⚠ Admin login falhou: ${e.message}`));
    }
  } else {
    console.log(c('yellow', '  ⚠ SUPER_ADMIN_EMAIL / ADMIN_PASSWORD não configurados no .env'));
  }

  // Pre-insert temporary classroom and institution
  const testClassroomId = `test_classroom_id_security_runner_${Date.now()}`;
  try {
    const db = new Database(DB_PATH);
    let inst = db.prepare('SELECT id FROM institutions LIMIT 1').get() as { id: string } | undefined;
    let instId = inst?.id;
    if (!instId) {
      instId = 'test_inst_id_security_runner';
      db.prepare("INSERT OR IGNORE INTO institutions (id, name) VALUES (?, ?)").run(
        instId,
        "Instituição de Teste de Segurança"
      );
    }
    db.prepare("INSERT OR IGNORE INTO classrooms (id, name, institutionId) VALUES (?, ?, ?)").run(
      testClassroomId,
      "Sala de Teste de Segurança",
      instId
    );
    db.close();
  } catch (err: any) {
    console.log(c('yellow', `  ⚠ Setup de sala de aula temporária falhou: ${err.message}`));
  }

  let userToken = '';
  let userId = '';
  let projectId = '';
  try {
    const u = await setupTestUser(testClassroomId);
    userToken = u.token;
    userId = u.userId;
    console.log(c('green', `  ✔ Usuário de teste criado (${u.email})`));
    projectId = await setupTestProject(userToken);
    if (projectId) console.log(c('green', `  ✔ Projeto de teste criado (${projectId})`));
  } catch (e: any) {
    console.log(c('yellow', `  ⚠ Setup de usuário de teste falhou: ${e.message}`));
  }

  const ctx = { userToken, adminToken: adminToken || userToken, userId, projectId, inviteCode: testClassroomId };

  // ── Run tests ──────────────────────────────────
  console.log(`\n${c('bold', '  Executando testes...')}\n`);
  const results: TestResult[] = [];
  const sortedTests = [...SECURITY_TESTS].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  for (const test of sortedTests) {
    process.stdout.write(`  ${c('gray', test.id.padEnd(12))} ${test.name.padEnd(45)} `);
    let result: TestResult;
    try {
      result = await test.run(BASE_URL, ctx);
    } catch (e: any) {
      result = {
        testId: test.id, name: test.name, category: test.category, severity: test.severity,
        status: 'error', message: `Erro ao executar teste: ${e.message}`,
      };
    }
    results.push(result);
    const icon = STATUS_ICON[result.status];
    const col = STATUS_COLOR[result.status];
    console.log(c(col, `${icon} ${result.status.toUpperCase()}`));
    if (result.details && result.status !== 'pass') {
      console.log(c('gray', `             └ ${result.details.slice(0, 100)}`));
    }
  }

  // ── Summary ────────────────────────────────────
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warn').length;
  const total = results.length;

  console.log(`\n${'─'.repeat(47)}`);
  console.log(`  Total: ${total}  ${c('green', `✔ ${passed}`)}  ${c('red', `✖ ${failed}`)}  ${c('yellow', `⚠ ${warnings}`)}`);

  if (failed > 0) {
    console.log(`\n${c('red', c('bold', '  FALHAS CRÍTICAS:'))}`);
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  ${c('red', r.testId)} ${r.name}`);
      console.log(`  ${c('gray', '└')} ${r.message}`);
    });
  }

  // Save to DB
  const runId = crypto.randomUUID();
  saveResultsToDB(runId, results);
  console.log(`\n${c('gray', `  Resultados salvos no DB (runId: ${runId})`)}`);

  // ── Cleanup ────────────────────────────────────
  cleanupTestResources(userId, testClassroomId);
  console.log(c('gray', '  Recursos de teste removidos do DB.'));

  console.log(`\n${'═'.repeat(47)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Runner error:', e);
  process.exit(1);
});
