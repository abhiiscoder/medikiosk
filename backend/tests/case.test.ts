/**
 * MEDiKIOSK Backend — Phase 02: Case, Patient & Clinical Session Integration Tests
 * Validates authoritative ID generation, lifecycle transitions, ownership enforcement, and API schemas.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Case } from '../src/models/case.model.js';
import { Patient } from '../src/models/patient.model.js';
import { ClinicalSession } from '../src/models/session.model.js';

describe('Phase 02: Patient + Case + Clinical Session Lifecycle & API', () => {
  let createdCaseId: string;
  let createdPatientId: string;
  let createdSessionId: string;

  before(async () => {
    await connectDatabase();
  });

  after(async () => {
    // Cleanup test fixtures
    if (createdCaseId) {
      await Case.deleteOne({ caseId: createdCaseId });
      await Patient.deleteOne({ patientId: createdPatientId });
      await ClinicalSession.deleteMany({ caseId: createdCaseId });
    }
    await disconnectDatabase();
  });

  test('POST /api/v1/cases creates Patient, Case, and initial ClinicalSession atomically', async () => {
    const payload = {
      patientData: {
        firstName: 'Rajesh',
        lastName: 'Kumar Patel',
        age: 48,
        gender: 'male',
        contactNumber: '+91 98765 43210'
      }
    };

    const res = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', 'user-clinician-001')
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);

    const data = res.body.data;
    assert.ok(data.caseId);
    assert.match(data.caseId, /^case-\d{4}$/);
    assert.ok(data.patientId);
    assert.match(data.patientId, /^pt-\d{5}$/);
    assert.ok(data.sessionId);
    assert.match(data.sessionId, /^sess-\d{4}$/);

    assert.equal(data.status, 'active');
    assert.equal(data.workflowStage, 'clinical_history');

    // Authoritative patient data checks
    assert.equal(data.patient.firstName, 'Rajesh');
    assert.equal(data.patient.lastName, 'Kumar Patel');
    assert.equal(data.patient.age, 48);
    assert.equal(data.patient.gender, 'male');
    assert.match(data.patient.mrn, /^MK-\d{4}-\d{4}$/);

    // Initial session checks
    assert.equal(data.activeSession.sessionId, data.sessionId);
    assert.equal(data.activeSession.status, 'active');

    // Retain for subsequent tests
    createdCaseId = data.caseId;
    createdPatientId = data.patientId;
    createdSessionId = data.sessionId;
  });

  test('POST /api/v1/cases rejects invalid patient demographics with 400 Bad Request', async () => {
    const invalidPayload = {
      patientData: {
        firstName: '', // Empty name violates min(1)
        age: 180, // Age > 130 violates max(130)
        gender: 'invalid_gender'
      }
    };

    const res = await request(app)
      .post('/api/v1/cases')
      .send(invalidPayload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.error.details));
  });

  test('GET /api/v1/cases/:caseId retrieves case with patient and active session details', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${createdCaseId}`)
      .set('x-user-id', 'user-clinician-001');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.caseId, createdCaseId);
    assert.equal(res.body.data.patient.patientId, createdPatientId);
    assert.equal(res.body.data.patient.firstName, 'Rajesh');
    assert.equal(res.body.data.patient.lastName, 'Kumar Patel');
    assert.equal(res.body.data.activeSession.sessionId, createdSessionId);
    assert.equal(res.body.data.activeSession.status, 'active');
  });

  test('GET /api/v1/cases/:caseId enforces ownership isolation across clinicians', async () => {
    // Attempt retrieval as a different clinician
    const res = await request(app)
      .get(`/api/v1/cases/${createdCaseId}`)
      .set('x-user-id', 'user-clinician-999');

    // Expected 404 to avoid leaking existence of cases across distinct users
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test('GET /api/v1/cases lists paginated cases for authenticated clinician', async () => {
    const res = await request(app)
      .get('/api/v1/cases?page=1&limit=10')
      .set('x-user-id', 'user-clinician-001');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.cases));
    assert.ok(res.body.data.cases.length >= 1);
    assert.ok(res.body.data.pagination);
    assert.equal(res.body.data.pagination.page, 1);
    assert.equal(res.body.data.pagination.limit, 10);
    assert.ok(typeof res.body.data.pagination.total === 'number');

    const found = res.body.data.cases.find((c: any) => c.caseId === createdCaseId);
    assert.ok(found, 'Created case should be listed in user cases');
    assert.equal(found.patient.firstName, 'Rajesh');
    assert.equal(found.patient.lastName, 'Kumar Patel');
  });

  test('PATCH /api/v1/cases/:caseId updates workflow stage and metadata', async () => {
    const res = await request(app)
      .patch(`/api/v1/cases/${createdCaseId}`)
      .set('x-user-id', 'user-clinician-001')
      .send({
        workflowStage: 'medical_records',
        status: 'completed'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.workflowStage, 'medical_records');
    assert.equal(res.body.data.status, 'completed');
  });

  test('PATCH /api/v1/cases/:caseId rejects invalid workflow stage or status values', async () => {
    const res = await request(app)
      .patch(`/api/v1/cases/${createdCaseId}`)
      .set('x-user-id', 'user-clinician-001')
      .send({
        workflowStage: 'non_existent_stage',
        status: 'illegal_status'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/v1/cases/:caseId/sessions starts a new clinical session and archives previous', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${createdCaseId}/sessions`)
      .set('x-user-id', 'user-clinician-001')
      .send({});

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.notEqual(res.body.data.sessionId, createdSessionId);
    assert.equal(res.body.data.status, 'active');
    assert.equal(res.body.data.caseId, createdCaseId);

    const newSessionId = res.body.data.sessionId;

    // Verify list of sessions returns both sessions with correct statuses
    const listRes = await request(app)
      .get(`/api/v1/cases/${createdCaseId}/sessions`)
      .set('x-user-id', 'user-clinician-001');

    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.data.length, 2);

    const oldSession = listRes.body.data.find((s: any) => s.sessionId === createdSessionId);
    const newSession = listRes.body.data.find((s: any) => s.sessionId === newSessionId);

    assert.equal(oldSession.status, 'completed');
    assert.ok(oldSession.endedAt);
    assert.equal(newSession.status, 'active');
  });
});
