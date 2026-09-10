/**
 * MEDiKIOSK Backend — Phase 01: Application Infrastructure Tests
 * Validates error handling, 404, request validation, and CORS headers.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { z } from 'zod';
import express, { Request, Response } from 'express';
import { app } from '../src/app.js';
import { validateRequest } from '../src/middleware/validate.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

describe('Application Infrastructure & Security', () => {
  test('Undefined route returns 404 with standardized error JSON', async () => {
    const res = await request(app).get('/api/v1/nonexistent-endpoint');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.ok(res.body.error.message.includes('not found'));
    assert.ok(res.body.timestamp);
  });

  test('CORS headers allow frontend origin http://localhost:5173', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');

    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });

  test('Malformed JSON payload returns 400 with MALFORMED_JSON code', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{ bad json: true, ');

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'MALFORMED_JSON');
  });

  test('Validation middleware rejects invalid schema with 400 VALIDATION_ERROR', async () => {
    // Create an isolated sub-app to test validation middleware
    const testApp = express();
    testApp.use(express.json());

    const testSchema = {
      body: z.object({
        name: z.string().min(3),
        count: z.number().int().positive()
      })
    };

    testApp.post('/test-validate', validateRequest(testSchema), (req: Request, res: Response) => {
      res.json({ success: true, received: req.body });
    });
    testApp.use(errorHandler);

    // 1. Valid request
    const validRes = await request(testApp)
      .post('/test-validate')
      .send({ name: 'MEDiKIOSK', count: 5 });
    assert.equal(validRes.status, 200);
    assert.equal(validRes.body.success, true);

    // 2. Invalid request (name too short, count negative)
    const invalidRes = await request(testApp)
      .post('/test-validate')
      .send({ name: 'ab', count: -1 });

    assert.equal(invalidRes.status, 400);
    assert.equal(invalidRes.body.success, false);
    assert.equal(invalidRes.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(invalidRes.body.error.details));
    assert.equal(invalidRes.body.error.details.length, 2);
  });
});
