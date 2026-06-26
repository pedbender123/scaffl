import crypto from 'crypto';
import db from './db.js';

// ── Tier definitions ─────────────────────────────────────────────────────────

type Tier = 'free_nonInst' | 'free_inst' | 'pro_nonInst';

interface TierConfig {
  labDailyLimit: number;
  labWeeklyLimit: number;
  petrusWeeklyCredits: number;
  labTokenLimit: number; // max estimated tokens per Lab request
}

const TIER_CONFIG: Record<Tier, TierConfig> = {
  free_nonInst: { labDailyLimit: 5,  labWeeklyLimit: 20, petrusWeeklyCredits: 100_000, labTokenLimit: 40_000 },
  free_inst:    { labDailyLimit: 10, labWeeklyLimit: 50, petrusWeeklyCredits: 100_000, labTokenLimit: 60_000 },
  pro_nonInst:  { labDailyLimit: 15, labWeeklyLimit: 50, petrusWeeklyCredits: 1_000_000, labTokenLimit: 80_000 },
};

export type { Tier, TierConfig };
export { TIER_CONFIG };

// ── Date helpers ─────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function weekStartIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  // Align to Monday (ISO week start)
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// ── Tier resolution ──────────────────────────────────────────────────────────

export function getUserTier(userId: string): Tier {
  const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(userId) as { plan: string } | undefined;
  const plan = user?.plan ?? 'free';
  const hasInst = !!db.prepare('SELECT 1 FROM user_institutions WHERE userId = ? LIMIT 1').get(userId);
  if (plan === 'pro' && !hasInst) return 'pro_nonInst';
  if (hasInst) return 'free_inst';
  return 'free_nonInst';
}

// ── Quota check result ───────────────────────────────────────────────────────

export interface QuotaResult {
  allowed: boolean;
  reason?: string;
  tier: Tier;
  config: TierConfig;
}

// ── Lab quota (per-request daily + weekly) ───────────────────────────────────

export function checkLabQuota(userId: string): QuotaResult {
  const tier = getUserTier(userId);
  const cfg = TIER_CONFIG[tier];
  const today = todayIso();
  const week = weekStartIso();

  const user = db.prepare(
    'SELECT lab_req_today, lab_req_today_reset, lab_req_week, lab_req_week_reset FROM users WHERE id = ?'
  ).get(userId) as any;

  const reqToday = user?.lab_req_today_reset === today ? (user?.lab_req_today ?? 0) : 0;
  const reqWeek  = user?.lab_req_week_reset  === week  ? (user?.lab_req_week  ?? 0) : 0;

  if (reqToday >= cfg.labDailyLimit) {
    logQuotaEvent({ userId, surface: 'lab', event: 'limit_hit' });
    return { allowed: false, reason: `Limite diário de ${cfg.labDailyLimit} requisições no Lab atingido. Tente amanhã.`, tier, config: cfg };
  }
  if (reqWeek >= cfg.labWeeklyLimit) {
    logQuotaEvent({ userId, surface: 'lab', event: 'limit_hit' });
    return { allowed: false, reason: `Limite semanal de ${cfg.labWeeklyLimit} requisições no Lab atingido.`, tier, config: cfg };
  }

  return { allowed: true, tier, config: cfg };
}

export function recordLabRequest(userId: string): void {
  const today = todayIso();
  const week = weekStartIso();

  const user = db.prepare(
    'SELECT lab_req_today, lab_req_today_reset, lab_req_week, lab_req_week_reset FROM users WHERE id = ?'
  ).get(userId) as any;

  const reqToday = user?.lab_req_today_reset === today ? (user?.lab_req_today ?? 0) : 0;
  const reqWeek  = user?.lab_req_week_reset  === week  ? (user?.lab_req_week  ?? 0) : 0;

  db.prepare(`
    UPDATE users SET
      lab_req_today       = ?,
      lab_req_today_reset = ?,
      lab_req_week        = ?,
      lab_req_week_reset  = ?
    WHERE id = ?
  `).run(reqToday + 1, today, reqWeek + 1, week, userId);

  logQuotaEvent({ userId, surface: 'lab', event: 'request' });
}

