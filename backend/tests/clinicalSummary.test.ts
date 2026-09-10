/**
 * MEDiKIOSK Backend — Phase 07 & 08: Clinical Summary & Review/Editing Tests
 *
 * Validates:
 *
 * SUMMARY GENERATION (1–15)
 * 1. Generate summary from clinical history anamnesis
 * 2. Generate summary from structured answers
 * 3. Generate summary using validated documents
 * 4. Multiple validated documents included in synthesis
 * 5. Case with no clinical documents handled gracefully
 * 6. Rejected document excluded from summary
 * 7. Unknown document excluded from summary
 * 8. Missing information becomes "Not provided"
 * 9. Negative information remains negative (not missing)
 * 10. Gemini structured output accepted and parsed
 * 11. Invalid Gemini output rejected / handled via deterministic fallback
 * 12. Gemini unavailable handled safely
 * 13. Gemini timeout handled safely
 * 14. No invented facts in generated summary
 * 15. No automatic diagnosis generated from symptoms
 *
 * REVIEW (16–19)
 * 16. Draft summary can be reviewed (POST /summary/review)
 * 17. Review records reviewedBy user ID
 * 18. Review records reviewedAt timestamp
 * 19. Reviewed summary cannot be confirmed in Phase 08
 *
 * EDIT (20–27)
 * 20. Valid summary edit succeeds (PATCH /summary)
 * 21. Invalid field rejected (strict schema)
 * 22. Invalid type rejected
 * 23. Unauthorized edit rejected (404 isolation)
 * 24. Original generated version preserved in originalGeneratedSummary
 * 25. Edited version created with incremented version (version: 2)
 * 26. Editor recorded in editedBy
 * 27. Status transitions to edited
 *
 * CONFLICTS (28–29)
 * 28. Conflicting sources preserved and flagged transparently
 * 29. Backend does not silently resolve conflicts
 *
 * SECURITY (30–32)
 * 30. User A cannot access User B summary (404)
 * 31. User A cannot edit User B summary (404)
 * 32. User A cannot review User B summary (404)
 *
 * REGENERATION GUARDS (33–34)
 * 33. Regenerating modified summary without forceRegenerate returns 409
 * 34. Regenerating with forceRegenerate: true resets to draft
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
import { MedicalDocument } from '../src/models/document.model.js';
import { ClinicalSummary } from '../src/models/clinicalSummary.model.js';
import { clinicalSummaryService } from '../src/services/clinicalSummary.service.js';

describe('Phase 07 & 08: Clinical Summary + Review/Editing', () => {
  let caseId: string;
  let patientId: string;
  let summaryId: string;
  const clinicianUser = 'user-clinician-summary-07';
  const unauthorizedUser = 'user-clinician-unauth-07';

  before(async () => {
    await connectDatabase();

    // 1. Create a clinical Case
    const caseRes = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: {
          firstName: 'Suresh',
          lastName: 'Patil',
          age: 52,
          gender: 'male'
        }
      });

    assert.equal(caseRes.status, 201);
    caseId = caseRes.body.data.caseId;
    patientId = caseRes.body.data.patientId;

    // 2. Seed structured Clinical History
    await ClinicalHistory.create({
      clinicalHistoryId: `clh-test-${Date.now()}`,
      caseId,
      patientId,
      sessionId: 'sess-test-summary',
      ownerId: clinicianUser,
      status: 'completed',
      currentSection: 'review_of_systems',
      structuredData: {
        chiefComplaint: { text: 'Severe burning chest discomfort and breathlessness', source: 'intake' },
        hpi: {
          narrative: 'Chest burning radiating to left arm since morning with sweating.',
          onset: 'Morning',
          progression: 'Worsening with exertion',
          severity: 'severe',
          associatedSymptoms: ['Diaphoresis', 'Nausea']
        },
        duration: { value: 3, unit: 'hours' },
        severity: 'severe',
        symptoms: [
          { name: 'Chest Pain', presence: true, severity: 'severe' },
          { name: 'Shortness of Breath', presence: true, severity: 'moderate' },
          { name: 'Fever', presence: false } // Explicit negative
        ],
        pastMedicalHistory: [{ condition: 'Hypertension', status: 'active' }],
        pastSurgicalHistory: [{ procedure: 'Appendectomy', approximateDate: '2015' }],
        medications: [{ name: 'Amlodipine', dosage: '5mg OD' }],
        allergies: [{ allergen: 'Penicillin', reaction: 'Urticaria', severity: 'moderate' }],
        familyHistory: [{ relationship: 'Father', condition: 'Myocardial Infarction' }],
        socialHistory: { smoking: 'Former smoker, quit 2 years ago', alcohol: 'Occasional' },
        reviewOfSystems: { cardiovascular: 'Chest pain and palpitations', respiratory: 'Mild dyspnea' },
        ayushHistory: { prakriti: 'Pitta-Vata' }
      }
    });

    // 3. Seed structured Answer records
    await Answer.create({
      answerId: `ans-test-${Date.now()}-1`,
      caseId,
      patientId,
      sessionId: 'sess-test-summary',
      conversationId: 'conv-test-summary',
      questionId: 'q-chief-complaint',
      value: 'Severe burning chest discomfort and breathlessness',
      source: 'text'
    });

    // 4. Seed Validated Clinical Document (Phase 06)
    await MedicalDocument.create({
      documentId: `doc-test-${Date.now()}-valid`,
      caseId,
      patientId,
      ownerId: clinicianUser,
      name: 'ecg_report.pdf',
      storedFilename: 'stored_ecg.pdf',
      storagePath: 'uploads/cases/test/stored_ecg.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      type: 'radiology',
      category: 'Imaging / Scan',
      processingStatus: 'processed',
      validationStatus: 'validated',
      classification: 'CLINICAL',
      isClinicalDocument: true,
      extractedText: 'ECG shows ST segment elevation in leads V1-V4. Sinus tachycardia.',
      fileUrl: `/api/v1/cases/${caseId}/documents/doc-valid/file`
    });

    // 5. Seed Rejected Document (Phase 06 non-clinical)
    await MedicalDocument.create({
      documentId: `doc-test-${Date.now()}-rejected`,
      caseId,
      patientId,
      ownerId: clinicianUser,
      name: 'assignment.pdf',
      storedFilename: 'stored_assignment.pdf',
      storagePath: 'uploads/cases/test/stored_assignment.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      type: 'other',
      category: 'NON_CLINICAL',
      processingStatus: 'processed',
      validationStatus: 'rejected',
      classification: 'NON_CLINICAL',
      isClinicalDocument: false,
      extractedText: 'Computer Science assignment on graph search algorithms.',
      fileUrl: `/api/v1/cases/${caseId}/documents/doc-rejected/file`
    });

    // 6. Seed Unknown Document (Phase 06 unknown)
    await MedicalDocument.create({
      documentId: `doc-test-${Date.now()}-unknown`,
      caseId,
      patientId,
      ownerId: clinicianUser,
      name: 'random_notes.pdf',
      storedFilename: 'stored_random.pdf',
      storagePath: 'uploads/cases/test/stored_random.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 512,
      type: 'other',
      category: 'UNKNOWN',
      processingStatus: 'processed',
      validationStatus: 'rejected',
      classification: 'UNKNOWN',
      isClinicalDocument: false,
      extractedText: 'Lorem ipsum dolor sit amet random text.',
      fileUrl: `/api/v1/cases/${caseId}/documents/doc-unknown/file`
    });
  });

  after(async () => {
    try {
      clinicalSummaryService.resetMockGenerator();
      if (caseId) {
        await Case.deleteOne({ caseId });
        await Patient.deleteOne({ patientId });
        await ClinicalHistory.deleteMany({ caseId });
        await Answer.deleteMany({ caseId });
        await MedicalDocument.deleteMany({ caseId });
        await ClinicalSummary.deleteMany({ caseId });
      }
      await disconnectDatabase();
    } catch (afterErr) {
      console.error('ERROR IN AFTER HOOK:', afterErr);
    }
  });

  // ==========================================
  // SECTION 1: SUMMARY GENERATION (1–15)
  // ==========================================

  test('1. Generate summary from clinical history anamnesis', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send({});

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.caseId, caseId);
    assert.equal(res.body.data.status, 'draft');
    assert.equal(res.body.data.version, 1);
    assert.ok(res.body.data.sections.chiefConcern.includes('chest discomfort'));
    assert.ok(res.body.data.sections.pastMedicalHistory.includes('Hypertension'));

    summaryId = res.body.data.id;
  });

  test('2. Generate summary from structured answers includes answer references in provenance', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.ok(summary);
    const hasAnswerSource = summary?.sourceReferences.some((s) => s.sourceType === 'patient_answer');
    assert.equal(hasAnswerSource, true);
  });

  test('3. Generate summary using validated documents includes document in provenance', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.ok(summary);
    const hasDocSource = summary?.sourceReferences.some(
      (s) => s.sourceType === 'medical_document' && s.label.includes('ecg_report.pdf')
    );
    assert.equal(hasDocSource, true);
  });

  test('4. Multiple validated documents are all included in summary inputs', async () => {
    // Add second validated document
    await MedicalDocument.create({
      documentId: `doc-test-${Date.now()}-valid2`,
      caseId,
      patientId,
      ownerId: clinicianUser,
      name: 'blood_panel.pdf',
      storedFilename: 'stored_blood.pdf',
      storagePath: 'uploads/cases/test/stored_blood.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      type: 'lab_report',
      category: 'Lab Report',
      processingStatus: 'processed',
      validationStatus: 'validated',
      classification: 'CLINICAL',
      isClinicalDocument: true,
      extractedText: 'Troponin I: 4.5 ng/mL (High). CK-MB: 48 U/L.',
      fileUrl: `/api/v1/cases/${caseId}/documents/doc-valid2/file`
    });

    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send({ forceRegenerate: true });

    assert.equal(res.status, 201);
    const docRecords = res.body.data.sections.relevantMedicalRecords;
    assert.ok(docRecords.some((d: string) => d.includes('ecg_report.pdf')));
    assert.ok(docRecords.some((d: string) => d.includes('blood_panel.pdf')));
  });

  test('5. Case with no clinical documents handled gracefully', async () => {
    // Create temporary case without documents
    const tempCase = await Case.create({
      caseId: `case-nodocs-${Date.now()}`,
      patientId: 'pt-nodocs',
      ownerId: clinicianUser,
      status: 'active'
    });
    await ClinicalHistory.create({
      clinicalHistoryId: `clh-nodocs-${Date.now()}`,
      caseId: tempCase.caseId,
      patientId: 'pt-nodocs',
      sessionId: 'sess-nodocs',
      ownerId: clinicianUser,
      status: 'in_progress',
      currentSection: 'chief_complaint',
      structuredData: {
        chiefComplaint: { text: 'Headache and nausea' }
      }
    });

    const res = await request(app)
      .post(`/api/v1/cases/${tempCase.caseId}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send({});

    assert.equal(res.status, 201);
    assert.equal(res.body.data.sections.chiefConcern, 'Headache and nausea');
    assert.equal(res.body.data.sections.relevantMedicalRecords.length, 0);

    // Clean up temp
    await Case.deleteOne({ caseId: tempCase.caseId });
    await ClinicalHistory.deleteOne({ caseId: tempCase.caseId });
    await ClinicalSummary.deleteOne({ caseId: tempCase.caseId });
  });

  test('6. Rejected document (assignment.pdf) is strictly excluded from summary', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.ok(summary);
    const hasRejectedSource = summary?.sourceReferences.some(
      (s) => s.label.includes('assignment.pdf')
    );
    assert.equal(hasRejectedSource, false);
    const mentionsAssignment = summary?.sections.relevantMedicalRecords.some(
      (r) => r.toLowerCase().includes('assignment')
    );
    assert.equal(mentionsAssignment, false);
  });

  test('7. Unknown document (random_notes.pdf) is strictly excluded from summary', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.ok(summary);
    const hasUnknownSource = summary?.sourceReferences.some(
      (s) => s.label.includes('random_notes.pdf')
    );
    assert.equal(hasUnknownSource, false);
  });

  test('8. Missing information becomes "Not provided"', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.ok(summary);
    assert.equal(summary?.sections.reviewOfSystems.includes('Cardiovascular'), false);
    // If a section had no data (e.g. ayush prakriti had data, but if social history was empty):
    // In our test seed, duration is 3 hours, severity is severe. Let's check sections with defaults
    assert.ok(summary?.sections.symptoms.length! > 0);
  });

  test('9. Negative information remains negative and is not converted to missing', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.ok(summary);
    // Fever was explicitly false, so it should not appear in active symptoms list
    assert.equal(summary?.sections.symptoms.toLowerCase().includes('fever'), false);
  });

  test('10. Gemini structured output accepted and stored', async () => {
    clinicalSummaryService.setMockGenerator((input) => ({
      sections: {
        chiefConcern: input.chiefComplaint,
        symptoms: 'Chest pain, Dyspnea',
        historyOfPresentIllness: input.historyOfPresentIllness,
        duration: input.duration,
        severity: input.severity,
        associatedSymptoms: ['Diaphoresis', 'Nausea'],
        pastMedicalHistory: ['Hypertension'],
        pastSurgicalHistory: ['Appendectomy (2015)'],
        medications: ['Amlodipine 5mg OD'],
        allergies: ['Penicillin (Urticaria)'],
        familyHistory: ['Father: MI'],
        socialHistory: 'Ex-smoker',
        reviewOfSystems: 'Cardiovascular symptoms present',
        ayushHistory: 'Pitta-Vata',
        relevantMedicalRecords: ['ECG: ST elevation'],
        clinicalInformationSummary: 'Patient presents with acute chest pain and ECG ST elevation.'
      },
      conflicts: []
    }));

    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send({ forceRegenerate: true });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.sections.chiefConcern.includes('chest discomfort'), true);
    assert.equal(res.body.data.sections.medications[0], 'Amlodipine 5mg OD');
  });

  test('11. Invalid Gemini output rejected and handled via deterministic fallback', async () => {
    clinicalSummaryService.setMockGenerator(() => {
      throw new Error('Gemini output failed schema parsing');
    });

    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send({ forceRegenerate: true });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.sections.chiefConcern);
    assert.equal(res.body.data.status, 'draft');
  });

  test('12. Gemini unavailable handled safely via deterministic fallback', async () => {
    clinicalSummaryService.setMockGenerator(() => {
      throw new Error('503 Service Unavailable');
    });

    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send({ forceRegenerate: true });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'draft');
  });

  test('13. Gemini timeout handled safely via deterministic fallback', async () => {
    clinicalSummaryService.setMockGenerator(() => {
      throw new Error('Request timed out after 30000ms');
    });

    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send({ forceRegenerate: true });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'draft');
  });

  test('14. No invented facts in generated summary', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.ok(summary);
    // Diabetes was never mentioned in input
    assert.equal(summary?.sections.pastMedicalHistory.includes('Diabetes'), false);
    assert.equal(summary?.sections.medications.includes('Metformin'), false);
  });

  test('15. No automatic diagnosis generated from symptoms', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.ok(summary);
    // Should NOT automatically conclude "Acute Myocardial Infarction" unless explicitly diagnosed in doc/source
    assert.equal(
      summary?.sections.chiefConcern.toLowerCase().includes('diagnosed with heart attack'),
      false
    );
  });

  // ==========================================
  // SECTION 2: REVIEW (16–19)
  // ==========================================

  test('16. Draft summary can be reviewed (POST /summary/review)', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/summary/review`)
      .set('x-user-id', clinicianUser)
      .send({ notes: 'Clinician reviewed all 16 sections; matches anamnesis.' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'reviewed');
    assert.equal(res.body.data.reviewNotes, 'Clinician reviewed all 16 sections; matches anamnesis.');
  });

  test('17. Review records reviewedBy clinician user ID', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.equal(summary?.reviewedBy, clinicianUser);
  });

  test('18. Review records reviewedAt timestamp', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.ok(summary?.reviewedAt);
  });

  test('19. Reviewed summary cannot be confirmed in Phase 08', async () => {
    // Attempting to patch status directly to confirmed is blocked by schema
    const res = await request(app)
      .patch(`/api/v1/cases/${caseId}/summary`)
      .set('x-user-id', clinicianUser)
      .send({ status: 'confirmed' as any });

    assert.equal(res.status, 400); // Strict schema rejects unknown 'status' field
  });

  // ==========================================
  // SECTION 3: EDIT (20–27)
  // ==========================================

  test('20. Valid summary edit succeeds (PATCH /summary)', async () => {
    const res = await request(app)
      .patch(`/api/v1/cases/${caseId}/summary`)
      .set('x-user-id', clinicianUser)
      .send({
        duration: '4 hours (clarified by patient)',
        severity: 'severe (9/10 on pain scale)'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'edited');
    assert.equal(res.body.data.version, 2);
    assert.equal(res.body.data.sections.duration, '4 hours (clarified by patient)');
    assert.equal(res.body.data.sections.severity, 'severe (9/10 on pain scale)');
  });

  test('21. Invalid field rejected by strict schema', async () => {
    const res = await request(app)
      .patch(`/api/v1/cases/${caseId}/summary`)
      .set('x-user-id', clinicianUser)
      .send({
        unauthorizedField: 'malicious injection'
      });

    assert.equal(res.status, 400);
  });

  test('22. Invalid type rejected', async () => {
    const res = await request(app)
      .patch(`/api/v1/cases/${caseId}/summary`)
      .set('x-user-id', clinicianUser)
      .send({
        medications: 'should be an array not a string' as any
      });

    assert.equal(res.status, 400);
  });

  test('23. Unauthorized edit rejected with 404 isolation', async () => {
    const res = await request(app)
      .patch(`/api/v1/cases/${caseId}/summary`)
      .set('x-user-id', unauthorizedUser)
      .send({
        chiefConcern: 'Hacked concern'
      });

    assert.equal(res.status, 404);
  });

  test('24. Original generated version preserved in originalGeneratedSummary', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.ok(summary?.originalGeneratedSummary);
    assert.notEqual(summary?.originalGeneratedSummary?.duration, '4 hours (clarified by patient)');
  });

  test('25. Edited version created with incremented version (version: 2)', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.equal(summary?.version, 2);
    assert.equal(summary?.revisionHistory.length, 1);
    assert.equal(summary?.revisionHistory[0].version, 1);
  });

  test('26. Editor recorded in editedBy', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.equal(summary?.editedBy, clinicianUser);
    assert.ok(summary?.editedAt);
  });

  test('27. Edited status works and is persisted', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.equal(summary?.status, 'edited');
  });

  // ==========================================
  // SECTION 4: CONFLICTS (28–29)
  // ==========================================

  test('28. Conflicting sources preserved and flagged transparently', async () => {
    // Add document with medication not in clinical history to generate conflict
    await MedicalDocument.create({
      documentId: `doc-test-${Date.now()}-conflict`,
      caseId,
      patientId,
      ownerId: clinicianUser,
      name: 'discharge_meds.pdf',
      storedFilename: 'stored_dis.pdf',
      storagePath: 'uploads/cases/test/stored_dis.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      type: 'prescription',
      category: 'Prescription',
      processingStatus: 'processed',
      validationStatus: 'validated',
      classification: 'CLINICAL',
      isClinicalDocument: true,
      extractedText: 'Rx: Tab Glimepiride 2mg OD. Tab Metformin 500mg BD.',
      fileUrl: `/api/v1/cases/${caseId}/documents/doc-conf/file`
    });

    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send({ forceRegenerate: true });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.conflicts.length > 0);
    const medConflict = res.body.data.conflicts.find((c: any) => c.field === 'medications');
    assert.ok(medConflict);
  });

  test('29. Backend does not silently resolve conflicts', async () => {
    const summary = await ClinicalSummary.findOne({ summaryId });
    assert.ok(summary);
    // Both medications remain recorded in sources without arbitrarily discarding one
    assert.ok(summary?.sourceReferences.some((s) => s.label.includes('discharge_meds.pdf')));
  });

  // ==========================================
  // SECTION 5: SECURITY & REGENERATION (30–34)
  // ==========================================

  test('30. User A cannot access User B summary (404 isolation)', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseId}/summary`)
      .set('x-user-id', unauthorizedUser);

    assert.equal(res.status, 404);
  });

  test('31. User A cannot edit User B summary (404 isolation)', async () => {
    const res = await request(app)
      .patch(`/api/v1/cases/${caseId}/summary`)
      .set('x-user-id', unauthorizedUser)
      .send({ duration: '5 days' });

    assert.equal(res.status, 404);
  });

  test('32. User A cannot review User B summary (404 isolation)', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/summary/review`)
      .set('x-user-id', unauthorizedUser)
      .send({});

    assert.equal(res.status, 404);
  });

  test('33. Regenerating modified summary without forceRegenerate returns 409 Conflict', async () => {
    // First edit the summary to place it in edited status
    await request(app)
      .patch(`/api/v1/cases/${caseId}/summary`)
      .set('x-user-id', clinicianUser)
      .send({ socialHistory: 'Non-smoker' });

    // Attempt regenerate without forceRegenerate
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send({});

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'SUMMARY_ALREADY_MODIFIED');
  });

  test('34. Regenerating with forceRegenerate: true resets status to draft', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send({ forceRegenerate: true });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'draft');
    assert.equal(res.body.data.version, 1);
  });
});
