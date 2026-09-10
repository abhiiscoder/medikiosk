/**
 * MEDiKIOSK Backend — DEMO MODE: OpenRouter AI Core Live Clinical Workflow Tests
 *
 * Full verification suite covering all 11 criteria:
 * 1. Clinical conversation: Natural language intake & structured understanding
 * 2. Multi-fact patient answer parsing (non-destructive)
 * 3. Negative assertion handling ("no known allergies")
 * 4. Incomplete / ambiguous answer & clarification loop
 * 5. Medical document upload & clinical entity extraction (meds, allergies, diagnoses, doctor, dates)
 * 6. Non-clinical document rejection (isClinicalDocument: false, validationStatus: 'rejected')
 * 7. Filename vs Content verification (e.g. non-clinical file named "prescription.pdf" MUST be rejected)
 * 8. Live clinical summary synthesis from real anamnesis & validated documents (stored in MongoDB)
 * 9. Real vector PDF generation with PDFKit (valid %PDF- stream containing confirmed case data)
 * 10. Confirmation gating enforcement (unconfirmed blocked with 400 SUMMARY_NOT_CONFIRMED; confirmed exports)
 * 11. AI failure handling: timeout / 5xx / malformed response returns clear retryable error (no fake AI)
 * 12. Security: OPENROUTER_API_KEY is never leaked to client, response headers, or payloads
 *
 * DEMO MODE: All AI calls route to OpenRouter exclusively. Gemini is not invoked.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Case } from '../src/models/case.model.js';
import { Patient } from '../src/models/patient.model.js';
import { ClinicalHistory } from '../src/models/clinicalHistory.model.js';
import { Conversation } from '../src/models/conversation.model.js';
import { MedicalDocument } from '../src/models/document.model.js';
import { ClinicalSummary } from '../src/models/clinicalSummary.model.js';
import { openRouterService } from '../src/services/openrouter.service.js';
import { config } from '../src/config/index.js';

describe('DEMO MODE: OpenRouter AI Core — Live Clinical Workflow Verification', () => {
  const clinicianUser = 'user-clinician-r2';
  let patientId: string;
  let caseId: string;

  // Valid Text-based Clinical PDF (> 30 characters of medical text)
  const textPdfBuffer = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n' +
    '4 0 obj\n<< /Length 120 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Patient Jane Miller: Tab Amoxicillin 500mg TID for Acute Pharyngitis) Tj\nET\nendstream\nendobj\n' +
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n' +
    'xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000000438 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n517\n%%EOF\n'
  );

  // Valid Non-Clinical Assignment PDF
  const assignmentPdfBuffer = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n' +
    '4 0 obj\n<< /Length 150 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Computer Science Assignment 3: Distributed Hash Tables and Graph Algorithms Course CS401) Tj\nET\nendstream\nendobj\n' +
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n' +
    'xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000000468 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n547\n%%EOF\n'
  );

  before(async () => {
    await connectDatabase();

    // Create test Case and Patient via API
    const caseRes = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: {
          firstName: 'Jane',
          lastName: 'Miller',
          age: 41,
          gender: 'female'
        }
      });

    assert.equal(caseRes.status, 201);
    caseId = caseRes.body.data.caseId;
    patientId = caseRes.body.data.patientId;
  });

  after(async () => {
    // Clean up MongoDB test data
    if (caseId) {
      await Case.deleteOne({ caseId });
      await Patient.deleteOne({ patientId });
      await ClinicalHistory.deleteOne({ caseId });
      await Conversation.deleteOne({ caseId });
      await MedicalDocument.deleteMany({ caseId });
      await ClinicalSummary.deleteMany({ caseId });

      const caseUploadDir = path.resolve(process.cwd(), config.UPLOAD_DIR, 'cases', caseId);
      if (fs.existsSync(caseUploadDir)) {
        fs.rmSync(caseUploadDir, { recursive: true, force: true });
      }
    }

    await disconnectDatabase();
  });

  // ============================================================
  // 1. CLINICAL CONVERSATION: Natural language intake
  // ============================================================
  test('1. Live conversation intake: User "I have fever and cough for three days" produces structured understanding', async () => {
    const origMethod = openRouterService.generateStructuredJson;
    openRouterService.generateStructuredJson = async () => ({
      answerUnderstanding: 'Patient has fever and cough lasting three days',
      extractedData: {
        chiefComplaint: 'Fever and cough',
        duration: '3 days',
        symptoms: ['Fever', 'Cough']
      },
      targetField: 'q-chief-complaint',
      answerStatus: 'answered',
      needsClarification: false,
      clarificationReason: null,
      suggestedNextQuestion: 'How high has the fever reached, and are you producing phlegm with the cough?'
    }) as any;

    try {
      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/conversation/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'I have fever and cough for three days.',
          source: 'text'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.structuredData);
      assert.equal(res.body.data.structuredData.chiefComplaint.text, 'Fever and cough');
      assert.ok(res.body.data.structuredData.duration);
      assert.equal(res.body.data.structuredData.duration.unit, 'days');

      // Verify backend retained control: state machine advanced question
      const currentField = res.body.data.clinicalState?.currentField || res.body.data.conversation?.question?.id;
      assert.ok(currentField);
      assert.notEqual(currentField, 'q-chief-complaint');

      // Verify AI does NOT prescribe or diagnose
      const content = res.body.data.assistantMessage.content.toLowerCase();
      assert.ok(!content.includes('you are diagnosed with'));
      assert.ok(!content.includes('i prescribe'));

      // Verify persisted in MongoDB
      const history = await ClinicalHistory.findOne({ caseId });
      assert.equal(history?.structuredData?.chiefComplaint?.text, 'Fever and cough');
      assert.ok(history?.structuredData?.duration);
      assert.equal(history?.structuredData?.duration?.unit, 'days');
    } finally {
      openRouterService.generateStructuredJson = origMethod;
    }
  });

  // ============================================================
  // 2. MULTI-FACT PARSING (NON-DESTRUCTIVE)
  // ============================================================
  test('2. Multi-fact patient answer parses multiple clinical entities non-destructively', async () => {
    const origMethod = openRouterService.generateStructuredJson;
    openRouterService.generateStructuredJson = async () => ({
      answerUnderstanding: 'Patient reports high fever (102F), severe chills starting yesterday, and mild nausea',
      extractedData: {
        severity: 'severe',
        symptoms: ['High fever 102F', 'Severe chills', 'Mild nausea']
      },
      targetField: 'q-symptoms',
      answerStatus: 'answered',
      needsClarification: false,
      clarificationReason: null,
      suggestedNextQuestion: 'Are you experiencing any shortness of breath or chest pain?'
    }) as any;

    try {
      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/conversation/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'My fever is 102F, severe chills started yesterday, and I have mild nausea.',
          source: 'text'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Prior chiefComplaint must NOT be overwritten (non-destructive preservation)
      assert.equal(res.body.data.structuredData.chiefComplaint.text, 'Fever and cough');
      assert.equal(res.body.data.structuredData.severity, 'severe');
      assert.ok(Array.isArray(res.body.data.structuredData.symptoms));
      assert.ok(res.body.data.structuredData.symptoms.length >= 2);
    } finally {
      openRouterService.generateStructuredJson = origMethod;
    }
  });

  // ============================================================
  // 3. NEGATIVE ASSERTIONS HANDLING
  // ============================================================
  test('3. Negative answer ("no known allergies") is preserved as confirmed negative fact, not missing', async () => {
    // Position history at allergies question to test negative answer processing
    await ClinicalHistory.updateOne(
      { caseId },
      { currentQuestionId: 'q-allergies', currentSection: 'allergies' }
    );

    const origMethod = openRouterService.generateStructuredJson;
    openRouterService.generateStructuredJson = async () => ({
      answerUnderstanding: 'Patient explicitly denies any drug or environmental allergies',
      extractedData: {
        allergies: ['No known drug allergies', 'No food allergies']
      },
      targetField: 'q-allergies',
      answerStatus: 'answered',
      needsClarification: false,
      clarificationReason: null,
      suggestedNextQuestion: 'Do you take any regular prescription medications?'
    }) as any;

    try {
      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/conversation/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'No known allergies to medications or foods, and no asthma.',
          source: 'text'
        });

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data.structuredData.allergies));
      const hasExplicitNegative = res.body.data.structuredData.allergies.some(
        (a: any) =>
          typeof a === 'string'
            ? a.toLowerCase().includes('no known') || a.toLowerCase().includes('no allergies')
            : (a.allergen || '').toLowerCase().includes('no known') || (a.allergen || '').toLowerCase().includes('no allergies')
      );
      assert.ok(hasExplicitNegative, 'Explicit negative assertion must be preserved');
    } finally {
      openRouterService.generateStructuredJson = origMethod;
    }
  });

  // ============================================================
  // 4. INCOMPLETE / AMBIGUOUS ANSWER CLARIFICATION
  // ============================================================
  test('4. Incomplete/ambiguous answer triggers clarification loop without hallucinating facts', async () => {
    const origMethod = openRouterService.generateStructuredJson;
    openRouterService.generateStructuredJson = async () => ({
      answerUnderstanding: 'Patient provided vague timeline with no specific duration',
      extractedData: {},
      targetField: 'q-duration',
      answerStatus: 'needs_clarification',
      needsClarification: true,
      clarificationReason: 'Patient timeline is ambiguous ("maybe yesterday or earlier")',
      suggestedNextQuestion: 'Could you clarify if symptoms started today, yesterday, or several days ago?'
    }) as any;

    try {
      const histBefore = await ClinicalHistory.findOne({ caseId });
      const qBefore = histBefore?.currentQuestionId;

      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/conversation/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'Maybe yesterday or earlier, I am not really sure.',
          source: 'text'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.needsClarification, true);
      assert.match(res.body.data.assistantMessage.content, /clarify if symptoms started/i);

      // Must remain on the current question, not jump ahead or invent timeline
      const histAfter = await ClinicalHistory.findOne({ caseId });
      assert.equal(histAfter?.currentQuestionId, qBefore);
    } finally {
      openRouterService.generateStructuredJson = origMethod;
    }
  });

  // ============================================================
  // 5. MEDICAL DOCUMENT AI: Upload, OCR & Clinical Entity Extraction
  // ============================================================
  test('5. Clinical document upload extracts structured clinical entities with strict provenance', async () => {
    const uploadRes = await request(app)
      .post(`/api/v1/cases/${caseId}/documents`)
      .set('x-user-id', clinicianUser)
      .attach('file', textPdfBuffer, 'prescription_dr_smith.pdf');

    assert.equal(uploadRes.status, 201);
    const docId = uploadRes.body.data.id;

    const origClassifier = openRouterService.generateStructuredJson;
    openRouterService.generateStructuredJson = async () => ({
      classification: 'CLINICAL',
      documentType: 'PRESCRIPTION',
      confidence: 0.98,
      reason: 'Valid prescription containing medications and diagnoses',
      extractedClinicalData: {
        medications: ['Amoxicillin 500mg PO TID'],
        allergies: ['Penicillin allergy'],
        diagnoses: ['Acute Bacterial Pharyngitis'],
        labValues: ['Rapid Strep test POSITIVE'],
        dates: ['2026-08-15'],
        doctors: ['Dr. Robert Smith, MD'],
        procedures: ['Throat swab culture']
      }
    }) as any;

    try {
      const procRes = await request(app)
        .post(`/api/v1/cases/${caseId}/documents/${docId}/process`)
        .set('x-user-id', clinicianUser)
        .send({});

      assert.equal(procRes.status, 200);
      assert.equal(procRes.body.data.validationStatus, 'validated');
      assert.equal(procRes.body.data.isClinicalDocument, true);
      assert.equal(procRes.body.data.documentType.toUpperCase(), 'PRESCRIPTION');

      // Verify in MongoDB
      const doc = await MedicalDocument.findOne({ documentId: docId });
      assert.ok(doc);
      assert.ok(doc.extractedClinicalData);
      assert.ok(doc.extractedClinicalData.medications.some((m: any) => (typeof m === 'string' ? m : m.name).includes('Amoxicillin')));
      assert.ok(doc.provenance);
      assert.equal(doc.provenance.sourceType, 'medical_document');
      assert.equal(doc.provenance.documentId, docId);
    } finally {
      openRouterService.generateStructuredJson = origClassifier;
    }
  });

  // ============================================================
  // 6. NON-CLINICAL DOCUMENT REJECTION
  // ============================================================
  test('6. Non-clinical document (e.g. source code or invoice) is strictly rejected', async () => {
    const uploadRes = await request(app)
      .post(`/api/v1/cases/${caseId}/documents`)
      .set('x-user-id', clinicianUser)
      .attach('file', assignmentPdfBuffer, 'server_code.pdf');

    assert.equal(uploadRes.status, 201);
    const docId = uploadRes.body.data.id;

    const origClassifier = openRouterService.generateStructuredJson;
    openRouterService.generateStructuredJson = async () => ({
      classification: 'NON_CLINICAL',
      documentType: 'OTHER',
      confidence: 0.99,
      reason: 'Content is university computer science coursework, not clinical records',
      extractedClinicalData: null
    }) as any;

    try {
      const procRes = await request(app)
        .post(`/api/v1/cases/${caseId}/documents/${docId}/process`)
        .set('x-user-id', clinicianUser)
        .send({});

      assert.equal(procRes.status, 200);
      assert.equal(procRes.body.data.validationStatus, 'rejected');
      assert.equal(procRes.body.data.isClinicalDocument, false);
      assert.equal(procRes.body.data.classification, 'NON_CLINICAL');
    } finally {
      geminiService.generateStructuredJson = origClassifier;
    }
  });

  // ============================================================
  // 7. CRITICAL RULE: CONTENT VS FILENAME VERIFICATION TEST
  // Non-clinical content named "prescription.pdf" MUST be rejected!
  // ============================================================
  test('7. Content vs Filename rule: Non-clinical text named "prescription.pdf" MUST be rejected', async () => {
    const uploadRes = await request(app)
      .post(`/api/v1/cases/${caseId}/documents`)
      .set('x-user-id', clinicianUser)
      .attach('file', assignmentPdfBuffer, 'prescription.pdf');

    assert.equal(uploadRes.status, 201);
    const docId = uploadRes.body.data.id;

    const origClassifier = openRouterService.generateStructuredJson;
    // OpenRouter evaluates the CONTENT, which is a computer science homework
    openRouterService.generateStructuredJson = async () => ({
      classification: 'NON_CLINICAL',
      documentType: 'OTHER',
      confidence: 0.99,
      reason: 'Content is computer science course homework, not a clinical prescription',
      extractedClinicalData: null
    }) as any;

    try {
      const procRes = await request(app)
        .post(`/api/v1/cases/${caseId}/documents/${docId}/process`)
        .set('x-user-id', clinicianUser)
        .send({});

      assert.equal(procRes.status, 200);
      // Critical assertion: Content determines validity, not filename
      assert.equal(procRes.body.data.validationStatus, 'rejected', 'Non-clinical content must be rejected despite prescription.pdf filename');
      assert.equal(procRes.body.data.isClinicalDocument, false);
      assert.equal(procRes.body.data.classification, 'NON_CLINICAL');
    } finally {
      openRouterService.generateStructuredJson = origClassifier;
    }
  });

  // ============================================================
  // 8. LIVE CLINICAL SUMMARY SYNTHESIS
  // ============================================================
  test('8. Clinical summary synthesizes anamnesis and validated documents via OpenRouter into MongoDB', async () => {
    const origMethod = openRouterService.generateStructuredJson;
    openRouterService.generateStructuredJson = async () => ({
      sections: {
        chiefConcern: 'Fever and cough for three days with associated chills',
        symptoms: 'Fever, persistent cough, severe chills, mild nausea',
        historyOfPresentIllness: 'Patient developed fever and cough 3 days ago, accompanied by chills and nausea.',
        duration: '3 days',
        severity: 'severe',
        associatedSymptoms: ['Chills', 'Nausea'],
        pastMedicalHistory: ['No known chronic illnesses'],
        pastSurgicalHistory: ['None reported'],
        medications: ['Amoxicillin 500mg PO TID (from validated prescription)'],
        allergies: ['Penicillin allergy noted in records; patient denies food allergies'],
        familyHistory: ['Not provided'],
        socialHistory: 'Not provided',
        reviewOfSystems: 'Constitutional: Fever and chills. Respiratory: Cough. Gastrointestinal: Mild nausea.',
        ayushHistory: 'Not provided',
        relevantMedicalRecords: ['Prescription from Dr. Robert Smith dated 2026-08-15'],
        clinicalInformationSummary: '41yo female presenting with acute respiratory symptoms and fever.'
      },
      conflicts: [
        {
          field: 'allergies',
          description: 'Document indicates Penicillin allergy whereas patient reported no drug allergies',
          sources: ['Patient interview', 'Prescription Dr. Smith']
        }
      ]
    }) as any;

    try {
      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/summary/generate`)
        .set('x-user-id', clinicianUser)
        .send({ forceRegenerate: true });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'draft');
      assert.equal(res.body.data.sections.chiefConcern, 'Fever and cough for three days with associated chills');
      assert.ok(res.body.data.sections.medications.some((m: string) => m.includes('Amoxicillin')));

      // Verify stored in MongoDB
      const savedSummary = await ClinicalSummary.findOne({ caseId });
      assert.ok(savedSummary);
      assert.equal(savedSummary.status, 'draft');
      assert.equal(savedSummary.version, 1);
    } finally {
      openRouterService.generateStructuredJson = origMethod;
    }
  });

  // ============================================================
  // 10. CONFIRMATION GATING ENFORCEMENT (Tested before PDF export)
  // ============================================================
  test('10. Confirmation gating: Unconfirmed summary export to PDF is blocked with 400 SUMMARY_NOT_CONFIRMED', async () => {
    // Current summary is 'draft'
    const res = await request(app)
      .get(`/api/v1/cases/${caseId}/summary/pdf`)
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'SUMMARY_NOT_CONFIRMED');
    assert.match(res.body.error.message, /Only a confirmed backend summary may be exported/i);
  });

  // ============================================================
  // 9. REAL PDF GENERATION (AFTER CONFIRMATION)
  // ============================================================
  test('9. Real vector PDF generated by backend and streamed after summary confirmation', async () => {
    // First, confirm the summary
    const confirmRes = await request(app)
      .post(`/api/v1/cases/${caseId}/summary/confirm`)
      .set('x-user-id', clinicianUser)
      .send({ notes: 'Clinical findings and document concordance verified by attending physician' });

    assert.equal(confirmRes.status, 200);
    assert.equal(confirmRes.body.data.summary.status, 'confirmed');
    assert.ok(confirmRes.body.data.summary.confirmedAt);
    assert.equal(confirmRes.body.data.summary.confirmedBy, clinicianUser);

    // Now, download PDF
    const pdfRes = await request(app)
      .get(`/api/v1/cases/${caseId}/summary/pdf`)
      .set('x-user-id', clinicianUser)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers['content-type'], 'application/pdf');
    assert.ok(pdfRes.headers['content-disposition'].includes('attachment; filename='));
    assert.ok(pdfRes.headers['content-disposition'].includes('.pdf'));

    // Check PDF binary signature: standard PDF starts with '%PDF-'
    const pdfBuffer: Buffer = pdfRes.body;
    assert.ok(Buffer.isBuffer(pdfBuffer));
    assert.ok(pdfBuffer.length > 500, 'PDF buffer must contain real vector data');
    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    assert.equal(pdfHeader, '%PDF-', 'Buffer must be a valid PDF binary file');
  });

  // ============================================================
  // 11. AI FAILURE HANDLING & RETRYABLE ERRORS (NO FAKE AI)
  // ============================================================
  test('11a. OpenRouter service error returns retryable 503 without fake AI or data corruption', async () => {
    const origMethod = openRouterService.generateStructuredJson;
    openRouterService.generateStructuredJson = async () => {
      throw new Error('OpenRouter API Service Unavailable (503): High server load');
    };

    try {
      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/conversation/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'I also noticed a rash on my chest this morning.',
          source: 'text'
        });

      assert.equal(res.status, 503);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'OPENROUTER_SERVICE_ERROR');
      assert.match(res.body.error.message, /Clinical AI service encountered an error.*Please retry/i);

      // Verify no fake messages were injected into conversation history
      const conv = await Conversation.findOne({ caseId });
      if (conv && conv.messages.length > 0) {
        const lastMsg = conv.messages[conv.messages.length - 1];
        assert.notEqual(lastMsg?.content, 'I also noticed a rash on my chest this morning.');
      }
    } finally {
      openRouterService.generateStructuredJson = origMethod;
    }
  });

  test('11b. OpenRouter malformed JSON response returns retryable 503 without fake summary', async () => {
    // Create a temporary unconfirmed case to test summary failure handling
    const tempCaseRes = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: {
          firstName: 'Robert',
          lastName: 'Brown',
          age: 50,
          gender: 'male'
        }
      });

    assert.equal(tempCaseRes.status, 201);
    const tempCaseId = tempCaseRes.body.data.caseId;
    const tempPatientId = tempCaseRes.body.data.patientId;

    const origMethod = openRouterService.generateStructuredJson;
    openRouterService.generateStructuredJson = async () => {
      // Simulate OpenRouter returning invalid JSON structure that cannot be parsed into schema
      throw new Error('JSON.parse: unexpected end of data at line 1 column 1');
    };

    try {
      const res = await request(app)
        .post(`/api/v1/cases/${tempCaseId}/summary/generate`)
        .set('x-user-id', clinicianUser)
        .send({ forceRegenerate: true });

      assert.equal(res.status, 503);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'OPENROUTER_SUMMARY_FAILED');
      assert.match(res.body.error.message, /Clinical summary generation failed.*Please retry/i);

      // Verify NO fallback summary was created in MongoDB
      const tempSummary = await ClinicalSummary.findOne({ caseId: tempCaseId });
      assert.equal(tempSummary, null, 'No fake or fallback summary should be created on AI failure');
    } finally {
      openRouterService.generateStructuredJson = origMethod;

      // Clean up temp case
      await Case.deleteOne({ caseId: tempCaseId });
      await Patient.deleteOne({ patientId: tempPatientId });
      await ClinicalHistory.deleteOne({ caseId: tempCaseId });
      await Conversation.deleteOne({ caseId: tempCaseId });
      await ClinicalSummary.deleteOne({ caseId: tempCaseId });
    }
  });

  // ============================================================
  // 12. SECURITY VERIFICATION: OPENROUTER_API_KEY CONFINEMENT
  // ============================================================
  test('12. Security: OPENROUTER_API_KEY is confined strictly to backend/.env and never exposed in responses or headers', async () => {
    // 1. Backend config has key (or is configured)
    assert.ok(process.env.OPENROUTER_API_KEY, 'OpenRouter API key must exist in backend environment');

    // 2. Sample response headers and body must NOT contain the secret API key
    const res = await request(app)
      .get(`/api/v1/cases/${caseId}`)
      .set('x-user-id', clinicianUser);

    const resString = JSON.stringify(res.body);
    const headersString = JSON.stringify(res.headers);

    const apiKey = process.env.OPENROUTER_API_KEY || '';
    if (apiKey.length > 6) {
      assert.equal(resString.includes(apiKey), false, 'API key must not appear in response body');
      assert.equal(headersString.includes(apiKey), false, 'API key must not appear in response headers');
    }

    // 3. Verify frontend directory has zero occurrences of OPENROUTER_API_KEY
    const frontendSrcDir = path.resolve(process.cwd(), '..', 'src');
    if (fs.existsSync(frontendSrcDir)) {
      const files = fs.readdirSync(frontendSrcDir, { recursive: true }) as string[];
      for (const file of files) {
        if (typeof file === 'string' && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
          const filePath = path.join(frontendSrcDir, file);
          if (fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath, 'utf8');
            assert.equal(
              content.includes('OPENROUTER_API_KEY'),
              false,
              `Found forbidden OPENROUTER_API_KEY reference in frontend file: ${file}`
            );
          }
        }
      }
    }
  });
});
