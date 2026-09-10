/**
 * MEDiKIOSK Backend — Phase 11: Core Backend QA + Hardening Automated Test Suite
 * Exhaustively validates end-to-end clinical workflow, multi-tenant isolation,
 * state machine enforcement, idempotency, rate limiting, error resilience,
 * and secret sanitization.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { MedicalDocument } from '../src/models/document.model.js';
import { ClinicalHistory } from '../src/models/clinicalHistory.model.js';
import { clinicalSummaryService } from '../src/services/clinicalSummary.service.js';
import { geminiService } from '../src/services/gemini.service.js';
import { fhirBundleSchema } from '../src/fhir/validators/fhir.validator.js';

describe('Phase 11: Core Backend QA + Hardening', () => {
  const clinicianA = 'user-clinician-qa-alpha';
  const clinicianB = 'user-clinician-qa-beta';

  let caseIdA: string;
  let patientIdA: string;
  let sessionIdA: string;
  let docIdA: string;
  let summaryIdA: string;

  before(async () => {
    await connectDatabase();

    // Mock clinical summary generator to run deterministically without hitting external Gemini quota
    clinicalSummaryService.setMockGenerator((input) => ({
      sections: {
        chiefConcern: input.chiefComplaint,
        symptoms: input.symptoms.join(', ') || 'Fever, Cough',
        historyOfPresentIllness: input.historyOfPresentIllness || 'Developed 3 days ago',
        duration: input.duration || '3 days',
        severity: input.severity || 'moderate',
        associatedSymptoms: input.associatedSymptoms || [],
        pastMedicalHistory: input.pastMedicalHistory || [],
        pastSurgicalHistory: input.pastSurgicalHistory || [],
        medications: input.medications || ['Paracetamol 500mg'],
        allergies: input.allergies || ['Sulfa drugs'],
        familyHistory: input.familyHistory || [],
        socialHistory: input.socialHistory || 'Non-smoker',
        reviewOfSystems: input.reviewOfSystems || 'No respiratory distress',
        ayushHistory: input.ayushHistory || 'None',
        relevantMedicalRecords: ['Lab Report: cbc_report.pdf'],
        clinicalInformationSummary: `Authoritative clinical summary for case ${input.caseId}`
      },
      conflicts: []
    }));

    // Setup Authoritative Case A for Clinician A
    const res = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianA)
      .send({
        patientData: {
          firstName: 'Kavita',
          lastName: 'Deshmukh',
          age: 38,
          gender: 'female',
          dateOfBirth: '1988-03-22',
          contactNumber: '+919811223344',
          bloodGroup: 'O+',
          abhaId: '91-3344-5566-7788'
        }
      });

    assert.equal(res.status, 201);
    caseIdA = res.body.data.caseId;
    patientIdA = res.body.data.patientId;
    sessionIdA = res.body.data.sessionId;
  });

  after(async () => {
    clinicalSummaryService.resetMockGenerator();
    await disconnectDatabase();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. END-TO-END CORE WORKFLOW VALIDATION (Phases 01 -> 10)
  // ─────────────────────────────────────────────────────────────
  describe('1. Full Core Workflow Integration (End-to-End)', () => {
    it('1.1. Ingests patient and initializes active clinical case & session (Phase 02)', async () => {
      const res = await request(app)
        .post('/api/v1/cases')
        .set('x-user-id', clinicianA)
        .send({
          patientData: {
            firstName: 'Aarav',
            lastName: 'Sharma',
            age: 29,
            gender: 'male'
          }
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.caseId);
      assert.ok(res.body.data.patientId);
      assert.ok(res.body.data.sessionId);
      assert.equal(res.body.data.status, 'active');
      assert.equal(res.body.data.workflowStage, 'clinical_history');
    });

    it('1.2. Drives structured clinical anamnesis updates via session (Phase 03/04)', async () => {
      const history = await ClinicalHistory.create({
        clinicalHistoryId: `clh-${crypto.randomUUID()}`,
        caseId: caseIdA,
        patientId: patientIdA,
        sessionId: sessionIdA,
        ownerId: clinicianA,
        status: 'completed',
        structuredData: {
          chiefComplaint: { text: 'Intermittent high fever and productive cough' },
          symptoms: [
            { name: 'High fever', presence: true, severity: 'moderate' },
            { name: 'Productive cough', presence: true, severity: 'moderate' },
            { name: 'Chest pain', presence: false } // Negative symptom
          ],
          medications: [
            { name: 'Paracetamol', dosage: '500mg', frequency: 'TDS' }
          ],
          allergies: [
            { allergen: 'Sulfa drugs', reaction: 'Rash', severity: 'moderate' }
          ]
        }
      });

      assert.ok(history);
      assert.equal(history.status, 'completed');
      assert.equal(history.structuredData.symptoms?.length, 3);
    });

    it('1.3. Uploads and attaches a validated medical record document (Phase 05/06)', async () => {
      docIdA = `doc-${Date.now().toString().slice(-4)}${crypto.randomInt(1000, 9999)}`;
      const doc = await MedicalDocument.create({
        documentId: docIdA,
        caseId: caseIdA,
        patientId: patientIdA,
        ownerId: clinicianA,
        name: 'cbc_report.pdf',
        storedFilename: `${docIdA}_cbc.pdf`,
        storagePath: `uploads/cases/${caseIdA}/${docIdA}_cbc.pdf`,
        fileUrl: `/api/v1/cases/${caseIdA}/documents/${docIdA}/file`,
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        type: 'lab_report',
        category: 'Lab Report',
        processingStatus: 'processed',
        validationStatus: 'validated',
        isClinicalDocument: true,
        classification: 'CLINICAL',
        extractedText: 'Complete Blood Count: Hemoglobin 13.2 g/dL, Total WBC 9,500 /mcL, Platelets 220,000 /mcL.'
      });

      assert.ok(doc);
      assert.equal(doc.isClinicalDocument, true);
      assert.equal(doc.validationStatus, 'validated');
    });

    it('1.4. Generates clinical summary draft synthesising history and documents (Phase 07)', async () => {
      const genRes = await request(app)
        .post(`/api/v1/cases/${caseIdA}/summary/generate`)
        .set('x-user-id', clinicianA)
        .send();

      assert.equal(genRes.status, 201);
      assert.equal(genRes.body.success, true);
      assert.equal(genRes.body.data.status, 'draft');
      assert.equal(genRes.body.data.version, 1);

      summaryIdA = genRes.body.data.summaryId;
    });

    it('1.5. Reviews and edits summary while tracking revision history (Phase 08)', async () => {
      // Review
      const revRes = await request(app)
        .post(`/api/v1/cases/${caseIdA}/summary/review`)
        .set('x-user-id', clinicianA)
        .send({ notes: 'Verified lab reports and patient history.' });

      assert.equal(revRes.status, 200);
      assert.equal(revRes.body.data.status, 'reviewed');

      // Edit
      const editRes = await request(app)
        .patch(`/api/v1/cases/${caseIdA}/summary`)
        .set('x-user-id', clinicianA)
        .send({
          symptoms: 'High fever (102F), productive cough with green phlegm'
        });

      assert.equal(editRes.status, 200);
      assert.equal(editRes.body.data.status, 'edited');
      assert.equal(editRes.body.data.version, 2);
      assert.equal(editRes.body.data.revisionHistory.length, 1);
    });

    it('1.6. Confirms summary, finalizes clinical case, and marks workflow complete (Phase 09)', async () => {
      const confRes = await request(app)
        .post(`/api/v1/cases/${caseIdA}/summary/confirm`)
        .set('x-user-id', clinicianA)
        .send({ summaryId: summaryIdA, version: 2 });

      assert.equal(confRes.status, 200);
      assert.equal(confRes.body.success, true);
      assert.equal(confRes.body.data.summary.status, 'confirmed');
      assert.equal(confRes.body.data.case.status, 'completed');
      assert.equal(confRes.body.data.case.workflowStage, 'completed');
    });

    it('1.7. Exports valid standard FHIR R4 Bundle for finalized case (Phase 10)', async () => {
      const fhirRes = await request(app)
        .get(`/api/v1/cases/${caseIdA}/fhir`)
        .set('x-user-id', clinicianA);

      assert.equal(fhirRes.status, 200);
      assert.equal(fhirRes.body.resourceType, 'Bundle');
      assert.equal(fhirRes.body.type, 'collection');

      const parsed = fhirBundleSchema.safeParse(fhirRes.body);
      assert.ok(parsed.success, 'Generated bundle conforms strictly to FHIR R4 schema');

      const entryTypes = fhirRes.body.entry.map((e: any) => e.resource.resourceType);
      assert.ok(entryTypes.includes('Patient'));
      assert.ok(entryTypes.includes('Encounter'));
      assert.ok(entryTypes.includes('Observation'));
      assert.ok(entryTypes.includes('MedicationStatement'));
      assert.ok(entryTypes.includes('AllergyIntolerance'));
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. MULTI-TENANT AUTHORIZATION & OWNERSHIP ISOLATION
  // ─────────────────────────────────────────────────────────────
  describe('2. Multi-Tenant Authorization & Ownership Isolation', () => {
    it('2.1. Clinician B cannot access Clinician A case (404 isolation)', async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${caseIdA}`)
        .set('x-user-id', clinicianB);

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
    });

    it('2.2. Clinician B cannot update Clinician A case (404 isolation)', async () => {
      const res = await request(app)
        .patch(`/api/v1/cases/${caseIdA}`)
        .set('x-user-id', clinicianB)
        .send({ workflowStage: 'medical_records' });

      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
    });

    it('2.3. Clinician B cannot post session messages to Clinician A session (404 isolation)', async () => {
      const res = await request(app)
        .post(`/api/v1/clinical-sessions/${sessionIdA}/messages`)
        .set('x-user-id', clinicianB)
        .send({ content: 'Attempt unauthorized access to session' });

      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'SESSION_NOT_FOUND');
    });

    it('2.4. Clinician B cannot retrieve Clinician A documents (404 isolation)', async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${caseIdA}/documents`)
        .set('x-user-id', clinicianB);

      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
    });

    it('2.5. Clinician B cannot retrieve Clinician A clinical summary (404 isolation)', async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${caseIdA}/summary`)
        .set('x-user-id', clinicianB);

      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
    });

    it('2.6. Clinician B cannot export Clinician A FHIR Bundle (404 isolation)', async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${caseIdA}/fhir`)
        .set('x-user-id', clinicianB);

      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. CASE & SUMMARY STATE MACHINE ENFORCEMENT
  // ─────────────────────────────────────────────────────────────
  describe('3. State Machine & Lifecycle Transitions', () => {
    it('3.1. Rejects invalid transition from completed back to active on Case (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/cases/${caseIdA}`)
        .set('x-user-id', clinicianA)
        .send({ status: 'active' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'INVALID_STATE_TRANSITION');
    });

    it('3.2. Allows valid transition from completed to archived on Case', async () => {
      const res = await request(app)
        .patch(`/api/v1/cases/${caseIdA}`)
        .set('x-user-id', clinicianA)
        .send({ status: 'archived' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'archived');
    });

    it('3.3. Rejects any further mutations on an archived case (400 CASE_ARCHIVED)', async () => {
      const res = await request(app)
        .patch(`/api/v1/cases/${caseIdA}`)
        .set('x-user-id', clinicianA)
        .send({ workflowStage: 'clinical_history' });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'CASE_ARCHIVED');
    });

    it('3.4. Rejects editing a confirmed clinical summary (400 SUMMARY_ALREADY_CONFIRMED)', async () => {
      const res = await request(app)
        .patch(`/api/v1/cases/${caseIdA}/summary`)
        .set('x-user-id', clinicianA)
        .send({ symptoms: 'Attempted edit after confirmation' });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'SUMMARY_ALREADY_CONFIRMED');
    });

    it('3.5. Rejects regenerating a confirmed clinical summary (400 SUMMARY_ALREADY_CONFIRMED)', async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${caseIdA}/summary/generate`)
        .set('x-user-id', clinicianA)
        .send();

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'SUMMARY_ALREADY_CONFIRMED');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. CONCURRENCY & IDEMPOTENCY HARDENING
  // ─────────────────────────────────────────────────────────────
  describe('4. Concurrency & Idempotency Hardening', () => {
    it('4.1. Double confirmation succeeds idempotently without mutating records or erroring', async () => {
      const confRes = await request(app)
        .post(`/api/v1/cases/${caseIdA}/summary/confirm`)
        .set('x-user-id', clinicianA)
        .send({ summaryId: summaryIdA });

      assert.equal(confRes.status, 200);
      assert.equal(confRes.body.success, true);
      assert.equal(confRes.body.data.summary.status, 'confirmed');
      assert.equal(confRes.body.data.summary.version, 2);
    });

    it('4.2. Stale version confirmation is rejected with 409 STALE_VERSION', async () => {
      // Create a fresh case + clinical history + draft summary for this check
      const cRes = await request(app)
        .post('/api/v1/cases')
        .set('x-user-id', clinicianA)
        .send({ patientData: { firstName: 'Suresh', lastName: 'Rao', age: 50, gender: 'male' } });

      const testCaseId = cRes.body.data.caseId;
      const testPtId = cRes.body.data.patientId;
      const testSessId = cRes.body.data.sessionId;

      await ClinicalHistory.create({
        clinicalHistoryId: `clh-${crypto.randomUUID()}`,
        caseId: testCaseId,
        patientId: testPtId,
        sessionId: testSessId,
        ownerId: clinicianA,
        status: 'completed',
        structuredData: { chiefComplaint: { text: 'Headache' } }
      });

      await request(app)
        .post(`/api/v1/cases/${testCaseId}/summary/generate`)
        .set('x-user-id', clinicianA)
        .send();

      // Edit to version 2
      await request(app)
        .patch(`/api/v1/cases/${testCaseId}/summary`)
        .set('x-user-id', clinicianA)
        .send({ symptoms: 'Updated headache symptom' });

      // Attempt confirming with stale version 1
      const staleRes = await request(app)
        .post(`/api/v1/cases/${testCaseId}/summary/confirm`)
        .set('x-user-id', clinicianA)
        .send({ version: 1 });

      assert.equal(staleRes.status, 409);
      assert.equal(staleRes.body.error.code, 'STALE_VERSION');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. INPUT VALIDATION & PARAMETER HARDENING
  // ─────────────────────────────────────────────────────────────
  describe('5. Input Validation & Parameter Hardening', () => {
    it('5.1. Rejects invalid enum values in case creation (400 VALIDATION_ERROR)', async () => {
      const res = await request(app)
        .post('/api/v1/cases')
        .set('x-user-id', clinicianA)
        .send({
          patientData: {
            firstName: 'Asha',
            gender: 'invalid_gender_value'
          }
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('5.2. Rejects negative or out-of-range patient age (400 VALIDATION_ERROR)', async () => {
      const res = await request(app)
        .post('/api/v1/cases')
        .set('x-user-id', clinicianA)
        .send({
          patientData: {
            firstName: 'Asha',
            age: 250 // Exceeds max 130
          }
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('5.3. Rejects pagination limit exceeding max 100 on list cases', async () => {
      const res = await request(app)
        .get('/api/v1/cases?limit=500')
        .set('x-user-id', clinicianA);

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('5.4. Rejects empty message content in conversation', async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${caseIdA}/conversation/messages`)
        .set('x-user-id', clinicianA)
        .send({ content: '   ' });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. RATE LIMITING & ABUSE PROTECTION
  // ─────────────────────────────────────────────────────────────
  describe('6. Rate Limiting & Abuse Protection', () => {
    it('6.1. Enforces rate limiting on /api when x-test-rate-limit is enabled', async () => {
      const clientIp = '198.51.100.42';

      // Send requests rapidly with the test header to trigger rate limit
      let hitRateLimit = false;
      for (let i = 0; i < 130; i++) {
        const res = await request(app)
          .get('/api/v1')
          .set('x-test-rate-limit', 'true')
          .set('x-forwarded-for', clientIp);

        if (res.status === 429) {
          hitRateLimit = true;
          assert.equal(res.body.error.code, 'TOO_MANY_REQUESTS');
          assert.ok(res.headers['retry-after']);
          break;
        }
      }

      assert.ok(hitRateLimit, 'Rate limiter correctly triggered 429 TOO_MANY_REQUESTS');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. EXTERNAL SERVICE TIMEOUT PROTECTION
  // ─────────────────────────────────────────────────────────────
  describe('7. External Service Timeout Protection', () => {
    it('7.1. Generates 504 GEMINI_TIMEOUT if external model call hangs beyond threshold', async () => {
      // Simulate timeout by requesting generateText with a 1ms timeout
      await assert.rejects(
        async () => {
          await geminiService.generateText('Reply fast', { timeoutMs: 1 });
        },
        (err: any) => {
          assert.equal(err.errorCode, 'GEMINI_TIMEOUT');
          assert.equal(err.statusCode, 504);
          return true;
        }
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. SECRET LEAKAGE & SANITIZATION CHECKS
  // ─────────────────────────────────────────────────────────────
  describe('8. Secret Leakage & Output Sanitization', () => {
    it('8.1. API responses never expose GEMINI_API_KEY or connection strings', async () => {
      const res = await request(app)
        .get('/health')
        .set('x-user-id', clinicianA);

      const jsonStr = JSON.stringify(res.body);
      assert.ok(!jsonStr.includes('AIzaSy'), 'No Google API key snippet in health response');
      assert.ok(!jsonStr.includes('mongodb://'), 'No raw MongoDB credentials in response');
    });

    it('8.2. Medical Document responses never expose internal storage paths', async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${caseIdA}/documents`)
        .set('x-user-id', clinicianA);

      if (res.body.data && res.body.data.length > 0) {
        const docJson = JSON.stringify(res.body.data);
        assert.ok(!docJson.includes('storagePath'), 'storagePath deleted from JSON projection');
        assert.ok(!docJson.includes('storedFilename'), 'storedFilename deleted from JSON projection');
      }
    });

    it('8.3. Error responses in development do not leak stack traces to client', async () => {
      const res = await request(app)
        .get('/api/v1/cases/case-doesnotexist-1234')
        .set('x-user-id', clinicianA);

      assert.equal(res.status, 404);
      assert.equal(res.body.error.stack, undefined, 'No stack trace in client error payload');
    });
  });
});
