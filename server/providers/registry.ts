import db from '../db.js';
import { decryptSecret } from '../crypto/secrets.js';
import { createGoogleProvider } from './google.js';
import { createOpenAICompatibleProvider } from './openaiCompatible.js';
import { createAnthropicProvider } from './anthropic.js';
import type { AIProvider } from './types.js';

// ── Key cache ────────────────────────────────────────────────────────────────

interface CachedKey { key: string; baseUrl?: string; expiresAt: number }
const keyCache = new Map<string, CachedKey>();
const CACHE_TTL_MS = 60_000;

/** Evicts the cached key for a provider (call after saving new credentials). */
export function invalidateKeyCache(provider: string): void {
  keyCache.delete(provider);
}

/**
 * Returns the active API key for a provider.
 * Priority: provider_credentials DB table → process.env fallback (dev only).
 * Throws a descriptive error if no credentials are found.
 */
export function getActiveKey(provider: string): { key: string; baseUrl?: string } {
  const cached = keyCache.get(provider);
  if (cached && cached.expiresAt > Date.now()) {
    return { key: cached.key, baseUrl: cached.baseUrl };
  }

  const row = db.prepare(
    'SELECT encrypted_key, iv, auth_tag, base_url FROM provider_credentials WHERE provider = ?'
  ).get(provider) as any;

  if (row) {
    const key = decryptSecret({
      encrypted: row.encrypted_key,
      iv:        row.iv,
      authTag:   row.auth_tag,
    });
    const result = { key, baseUrl: row.base_url ?? undefined };
    keyCache.set(provider, { ...result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  const envResult = getKeyFromEnv(provider);
  if (envResult) return envResult;

  throw new Error(
    `No credentials configured for provider "${provider}". ` +
    'Set them in Admin → Inteligência Artificial or via environment variables.'
  );
}

function getKeyFromEnv(provider: string): { key: string; baseUrl?: string } | null {
  switch (provider) {
    case 'google': {
      const k = process.env.GEMINI_API_KEY?.trim();
      return k ? { key: k } : null;
    }
    case 'anthropic': {
      const k = process.env.ANTHROPIC_API_KEY?.trim();
      return k ? { key: k } : null;
    }
    case 'openai-compatible': {
      const k = process.env.OPENAI_API_KEY?.trim();
      return k ? { key: k, baseUrl: process.env.OPENAI_BASE_URL } : null;
    }
    default:
      return null;
  }
}

// ── Provider factory ─────────────────────────────────────────────────────────

function buildProvider(providerId: string, key: string, baseUrl?: string): AIProvider {
  switch (providerId) {
    case 'google':    return createGoogleProvider(key);
    case 'anthropic': return createAnthropicProvider(key);
    default:          return createOpenAICompatibleProvider(key, baseUrl);
  }
}

/**
 * Returns an AIProvider instance for the given model ID.
 * Looks up the model in ai_models to determine the provider, then retrieves credentials.
 */
export function getProvider(modelId: string): AIProvider {
  const model = getModelInfo(modelId);
  if (!model) throw new Error(`Model "${modelId}" not found in the model registry.`);
  const { key, baseUrl } = getActiveKey(model.provider);
  return buildProvider(model.provider, key, baseUrl);
}

/**
 * Returns an AIProvider instance for the given provider ID directly.
 * Useful when you have the provider ID without going through a model lookup.
 */
export function getProviderById(providerId: string): AIProvider {
  const { key, baseUrl } = getActiveKey(providerId);
  return buildProvider(providerId, key, baseUrl);
}

// ── Model registry ───────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  provider: string;
  displayName: string;
  inputCostPer1m: number;
  inputCachedCostPer1m: number;
  outputCostPer1m: number;
  currency: string;
  isDefault: boolean;
  enabled: boolean;
}

function rowToModelInfo(row: any): ModelInfo {
  return {
    id:                   row.id,
    provider:             row.provider,
    displayName:          row.display_name,
    inputCostPer1m:       row.input_cost_per_1m        ?? 0,
    inputCachedCostPer1m: row.input_cached_cost_per_1m ?? 0,
    outputCostPer1m:      row.output_cost_per_1m       ?? 0,
    currency:             row.currency ?? 'BRL',
    isDefault:            !!row.is_default,
    enabled:              !!row.enabled,
  };
}

export function getModelInfo(modelId: string): ModelInfo | null {
  const row = db.prepare('SELECT * FROM ai_models WHERE id = ?').get(modelId) as any;
  return row ? rowToModelInfo(row) : null;
}

export function getDefaultModel(): ModelInfo | null {
  const row = db.prepare(
    'SELECT * FROM ai_models WHERE is_default = 1 AND enabled = 1 LIMIT 1'
  ).get() as any;
  return row ? rowToModelInfo(row) : null;
}

export function listEnabledModels(): ModelInfo[] {
  const rows = db.prepare('SELECT * FROM ai_models WHERE enabled = 1 ORDER BY is_default DESC, id ASC').all() as any[];
  return rows.map(rowToModelInfo);
}

// ── Credit calculation ───────────────────────────────────────────────────────

/**
 * Calculates credits from token usage using costs stored in ai_models.
 *
 * Formula: credits = tokens × cost_per_1m
 * Rationale: 1 credit = 1 currency_unit / 1_000_000, so cost_per_1m (e.g. 1.65 BRL/M)
 * means N tokens = N × 1.65 credits — numerically equivalent to the old FLASH_RATE / 1_000_000 approach.
 */
export function calcCredits(
  modelId: string,
  inputTokens: number,
  cachedTokens: number,
  outputTokens: number
): number {
  const model = getModelInfo(modelId);
  if (!model) {
    console.warn(`[registry] calcCredits: model "${modelId}" not in registry — charging 0.`);
    return 0;
  }
  const normalInput = Math.max(0, inputTokens - cachedTokens);
  return Math.ceil(
    normalInput  * model.inputCostPer1m +
    cachedTokens * model.inputCachedCostPer1m +
    outputTokens * model.outputCostPer1m
  );
}
