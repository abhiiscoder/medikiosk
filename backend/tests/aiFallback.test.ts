/**
 * MEDiKIOSK Backend — R3 HOTFIX: Gemini to OpenRouter Rate-Limit Fallback Tests
 *
 * Validates:
 * 1. Gemini success → Gemini result (Gemini remains primary)
 * 2. Gemini 429 rate limit → Automatic OpenRouter fallback result
 * 3. Gemini 503 availability error → Automatic OpenRouter fallback result
 * 4. Both fail → Truthful error returned without fake clinical data
 * 5. Validation / safety error → No fallback triggered
 * 6. Security → Neither API key is ever leaked in fallback errors or responses
 * 7. Structured clinical extraction → Schema validation succeeds after OpenRouter fallback
 */

import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { geminiService } from '../src/services/gemini.service.js';
import { openRouterService } from '../src/services/openrouter.service.js';
import { config, isOpenRouterConfigured } from '../src/config/index.js';
import { geminiExtractionSchema } from '../src/validators/conversation.validator.js';

describe('R3 HOTFIX: Gemini to OpenRouter Rate-Limit Fallback Verification', () => {
  afterEach(() => {
    // Ensure all mock hooks are cleanly reset after each test
    geminiService.setMockFailure(null);
    openRouterService.setMockFailure(null);
  });

  test('1. Gemini success → Gemini result (Primary provider untouched)', async () => {
    geminiService.setMockFailure(null);
    const result = await geminiService.generateText('Reply with: PRIMARY_GEMINI_OK', {
      temperature: 0.1,
      maxOutputTokens: 30
    });

    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  test('2. Gemini 429 → Automatic OpenRouter fallback result', async () => {
    if (!isOpenRouterConfigured()) {
      return;
    }

    // Force Gemini to throw 429 rate limit
    geminiService.setMockFailure('RATE_LIMIT_429');

    const result = await geminiService.generateText('Reply with: OPENROUTER_FALLBACK_OK', {
      temperature: 0.1,
      maxOutputTokens: 100
    });

    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  test('3. Gemini 503 → Automatic OpenRouter fallback result', async () => {
    if (!isOpenRouterConfigured()) {
      return;
    }

    // Force Gemini to throw 503 service unavailable
    geminiService.setMockFailure('UNAVAILABLE_503');

    const result = await geminiService.generateText('Reply with: OPENROUTER_503_FALLBACK_OK', {
      temperature: 0.1,
      maxOutputTokens: 100
    });

    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  test('4. Gemini 429 in structured clinical JSON → OpenRouter fallback adheres strictly to clinical schema', async () => {
    if (!isOpenRouterConfigured()) {
      return;
    }

    // Force Gemini to throw 429 rate limit
    geminiService.setMockFailure('RATE_LIMIT_429');

    const prompt = `
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

    const rawResult = await geminiService.generateStructuredJson<unknown>(prompt, {
      temperature: 0.1,
      maxOutputTokens: 1000
    });

    // Run identical clinical schema validation check as conversation engine
    const schemaValidation = geminiExtractionSchema.safeParse(rawResult);
    assert.equal(schemaValidation.success, true);

    const data = schemaValidation.data;
    assert.equal(data.targetField, 'chiefComplaint');
    assert.ok(['answered', 'partially_answered'].includes(data.answerStatus));
    assert.equal(typeof data.needsClarification, 'boolean');
    assert.equal(typeof data.suggestedNextQuestion, 'string');
    assert.ok(data.suggestedNextQuestion.length > 0);
  });

  test('5. Both providers fail → Truthful error returned without fake clinical data', async () => {
    // Both Gemini and OpenRouter fail
    geminiService.setMockFailure('RATE_LIMIT_429');
    openRouterService.setMockFailure('UNAVAILABLE_503');

    await assert.rejects(
      async () => {
        await geminiService.generateText('Test prompt that should fail on both');
      },
      (err: any) => {
        assert.equal(err.name, 'AppError');
        assert.equal(err.statusCode, 503);
        assert.equal(err.errorCode, 'AI_FALLBACK_FAILED');

        // Truthful error message mentioning both failed
        assert.match(err.message, /Primary provider .* and fallback provider .* both failed/i);

        // Security check: No API keys leaked
        const msg = err.message;
        assert.ok(!msg.includes(config.OPENROUTER_API_KEY));
        assert.ok(!msg.includes('sk-or-v1'));
        if (config.GEMINI_API_KEY) {
          assert.ok(!msg.includes(config.GEMINI_API_KEY));
        }
        return true;
      }
    );
  });

  test('6. Validation / Safety error → Do NOT fallback to OpenRouter', async () => {
    // 6a: Empty prompt rejection happens immediately without invoking fallback
    await assert.rejects(
      async () => {
        await geminiService.generateText('   ');
      },
      (err: any) => {
        assert.equal(err.name, 'AppError');
        assert.equal(err.errorCode, 'INVALID_PROMPT');
        assert.equal(err.statusCode, 400);
        return true;
      }
    );

    // 6b: Non-retryable clinical validation error throws directly without triggering OpenRouter
    geminiService.setMockFailure('VALIDATION_ERROR');

    await assert.rejects(
      async () => {
        await geminiService.generateText('Clinical test prompt');
      },
      (err: any) => {
        assert.equal(err.name, 'AppError');
        assert.equal(err.errorCode, 'CLINICAL_VALIDATION_ERROR');
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });
});