// ── Petrus quota (weekly credits) ────────────────────────────────────────────

export function checkPetrusQuota(userId: string): QuotaResult {
  const tier = getUserTier(userId);
  const cfg = TIER_CONFIG[tier];
  const week = weekStartIso();

  const user = db.prepare(
    'SELECT petrus_credits_week, petrus_credits_week_reset FROM users WHERE id = ?'
  ).get(userId) as any;

  const creditsWeek = user?.petrus_credits_week_reset === week
    ? (user?.petrus_credits_week ?? 0)
    : 0;

  if (creditsWeek >= cfg.petrusWeeklyCredits) {
    const label = cfg.petrusWeeklyCredits >= 1_000_000 ? '1M' : '100k';
    logQuotaEvent({ userId, surface: 'petrus', event: 'limit_hit' });
    return { allowed: false, reason: `Limite semanal de ${label} créditos do Petrus atingido.`, tier, config: cfg };
  }

  return { allowed: true, tier, config: cfg };
}

export function recordPetrusCredits(userId: string, credits: number): void {
  const week = weekStartIso();
  const user = db.prepare(
    'SELECT petrus_credits_week, petrus_credits_week_reset FROM users WHERE id = ?'
  ).get(userId) as any;

  const creditsWeek = user?.petrus_credits_week_reset === week
    ? (user?.petrus_credits_week ?? 0)
    : 0;

  db.prepare(`
    UPDATE users SET petrus_credits_week = ?, petrus_credits_week_reset = ? WHERE id = ?
  `).run(creditsWeek + credits, week, userId);
}

// ── Instrumentation ──────────────────────────────────────────────────────────

export type QuotaEvent = 'request' | '429' | 'spill' | 'limit_hit' | 'queued' | 'fallback';

export function logQuotaEvent(params: {
  userId?: string;
  surface: 'lab' | 'petrus';
  event: QuotaEvent;
  model?: string;
  credits?: number;
}): void {
  try {
    db.prepare(`
      INSERT INTO quota_metrics (id, surface, event, model, userId, credits)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      params.surface,
      params.event,
      params.model ?? null,
      params.userId ?? null,
      params.credits ?? 0,
    );
  } catch {
    // Metrics are best-effort — never block a request over a logging failure
  }
}

// ── Admin: quota summary for a user ─────────────────────────────────────────

export interface QuotaSummary {
  tier: Tier;
  lab: {
    today: number;
    dailyLimit: number;
    week: number;
    weeklyLimit: number;
  };
  petrus: {
    creditsWeek: number;
    weeklyLimit: number;
  };
}

export function getQuotaSummary(userId: string): QuotaSummary {
  const tier = getUserTier(userId);
  const cfg = TIER_CONFIG[tier];
  const today = todayIso();
  const week = weekStartIso();

  const user = db.prepare(`
    SELECT lab_req_today, lab_req_today_reset, lab_req_week, lab_req_week_reset,
           petrus_credits_week, petrus_credits_week_reset
    FROM users WHERE id = ?
  `).get(userId) as any;

  return {
    tier,
    lab: {
      today:      user?.lab_req_today_reset === today ? (user?.lab_req_today ?? 0) : 0,
      dailyLimit: cfg.labDailyLimit,
      week:       user?.lab_req_week_reset  === week  ? (user?.lab_req_week  ?? 0) : 0,
      weeklyLimit: cfg.labWeeklyLimit,
    },
    petrus: {
      creditsWeek: user?.petrus_credits_week_reset === week ? (user?.petrus_credits_week ?? 0) : 0,
      weeklyLimit: cfg.petrusWeeklyCredits,
    },
  };
}
