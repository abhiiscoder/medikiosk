/**
 * MEDiKIOSK Backend — Phase 03: Conversation & State Extraction Tests
 * Validates:
 * - Conversation auto-creation during answer flow
 * - GET /conversation returns sequenced messages
 * - Conversation alias at /cases/:caseId/conversation
 * - Ownership isolation on conversation endpoints
 * - POST /reset clears conversation
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Case } from '../src/models/case.model.js';
import { Patient } from '../src/models/patient.model.js';
import { Conversation } from '../src/models/conversation.model.js';
import { ClinicalHistory } from '../src/models/clinicalHistory.model.js';
import { Answer } from '../src/models/answer.model.js';

describe('Phase 03: Conversation Engine & State Extraction', () => {
  let caseId: string;
  let patientId: string;

  before(async () => {
    await connectDatabase();

    const caseRes = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', 'user-clinician-001')
      .send({
        patientData: {
          firstName: 'Suresh',
          lastName: 'Choudhary',
          age: 52,
          gender: 'male'
        }
      });

    assert.equal(caseRes.status, 201);
    caseId = caseRes.body.data.caseId;
    patientId = caseRes.body.data.patientId;
  });

  after(async () => {
    if (caseId) {
      await Case.deleteOne({ caseId });
      await Patient.deleteOne({ patientId });
      await Conversation.deleteOne({ caseId });
      await ClinicalHistory.deleteOne({ caseId });
      await Answer.deleteMany({ caseId });
    }
    await disconnectDatabase();
  });

  test('Submitting an answer auto-creates conversation with initial assistant message', async () => {
    const answerRes = await request(app)
      .post(`/api/v1/cases/${caseId}/clinical-history/answers`)
      .set('x-user-id', 'user-clinician-001')
      .send({
        sessionId: 'sess-conv-test',
        questionId: 'q-chief-complaint',
        value: 'Chest pain on exertion',
        source: 'text'
      });

    assert.equal(answerRes.status, 201);

    // Now retrieve the conversation
    const convRes = await request(app)
      .get(`/api/v1/cases/${caseId}/clinical-history/conversation`)
      .set('x-user-id', 'user-clinician-001');

    assert.equal(convRes.status, 200);
    assert.equal(convRes.body.data.caseId, caseId);
    assert.equal(convRes.body.data.status, 'active');
    assert.ok(Array.isArray(convRes.body.data.messages));
    // Should have at least: initial assistant + user answer + next question assistant
    assert.ok(convRes.body.data.messages.length >= 3, `Expected >= 3 messages, got ${convRes.body.data.messages.length}`);
  });

  test('Conversation messages have explicit sequence numbers', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseId}/clinical-history/conversation`)
      .set('x-user-id', 'user-clinician-001');

    assert.equal(res.status, 200);
    const messages = res.body.data.messages;

    for (const msg of messages) {
      assert.ok(typeof msg.sequence === 'number', `message ${msg.messageId} missing sequence`);
      assert.ok(typeof msg.source === 'string', `message ${msg.messageId} missing source`);
    }
  });

  test('GET /conversation alias also works', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseId}/conversation`)
      .set('x-user-id', 'user-clinician-001');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.caseId, caseId);
  });

  test('Conversation endpoints enforce ownership isolation', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseId}/conversation`)
      .set('x-user-id', 'user-clinician-999');

    assert.equal(res.status, 404);
  });

  test('POST /conversation/reset clears conversation', async () => {
    const resetRes = await request(app)
      .post(`/api/v1/cases/${caseId}/conversation/reset`)
      .set('x-user-id', 'user-clinician-001');

    assert.equal(resetRes.status, 200);

    // Conversation should no longer exist
    const convRes = await request(app)
      .get(`/api/v1/cases/${caseId}/conversation`)
      .set('x-user-id', 'user-clinician-001');

    assert.equal(convRes.status, 404);
  });
});
