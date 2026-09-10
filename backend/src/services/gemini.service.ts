/**
 * MEDiKIOSK Backend — Foundation 03: Gemini AI Service
 * Official Google GenAI SDK integration (@google/genai)
 * Provides reusable text generation, connectivity diagnostics, and safe error handling.
 */

import { GoogleGenAI } from '@google/genai';
import { config, isGeminiConfigured } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

import { IAIService, GenerateTextOptions, AIConnectivityResult } from './ai.interface.js';
import { openRouterService } from './openrouter.service.js';

export type { GenerateTextOptions, AIConnectivityResult };

export interface GeminiConnectivityResult extends AIConnectivityResult {
  provider: 'gemini';
}

export class GeminiService implements IAIService {
  public readonly providerName = 'gemini';
  private client: GoogleGenAI | null = null;
  private mockFailure: 'RATE_LIMIT_429' | 'UNAVAILABLE_503' | 'VALIDATION_ERROR' | null = null;

  /**
   * Sets mock failure mode for unit and integration testing.
   */
  public setMockFailure(failure: 'RATE_LIMIT_429' | 'UNAVAILABLE_503' | 'VALIDATION_ERROR' | null): void {
    this.mockFailure = failure;
  }

  /**
   * Safe getter for GoogleGenAI client.
   * Lazily initialized to avoid crashing at startup if the key is not yet provided.
   */
  private getClient(): GoogleGenAI {
    if (!isGeminiConfigured()) {
      throw new AppError('Gemini API key is not configured.', 500, 'GEMINI_API_KEY_MISSING');
    }

    if (!this.client) {
      this.client = new GoogleGenAI({
        apiKey: config.GEMINI_API_KEY
      });
    }

    return this.client;
  }

