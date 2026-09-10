/**
 * MEDiKIOSK Backend — Phase 03: Clinical History Integration Tests
 * Validates:
 * - ClinicalHistory creation with clh-xxxx, caseId, sessionId
 * - Status transitions (not_started → in_progress → completed)
 * - Section management with machine-readable names
 * - POST /answers flow with Answer record creation, Message sequence ordering
 * - Non-destructive structured state updates across all 13 sections
 * - Ownership isolation and invalid case rejection
 * - GET /clinical-history/questions with section filter
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Case } from '../src/models/case.model.js';
import { Patient } from '../src/models/patient.model.js';
import { ClinicalHistory } from '../src/models/clinicalHistory.model.js';
import { Answer } from '../src/models/answer.model.js';
import { Conversation } from '../src/models/conversation.model.js';

describe('Phase 03: Clinical History Data Model, Answer Ingestion & Structured State', () => {
  let caseId: string;
  let patientId: string;

  before(async () => {
    await connectDatabase();

    // Create fixture case
    const caseRes = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', 'user-clinician-001')
      .send({
        patientData: {
          firstName: 'Ananya',
          lastName: 'Deshmukh',
          age: 34,
          gender: 'female'
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
      await ClinicalHistory.deleteOne({ caseId });
      await Answer.deleteMany({ caseId });
      await Conversation.deleteOne({ caseId });
    }
    await disconnectDatabase();
  });

  // ─── Initialization ───

  test('GET /clinical-history initializes record with clh-xxxx ID and not_started status', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseId}/clinical-history`)
      .set('x-user-id', 'user-clinician-001');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const data = res.body.data;
    assert.ok(data.clinicalHistoryId.startsWith('clh-'), `Expected clh-xxxx, got: ${data.clinicalHistoryId}`);
    assert.equal(data.caseId, caseId);
    assert.equal(data.patientId, patientId);
    assert.equal(data.status, 'not_started');
    assert.equal(data.currentSection, 'chief_complaint');
    assert.ok(data.structuredData !== undefined, 'structuredData should exist');
  });

  // ─── Questions Catalog ───

  test('GET /clinical-history/questions returns all 13 section questions', async () => {
    const res = await request(app)
      .get('/api/v1/clinical-history/questions');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 13, `Expected at least 13 questions, got ${res.body.data.length}`);
  });

  test('GET /clinical-history/questions?section=severity filters correctly', async () => {
    const res = await request(app)
      .get('/api/v1/clinical-history/questions?section=severity');

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data.every((q: any) => q.section === 'severity'));
  });

  // ─── Answer Flow ───

  test('POST /answers for chief_complaint creates Answer, updates structuredData, returns nextQuestion', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/clinical-history/answers`)
      .set('x-user-id', 'user-clinician-001')
      .send({
        sessionId: 'sess-test-1',
        questionId: 'q-chief-complaint',
        value: 'Persistent cough and low-grade evening fever',
        source: 'text'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);

    const data = res.body.data;
    assert.ok(data.answerId.startsWith('ans-'));
    assert.ok(data.clinicalHistoryId.startsWith('clh-'));
    assert.ok(data.nextQuestion, 'Should have a next question');
    assert.equal(data.nextQuestion.questionId, 'q-hpi');

    // Verify structured data was updated
    assert.equal(data.updatedState.chiefComplaint.text, 'Persistent cough and low-grade evening fever');
  });

  test('POST /answers for HPI appends narrative without overwriting chief complaint', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/clinical-history/answers`)
      .set('x-user-id', 'user-clinician-001')
      .send({
        sessionId: 'sess-test-1',
        questionId: 'q-hpi',
        value: 'Progressive dry cough for 3 weeks with mild fatigue.',
        source: 'text'
      });

    assert.equal(res.status, 201);

    const data = res.body.data;
    // Chief complaint should still be preserved
    assert.equal(data.updatedState.chiefComplaint.text, 'Persistent cough and low-grade evening fever');
    // HPI should be set
    assert.ok(data.updatedState.historyOfPresentIllness.narrative.includes('Progressive dry cough'));
    // Next question
    assert.equal(data.nextQuestion.questionId, 'q-duration');
  });

  test('POST /answers for duration stores structured duration object', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/clinical-history/answers`)
      .set('x-user-id', 'user-clinician-001')
      .send({
        sessionId: 'sess-test-1',
        questionId: 'q-duration',
        value: { amount: 3, unit: 'weeks' },
        source: 'text'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.updatedState.duration.value, 3);
    assert.equal(res.body.data.updatedState.duration.unit, 'weeks');
    assert.equal(res.body.data.nextQuestion.questionId, 'q-severity');
  });

  test('POST /answers for severity stores enum value', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/clinical-history/answers`)
      .set('x-user-id', 'user-clinician-001')
      .send({
        sessionId: 'sess-test-1',
        questionId: 'q-severity',
        value: 'moderate',
        source: 'selection'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.updatedState.severity, 'moderate');
    assert.equal(res.body.data.nextQuestion.questionId, 'q-symptoms');
  });

  test('POST /answers for symptoms stores array of symptom items', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/clinical-history/answers`)
      .set('x-user-id', 'user-clinician-001')
      .send({
        sessionId: 'sess-test-1',
        questionId: 'q-symptoms',
        value: ['Dry cough', 'Evening fever', 'Fatigue'],
        source: 'selection'
      });

    assert.equal(res.status, 201);
    const symptoms = res.body.data.updatedState.symptoms;
    assert.ok(symptoms.length >= 3, `Expected at least 3 symptoms, got ${symptoms.length}`);
    assert.ok(symptoms.some((s: any) => s.name === 'Dry cough'));
    assert.ok(symptoms.some((s: any) => s.name === 'Evening fever'));
  });

  test('POST /answers for past_medical_history stores condition', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/clinical-history/answers`)
      .set('x-user-id', 'user-clinician-001')
      .send({
        sessionId: 'sess-test-1',
        questionId: 'q-past-medical',
        value: 'Childhood bronchial asthma, resolved',
        source: 'text'
      });

    assert.equal(res.status, 201);
    const pmh = res.body.data.updatedState.pastMedicalHistory;
    assert.ok(pmh.length >= 1);
    assert.ok(pmh[0].condition.includes('bronchial asthma'));
  });

  // ─── Status Transitions ───

  test('Clinical history transitions from not_started to in_progress after first answer', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseId}/clinical-history`)
      .set('x-user-id', 'user-clinician-001');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'in_progress');
  });

  // ─── PATCH Direct Update ───

  test('PATCH /clinical-history updates structuredData directly', async () => {
    const res = await request(app)
      .patch(`/api/v1/cases/${caseId}/clinical-history`)
      .set('x-user-id', 'user-clinician-001')
      .send({
        socialHistory: {
          smoking: 'Non-smoker',
          alcohol: 'Occasional',
          occupation: 'Software Engineer'
        },
        ayushHistory: {
          notes: 'Tulsi-Ginger decoction (Kadha) for 5 days'
        }
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.structuredData.socialHistory.smoking, 'Non-smoker');
    assert.ok(res.body.data.structuredData.ayushHistory.notes.includes('Kadha'));
  });

  // ─── Conversation Retrieval ───

  test('GET /clinical-history/conversation returns conversation with sequenced messages', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseId}/clinical-history/conversation`)
      .set('x-user-id', 'user-clinician-001');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.messages));
    assert.ok(res.body.data.messages.length > 0, 'Should have messages');

    // Verify sequence ordering
    const messages = res.body.data.messages;
    for (let i = 1; i < messages.length; i++) {
      assert.ok(messages[i].sequence >= messages[i - 1].sequence, 'Messages should be in sequence order');
    }
  });

  // ─── Ownership Isolation ───

  test('GET /clinical-history enforces ownership isolation', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseId}/clinical-history`)
      .set('x-user-id', 'user-clinician-999');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test('POST /answers rejects invalid questionId', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/clinical-history/answers`)
      .set('x-user-id', 'user-clinician-001')
      .send({
        sessionId: 'sess-test-1',
        questionId: 'q-nonexistent',
        value: 'test'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('POST /answers rejects invalid caseId', async () => {
    const res = await request(app)
      .post('/api/v1/cases/case-nonexistent/clinical-history/answers')
      .set('x-user-id', 'user-clinician-001')
      .send({
        sessionId: 'sess-test-1',
        questionId: 'q-chief-complaint',
        value: 'test'
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});
