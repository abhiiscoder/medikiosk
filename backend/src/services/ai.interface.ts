/**
 * MEDiKIOSK Backend — AI Provider Abstraction Interface
 * Shared contract for AI services (Gemini primary, OpenRouter secondary).
 */

export interface GenerateTextOptions {
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface AIConnectivityResult {
  connected: boolean;
  provider: 'gemini' | 'openrouter' | string;
  model: string;
  responseSnippet?: string;
  error?: string;
}

export interface IAIService {
  readonly providerName: string;
  isConfigured(): boolean;
  getModel(): string;
  generateText(prompt: string, options?: GenerateTextOptions): Promise<string>;
  generateStructuredJson<T>(prompt: string, options?: GenerateTextOptions): Promise<T>;
  verifyConnectivity(): Promise<AIConnectivityResult>;
}
