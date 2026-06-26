/**
 * Per-model request queue with token-bucket semantics.
 *
 * Serialises Lab AI calls by model so a classroom burst doesn't exhaust
 * the API quota. Each model gets its own FIFO queue; requests execute one
 * at a time (concurrency = 1) with a configurable inter-request gap.
 *
 * Fallback chain callers wrap individual model calls with retryWithFallback.
 */

interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

class ModelQueue {
  private readonly queue: QueueItem<unknown>[] = [];
  private running = false;

  // Minimum gap between consecutive requests to this model (ms)
  constructor(private readonly minGapMs: number = 1_000) {}

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

/** Returns (creating if needed) the queue for a given model. */
export function getModelQueue(modelId: string): ModelQueue {
  if (!queues.has(modelId)) {
    // 1-second gap between requests to the same model — keeps RPM well under API limits
    queues.set(modelId, new ModelQueue(1_000));
  }
  return queues.get(modelId)!;
}

/** Current backlog depth for a model (0 if queue doesn't exist yet). */
export function getQueueDepth(modelId: string): number {
  return queues.get(modelId)?.depth ?? 0;
}

// ── Fallback chain helper ────────────────────────────────────────────────────

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
 * Tries each factory in the chain in order.
 * On a retryable error (429 / timeout / 503) it waits with jitter and
 * tries the next model. Non-retryable errors throw immediately.
 * onFallback is called before each retry so callers can log the event.
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
