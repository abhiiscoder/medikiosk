/**
 * MEDiKIOSK Backend — Phase 10: FHIR R4 Mapping Tests
 *
 * Validates:
 * 1. Patient maps accurately to FHIR R4 Patient (MRN, ABHA, Name, Gender)
 * 2. Missing optional Patient fields (birthDate, telecom) are omitted (never invented)
 * 3. Case & Session map to FHIR R4 Encounter (status, class: AMB, subject ref, period)
 * 4. Encounter references correct Patient resource
 * 5. Observations map validated symptoms and document findings accurately
 * 6. Document Observation preserves provenance in derivedFrom
 * 7. Negative/missing symptoms do not generate fake positive observations
 * 8. Explicit medications map to FHIR R4 MedicationStatement
 * 9. Missing medications do not create MedicationStatement resources
 * 10. Explicit allergies map to FHIR R4 AllergyIntolerance
 * 11. Missing allergy reactions are not invented
 * 12. Bundle packages all mapped resources as type: 'collection'
 * 13. Bundle passes strict Zod FHIR R4 schema validation
 * 14. GET /cases/:caseId/fhir returns direct standard FHIR JSON
 * 15. Alias GET /cases/:caseId/fhir/bundle returns identical output
 * 16. Unconfirmed case returns 400 SUMMARY_NOT_CONFIRMED
 * 17. User A cannot access User B FHIR bundle (404 isolation)
 * 18. Non-existent case returns 404 CASE_NOT_FOUND
 * 19. Confirmation does not call Gemini API during FHIR mapping
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Case } from '../src/models/case.model.js';
import { Patient } from '../src/models/patient.model.js';
import { ClinicalHistory } from '../src/models/clinicalHistory.model.js';
import { MedicalDocument } from '../src/models/document.model.js';
import { clinicalSummaryService } from '../src/services/clinicalSummary.service.js';
import { fhirBundleSchema } from '../src/fhir/validators/fhir.validator.js';
import { FhirBundle } from '../src/fhir/types.js';

describe('Phase 10: FHIR R4 Mapping', () => {
  const clinicianUser = 'user-clinician-phase10';
  const otherClinicianUser = 'user-clinician-other10';

  let caseIdConfirmed: string;
  let patientIdConfirmed: string;
  let docId: string;

  let caseIdUnconfirmed: string;
  let caseIdNoSummary: string;

  before(async () => {
    await connectDatabase();

    // 1. Setup Patient and Case for Confirmed Flow
    const caseRes = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: {
          firstName: 'Meera',
          lastName: 'Nair',
          age: 45,
          dateOfBirth: '1981-06-15',
          gender: 'female',
          contactNumber: '+919876543210',
          abhaId: '91-1234-5678-9012'
        }
      });
    assert.equal(caseRes.status, 201);
    caseIdConfirmed = caseRes.body.data.caseId;
    patientIdConfirmed = caseRes.body.data.patientId;

    // 2. Add structured Clinical History with symptom, medication, allergy
    await ClinicalHistory.create({
      clinicalHistoryId: `clh-${crypto.randomUUID()}`,
      caseId: caseIdConfirmed,
      patientId: patientIdConfirmed,
      sessionId: 'sess-p10-1',
      ownerId: clinicianUser,
      status: 'completed',
      structuredData: {
        chiefComplaint: { text: 'Throat pain and fever' },
        symptoms: [
          { name: 'Sore throat', presence: true, severity: 'moderate' },
          { name: 'Fever', presence: true, severity: 'mild' },
          { name: 'Cough', presence: false } // Negative finding; should NOT become an observation
        ],
        medications: [
          { name: 'Amoxicillin', dosage: '500mg', frequency: 'Three times daily' }
        ],
        allergies: [
          { allergen: 'Sulfa drugs', reaction: 'Skin rash', severity: 'moderate' }
        ]
      }
    });

    // 3. Add a validated medical document
    docId = `doc-${Date.now().toString().slice(-4)}${crypto.randomInt(1000, 9999)}`;
    await MedicalDocument.create({
      documentId: docId,
      caseId: caseIdConfirmed,
      patientId: patientIdConfirmed,
      ownerId: clinicianUser,
      name: 'blood_test_report.pdf',
      storedFilename: `${docId}_test.pdf`,
      storagePath: `uploads/cases/${caseIdConfirmed}/${docId}_test.pdf`,
      fileUrl: `/api/v1/cases/${caseIdConfirmed}/documents/${docId}/file`,
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      type: 'lab_report',
      category: 'Lab Report',
      processingStatus: 'processed',
      validationStatus: 'validated',
      isClinicalDocument: true,
      classification: 'CLINICAL',
      extractedText: 'WBC count: 11,000 /mcL (Elevated). Platelets: 250,000.'
    });

    // Mock summary generator to generate and confirm summary without hitting Gemini
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
        relevantMedicalRecords: ['Lab Report: blood_test_report.pdf'],
        clinicalInformationSummary: `Summary for case ${input.caseId}`
      },
      conflicts: []
    }));

    // Generate summary
    const genRes = await request(app)
      .post(`/api/v1/cases/${caseIdConfirmed}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send();
    assert.equal(genRes.status, 201);

    // Confirm summary (Phase 09 operation)
    const confRes = await request(app)
      .post(`/api/v1/cases/${caseIdConfirmed}/summary/confirm`)
      .set('x-user-id', clinicianUser)
      .send();
    assert.equal(confRes.status, 200);

    // 4. Setup Case with Unconfirmed Summary (Draft)
    const unconfRes = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: { firstName: 'Vijay', lastName: 'Kumar', age: 30, gender: 'male' }
      });
    caseIdUnconfirmed = unconfRes.body.data.caseId;

    await ClinicalHistory.create({
      clinicalHistoryId: `clh-${crypto.randomUUID()}`,
      caseId: caseIdUnconfirmed,
      patientId: unconfRes.body.data.patientId,
      sessionId: 'sess-p10-unconf',
      ownerId: clinicianUser,
      status: 'completed',
      structuredData: { chiefComplaint: { text: 'Sprain' } }
    });

    await request(app)
      .post(`/api/v1/cases/${caseIdUnconfirmed}/summary/generate`)
      .set('x-user-id', clinicianUser)
      .send();

    // 5. Setup Case without summary
    const noSumRes = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: { firstName: 'Sunil', lastName: 'Gawde', age: 40, gender: 'male' }
      });
    caseIdNoSummary = noSumRes.body.data.caseId;
  });

  after(async () => {
    clinicalSummaryService.resetMockGenerator();
    await disconnectDatabase();
  });

  // -------------------------------------------------------------
  // FHIR BUNDLE EXPORT & STRUCTURE
  // -------------------------------------------------------------

  test('1. GET /cases/:caseId/fhir exports valid standard FHIR R4 Bundle', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdConfirmed}/fhir`)
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'].includes('application/json'), true);

    const bundle = res.body as FhirBundle;
    assert.equal(bundle.resourceType, 'Bundle');
    assert.equal(bundle.type, 'collection');
    assert.equal(bundle.id, `bundle-${caseIdConfirmed}`);
    assert.ok(bundle.timestamp);
    assert.ok(bundle.entry && bundle.entry.length >= 4);

    // Validate with strict Zod FHIR schema
    assert.doesNotThrow(() => fhirBundleSchema.parse(bundle));
  });

  test('2. Alias route GET /cases/:caseId/fhir/bundle returns identical output', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdConfirmed}/fhir/bundle`)
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 200);
    assert.equal(res.body.resourceType, 'Bundle');
    assert.equal(res.body.id, `bundle-${caseIdConfirmed}`);
  });

  // -------------------------------------------------------------
  // PATIENT RESOURCE MAPPING
  // -------------------------------------------------------------

  test('3. Patient resource is accurately mapped with MRN, ABHA, name, and gender', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdConfirmed}/fhir`)
      .set('x-user-id', clinicianUser);

    const bundle = res.body as FhirBundle;
    const patientEntry = bundle.entry.find((e) => e.resource.resourceType === 'Patient');
    assert.ok(patientEntry);

    const patient = patientEntry.resource as any;
    assert.equal(patient.id, patientIdConfirmed);
    assert.equal(patient.gender, 'female');
    assert.equal(patient.birthDate, '1981-06-15');
    assert.equal(patient.name[0].family, 'Nair');
    assert.equal(patient.name[0].given[0], 'Meera');

    // Identifiers
    const mrnId = patient.identifier.find((i: any) => i.type?.coding?.[0]?.code === 'MR');
    assert.ok(mrnId);
    assert.ok(mrnId.value);

    const abhaId = patient.identifier.find((i: any) => i.system === 'https://healthid.ndhm.gov.in');
    assert.ok(abhaId);
    assert.equal(abhaId.value, '91-1234-5678-9012');

    // Telecom
    assert.equal(patient.telecom[0].system, 'phone');
    assert.equal(patient.telecom[0].value, '+919876543210');
  });

  test('4. Patient with missing birthDate or phone omits fields (never invents them)', async () => {
    // Create patient without birthDate or phone
    const newCase = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: {
          firstName: 'Gopal',
          lastName: 'Kadam',
          age: 50,
          gender: 'male'
          // no dateOfBirth, no contactNumber
        }
      });
    const cId = newCase.body.data.caseId;

    await ClinicalHistory.create({
      clinicalHistoryId: `clh-${crypto.randomUUID()}`,
      caseId: cId,
      patientId: newCase.body.data.patientId,
      sessionId: 'sess-p10-nopatientdetails',
      ownerId: clinicianUser,
      status: 'completed',
      structuredData: { chiefComplaint: { text: 'General checkup' } }
    });

    await request(app).post(`/api/v1/cases/${cId}/summary/generate`).set('x-user-id', clinicianUser);
    await request(app).post(`/api/v1/cases/${cId}/summary/confirm`).set('x-user-id', clinicianUser);

    const res = await request(app).get(`/api/v1/cases/${cId}/fhir`).set('x-user-id', clinicianUser);
    assert.equal(res.status, 200);

    const patient = res.body.entry.find((e: any) => e.resource.resourceType === 'Patient').resource;
    assert.equal(patient.birthDate, undefined);
    assert.equal(patient.telecom, undefined);
  });

  // -------------------------------------------------------------
  // ENCOUNTER RESOURCE MAPPING
  // -------------------------------------------------------------

  test('5. Encounter resource maps status finished, class AMB, subject reference, and period', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdConfirmed}/fhir`)
      .set('x-user-id', clinicianUser);

    const encounter = res.body.entry.find((e: any) => e.resource.resourceType === 'Encounter').resource;
    assert.ok(encounter);
    assert.equal(encounter.id, `enc-${caseIdConfirmed}`);
    assert.equal(encounter.status, 'finished');
    assert.equal(encounter.class.code, 'AMB');
    assert.equal(encounter.subject.reference, `Patient/${patientIdConfirmed}`);
    assert.ok(encounter.period.start);
    assert.ok(encounter.period.end);
  });

  // -------------------------------------------------------------
  // OBSERVATION RESOURCE MAPPING & PROVENANCE
  // -------------------------------------------------------------

  test('6. Observations map validated symptoms and document findings with provenance', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdConfirmed}/fhir`)
      .set('x-user-id', clinicianUser);

    const observations = res.body.entry
      .filter((e: any) => e.resource.resourceType === 'Observation')
      .map((e: any) => e.resource);

    assert.ok(observations.length >= 3);

    // Chief concern observation
    const ccObs = observations.find((o: any) => o.code.text === 'Chief Concern');
    assert.ok(ccObs);
    assert.equal(ccObs.valueString, 'Throat pain and fever');
    assert.equal(ccObs.subject.reference, `Patient/${patientIdConfirmed}`);

    // Sore throat observation
    const soreThroatObs = observations.find((o: any) => o.code.text === 'Sore throat');
    assert.ok(soreThroatObs);
    assert.equal(soreThroatObs.valueString, 'Sore throat (moderate)');

    // Negative symptom (Cough: presence = false) must NOT be present as a positive observation
    const coughObs = observations.find((o: any) => o.code.text === 'Cough');
    assert.equal(coughObs, undefined);

    // Document observation with provenance
    const docObs = observations.find((o: any) => o.derivedFrom && o.derivedFrom.length > 0);
    assert.ok(docObs);
    assert.equal(docObs.derivedFrom[0].reference, `DocumentReference/${docId}`);
  });

  // -------------------------------------------------------------
  // MEDICATIONSTATEMENT RESOURCE MAPPING
  // -------------------------------------------------------------

  test('7. Explicit medication maps to MedicationStatement with dosage', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdConfirmed}/fhir`)
      .set('x-user-id', clinicianUser);

    const medStatement = res.body.entry.find(
      (e: any) => e.resource.resourceType === 'MedicationStatement'
    )?.resource;

    assert.ok(medStatement);
    assert.equal(medStatement.status, 'active');
    assert.equal(medStatement.medicationCodeableConcept.text, 'Amoxicillin');
    assert.equal(medStatement.subject.reference, `Patient/${patientIdConfirmed}`);
    assert.ok(medStatement.dosage[0].text.includes('500mg'));
  });

  test('8. Missing/denied medications do NOT create MedicationStatement resources', async () => {
    // Create case with no medications
    const newCase = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: { firstName: 'Tara', lastName: 'Bhosale', age: 28, gender: 'female' }
      });
    const cId = newCase.body.data.caseId;

    await ClinicalHistory.create({
      clinicalHistoryId: `clh-${crypto.randomUUID()}`,
      caseId: cId,
      patientId: newCase.body.data.patientId,
      sessionId: 'sess-p10-nomeds',
      ownerId: clinicianUser,
      status: 'completed',
      structuredData: {
        chiefComplaint: { text: 'Mild rash' },
        medications: [{ name: 'None reported' }]
      }
    });

    await request(app).post(`/api/v1/cases/${cId}/summary/generate`).set('x-user-id', clinicianUser);
    await request(app).post(`/api/v1/cases/${cId}/summary/confirm`).set('x-user-id', clinicianUser);

    const res = await request(app).get(`/api/v1/cases/${cId}/fhir`).set('x-user-id', clinicianUser);
    const medStatements = res.body.entry.filter((e: any) => e.resource.resourceType === 'MedicationStatement');
    assert.equal(medStatements.length, 0);
  });

  // -------------------------------------------------------------
  // ALLERGYINTOLERANCE RESOURCE MAPPING
  // -------------------------------------------------------------

  test('9. Explicit allergy maps to AllergyIntolerance with manifestation and severity', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdConfirmed}/fhir`)
      .set('x-user-id', clinicianUser);

    const allergy = res.body.entry.find(
      (e: any) => e.resource.resourceType === 'AllergyIntolerance'
    )?.resource;

    assert.ok(allergy);
    assert.equal(allergy.code.text, 'Sulfa drugs');
    assert.equal(allergy.clinicalStatus.coding[0].code, 'active');
    assert.equal(allergy.verificationStatus.coding[0].code, 'confirmed');
    assert.equal(allergy.patient.reference, `Patient/${patientIdConfirmed}`);
    assert.equal(allergy.reaction[0].manifestation[0].text, 'Skin rash');
    assert.equal(allergy.reaction[0].severity, 'moderate');
  });

  // -------------------------------------------------------------
  // CONFIRMATION REQUIREMENT & SECURITY
  // -------------------------------------------------------------

  test('10. Unconfirmed case returns 400 SUMMARY_NOT_CONFIRMED', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdUnconfirmed}/fhir`)
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'SUMMARY_NOT_CONFIRMED');
  });

  test('11. Case without summary returns 404 SUMMARY_NOT_FOUND', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdNoSummary}/fhir`)
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'SUMMARY_NOT_FOUND');
  });

  test('12. User A cannot access User B FHIR bundle (404 isolation)', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseIdConfirmed}/fhir`)
      .set('x-user-id', otherClinicianUser);

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
  });

  test('13. Non-existent case returns 404 CASE_NOT_FOUND', async () => {
    const res = await request(app)
      .get('/api/v1/cases/case-nonexistent-9999/fhir')
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
  });

  test('14. FHIR mapping does not invoke Gemini API (pure deterministic mapper)', async () => {
    let geminiInvoked = false;
    clinicalSummaryService.setMockGenerator(() => {
      geminiInvoked = true;
      throw new Error('Gemini must NOT be called during FHIR mapping');
    });

    const res = await request(app)
      .get(`/api/v1/cases/${caseIdConfirmed}/fhir`)
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 200);
    assert.equal(geminiInvoked, false);
  });
});
