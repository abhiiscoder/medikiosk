/**
 * MEDiKIOSK Backend — Secondary AI Provider: OpenRouter Service
 * Implements IAIService abstraction using OpenRouter REST API.
 * Supports arbitrary OpenRouter models, connectivity checks, and structured clinical extraction.
 *
 * STRICT CLINICAL INTEGRITY & SECURITY:
 * 1. Never exposes OPENROUTER_API_KEY, tokens, or bearer headers in errors/logs.
 * 2. Never generates fake clinical data if external calls fail or response is malformed.
 * 3. Enforces strict JSON extraction and validates against clinical schemas.
 */

import { config, isOpenRouterConfigured } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { IAIService, GenerateTextOptions, AIConnectivityResult } from './ai.interface.js';
import { geminiExtractionSchema, GeminiExtractionOutput } from '../validators/conversation.validator.js';

export interface OpenRouterConnectivityResult extends AIConnectivityResult {
  provider: 'openrouter';
}

export class OpenRouterService implements IAIService {
  public readonly providerName = 'openrouter';
  private readonly baseUrl: string;
  private mockFailure: 'RATE_LIMIT_429' | 'UNAVAILABLE_503' | null = null;

  constructor(baseUrl = 'https://openrouter.ai/api/v1/chat/completions') {
    this.baseUrl = baseUrl;
  }

  /**
   * Sets mock failure mode for unit and integration testing.
   */
  public setMockFailure(failure: 'RATE_LIMIT_429' | 'UNAVAILABLE_503' | null): void {
    this.mockFailure = failure;
  }

  /**
   * Returns true if a real, non-placeholder OpenRouter API key is configured.
   */
  public isConfigured(): boolean {
    return isOpenRouterConfigured();
  }

  /**
   * Returns the configured OpenRouter model name (defaults to 'openrouter/free').
   */
  public getModel(): string {
    return config.OPENROUTER_MODEL || 'openrouter/free';
  }

