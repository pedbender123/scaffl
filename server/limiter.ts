/**
 * Per-model request queue + RPD (requests-per-day) tracking for free-tier models.
 *
 * Free models (Gemma 4 31B / 26B):
 *   - 15 RPM → 4 500 ms minimum gap between requests in the same model queue
 *   - 1 500 RPD → hard daily cap tracked in memory, seeded from quota_metrics on startup
 *
 * Paid models (Gemini Flash, etc.):
 *   - 1 000 ms minimum gap (conservative; API limits are much higher)
 *   - No RPD cap enforced here (handled by spend caps / billing)
 */

import db from './db.js';

// ── Model-specific rate-limit config ─────────────────────────────────────────

interface ModelLimits {
  gapMs: number;        // min ms between consecutive requests in the queue
  rpdLimit: number;     // daily request cap (Infinity = no cap)
}

const FREE_GAP_MS = 4_500;  // 15 RPM = 1 per 4s → +500 ms safety margin
const PAID_GAP_MS = 1_000;

const MODEL_LIMITS: Record<string, ModelLimits> = {
  'gemma-4-31b-it':     { gapMs: FREE_GAP_MS, rpdLimit: 1_500 },
  'gemma-4-26b-a4b-it': { gapMs: FREE_GAP_MS, rpdLimit: 1_500 },
};

function getLimits(modelId: string): ModelLimits {
  return MODEL_LIMITS[modelId] ?? { gapMs: PAID_GAP_MS, rpdLimit: Infinity };
}

// ── RPD in-memory tracker ─────────────────────────────────────────────────────

interface RpdEntry { date: string; count: number }
const rpdCounters = new Map<string, RpdEntry>();
let rpdSeeded = false;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Seeds RPD counters from quota_metrics on first call so server restarts don't reset them. */
function ensureSeeded(): void {
  if (rpdSeeded) return;
  rpdSeeded = true;
  const today = todayIso();
  try {
    const rows = db.prepare(`
      SELECT model, COUNT(*) as cnt
      FROM quota_metrics
      WHERE event = 'request' AND model IS NOT NULL
        AND ts >= datetime('now', 'start of day')
      GROUP BY model
    `).all() as { model: string; cnt: number }[];
    for (const { model, cnt } of rows) {
      rpdCounters.set(model, { date: today, count: cnt });
    }
  } catch {
    // quota_metrics may not exist yet on a fresh install — that's fine
  }
}

export function getRPDCount(modelId: string): number {
  ensureSeeded();
  const today = todayIso();
  const entry = rpdCounters.get(modelId);
  if (!entry || entry.date !== today) return 0;
  return entry.count;
}

export function incrementRPD(modelId: string): void {
  ensureSeeded();
  const today = todayIso();
  const entry = rpdCounters.get(modelId);
  if (!entry || entry.date !== today) {
    rpdCounters.set(modelId, { date: today, count: 1 });
  } else {
    entry.count++;
  }
}

export function isRPDExhausted(modelId: string): boolean {
  const { rpdLimit } = getLimits(modelId);
  if (rpdLimit === Infinity) return false;
  return getRPDCount(modelId) >= rpdLimit;
}

// ── Per-model FIFO queue ──────────────────────────────────────────────────────

interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

class ModelQueue {
  private readonly queue: QueueItem<unknown>[] = [];
  private running = false;

  constructor(private readonly minGapMs: number) {}

  get depth(): number { return this.queue.length; }

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject } as QueueItem<unknown>);
      this.drain();
    });
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        (item.resolve as (v: unknown) => void)(await item.fn());
      } catch (e) {
        item.reject(e);
      }
      if (this.queue.length > 0) {
        await sleep(this.minGapMs);
      }
    }
    this.running = false;
  }
}

const queues = new Map<string, ModelQueue>();

export function getModelQueue(modelId: string): ModelQueue {
  if (!queues.has(modelId)) {
    queues.set(modelId, new ModelQueue(getLimits(modelId).gapMs));
  }
  return queues.get(modelId)!;
}

export function getQueueDepth(modelId: string): number {
  return queues.get(modelId)?.depth ?? 0;
}

// ── Fallback chain helper ─────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function jitter(baseMs: number): number {
  return baseMs + Math.random() * baseMs;
}

function isRetryable(err: unknown): boolean {
  const e = err as any;
  return (
    e?.status === 429 ||
    e?.status === 503 ||
    String(e?.message).includes('429') ||
    String(e?.message).includes('quota') ||
    String(e?.message).includes('RESOURCE_EXHAUSTED') ||
    String(e?.message).toLowerCase().includes('timeout') ||
    e?.code === 'ECONNABORTED' ||
    e?.code === 'ETIMEDOUT'
  );
}

/**
 * Tries each factory in order.
 * On 429 / timeout / 503 it waits with jitter and falls back to the next factory.
 * Non-retryable errors throw immediately.
 */
export async function retryWithFallback<T>(
  factories: Array<() => Promise<T>>,
  onFallback?: (fromIndex: number, err: unknown) => void,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < factories.length; i++) {
    try {
      return await factories[i]();
    } catch (err) {
      lastErr = err;
      if (isRetryable(err) && i < factories.length - 1) {
        onFallback?.(i, err);
        await sleep(jitter(800));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
