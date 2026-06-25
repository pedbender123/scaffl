import OpenAI from 'openai';
import type { AIProvider, ChatParams, ChatResult, ValidationResult } from './types.js';

/**
 * Creates an OpenAI-compatible provider.
 * Works with OpenAI, xAI/Grok, DeepSeek, Qwen (DashScope), Mistral, OpenRouter,
 * or any local endpoint (Ollama, vLLM) that exposes the OpenAI chat completions API.
 */
export function createOpenAICompatibleProvider(
  apiKey: string,
  baseUrl: string = 'https://api.openai.com/v1'
): AIProvider {
  return {
    id: 'openai-compatible',

    async chat({ messages, systemPrompt, modelId, imageBase64 }: ChatParams): Promise<ChatResult> {
      if (imageBase64) {
        console.warn('[openai-compatible] Vision input is not supported in this adapter yet.');
      }

      const client = new OpenAI({ apiKey, baseURL: baseUrl });
      const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
      for (const m of messages) {
        msgs.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content });
      }

      const completion = await client.chat.completions.create({
        model: modelId,
        messages: msgs,
        temperature: 0.7,
      });

      const text = completion.choices[0]?.message?.content ?? '';
      const usage = completion.usage;
      const cachedTokens = (usage as any)?.prompt_tokens_details?.cached_tokens ?? 0;

      return {
        text,
        inputTokens:  usage?.prompt_tokens     ?? Math.ceil(messages.map(m => m.content).join('').length / 4),
        outputTokens: usage?.completion_tokens ?? Math.ceil(text.length / 4),
        cachedTokens,
      };
    },

    async validateKey(key: string, baseUrl?: string): Promise<ValidationResult> {
      try {
        const client = new OpenAI({
          apiKey: key.trim(),
          baseURL: baseUrl ?? 'https://api.openai.com/v1',
        });
        await client.models.list();
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.message };
      }
    },
  };
}
