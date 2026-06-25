/** A single turn in a conversation. */
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

/** Parameters for a chat completion request. */
export interface ChatParams {
  messages: ChatMessage[];
  systemPrompt?: string;
  /** Model ID as stored in ai_models (e.g. 'gemini-2.5-flash', 'gpt-4o-mini'). */
  modelId: string;
  /** Optional base64-encoded image for vision-capable models. */
  imageBase64?: string;
  imageMimeType?: string;
}

/** Token usage and generated text returned by a provider. */
export interface ChatResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /** Tokens served from prompt cache (e.g. Gemini cached content, Anthropic prompt caching). */
  cachedTokens: number;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** Common interface every AI provider adapter must implement. */
export interface AIProvider {
  /** Provider identifier: 'google' | 'anthropic' | 'openai-compatible' */
  id: string;
  chat(params: ChatParams): Promise<ChatResult>;
  validateKey(key: string, baseUrl?: string): Promise<ValidationResult>;
}
