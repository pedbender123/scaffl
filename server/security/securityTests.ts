// Security test suite — runs HTTP probes against the live local API
// like a pentester would. Each test is self-contained.

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type TestStatus = 'pass' | 'fail' | 'warn' | 'error';

export interface TestResult {
  testId: string;
  name: string;
  category: string;
  severity: Severity;
  status: TestStatus;
  message: string;
  details?: string;
}

type TestFn = (base: string, ctx: TestContext) => Promise<TestResult>;

export interface SecurityTest {
  id: string;
  name: string;
  category: string;
  severity: Severity;
  run: TestFn;
}

interface TestContext {
  userToken: string;   // valid regular user JWT
  adminToken: string;  // valid admin JWT
  userId: string;
  projectId: string;   // a lab project owned by the test user
  inviteCode?: string; // valid invite code for registrations
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function hit(
  base: string,
  path: string,
  opts: { method?: string; body?: any; token?: string | null; headers?: Record<string, string> } = {}
) {
  const { method = 'GET', body, token, headers: extraHeaders = {} } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function pass(testId: string, name: string, category: string, severity: Severity, message: string, details?: string): TestResult {
  return { testId, name, category, severity, status: 'pass', message, details };
}
function fail(testId: string, name: string, category: string, severity: Severity, message: string, details?: string): TestResult {
  return { testId, name, category, severity, status: 'fail', message, details };
}
function warn(testId: string, name: string, category: string, severity: Severity, message: string, details?: string): TestResult {
  return { testId, name, category, severity, status: 'warn', message, details };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

export const SECURITY_TESTS: SecurityTest[] = [

  // ── AUTH ──────────────────────────────────────────────────────────────────

  {
    id: 'AUTH-001',
    name: 'Acesso sem token JWT',
    category: 'Autenticação',
    severity: 'critical',
    async run(base, _ctx) {
      const id = 'AUTH-001'; const n = 'Acesso sem token JWT'; const c = 'Autenticação'; const s: Severity = 'critical';
      const res = await hit(base, '/api/auth/me');
      if (res.status === 401) return pass(id, n, c, s, 'Endpoint protegido retornou 401 sem token.');
      return fail(id, n, c, s, `Esperado 401, recebido ${res.status} — endpoint acessível sem autenticação.`);
    },
  },

  {
    id: 'AUTH-002',
    name: 'Token JWT inválido (assinatura forjada)',
    category: 'Autenticação',
    severity: 'critical',
    async run(base, _ctx) {
      const id = 'AUTH-002'; const n = 'Token JWT inválido (assinatura forjada)'; const c = 'Autenticação'; const s: Severity = 'critical';
      const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImhhY2tlciIsImVtYWlsIjoiaGFja2VyQGV2aWwuY29tIiwicm9sZSI6ImFkbWluIiwiaXNBZG1pbiI6dHJ1ZX0.INVALIDSIGNATURE';
      const res = await hit(base, '/api/auth/me', { token: fakeToken });
      if (res.status === 401) return pass(id, n, c, s, 'Token forjado rejeitado com 401.');
      return fail(id, n, c, s, `Esperado 401, recebido ${res.status} — token inválido foi aceito!`, JSON.stringify(await res.json().catch(() => ({}))));
    },
  },

  {
    id: 'AUTH-003',
    name: 'JWT algorithm "none" bypass',
    category: 'Autenticação',
    severity: 'critical',
    async run(base, _ctx) {
      const id = 'AUTH-003'; const n = 'JWT algorithm "none" bypass'; const c = 'Autenticação'; const s: Severity = 'critical';
      // Header: {"alg":"none","typ":"JWT"}  Payload: {"id":"hacker","isAdmin":true}
      const header = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url');
      const payload = Buffer.from('{"id":"hacker","email":"h@h.com","role":"admin","isAdmin":true}').toString('base64url');
      const noneToken = `${header}.${payload}.`;
      const res = await hit(base, '/api/auth/me', { token: noneToken });
      if (res.status === 401) return pass(id, n, c, s, 'Algorithm "none" rejeitado corretamente.');
      return fail(id, n, c, s, `Esperado 401, recebido ${res.status} — vulnerável a JWT algorithm confusion!`);
    },
  },

  {
    id: 'AUTH-004',
    name: 'Escalonamento de privilégio (user → admin)',
    category: 'Autorização',
    severity: 'critical',
    async run(base, ctx) {
      const id = 'AUTH-004'; const n = 'Escalonamento de privilégio (user → admin)'; const c = 'Autorização'; const s: Severity = 'critical';
      const res = await hit(base, '/api/admin/users', { token: ctx.userToken });
      if (res.status === 403) return pass(id, n, c, s, 'Usuário comum recebeu 403 ao tentar acessar rota admin.');
      return fail(id, n, c, s, `Esperado 403, recebido ${res.status} — usuário comum pode acessar rota admin!`);
    },
  },

  {
    id: 'AUTH-005',
    name: 'Enumeração de contas (mensagens de erro)',
    category: 'Autenticação',
    severity: 'medium',
    async run(base, _ctx) {
      const id = 'AUTH-005'; const n = 'Enumeração de contas (mensagens de erro)'; const c = 'Autenticação'; const s: Severity = 'medium';
      const resNoUser = await hit(base, '/api/auth/login', { method: 'POST', body: { email: 'definitivamente_nao_existe_xyzabc@example.invalid', password: 'qualquercoisa' } });
      const resWrongPwd = await hit(base, '/api/auth/login', { method: 'POST', body: { email: 'system@scaffl.local', password: 'senhaerrada123' } });
      const b1 = await resNoUser.json().catch(() => ({})) as any;
      const b2 = await resWrongPwd.json().catch(() => ({})) as any;
      if (b1.error === b2.error) return pass(id, n, c, s, 'Mensagens de erro idênticas para email inexistente e senha errada — sem enumeração.');
      return warn(id, n, c, s, 'Mensagens de erro diferentes podem permitir enumeração de usuários.', `Email inexistente: "${b1.error}" | Senha errada: "${b2.error}"`);
    },
  },

  // ── IDOR ──────────────────────────────────────────────────────────────────

  {
    id: 'IDOR-001',
    name: 'Acesso a projeto de outro usuário (IDOR)',
    category: 'IDOR',
    severity: 'high',
    async run(base, ctx) {
      const id = 'IDOR-001'; const n = 'Acesso a projeto de outro usuário (IDOR)'; const c = 'IDOR'; const s: Severity = 'high';
      if (!ctx.projectId) return warn(id, n, c, s, 'Sem projectId de teste disponível para verificar IDOR.');
      // Try to access the project with the admin token (different user)
      const res = await hit(base, `/api/lab/projects/${ctx.projectId}`, { token: ctx.adminToken });
      // Admins can access it — but check with an injected fake user token approach
      // Instead, check that project owner check works: try to send a message as admin
      const res2 = await hit(base, `/api/lab/projects/${ctx.projectId}/messages`, {
        method: 'POST',
        token: ctx.adminToken,
        body: { content: 'IDOR test' },
      });
      if (res2.status === 403) return pass(id, n, c, s, 'Servidor rejeitou edição de projeto por usuário não-dono com 403.');
      if (res2.status === 404) return pass(id, n, c, s, 'Projeto não encontrado para o usuário não-dono (acesso negado indiretamente).');
      return warn(id, n, c, s, `Admin conseguiu interagir com projeto de outro usuário (status ${res2.status}). Verifique se isso é intencional.`);
    },
  },

  // ── INPUT ─────────────────────────────────────────────────────────────────

  {
    id: 'INPUT-001',
    name: 'SQL Injection no login',
    category: 'Injeção',
    severity: 'critical',
    async run(base, _ctx) {
      const id = 'INPUT-001'; const n = 'SQL Injection no login'; const c = 'Injeção'; const s: Severity = 'critical';
      const payloads = [
        { email: "' OR '1'='1", password: "' OR '1'='1" },
        { email: "admin'--", password: 'anything' },
        { email: "'; DROP TABLE users;--", password: 'x' },
      ];
      for (const body of payloads) {
        const res = await hit(base, '/api/auth/login', { method: 'POST', body });
        if (res.status === 200) {
          const data = await res.json().catch(() => ({})) as any;
          if (data.token) return fail(id, n, c, s, `SQL injection bem-sucedido! Payload: ${JSON.stringify(body)}`);
        }
      }
      return pass(id, n, c, s, 'Nenhum payload de SQL injection resultou em autenticação.');
    },
  },

  {
    id: 'INPUT-002',
    name: 'XSS no título do projeto',
    category: 'Injeção',
    severity: 'high',
    async run(base, ctx) {
      const id = 'INPUT-002'; const n = 'XSS no título do projeto'; const c = 'Injeção'; const s: Severity = 'high';
      const xssTitle = '<script>alert("XSS")</script>';
      const res = await hit(base, '/api/lab/projects', { method: 'POST', token: ctx.userToken, body: { title: xssTitle } });
      if (!res.ok) return warn(id, n, c, s, `Não foi possível criar projeto para testar XSS (status ${res.status}).`);
      const proj = await res.json().catch(() => ({})) as any;
      if (proj.title === xssTitle) {
        // XSS stored — but React escapes by default; note as informational
        await hit(base, `/api/lab/projects/${proj.id}`, { method: 'DELETE', token: ctx.userToken });
        return warn(id, n, c, s, 'Payload XSS armazenado sem sanitização no servidor. React escapa no cliente, mas APIs de terceiros podem ser afetadas.', `Título armazenado: ${proj.title}`);
      }
      await hit(base, `/api/lab/projects/${proj.id}`, { method: 'DELETE', token: ctx.userToken }).catch(() => {});
      return pass(id, n, c, s, 'Servidor sanitizou o payload XSS no título.');
    },
  },

  {
    id: 'INPUT-003',
    name: 'Payload gigante (DoS via body size)',
    category: 'Input Validation',
    severity: 'medium',
    async run(base, ctx) {
      const id = 'INPUT-003'; const n = 'Payload gigante (DoS via body size)'; const c = 'Input Validation'; const s: Severity = 'medium';
      const bigTitle = 'A'.repeat(500_000); // 500KB string
      const res = await hit(base, '/api/lab/projects', { method: 'POST', token: ctx.userToken, body: { title: bigTitle } });
      // Express default body parser limit is 100kb
      if (res.status === 413) return pass(id, n, c, s, 'Servidor rejeitou payload de 500KB com 413 Entity Too Large.');
      if (res.status >= 400) return warn(id, n, c, s, `Payload grande rejeitado com ${res.status}, mas não com 413 explícito.`);
      return fail(id, n, c, s, `Servidor aceitou payload de 500KB (status ${res.status}). Sem limite de tamanho configurado.`);
    },
  },

  {
    id: 'INPUT-004',
    name: 'Path traversal no projectId',
    category: 'Injeção',
    severity: 'high',
    async run(base, ctx) {
      const id = 'INPUT-004'; const n = 'Path traversal no projectId'; const c = 'Injeção'; const s: Severity = 'high';
      const payloads = ['../../../etc/passwd', '..%2F..%2Fetc%2Fpasswd', '%00admin'];
      for (const p of payloads) {
        const res = await hit(base, `/api/lab/projects/${p}`, { token: ctx.userToken });
        const body = await res.text().catch(() => '');
        if (body.includes('root:') || body.includes('/bin/bash')) {
          return fail(id, n, c, s, `Path traversal bem-sucedido com payload: ${p}`);
        }
      }
      return pass(id, n, c, s, 'Nenhum payload de path traversal resultou em vazamento de arquivo.');
    },
  },

  // ── RATE LIMIT ────────────────────────────────────────────────────────────

  {
    id: 'RATE-001',
    name: 'Rate limiting global',
    category: 'Rate Limit',
    severity: 'medium',
    async run(base, ctx) {
      const id = 'RATE-001'; const n = 'Rate limiting global'; const c = 'Rate Limit'; const s: Severity = 'medium';
      // Send 12 rapid requests to a rate-limited endpoint
      const results = await Promise.all(
        Array.from({ length: 12 }, () =>
          hit(base, `/api/chats/${crypto.randomUUID()}/messages`, { method: 'POST', token: ctx.userToken, body: { content: 'test' } })
        )
      );
      const hit429 = results.some(r => r.status === 429);
      if (hit429) return pass(id, n, c, s, 'Rate limiter acionado (429) após 12 requisições rápidas.');
      const statuses = results.map(r => r.status).join(', ');
      return warn(id, n, c, s, 'Rate limiter não acionou 429 em 12 req rápidas.', `Status recebidos: ${statuses} — note: o limiter é global, pode ter sido pré-atingido.`);
    },
  },

  // ── CORS / HEADERS ────────────────────────────────────────────────────────

  {
    id: 'CORS-001',
    name: 'CORS aberto para todas as origens',
    category: 'CORS',
    severity: 'medium',
    async run(base, _ctx) {
      const id = 'CORS-001'; const n = 'CORS aberto para todas as origens'; const c = 'CORS'; const s: Severity = 'medium';
      const res = await hit(base, '/api/auth/me', { headers: { Origin: 'https://evil-site.com' } });
      const acao = res.headers.get('access-control-allow-origin');
      if (acao === '*' || acao === 'https://evil-site.com') {
        return warn(id, n, c, s, `CORS permite origem desconhecida: "${acao}". Para produção, restrinja a origens específicas.`);
      }
      return pass(id, n, c, s, `CORS não reflete origem desconhecida (valor: "${acao || 'ausente'}").`);
    },
  },

  {
    id: 'CORS-002',
    name: 'JWT Secret padrão (fallback inseguro)',
    category: 'Configuração',
    severity: 'critical',
    async run(base, _ctx) {
      const id = 'CORS-002'; const n = 'JWT Secret padrão (fallback inseguro)'; const c = 'Configuração'; const s: Severity = 'critical';
      // Try to forge a token with the known fallback secret
      const fallbackSecret = 'fallback_secret_change_me';
      // Simulated HMAC-SHA256 signature with the fallback secret
      const { createHmac } = await import('crypto');
      const header = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
      const payload = Buffer.from('{"id":"hacker","email":"h@x.com","role":"admin","isAdmin":true,"iat":9999999999}').toString('base64url');
      const sig = createHmac('sha256', fallbackSecret).update(`${header}.${payload}`).digest('base64url');
      const forgedToken = `${header}.${payload}.${sig}`;
      const res = await hit(base, '/api/auth/me', { token: forgedToken });
      if (res.status === 200) {
        return fail(id, n, c, s, 'JWT_SECRET usa o valor padrão "fallback_secret_change_me"! Tokens podem ser forjados por qualquer pessoa.', 'Configure JWT_SECRET no .env com um valor aleatório e forte.');
      }
      return pass(id, n, c, s, 'JWT_SECRET não é o valor padrão — token forjado com secret conhecido foi rejeitado.');
    },
  },

  // ── INFO DISCLOSURE ───────────────────────────────────────────────────────

  {
    id: 'INFO-001',
    name: 'Stack trace em erros do servidor',
    category: 'Information Disclosure',
    severity: 'low',
    async run(base, _ctx) {
      const id = 'INFO-001'; const n = 'Stack trace em erros do servidor'; const c = 'Information Disclosure'; const s: Severity = 'low';
      const res = await hit(base, '/api/chats/INVALID_ID_9999/messages', { method: 'POST', body: { content: 'test' } });
      const body = await res.text().catch(() => '');
      if (body.includes('Error:') && body.includes('at ')) {
        return warn(id, n, c, s, 'Resposta de erro contém stack trace — pode expor estrutura interna do servidor.', body.slice(0, 300));
      }
      return pass(id, n, c, s, 'Respostas de erro não expõem stack trace.');
    },
  },

  {
    id: 'INFO-002',
    name: 'Password hash no response de login',
    category: 'Information Disclosure',
    severity: 'high',
    async run(base, ctx) {
      const id = 'INFO-002'; const n = 'Password hash no response de login'; const c = 'Information Disclosure'; const s: Severity = 'high';
      // Try registering a temp user and check if password leaks
      const tempEmail = `sectest_${Date.now()}@example.com`;
      const regRes = await hit(base, '/api/auth/register', {
        method: 'POST',
        body: {
          name: 'SecTest',
          email: tempEmail,
          password: 'Test1234!',
          inviteCode: ctx.inviteCode || 'test_classroom_id_security_runner'
        }
      });
      if (!regRes.ok) return warn(id, n, c, s, 'Não foi possível registrar usuário de teste — pulando verificação de hash.', await regRes.text());
      const regBody = await regRes.json().catch(() => ({})) as any;
      const hasPasswordLeak = regBody?.user?.password || regBody?.password;
      if (hasPasswordLeak) return fail(id, n, c, s, 'Hash de password retornado no response de registro!');
      return pass(id, n, c, s, 'Password não exposto no response de registro/login.');
    },
  },
];