  /**
   * Enforces a maximum execution time on external API calls.
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new AppError(`${operationName} timed out after ${timeoutMs}ms.`, 504, 'OPENROUTER_TIMEOUT'));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Strips API keys, bearer tokens, or secrets from error messages and logs.
   */
  public sanitizeError(rawMessage: string): string {
    let sanitized = rawMessage;
    const apiKey = config.OPENROUTER_API_KEY;
    if (apiKey && apiKey.length > 4) {
      sanitized = sanitized.split(apiKey).join('[REDACTED_API_KEY]');
    }
    const geminiKey = config.GEMINI_API_KEY;
    if (geminiKey && geminiKey.length > 4) {
      sanitized = sanitized.split(geminiKey).join('[REDACTED_API_KEY]');
    }
    sanitized = sanitized.replace(/sk-or-v1-[a-zA-Z0-9_\-]+/gi, 'sk-or-v1-[REDACTED]');
    sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
    sanitized = sanitized.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]');
    return sanitized;
  }

  /**
   * Robust JSON extraction from text that may contain markdown code fences or conversational text.
   */
  private extractJsonString(rawText: string): string {
    let text = rawText.trim();

    // 1. Strip markdown code fences if wrapped in ```json ... ``` or ``` ... ```
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    // 2. If it directly parses, return
    try {
      JSON.parse(text);
      return text;
    } catch {
      // Continue to heuristic boundary extraction
    }

    // 3. Find first outer '{' and matching last '}'
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.substring(firstBrace, lastBrace + 1).trim();
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        // Fall through
      }
    }

    // 4. Find first outer '[' and matching last ']'
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const candidate = text.substring(firstBracket, lastBracket + 1).trim();
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        // Fall through
      }
    }

    return text;
  }

  /**
   * Internal HTTP execution against OpenRouter API with retry and timeout handling.
   */
  private async executeChatCompletion(
    messages: Array<{ role: string; content: string }>,
    options: GenerateTextOptions,
    jsonMode = false
  ): Promise<string> {
    if (this.mockFailure === 'RATE_LIMIT_429') {
      throw new AppError('OpenRouter API rate limit exceeded. Please retry later.', 429, 'OPENROUTER_RATE_LIMIT');
    }
    if (this.mockFailure === 'UNAVAILABLE_503') {
      throw new AppError('OpenRouter API is temporarily unavailable.', 503, 'OPENROUTER_UNAVAILABLE');
    }

    if (!this.isConfigured()) {
      throw new AppError('OpenRouter API key is not configured.', 500, 'OPENROUTER_API_KEY_MISSING');
    }

    const model = options.model || this.getModel();
    const timeoutMs = options.timeoutMs || Number(process.env.OPENROUTER_TIMEOUT_MS) || 45000;
    const maxAttempts = 3;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        logger.info('Invoking OpenRouter API chat completion...', {
          model,
          messageCount: messages.length,
          attempt: attempts,
          jsonMode
        });

        const requestBody: Record<string, unknown> = {
          model,
          messages,
          temperature: options.temperature ?? 0.2
        };

        if (options.maxOutputTokens) {
          requestBody.max_tokens = options.maxOutputTokens;
        }

        if (jsonMode) {
          requestBody.response_format = { type: 'json_object' };
        }

        const fetchPromise = (async () => {
          const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
              'HTTP-Referer': config.CORS_ORIGIN || 'http://localhost:5000',
              'X-Title': 'MEDiKIOSK'
            },
            body: JSON.stringify(requestBody)
          });

          const responseText = await response.text();

          let data: any;
          try {
            data = JSON.parse(responseText);
          } catch {
            data = null;
          }

          if (!response.ok) {
            const apiError = data?.error?.message || `HTTP ${response.status} ${response.statusText}`;
            throw new Error(apiError);
          }

          const choice = data?.choices?.[0];
          const message = choice?.message;
          let content = message?.content ?? choice?.text;
          if (content === undefined || content === null || (typeof content === 'string' && content.trim().length === 0)) {
            // Check reasoning field if present
            if (message?.reasoning && message.reasoning.trim().length > 0) {
              content = message.reasoning;
            }
          }

          if (content === undefined || content === null || (typeof content === 'string' && content.trim().length === 0)) {
            throw new Error('No content returned in OpenRouter response choices.');
          }

          return String(content).trim();
        })();

        const resultText = await this.withTimeout(fetchPromise, timeoutMs, 'OpenRouter chatCompletion');
        return resultText;
      } catch (error) {
        if (error instanceof AppError && error.errorCode === 'OPENROUTER_TIMEOUT') {
          throw error;
        }

        const rawMessage = error instanceof Error ? error.message : 'Unknown OpenRouter API error';
        const sanitized = this.sanitizeError(rawMessage);

        const isTransient =
          rawMessage.includes('503') ||
          rawMessage.includes('502') ||
          rawMessage.includes('504') ||
          rawMessage.includes('UNAVAILABLE') ||
          rawMessage.includes('rate-limited') ||
          rawMessage.includes('temporarily unavailable');

        if (isTransient && attempts < maxAttempts) {
          logger.warn(`OpenRouter transient error detected, retrying in 1500ms (attempt ${attempts}/${maxAttempts})...`, {
            error: sanitized
          });
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }

        logger.error('OpenRouter API request failed', {
          model,
          error: sanitized
        });

        if (rawMessage.includes('401') || rawMessage.includes('auth') || rawMessage.includes('API key') || rawMessage.includes('Unauthorized')) {
          throw new AppError('OpenRouter API authentication failed: Invalid API key.', 401, 'OPENROUTER_AUTH_FAILED');
        }

        if (rawMessage.includes('429') || rawMessage.includes('rate limit') || rawMessage.includes('quota')) {
          throw new AppError('OpenRouter API rate limit exceeded. Please retry later.', 429, 'OPENROUTER_RATE_LIMIT');
        }

        if (rawMessage.includes('503') || rawMessage.includes('502') || rawMessage.includes('504')) {
          throw new AppError('OpenRouter API is temporarily unavailable. Please retry shortly.', 503, 'OPENROUTER_UNAVAILABLE');
        }

        if (rawMessage.includes('model not found') || rawMessage.includes('404')) {
          throw new AppError(`OpenRouter model '${model}' is unavailable or not found.`, 502, 'OPENROUTER_MODEL_UNAVAILABLE');
        }

        throw new AppError(`OpenRouter API error: ${sanitized}`, 502, 'OPENROUTER_API_ERROR');
      }
    }

    throw new AppError('OpenRouter API request failed after retries.', 503, 'OPENROUTER_UNAVAILABLE');
  }

  /**
   * Generates free-form text from a prompt using the configured OpenRouter model.
   */
  public async generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new AppError('Prompt must be a non-empty string.', 400, 'INVALID_PROMPT');
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    return await this.executeChatCompletion(messages, options, false);
  }

  /**
   * Generates structured JSON from prompt and strictly validates JSON format.
   * OpenRouter must never generate fake clinical data; if parsing or API fails, an AppError is thrown.
   */
  public async generateStructuredJson<T>(prompt: string, options: GenerateTextOptions = {}): Promise<T> {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new AppError('Prompt must be a non-empty string.', 400, 'INVALID_PROMPT');
    }

    const systemInstruction = [
      options.systemInstruction || 'You are an authoritative clinical AI intake assistant.',
      'STRICT RULE: Output valid, parseable JSON conforming strictly to the requested schema.',
      'Do not include any conversational preamble, safety evaluations, commentary, or markdown fences.'
    ].join('\n');

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ];

      if (attempts > 1) {
        messages.push({
          role: 'user',
          content: 'The previous response could not be parsed as valid JSON. Please output the JSON object only.'
        });
      }

      let rawText: string;
      try {
        rawText = await this.executeChatCompletion(messages, options, true);
      } catch (err: any) {
        // If the model rejects response_format=json_object or returns empty choices, retry in prompt-constrained mode
        const isFormatError =
          (err instanceof AppError && err.message.toLowerCase().includes('response_format')) ||
          (err instanceof Error && (err.message.includes('response_format') || err.message.includes('No content returned')));
        if (isFormatError) {
          logger.warn('OpenRouter jsonMode issue encountered, retrying in prompt-constrained mode...');
          rawText = await this.executeChatCompletion(messages, options, false);
        } else {
          throw err;
        }
      }

      if (!rawText) {
        if (attempts < maxAttempts) continue;
        throw new AppError('Empty response received from OpenRouter.', 502, 'OPENROUTER_EMPTY_RESPONSE');
      }

      const cleanJson = this.extractJsonString(rawText);

      try {
        return JSON.parse(cleanJson) as T;
      } catch (parseErr) {
        if (attempts < maxAttempts) {
          logger.warn('Retrying OpenRouter structured JSON extraction after unparseable response...');
          continue;
        }
        logger.error('Failed to parse OpenRouter structured JSON output', {
          snippet: this.sanitizeError(rawText.slice(0, 250))
        });
        throw new AppError('Malformed JSON output from OpenRouter.', 502, 'OPENROUTER_MALFORMED_OUTPUT');
      }
    }

    throw new AppError('Failed to generate valid structured JSON from OpenRouter.', 502, 'OPENROUTER_MALFORMED_OUTPUT');
  }

  /**
   * Safe backend-side verification mechanism.
   * Sends a harmless, non-clinical test ping to verify OpenRouter connectivity and model responsiveness.
   */
  public async verifyConnectivity(): Promise<OpenRouterConnectivityResult> {
    const model = this.getModel();

    if (!this.isConfigured()) {
      return {
        connected: false,
        provider: 'openrouter',
        model,
        error: 'OpenRouter API key is not configured.'
      };
    }

    try {
      const testPrompt = 'Reply with exactly: MEDiKIOSK_OPENROUTER_OK';
      const response = await this.generateText(testPrompt, {
        temperature: 0.1,
        maxOutputTokens: 300,
        timeoutMs: 30000
      });

      const snippet = response.slice(0, 100).trim();

      return {
        connected: true,
        provider: 'openrouter',
        model,
        responseSnippet: snippet
      };
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Connectivity check failed';
      const sanitized = this.sanitizeError(rawMessage);

      return {
        connected: false,
        provider: 'openrouter',
        model,
        error: sanitized
      };
    }
  }

  /**
   * Executes a minimal synthetic clinical request using the standard MEDiKIOSK clinical schema.
   * Verifies that OpenRouter can extract structured clinical anamnesis data conforming to schema
   * without generating fake or fabricated clinical data.
   */
  public async testMinimalClinicalRequest(): Promise<{
    success: boolean;
    provider: 'openrouter';
    model: string;
    extractedData: GeminiExtractionOutput;
  }> {
    const model = this.getModel();

    const minimalPrompt = `
Extract clinical intake information for the patient statement below into the specified JSON schema.

PATIENT STATEMENT:
"I have had a mild headache for 2 days. No known allergies."

CLINICAL CONTEXT:
- Active target field: "chiefComplaint"
- Next target field: "duration"

OUTPUT JSON SCHEMA:
{
  "answerUnderstanding": "Summary of patient answer",
  "extractedData": {
    "chiefComplaint": { "text": "mild headache" },
    "duration": { "value": 2, "unit": "days" },
    "allergies": [{ "allergen": "No known allergies" }]
  },
  "targetField": "chiefComplaint",
  "answerStatus": "answered",
  "needsClarification": false,
  "clarificationReason": null,
  "suggestedNextQuestion": "How severe is the headache right now?"
}
`.trim();

    const rawJson = await this.generateStructuredJson<unknown>(minimalPrompt, {
      temperature: 0.1,
      maxOutputTokens: 1000
    });

    const parsed = geminiExtractionSchema.safeParse(rawJson);
    if (!parsed.success) {
      logger.error('OpenRouter clinical extraction output failed schema validation', {
        errors: parsed.error.issues
      });
      throw new AppError(
        'OpenRouter clinical extraction returned malformed schema data.',
        502,
        'OPENROUTER_SCHEMA_VALIDATION_FAILED'
      );
    }

    return {
      success: true,
      provider: 'openrouter',
      model,
      extractedData: parsed.data
    };
  }
}

export const openRouterService = new OpenRouterService();