  /**
   * Enforces a maximum execution time on asynchronous external service calls
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new AppError(`${operationName} timed out after ${timeoutMs}ms.`, 504, 'GEMINI_TIMEOUT'));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Strips any potential API key or authorization tokens from error messages
   */
  public sanitizeError(rawMessage: string): string {
    let sanitized = rawMessage;
    if (config.GEMINI_API_KEY && config.GEMINI_API_KEY.length > 4) {
      sanitized = sanitized.split(config.GEMINI_API_KEY).join('[REDACTED_API_KEY]');
    }
    if (config.OPENROUTER_API_KEY && config.OPENROUTER_API_KEY.length > 4) {
      sanitized = sanitized.split(config.OPENROUTER_API_KEY).join('[REDACTED_API_KEY]');
    }
    // Redact query parameter keys or bearer tokens if present in URL/message
    sanitized = sanitized.replace(/sk-or-v1-[a-zA-Z0-9_\-]+/gi, 'sk-or-v1-[REDACTED]');
    sanitized = sanitized.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]');
    sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
    return sanitized;
  }

  /**
   * Parses error from Google GenAI SDK, AppError, or network failure.
   * Accurately detects HTTP 429 / 503 status codes and quota / rate-limit phrases.
   */
  public parseGeminiError(error: unknown): { isRateLimit: boolean; isUnavailable: boolean; statusCode?: number; rawMessage: string } {
    const rawMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
    const lower = rawMessage.toLowerCase();

    // Extract any numeric status from error object properties (SDK ApiError has .status property)
    const anyErr = error as any;
    const status = anyErr?.status || anyErr?.statusCode || anyErr?.code || anyErr?.response?.status || anyErr?.error?.code;
    const numericStatus = typeof status === 'number' ? status : (typeof status === 'string' && /^\d{3}$/.test(status) ? parseInt(status, 10) : undefined);

    const isRateLimit =
      numericStatus === 429 ||
      lower.includes('429') ||
      lower.includes('resource_exhausted') ||
      lower.includes('resource has been exhausted') ||
      lower.includes('rate limit') ||
      lower.includes('rate-limit') ||
      lower.includes('ratelimit') ||
      lower.includes('quota') ||
      lower.includes('too many requests') ||
      lower.includes('exceeded your current quota');

    const isUnavailable =
      numericStatus === 503 ||
      numericStatus === 502 ||
      numericStatus === 504 ||
      lower.includes('503') ||
      lower.includes('unavailable') ||
      lower.includes('high demand') ||
      lower.includes('overloaded') ||
      lower.includes('temporarily unavailable');

    return { isRateLimit, isUnavailable, statusCode: numericStatus, rawMessage };
  }

  /**
   * Determines whether an error is a retryable rate-limit or service availability error (429/503).
   * Validation errors (400), authentication errors (401), and malformed output errors are NOT retryable.
   */
  public isRetryableError(error: unknown): boolean {
    if (error instanceof AppError) {
      if (
        error.errorCode === 'GEMINI_RATE_LIMIT' ||
        error.errorCode === 'GEMINI_UNAVAILABLE' ||
        error.statusCode === 429 ||
        error.statusCode === 503
      ) {
        return true;
      }
      // Check if wrapped GEMINI_API_ERROR or other AppError contains rate limit or availability signals
      const lower = error.message.toLowerCase();
      return (
        lower.includes('429') ||
        lower.includes('resource_exhausted') ||
        lower.includes('resource has been exhausted') ||
        lower.includes('rate limit') ||
        lower.includes('rate-limit') ||
        lower.includes('ratelimit') ||
        lower.includes('quota') ||
        lower.includes('too many requests') ||
        lower.includes('exceeded your current quota') ||
        lower.includes('503') ||
        lower.includes('unavailable') ||
        lower.includes('high demand') ||
        lower.includes('overloaded')
      );
    }

    const { isRateLimit, isUnavailable } = this.parseGeminiError(error);
    return isRateLimit || isUnavailable;
  }

  /**
   * Returns true if a real, non-placeholder Gemini API key is configured
   */
  public isConfigured(): boolean {
    return isGeminiConfigured();
  }

  /**
   * Returns the currently configured Gemini model name
   */
  public getModel(): string {
    return config.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Executes Gemini text generation directly without fallback.
   */
  private async executeGeminiGenerateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    if (this.mockFailure === 'RATE_LIMIT_429') {
      throw new AppError('Gemini API rate limit exceeded. Please retry later.', 429, 'GEMINI_RATE_LIMIT');
    }
    if (this.mockFailure === 'UNAVAILABLE_503') {
      throw new AppError('Gemini API is temporarily experiencing high demand. Please retry shortly.', 503, 'GEMINI_UNAVAILABLE');
    }
    if (this.mockFailure === 'VALIDATION_ERROR') {
      throw new AppError('Validation failure: Clinical parameter invalid.', 400, 'CLINICAL_VALIDATION_ERROR');
    }

    const ai = this.getClient();
    const model = options.model || this.getModel();

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        logger.info('Invoking Gemini API generateText...', {
          model,
          promptLength: prompt.length,
          attempt: attempts
        });

        const timeoutMs = options.timeoutMs || Number(process.env.GEMINI_TIMEOUT_MS) || 45000;
        const response = await this.withTimeout(
          ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction: options.systemInstruction,
              temperature: options.temperature,
              maxOutputTokens: options.maxOutputTokens
            }
          }),
          timeoutMs,
          'Gemini generateText'
        );

        const text = response.text ?? '';
        if (!text && response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          const parts = candidate.content?.parts ?? [];
          const combined = parts.map((p) => ('text' in p ? p.text : '')).join('');
          return combined.trim();
        }

        return text.trim();
      } catch (error) {
        if (error instanceof AppError && error.errorCode === 'GEMINI_TIMEOUT') {
          throw error;
        }

        const { isRateLimit, isUnavailable, rawMessage } = this.parseGeminiError(error);
        const sanitized = this.sanitizeError(rawMessage);

        const isTransient = isUnavailable;
        if (isTransient && attempts < maxAttempts) {
          logger.warn(`Gemini transient 503 detected, retrying in 1200ms (attempt ${attempts}/${maxAttempts})...`);
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }

        logger.error('Gemini API request failed', {
          model,
          error: sanitized
        });

        if (rawMessage.toLowerCase().includes('api key not valid') || rawMessage.toLowerCase().includes('api_key_invalid')) {
          throw new AppError('Gemini API authentication failed: Invalid API key.', 401, 'GEMINI_AUTH_FAILED');
        }

        if (isRateLimit) {
          throw new AppError('Gemini API rate limit exceeded. Please retry later.', 429, 'GEMINI_RATE_LIMIT');
        }

        if (isUnavailable) {
          throw new AppError('Gemini API is temporarily experiencing high demand. Please retry shortly.', 503, 'GEMINI_UNAVAILABLE');
        }

        if (rawMessage.toLowerCase().includes('model_not_found') || rawMessage.toLowerCase().includes('not found')) {
          throw new AppError(`Gemini model '${model}' is unavailable or not found.`, 502, 'GEMINI_MODEL_UNAVAILABLE');
        }

        throw new AppError(`Gemini API error: ${sanitized}`, 502, 'GEMINI_API_ERROR');
      }
    }

    throw new AppError('Gemini API request failed after retries.', 503, 'GEMINI_UNAVAILABLE');
  }

  /**
   * Generates text from prompt using Gemini as the primary provider.
   * On retryable rate-limit or API availability errors (429/503), automatically falls back to OpenRouter.
   */
  public async generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new AppError('Prompt must be a non-empty string.', 400, 'INVALID_PROMPT');
    }

    logger.info('AI generateText request initiated', {
      selectedProvider: 'gemini',
      model: options.model || this.getModel(),
      promptLength: prompt.length
    });

    try {
      const result = await this.executeGeminiGenerateText(prompt, options);
      logger.info('AI generateText completed via primary provider', {
        selectedProvider: 'gemini',
        geminiResponseStatus: 200,
        fallbackTriggered: false,
        openRouterRequestStarted: false,
        openRouterResponseStatus: null,
        finalProvider: 'gemini',
        finalResult: 'success'
      });
      return result;
    } catch (geminiError) {
      const { isRateLimit, isUnavailable, statusCode } = this.parseGeminiError(geminiError);
      const geminiStatus =
        geminiError instanceof AppError
          ? geminiError.statusCode
          : (statusCode || (isRateLimit ? 429 : isUnavailable ? 503 : 502));

      const isRetryable = this.isRetryableError(geminiError);
      const fallbackTriggered = isRetryable && openRouterService.isConfigured();

      logger.warn('Primary AI provider (Gemini) generateText failed', {
        selectedProvider: 'gemini',
        geminiResponseStatus: null,
        geminiErrorStatus: geminiStatus,
        fallbackTriggered,
        reason: geminiError instanceof Error ? this.sanitizeError(geminiError.message) : 'Unknown error'
      });

      if (fallbackTriggered) {
        logger.info('Starting OpenRouter fallback request for generateText', {
          selectedProvider: 'gemini',
          geminiErrorStatus: geminiStatus,
          fallbackTriggered: true,
          openRouterRequestStarted: true,
          openRouterModel: openRouterService.getModel()
        });

        try {
          const result = await openRouterService.generateText(prompt, options);
          logger.info('AI generateText completed via OpenRouter fallback', {
            selectedProvider: 'gemini',
            geminiErrorStatus: geminiStatus,
            fallbackTriggered: true,
            openRouterRequestStarted: true,
            openRouterResponseStatus: 200,
            finalProvider: 'openrouter',
            finalResult: 'success'
          });
          return result;
        } catch (openRouterError) {
          const openRouterStatus =
            openRouterError instanceof AppError
              ? openRouterError.statusCode
              : 502;

          const geminiMsg = geminiError instanceof Error ? this.sanitizeError(geminiError.message) : 'Gemini unavailable';
          const openRouterMsg = openRouterError instanceof Error ? openRouterService.sanitizeError(openRouterError.message) : 'OpenRouter unavailable';

          logger.error('Both primary and fallback AI providers failed for generateText', {
            selectedProvider: 'gemini',
            geminiErrorStatus: geminiStatus,
            fallbackTriggered: true,
            openRouterRequestStarted: true,
            openRouterResponseStatus: openRouterStatus,
            finalProvider: 'none',
            finalResult: 'failed'
          });

          throw new AppError(
            `AI service unavailable: Primary provider (Gemini: ${geminiMsg}) and fallback provider (OpenRouter: ${openRouterMsg}) both failed.`,
            503,
            'AI_FALLBACK_FAILED'
          );
        }
      }

      logger.warn('AI fallback not triggered for generateText', {
        selectedProvider: 'gemini',
        geminiErrorStatus: geminiStatus,
        fallbackTriggered: false,
        openRouterRequestStarted: false,
        openRouterResponseStatus: null,
        finalProvider: 'gemini',
        finalResult: 'failed'
      });

      throw geminiError;
    }
  }

  /**
   * Executes Gemini structured JSON generation directly without fallback.
   */
  private async executeGeminiStructuredJson<T>(prompt: string, options: GenerateTextOptions = {}): Promise<T> {
    if (this.mockFailure === 'RATE_LIMIT_429') {
      throw new AppError('Gemini API rate limit exceeded. Please retry later.', 429, 'GEMINI_RATE_LIMIT');
    }
    if (this.mockFailure === 'UNAVAILABLE_503') {
      throw new AppError('Gemini API is temporarily experiencing high demand. Please retry shortly.', 503, 'GEMINI_UNAVAILABLE');
    }
    if (this.mockFailure === 'VALIDATION_ERROR') {
      throw new AppError('Validation failure: Clinical parameter invalid.', 400, 'CLINICAL_VALIDATION_ERROR');
    }

    const ai = this.getClient();
    const model = options.model || this.getModel();

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        logger.info('Invoking Gemini API generateStructuredJson...', {
          model,
          promptLength: prompt.length,
          attempt: attempts
        });

        const timeoutMs = options.timeoutMs || Number(process.env.GEMINI_TIMEOUT_MS) || 45000;
        const response = await this.withTimeout(
          ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction: options.systemInstruction,
              temperature: options.temperature,
              maxOutputTokens: options.maxOutputTokens,
              responseMimeType: 'application/json'
            }
          }),
          timeoutMs,
          'Gemini generateStructuredJson'
        );

        let text = (response.text ?? '').trim();
        if (!text && response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          const parts = candidate.content?.parts ?? [];
          text = parts.map((p) => ('text' in p ? p.text : '')).join('').trim();
        }

        if (!text) {
          throw new AppError('Empty response received from Gemini.', 502, 'GEMINI_EMPTY_RESPONSE');
        }

        // Strip leading and trailing markdown fences if present
        if (text.startsWith('```')) {
          text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }

        try {
          return JSON.parse(text) as T;
        } catch (jsonErr) {
          logger.error('Failed to parse Gemini JSON output', {
            snippet: text.slice(0, 200)
          });
          throw new AppError('Malformed JSON output from Gemini.', 502, 'GEMINI_MALFORMED_OUTPUT');
        }
      } catch (error) {
        if (error instanceof AppError && (error.errorCode === 'GEMINI_MALFORMED_OUTPUT' || error.errorCode === 'GEMINI_TIMEOUT')) {
          throw error;
        }

        const { isRateLimit, isUnavailable, rawMessage } = this.parseGeminiError(error);
        const sanitized = this.sanitizeError(rawMessage);

        const isTransient = isUnavailable;
        if (isTransient && attempts < maxAttempts) {
          logger.warn(`Gemini transient 503 in JSON call, retrying in 1200ms (attempt ${attempts}/${maxAttempts})...`);
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }

        logger.error('Gemini structured JSON request failed', {
          model,
          error: sanitized
        });

        if (rawMessage.toLowerCase().includes('api key not valid') || rawMessage.toLowerCase().includes('api_key_invalid')) {
          throw new AppError('Gemini API authentication failed: Invalid API key.', 401, 'GEMINI_AUTH_FAILED');
        }

        if (isRateLimit) {
          throw new AppError('Gemini API rate limit exceeded. Please retry later.', 429, 'GEMINI_RATE_LIMIT');
        }

        if (isUnavailable) {
          throw new AppError('Gemini API is temporarily experiencing high demand. Please retry shortly.', 503, 'GEMINI_UNAVAILABLE');
        }

        if (rawMessage.toLowerCase().includes('model_not_found') || rawMessage.toLowerCase().includes('not found')) {
          throw new AppError(`Gemini model '${model}' is unavailable or not found.`, 502, 'GEMINI_MODEL_UNAVAILABLE');
        }

        throw new AppError(`Gemini API error: ${sanitized}`, 502, 'GEMINI_API_ERROR');
      }
    }

    throw new AppError('Gemini API request failed after retries.', 503, 'GEMINI_UNAVAILABLE');
  }

  /**
   * Generates structured JSON from prompt using Gemini as the primary provider.
   * On retryable rate-limit or API availability errors (429/503), automatically falls back to OpenRouter.
   * Parses and validates JSON before returning. Never generates fake clinical data.
   */
  public async generateStructuredJson<T>(prompt: string, options: GenerateTextOptions = {}): Promise<T> {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new AppError('Prompt must be a non-empty string.', 400, 'INVALID_PROMPT');
    }

    logger.info('AI structured JSON request initiated', {
      selectedProvider: 'gemini',
      model: options.model || this.getModel(),
      promptLength: prompt.length
    });

    try {
      const result = await this.executeGeminiStructuredJson<T>(prompt, options);
      logger.info('AI structured JSON completed via primary provider', {
        selectedProvider: 'gemini',
        geminiResponseStatus: 200,
        fallbackTriggered: false,
        openRouterRequestStarted: false,
        openRouterResponseStatus: null,
        finalProvider: 'gemini',
        finalResult: 'success'
      });
      return result;
    } catch (geminiError) {
      const { isRateLimit, isUnavailable, statusCode } = this.parseGeminiError(geminiError);
      const geminiStatus =
        geminiError instanceof AppError
          ? geminiError.statusCode
          : (statusCode || (isRateLimit ? 429 : isUnavailable ? 503 : 502));

      const isRetryable = this.isRetryableError(geminiError);
      const fallbackTriggered = isRetryable && openRouterService.isConfigured();

      logger.warn('Primary AI provider (Gemini) structured JSON failed', {
        selectedProvider: 'gemini',
        geminiResponseStatus: null,
        geminiErrorStatus: geminiStatus,
        fallbackTriggered,
        reason: geminiError instanceof Error ? this.sanitizeError(geminiError.message) : 'Unknown error'
      });

      // Do not fallback for validation errors, bad prompts, or malformed JSON
      if (fallbackTriggered) {
        logger.info('Starting OpenRouter fallback request for structured JSON', {
          selectedProvider: 'gemini',
          geminiErrorStatus: geminiStatus,
          fallbackTriggered: true,
          openRouterRequestStarted: true,
          openRouterModel: openRouterService.getModel()
        });

        try {
          const result = await openRouterService.generateStructuredJson<T>(prompt, options);
          logger.info('AI structured JSON completed via OpenRouter fallback', {
            selectedProvider: 'gemini',
            geminiErrorStatus: geminiStatus,
            fallbackTriggered: true,
            openRouterRequestStarted: true,
            openRouterResponseStatus: 200,
            finalProvider: 'openrouter',
            finalResult: 'success'
          });
          return result;
        } catch (openRouterError) {
          const openRouterStatus =
            openRouterError instanceof AppError
              ? openRouterError.statusCode
              : 502;

          const geminiMsg = geminiError instanceof Error ? this.sanitizeError(geminiError.message) : 'Gemini unavailable';
          const openRouterMsg = openRouterError instanceof Error ? openRouterService.sanitizeError(openRouterError.message) : 'OpenRouter unavailable';

          logger.error('Both primary and fallback AI providers failed for structured JSON', {
            selectedProvider: 'gemini',
            geminiErrorStatus: geminiStatus,
            fallbackTriggered: true,
            openRouterRequestStarted: true,
            openRouterResponseStatus: openRouterStatus,
            finalProvider: 'none',
            finalResult: 'failed'
          });

          throw new AppError(
            `Clinical AI service unavailable: Primary provider (Gemini: ${geminiMsg}) and fallback provider (OpenRouter: ${openRouterMsg}) both failed.`,
            503,
            'AI_FALLBACK_FAILED'
          );
        }
      }

      logger.warn('AI fallback not triggered for structured JSON', {
        selectedProvider: 'gemini',
        geminiErrorStatus: geminiStatus,
        fallbackTriggered: false,
        openRouterRequestStarted: false,
        openRouterResponseStatus: null,
        finalProvider: 'gemini',
        finalResult: 'failed'
      });

      throw geminiError;
    }
  }

  /**
   * Safe backend-side verification mechanism.
   * Sends a harmless, non-clinical test ping to verify SDK connectivity and model responsiveness.
   */
  public async verifyConnectivity(): Promise<GeminiConnectivityResult> {
    const model = this.getModel();

    if (!this.isConfigured()) {
      return {
        connected: false,
        provider: 'gemini',
        model,
        error: 'Gemini API key is not configured.'
      };
    }

    try {
      const testPrompt = 'Reply with exactly: MEDiKIOSK_GEMINI_OK';
      const response = await this.generateText(testPrompt, {
        temperature: 0.1,
        maxOutputTokens: 50
      });

      const snippet = response.slice(0, 100).trim();

      return {
        connected: true,
        provider: 'gemini',
        model,
        responseSnippet: snippet
      };
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Connectivity check failed';
      const sanitized = this.sanitizeError(rawMessage);

      return {
        connected: false,
        provider: 'gemini',
        model,
        error: sanitized
      };
    }
  }
}

export const geminiService = new GeminiService();
