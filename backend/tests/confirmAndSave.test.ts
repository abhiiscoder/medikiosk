/**
 * MEDiKIOSK Backend — Phase 09: Confirm + Save Tests
 *
 * Validates:
 * 1. Confirm valid reviewed summary (POST /cases/:caseId/summary/confirm)
 * 2. Confirm valid edited summary (POST /cases/:caseId/summary/confirm)
 * 3. Confirm valid draft summary (direct confirmation workflow)
 * 4. Persisted confirmed state records confirmedBy, confirmedAt, confirmedVersion
 * 5. Case transitions to status: 'completed' and workflowStage: 'completed'
 * 6. Clinical session transitions to status: 'completed' with endedAt timestamp
 * 7. User A confirms own case (200 OK)
 * 8. User A cannot confirm User B case (404 isolation)
 * 9. Missing summary returns 404 SUMMARY_NOT_FOUND
 * 10. Missing case returns 404 CASE_NOT_FOUND
 * 11. Summary ID mismatch returns 400 SUMMARY_ID_MISMATCH
 * 12. Stale version rejected with 409 STALE_VERSION
 * 13. Future/invalid version rejected with 400 INVALID_VERSION
 * 14. Idempotent confirmation returns existing confirmed state safely
 * 15. Confirmed summary cannot be subsequently edited (400 SUMMARY_ALREADY_CONFIRMED)
 * 16. Confirmed summary cannot be subsequently reviewed (400 SUMMARY_ALREADY_CONFIRMED)
 * 17. Confirmed summary cannot be regenerated (400 SUMMARY_ALREADY_CONFIRMED)
 * 18. Preserves originalGeneratedSummary and revisionHistory
 * 19. Reject unexpected keys like { status: 'confirmed' } via strict validator (400)
 * 20. Confirmation notes are persisted in reviewNotes
 * 21. Confirmation does NOT call Gemini API
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Case } from '../src/models/case.model.js';
import { ClinicalSession } from '../src/models/session.model.js';
import { ClinicalHistory } from '../src/models/clinicalHistory.model.js';
import { ClinicalSummary } from '../src/models/clinicalSummary.model.js';
import { clinicalSummaryService } from '../src/services/clinicalSummary.service.js';

describe('Phase 09: Confirm + Save', () => {
  const clinicianUser = 'user-clinician-phase09';
  const otherClinicianUser = 'user-clinician-other09';

  let caseIdReviewed: string;
  let summaryIdReviewed: string;

  let caseIdEdited: string;
  let summaryIdEdited: string;

  let caseIdDraft: string;
  let summaryIdDraft: string;

  before(async () => {
    await connectDatabase();

    // Set mock generator on summary service so generation does not hit Gemini
    clinicalSummaryService.setMockGenerator((input) => ({
      sections: {
        chiefConcern: input.chiefComplaint,
        symptoms: input.symptoms.join(', ') || 'Not provided',
        historyOfPresentIllness: input.historyOfPresentIllness,
        duration: input.duration,
        severity: input.severity,
        associatedSymptoms: input.associatedSymptoms,
        pastMedicalHistory: input.pastMedicalHistory,
        pastSurgicalHistory: input.pastSurgicalHistory,
        medications: input.medications,
        allergies: input.allergies,
        familyHistory: input.familyHistory,
        socialHistory: input.socialHistory,
        reviewOfSystems: input.reviewOfSystems,
        ayushHistory: input.ayushHistory,
        relevantMedicalRecords: [],
        clinicalInformationSummary: `Summary for case ${input.caseId}`
      },
      conflicts: input.conflicts
    }));

    // Setup Case 1: For Review -> Confirm flow
    const res1 = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: {
          firstName: 'Anil',
          lastName: 'Deshmukh',
          age: 48,
          gender: 'male'
        }
      });
    assert.equal(res1.status, 201);
    caseIdReviewed = res1.body.data.caseId;

    await ClinicalHistory.create({
      clinicalHistoryId: `clh-${crypto.randomUUID()}`,
      caseId: caseIdReviewed,
      patientId: res1.body.data.patientId,
      sessionId: 'sess-p09-1',
      ownerId: clinicianUser,
      status: 'completed',
      structuredData: {
        chiefComplaint: { text: 'Intermittent dizziness' },
        symptoms: [{ name: 'Dizziness', presence: true }]
      }
    });

    const gen1 = await request(app)
      .post(`/api/v1/cases/${caseIdReviewed}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send();
    assert.equal(gen1.status, 201);
    summaryIdReviewed = gen1.body.data.summaryId;

    // Review Case 1
    const rev1 = await request(app)
      .post(`/api/v1/cases/${caseIdReviewed}/summary/review`)
      .set('x-user-id', clinicianUser)
      .send({ notes: 'Clinician reviewed and approved for final sign-off.' });
    assert.equal(rev1.status, 200);
    assert.equal(rev1.body.data.status, 'reviewed');

    // Setup Case 2: For Edit -> Confirm flow
    const res2 = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: {
          firstName: 'Priya',
          lastName: 'Kulkarni',
          age: 34,
          gender: 'female'
        }
      });
    assert.equal(res2.status, 201);
    caseIdEdited = res2.body.data.caseId;

    await ClinicalHistory.create({
      clinicalHistoryId: `clh-${crypto.randomUUID()}`,
      caseId: caseIdEdited,
      patientId: res2.body.data.patientId,
      sessionId: 'sess-p09-2',
      ownerId: clinicianUser,
      status: 'completed',
      structuredData: {
        chiefComplaint: { text: 'Headache and fatigue' },
        symptoms: [{ name: 'Headache', presence: true }]
      }
    });

    const gen2 = await request(app)
      .post(`/api/v1/cases/${caseIdEdited}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send();
    assert.equal(gen2.status, 201);
    summaryIdEdited = gen2.body.data.summaryId;

    // Edit Case 2 (increments version: 1 -> 2, status -> edited)
    const edit2 = await request(app)
      .patch(`/api/v1/cases/${caseIdEdited}/summary`)
      .set('x-user-id', clinicianUser)
      .send({ severity: 'Moderate to severe' });
    assert.equal(edit2.status, 200);
    assert.equal(edit2.body.data.version, 2);
    assert.equal(edit2.body.data.status, 'edited');

    // Setup Case 3: For Draft -> Confirm flow
    const res3 = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: {
          firstName: 'Ramesh',
          lastName: 'Shinde',
          age: 60,
          gender: 'male'
        }
      });
    assert.equal(res3.status, 201);
    caseIdDraft = res3.body.data.caseId;

    await ClinicalHistory.create({
      clinicalHistoryId: `clh-${crypto.randomUUID()}`,
      caseId: caseIdDraft,
      patientId: res3.body.data.patientId,
      sessionId: 'sess-p09-3',
      ownerId: clinicianUser,
      status: 'completed',
      structuredData: {
        chiefComplaint: { text: 'Knee joint pain' },
        symptoms: [{ name: 'Joint pain', presence: true }]
      }
    });

    const gen3 = await request(app)
      .post(`/api/v1/cases/${caseIdDraft}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send();
    assert.equal(gen3.status, 201);
    summaryIdDraft = gen3.body.data.summaryId;
    assert.equal(gen3.body.data.status, 'draft');
  });

  after(async () => {
    clinicalSummaryService.resetMockGenerator();
    await disconnectDatabase();
  });

  // -------------------------------------------------------------
  // VALID CONFIRMATION WORKFLOWS
  // -------------------------------------------------------------

  test('1. Confirm valid reviewed summary succeeds (POST /summary/confirm)', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseIdReviewed}/summary/confirm`)
      .set('x-user-id', clinicianUser)
      .send({
        summaryId: summaryIdReviewed,
        version: 1,
        notes: 'Final review verified and confirmed'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.summary.status, 'confirmed');
    assert.equal(res.body.data.summary.version, 1);
    assert.equal(res.body.data.summary.confirmedVersion, 1);
    assert.equal(res.body.data.summary.confirmedBy, clinicianUser);
    assert.ok(res.body.data.summary.confirmedAt);
  });

  test('2. Case transitions to status: completed and workflowStage: completed', async () => {
    const caseDoc = await Case.findOne({ caseId: caseIdReviewed });
    assert.ok(caseDoc);
    assert.equal(caseDoc.status, 'completed');
    assert.equal(caseDoc.workflowStage, 'completed');
  });

  test('3. Clinical session transitions to status: completed with endedAt timestamp', async () => {
    const sessions = await ClinicalSession.find({ caseId: caseIdReviewed });
    assert.ok(sessions.length > 0);
    for (const sess of sessions) {
      assert.equal(sess.status, 'completed');
      assert.ok(sess.endedAt);
    }
  });

  test('4. Confirm valid edited summary (version 2) succeeds', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseIdEdited}/summary/confirm`)
      .set('x-user-id', clinicianUser)
      .send({
        summaryId: summaryIdEdited,
        version: 2
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.summary.status, 'confirmed');
    assert.equal(res.body.data.summary.version, 2);
    assert.equal(res.body.data.summary.confirmedVersion, 2);
    assert.equal(res.body.data.case.status, 'completed');
    assert.equal(res.body.data.case.workflowStage, 'completed');
  });

  test('5. Confirm valid draft summary directly succeeds', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseIdDraft}/summary/confirm`)
      .set('x-user-id', clinicianUser)
      .send();

    assert.equal(res.status, 200);
    assert.equal(res.body.data.summary.status, 'confirmed');
    assert.equal(res.body.data.case.status, 'completed');
    assert.equal(res.body.data.case.workflowStage, 'completed');
  });

  // -------------------------------------------------------------
  // CONCURRENCY & STALE VERSION PROTECTION
  // -------------------------------------------------------------

  test('6. Stale version confirmation is rejected with 409 Conflict', async () => {
    // Create a new case with version 2
    const res = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: { firstName: 'Sunita', lastName: 'Rao', age: 40, gender: 'female' }
      });
    const cId = res.body.data.caseId;

    await ClinicalHistory.create({
      clinicalHistoryId: `clh-${crypto.randomUUID()}`,
      caseId: cId,
      patientId: res.body.data.patientId,
      sessionId: 'sess-p09-stale',
      ownerId: clinicianUser,
      status: 'completed',
      structuredData: { chiefComplaint: { text: 'Back pain' } }
    });

    await request(app).post(`/api/v1/cases/${cId}/summary/generate`).set('x-user-id', clinicianUser);
    // Edit to advance to version 2
    await request(app).patch(`/api/v1/cases/${cId}/summary`).set('x-user-id', clinicianUser).send({ severity: 'Severe' });

    // Try confirming with stale version 1
    const staleRes = await request(app)
      .post(`/api/v1/cases/${cId}/summary/confirm`)
      .set('x-user-id', clinicianUser)
      .send({ version: 1 });

    assert.equal(staleRes.status, 409);
    assert.equal(staleRes.body.error.code, 'STALE_VERSION');
  });

  test('7. Future/invalid version number is rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: { firstName: 'Deepak', lastName: 'Joshi', age: 37, gender: 'male' }
      });
    const cId = res.body.data.caseId;

    await ClinicalHistory.create({
      clinicalHistoryId: `clh-${crypto.randomUUID()}`,
      caseId: cId,
      patientId: res.body.data.patientId,
      sessionId: 'sess-p09-invver',
      ownerId: clinicianUser,
      status: 'completed',
      structuredData: { chiefComplaint: { text: 'Cough' } }
    });

    await request(app).post(`/api/v1/cases/${cId}/summary/generate`).set('x-user-id', clinicianUser);

    const invRes = await request(app)
      .post(`/api/v1/cases/${cId}/summary/confirm`)
      .set('x-user-id', clinicianUser)
      .send({ version: 99 });

    assert.equal(invRes.status, 400);
    assert.equal(invRes.body.error.code, 'INVALID_VERSION');
  });

  test('8. Summary ID mismatch is rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: { firstName: 'Sneha', lastName: 'More', age: 29, gender: 'female' }
      });
    const cId = res.body.data.caseId;

    await ClinicalHistory.create({
      clinicalHistoryId: `clh-${crypto.randomUUID()}`,
      caseId: cId,
      patientId: res.body.data.patientId,
      sessionId: 'sess-p09-mismatch',
      ownerId: clinicianUser,
      status: 'completed',
      structuredData: { chiefComplaint: { text: 'Fever' } }
    });

    await request(app).post(`/api/v1/cases/${cId}/summary/generate`).set('x-user-id', clinicianUser);

    const mismatchRes = await request(app)
      .post(`/api/v1/cases/${cId}/summary/confirm`)
      .set('x-user-id', clinicianUser)
      .send({ summaryId: 'sum-completely-wrong-id' });

    assert.equal(mismatchRes.status, 400);
    assert.equal(mismatchRes.body.error.code, 'SUMMARY_ID_MISMATCH');
  });

  // -------------------------------------------------------------
  // IDEMPOTENCY
  // -------------------------------------------------------------

  test('9. Repeated confirmation on already confirmed summary is idempotent and safe', async () => {
    // caseIdReviewed was already confirmed in test 1
    const res = await request(app)
      .post(`/api/v1/cases/${caseIdReviewed}/summary/confirm`)
      .set('x-user-id', clinicianUser)
      .send({ summaryId: summaryIdReviewed, version: 1 });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.summary.status, 'confirmed');
    assert.equal(res.body.data.case.status, 'completed');

    // Confirm no duplicate confirmation records in summary
    const summaryDoc = await ClinicalSummary.findOne({ caseId: caseIdReviewed });
    assert.ok(summaryDoc);
    assert.equal(summaryDoc.status, 'confirmed');
    assert.equal(summaryDoc.confirmedVersion, 1);
  });

  // -------------------------------------------------------------
  // AUTHORIZATION & ISOLATION
  // -------------------------------------------------------------

  test('10. User A cannot confirm User B case (404 isolation)', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseIdReviewed}/summary/confirm`)
      .set('x-user-id', otherClinicianUser)
      .send();

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
  });

  test('11. Non-existent case returns 404', async () => {
    const res = await request(app)
      .post('/api/v1/cases/case-nonexistent-9999/summary/confirm')
      .set('x-user-id', clinicianUser)
      .send();

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
  });

  test('12. Case without generated summary returns 404 SUMMARY_NOT_FOUND', async () => {
    const newCase = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: { firstName: 'Kavita', lastName: 'Shinde', age: 31, gender: 'female' }
      });
    const cId = newCase.body.data.caseId;

    const res = await request(app)
      .post(`/api/v1/cases/${cId}/summary/confirm`)
      .set('x-user-id', clinicianUser)
      .send();

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'SUMMARY_NOT_FOUND');
  });

  // -------------------------------------------------------------
  // IMMUTABILITY OF CONFIRMED SUMMARY
  // -------------------------------------------------------------

  test('13. Confirmed summary cannot be edited (PATCH /summary returns 400)', async () => {
    const res = await request(app)
      .patch(`/api/v1/cases/${caseIdReviewed}/summary`)
      .set('x-user-id', clinicianUser)
      .send({ chiefConcern: 'Attempted edit after confirm' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'SUMMARY_ALREADY_CONFIRMED');
  });

  test('14. Confirmed summary cannot be reviewed (POST /summary/review returns 400)', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseIdReviewed}/summary/review`)
      .set('x-user-id', clinicianUser)
      .send({ notes: 'Attempted review after confirm' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'SUMMARY_ALREADY_CONFIRMED');
  });

  test('15. Confirmed summary cannot be regenerated (POST /summary/generate returns 400)', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseIdReviewed}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send({ forceRegenerate: true });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'SUMMARY_ALREADY_CONFIRMED');
  });

  test('16. Preserves originalGeneratedSummary and revisionHistory after confirmation', async () => {
    const summaryDoc = await ClinicalSummary.findOne({ caseId: caseIdEdited });
    assert.ok(summaryDoc);
    assert.ok(summaryDoc.originalGeneratedSummary);
    assert.equal(summaryDoc.revisionHistory.length, 1);
    assert.equal(summaryDoc.status, 'confirmed');
    assert.equal(summaryDoc.confirmedVersion, 2);
  });

  test('17. Strict validator rejects unrecognized keys such as arbitrary status', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseIdReviewed}/summary/confirm`)
      .set('x-user-id', clinicianUser)
      .send({
        status: 'confirmed',
        unauthorizedField: 'malicious'
      });

    assert.equal(res.status, 400);
  });

  test('18. GET /cases/:caseId/summary returns confirmed status and audit fields', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdReviewed}/summary`)
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'confirmed');
    assert.equal(res.body.data.confirmedBy, clinicianUser);
    assert.ok(res.body.data.confirmedAt);
    assert.equal(res.body.data.confirmedVersion, 1);
  });

  test('19. GET /cases/:caseId returns status completed and workflowStage completed', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdReviewed}`)
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'completed');
    assert.equal(res.body.data.workflowStage, 'completed');
  });

  test('20. GET /cases?status=completed lists the confirmed case', async () => {
    const res = await request(app)
      .get('/api/v1/cases?status=completed')
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 200);
    const matched = res.body.data.cases.find((c: any) => c.caseId === caseIdReviewed);
    assert.ok(matched);
    assert.equal(matched.status, 'completed');
    assert.equal(matched.workflowStage, 'completed');
  });

  test('21. Confirmation does not alter section content or introduce hallucinations', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdReviewed}/summary`)
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.sections.chiefConcern, 'Intermittent dizziness');
    assert.equal(res.body.data.sections.symptoms, 'Dizziness');
  });

  test('22. Confirmation does not invoke Gemini API (strictly uses reviewed content)', async () => {
    let geminiInvoked = false;
    clinicalSummaryService.setMockGenerator(() => {
      geminiInvoked = true;
      throw new Error('Gemini must NOT be called during confirmation');
    });

    const res = await request(app)
      .post(`/api/v1/cases/${caseIdEdited}/summary/confirm`)
      .set('x-user-id', clinicianUser)
      .send();

    assert.equal(res.status, 200);
    assert.equal(geminiInvoked, false);
  });

  test('23. Confirmation notes are appended to summary reviewNotes', async () => {
    const summaryDoc = await ClinicalSummary.findOne({ caseId: caseIdReviewed });
    assert.ok(summaryDoc);
    assert.ok(summaryDoc.reviewNotes?.includes('Confirmation notes: Final review verified and confirmed'));
  });

  test('24. User A cannot view confirmed summary of User B (404 isolation)', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdReviewed}/summary`)
      .set('x-user-id', otherClinicianUser);

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
  });

  test('25. User A cannot view confirmed case of User B (404 isolation)', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdReviewed}`)
      .set('x-user-id', otherClinicianUser);

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
  });
});

