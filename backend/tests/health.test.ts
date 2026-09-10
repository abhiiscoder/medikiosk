/**
 * MEDiKIOSK Backend — Phase 01: Health Endpoint Tests
 * Validates /health and /api/v1/health operational status.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Health Diagnostic Endpoints', () => {
  test('GET /health returns 200 with service operational status', async () => {
    const res = await request(app).get('/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.service, 'MEDiKIOSK Backend');
    assert.ok(['healthy', 'degraded'].includes(res.body.data.status));
    assert.ok(typeof res.body.data.version === 'string');
    assert.ok(typeof res.body.data.uptimeSeconds === 'number');
    assert.ok(res.body.data.database);
    assert.ok(typeof res.body.data.database.status === 'string');
  });

  test('GET /api/v1/health returns 200 with matching diagnostics', async () => {
    const res = await request(app).get('/api/v1/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.service, 'MEDiKIOSK Backend');
  });

  test('GET /api/v1 root returns 200 with API v1 metadata', async () => {
    const res = await request(app).get('/api/v1');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'MEDiKIOSK Authoritative API');
    assert.equal(res.body.data.version, 'v1');
  });
});
