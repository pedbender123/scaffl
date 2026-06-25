import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, ChatParams, ChatResult, ValidationResult } from './types.js';

/** Creates a Google Gemini provider backed by the given API key. */
export function createGoogleProvider(apiKey: string): AIProvider {
  return {
    id: 'google',

    async chat({ messages, systemPrompt, modelId, imageBase64, imageMimeType }: ChatParams): Promise<ChatResult> {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel(
        {
          model: modelId,
          ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
        },
        { timeout: 300_000 }
      );

      const contents: any[] = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      // Prepend inline image to the last message when provided
      if (imageBase64 && contents.length > 0) {
        const last = contents[contents.length - 1];
        last.parts.unshift({
          inlineData: { data: imageBase64, mimeType: imageMimeType ?? 'image/jpeg' },
        });
      }

      const result = await model.generateContent({ contents });
      const response = result.response;
      const text = response.text();

      return {
        text,
        inputTokens:  response.usageMetadata?.promptTokenCount     ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? Math.ceil(text.length / 4),
        cachedTokens: (response.usageMetadata as any)?.cachedContentTokenCount ?? 0,
      };
    },

    async validateKey(key: string): Promise<ValidationResult> {
      try {
        const genAI = new GoogleGenerativeAI(key.trim());
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        });
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.message };
      }
    },
  };
}
