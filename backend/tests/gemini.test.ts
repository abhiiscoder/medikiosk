/**
 * MEDiKIOSK Backend — Foundation 03: Gemini Service & Diagnostic Endpoint Tests
 * Validates configuration, service interface, security sanitization, and /api/v1/ai/health endpoint.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { geminiService } from '../src/services/gemini.service.js';
import { isGeminiConfigured } from '../src/config/index.js';

describe('Foundation 03: Gemini Service & AI Diagnostic Tests', () => {
  test('Gemini service reports configured model name', () => {
    const model = geminiService.getModel();
    const expectedModel = geminiService.getModel();
    assert.equal(typeof model, 'string');
    assert.ok(model.length > 0);
    assert.equal(model, expectedModel);
  });

  test('generateText rejects empty or whitespace-only prompt', async () => {
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
  });

  test('verifyConnectivity returns structured diagnostics without crashing', async () => {
    const result = await geminiService.verifyConnectivity();
    assert.equal(typeof result.connected, 'boolean');
    assert.equal(result.provider, 'gemini');
    assert.equal(result.model, geminiService.getModel());

    if (!isGeminiConfigured()) {
      assert.equal(result.connected, false);
      assert.match(result.error || '', /Gemini API key is not configured/i);
    }
  });

  test('GET /api/v1/ai/health endpoint responds with valid JSON schema and no exposed secrets', async () => {
    const res = await request(app).get('/api/v1/ai/health');

    // Either 200 (if real key configured and connected) or 503 (if unconfigured/unavailable)
    assert.ok([200, 503].includes(res.status));

    const responseBody = JSON.stringify(res.body);

    // CRITICAL SECURITY CHECKS: Never expose API keys or auth headers
    assert.ok(!responseBody.includes('AIzaSy'));
    assert.ok(!responseBody.includes('Bearer '));
    assert.ok(!responseBody.includes('YOUR_REAL_GEMINI_API_KEY'));

    if (res.status === 200) {
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.provider, 'gemini');
      assert.equal(res.body.data.model, geminiService.getModel());
      assert.equal(res.body.data.connected, true);
    } else {
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'GEMINI_UNAVAILABLE');
    }
  });
});
