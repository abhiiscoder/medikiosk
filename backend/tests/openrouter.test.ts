/**
 * MEDiKIOSK Backend — Secondary AI Provider: OpenRouter Service & Clinical Tests
 * Validates configuration, service interface, security sanitization, diagnostic health check,
 * and minimal synthetic clinical request using the standard clinical schema.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { openRouterService } from '../src/services/openrouter.service.js';
import { isOpenRouterConfigured, config } from '../src/config/index.js';
import { geminiExtractionSchema } from '../src/validators/conversation.validator.js';

describe('OpenRouter Service & Clinical Health Verification', () => {
  test('OpenRouter service reports configured model name', () => {
    const model = openRouterService.getModel();
    assert.equal(typeof model, 'string');
    assert.ok(model.length > 0);
    assert.equal(model, config.OPENROUTER_MODEL || 'openrouter/free');
  });

  test('generateText rejects empty or whitespace-only prompt', async () => {
    await assert.rejects(
      async () => {
        await openRouterService.generateText('   ');
      },
      (err: any) => {
        assert.equal(err.name, 'AppError');
        assert.equal(err.errorCode, 'INVALID_PROMPT');
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  test('sanitizeError strips OpenRouter API key and Bearer tokens', () => {
    const rawError = `Failed at https://openrouter.ai/api/v1/chat/completions with Bearer ${config.OPENROUTER_API_KEY}`;
    const sanitized = openRouterService.sanitizeError(rawError);
    assert.ok(!sanitized.includes(config.OPENROUTER_API_KEY));
    assert.ok(!sanitized.includes('sk-or-v1-'));
    assert.match(sanitized, /\[REDACTED/);
  });

  test('verifyConnectivity returns structured diagnostics without crashing or leaking secrets', async () => {
    const result = await openRouterService.verifyConnectivity();
    assert.equal(typeof result.connected, 'boolean');
    assert.equal(result.provider, 'openrouter');
    assert.equal(result.model, openRouterService.getModel());

    if (!isOpenRouterConfigured()) {
      assert.equal(result.connected, false);
      assert.match(result.error || '', /OpenRouter API key is not configured/i);
    } else if (result.connected) {
      assert.ok(result.responseSnippet && result.responseSnippet.length > 0);
    }
  });

  test('GET /api/v1/ai/health?provider=openrouter responds with valid schema and zero leaked secrets', async () => {
    const res = await request(app).get('/api/v1/ai/health?provider=openrouter');

    // 200 (connected) or 503 (unconfigured/unavailable)
    assert.ok([200, 503].includes(res.status));

    const responseBody = JSON.stringify(res.body);

    // CRITICAL SECURITY CHECKS: Never expose API keys or auth headers
    assert.ok(!responseBody.includes('sk-or-v1'));
    assert.ok(!responseBody.includes('Bearer '));
    if (config.OPENROUTER_API_KEY) {
      assert.ok(!responseBody.includes(config.OPENROUTER_API_KEY));
    }

    if (res.status === 200) {
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.provider, 'openrouter');
      assert.equal(res.body.data.model, openRouterService.getModel());
      assert.equal(res.body.data.connected, true);
    } else {
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'OPENROUTER_UNAVAILABLE');
    }
  });

  test('Minimal synthetic clinical request extracts structured anamnesis data conforming to schema', async () => {
    if (!isOpenRouterConfigured()) {
      // Skip live execution if key is absent
      return;
    }

    const clinicalResult = await openRouterService.testMinimalClinicalRequest();
    assert.equal(clinicalResult.success, true);
    assert.equal(clinicalResult.provider, 'openrouter');

    // Strict validation against clinical schema
    const schemaValidation = geminiExtractionSchema.safeParse(clinicalResult.extractedData);
    assert.equal(schemaValidation.success, true);

    const data = schemaValidation.data;
    assert.equal(data.targetField, 'chiefComplaint');
    assert.ok(['answered', 'partially_answered'].includes(data.answerStatus));
    assert.equal(typeof data.needsClarification, 'boolean');
    assert.equal(typeof data.suggestedNextQuestion, 'string');
    assert.ok(data.suggestedNextQuestion.length > 0);
    assert.equal(typeof data.answerUnderstanding, 'string');
    assert.ok(data.answerUnderstanding.length > 0);

    // Check that extracted structured facts are present and no fake data was hallucinated
    assert.ok(data.extractedData && typeof data.extractedData === 'object');
    const extracted = data.extractedData as Record<string, any>;
    assert.ok(
      extracted.chiefComplaint ||
      extracted.duration ||
      extracted.allergies ||
      data.answerUnderstanding.toLowerCase().includes('headache')
    );
  });
});
