import type { AIProvider, ChatParams, ChatResult, ValidationResult } from './types.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/** Creates an Anthropic provider using the Messages API via fetch (no SDK required). */
export function createAnthropicProvider(apiKey: string): AIProvider {
  return {
    id: 'anthropic',

    async chat({ messages, systemPrompt, modelId }: ChatParams): Promise<ChatResult> {
      const body = {
        model: modelId,
        max_tokens: 8096,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: messages.map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.content,
        })),
      };

      const resp = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as any;
        throw new Error(`Anthropic API error ${resp.status}: ${err?.error?.message ?? resp.statusText}`);
      }

      const data = await resp.json() as any;
      const text = (data.content as any[])?.find(b => b.type === 'text')?.text ?? '';

      return {
        text,
        inputTokens:  data.usage?.input_tokens  ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
        // cache_read_input_tokens is the prompt-caching read count
        cachedTokens: data.usage?.cache_read_input_tokens ?? 0,
      };
    },

    async validateKey(key: string): Promise<ValidationResult> {
      try {
        const resp = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key.trim(),
            'anthropic-version': ANTHROPIC_VERSION,
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ping' }],
          }),
        });

        if (resp.ok) return { ok: true };
        const err = await resp.json().catch(() => ({})) as any;
        return { ok: false, error: err?.error?.message ?? `HTTP ${resp.status}` };
      } catch (err: any) {
        return { ok: false, error: err.message };
      }
    },
  };
}
