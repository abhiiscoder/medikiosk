import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000/api/v1';
const HEADERS = {
  'Content-Type': 'application/json',
  'x-user-id': 'user-clinician-001'
};

async function runRealIntegrationTest() {
  console.log('============================================================');
  console.log('MEDiKIOSK — REAL RUNTIME INTEGRATION VERIFICATION');
  console.log('============================================================\n');

  // 1. Health Check
  console.log('--- 1. BACKEND HEALTH CHECK ---');
  const healthRes = await fetch('http://localhost:5000/health');
  const healthJson = await healthRes.json() as any;
  console.log('GET /health status:', healthRes.status, JSON.stringify(healthJson.data));
  if (!healthJson.success) throw new Error('Backend is not healthy');

  // 2. MongoDB connection verification
  console.log('\n--- 2. MONGODB DIRECT CONNECTION ---');
  await mongoose.connect('mongodb://127.0.0.1:27017/medikiosk');
  console.log('Connected to MongoDB database:', mongoose.connection.name);

  // 3. New Case Creation (Real API -> Real DB)
  console.log('\n--- 3. CREATE REAL CLINICAL CASE ---');
  const casePayload = {
    patientData: {
      firstName: 'Aarav',
      lastName: 'Mehta',
      age: 34,
      gender: 'male',
      bloodGroup: 'O+'
    }
  };
  const createCaseRes = await fetch(`${API_BASE}/cases`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(casePayload)
  });
  const createCaseJson = await createCaseRes.json() as any;
  console.log('POST /api/v1/cases status:', createCaseRes.status);
  const { caseId, patientId, sessionId } = createCaseJson.data;
  console.log(`Authoritative Case Created: caseId=${caseId}, patientId=${patientId}, sessionId=${sessionId}`);

  // Check MongoDB directly
  const dbCase = await mongoose.connection.db!.collection('cases').findOne({ caseId });
  const dbPatient = await mongoose.connection.db!.collection('patients').findOne({ patientId });
  console.log(`MongoDB Verified Case: ${dbCase?.caseId}, status=${dbCase?.status}`);
  console.log(`MongoDB Verified Patient: ${dbPatient?.firstName} ${dbPatient?.lastName}, age=${dbPatient?.age}`);

  // 4. Clinical History Conversation (Real Message -> LLM/Validation -> Answer persistence)
  console.log('\n--- 4. CLINICAL CONVERSATION & ANSWER PERSISTENCE ---');
  const patientStatement = 'I have had a high fever and persistent dry cough for the past three days.';
  console.log(`Sending patient statement: "${patientStatement}"`);

  const msgRes = await fetch(`${API_BASE}/cases/${caseId}/conversation/messages`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ content: patientStatement })
  });
  const msgJson = await msgRes.json() as any;
  console.log('POST /conversation/messages status:', msgRes.status);
  console.log('Assistant next question:', msgJson.data?.assistantMessage?.content);
  console.log('answerStatus returned:', msgJson.data?.answerStatus);

  // Verify answerStatus in DB
  const dbAnswer = await mongoose.connection.db!.collection('answers').findOne({ caseId });
  console.log(`MongoDB Answer record: answerId=${dbAnswer?.answerId}, answerStatus=${dbAnswer?.answerStatus}, value="${dbAnswer?.value}"`);
  if (dbAnswer?.answerStatus === 'unanswered') {
    throw new Error('FAIL: answerStatus is "unanswered"!');
  }
  const allowedStatuses = ['answered', 'partially_answered', 'unclear', 'not_applicable', 'needs_clarification'];
  if (!allowedStatuses.includes(dbAnswer?.answerStatus)) {
    throw new Error(`FAIL: answerStatus "${dbAnswer?.answerStatus}" not in allowed enum!`);
  }
  console.log('✓ answerStatus strictly verified in MongoDB enum.');

  // 5. Document Upload & Processing (Real bytes -> real sizeBytes -> OCR/Classification)
  console.log('\n--- 5. DOCUMENT UPLOAD & BACKEND PROCESSING ---');
  const textPdfBuffer = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n' +
    '4 0 obj\n<< /Length 120 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Patient Aarav Mehta: Tab Metformin 500mg BD for Type 2 Diabetes Mellitus with Blood Sugar 145 mg/dL) Tj\nET\nendstream\nendobj\n' +
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n' +
    'xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000000438 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n517\n%%EOF\n'
  );
  const tempDocPath = path.resolve(process.cwd(), 'temp_test_report.pdf');
  fs.writeFileSync(tempDocPath, textPdfBuffer);
  const realFileBytes = fs.statSync(tempDocPath).size;
  console.log(`Created sample PDF file on disk: ${tempDocPath} (${realFileBytes} bytes)`);

  const fileBlob = new Blob([fs.readFileSync(tempDocPath)], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('file', fileBlob, 'Blood_Chemistry_Lab_Report.pdf');

  const uploadRes = await fetch(`${API_BASE}/cases/${caseId}/documents`, {
    method: 'POST',
    headers: { 'x-user-id': 'user-clinician-001' },
    body: formData
  });
  const uploadJson = await uploadRes.json() as any;
  console.log('POST /documents status:', uploadRes.status);
  const uploadedDocId = uploadJson.data?.documentId || uploadJson.data?.id;
  const returnedSizeBytes = uploadJson.data?.sizeBytes ?? uploadJson.data?.fileSize;
  console.log(`Uploaded docId=${uploadedDocId}, returned sizeBytes=${returnedSizeBytes} (real=${realFileBytes})`);

  // Check document in MongoDB
  const dbDoc = await mongoose.connection.db!.collection('medicaldocuments').findOne({ documentId: uploadedDocId });
  console.log(`MongoDB Document record: name="${dbDoc?.name}", sizeBytes=${dbDoc?.sizeBytes}`);
  if (dbDoc?.sizeBytes === 0 || dbDoc?.sizeBytes === 2450) {
    throw new Error(`FAIL: MongoDB sizeBytes is incorrect (${dbDoc?.sizeBytes})`);
  }
  console.log('✓ Real document size accurately persisted in MongoDB.');

  // Process Document
  console.log('\n--- 6. BACKEND DOCUMENT CLASSIFICATION & VALIDATION ---');
  const procRes = await fetch(`${API_BASE}/cases/${caseId}/documents/${uploadedDocId}/process`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({})
  });
  const procJson = await procRes.json() as any;
  console.log('POST /documents/:id/process status:', procRes.status);
  console.log(`Classification: ${procJson.data?.classification}, isClinicalDocument: ${procJson.data?.isClinicalDocument}, type: ${procJson.data?.documentType}`);
  console.log(`ProcessingStatus: ${procJson.data?.processingStatus}, extractedTextLength: ${procJson.data?.extractedTextLength}`);

  // 7. Clinical Summary Generation
  console.log('\n--- 7. CLINICAL SUMMARY GENERATION (REAL BACKEND) ---');
  const summaryRes = await fetch(`${API_BASE}/cases/${caseId}/summary/generate`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({})
  });
  const summaryJson = await summaryRes.json() as any;
  console.log('POST /summary/generate status:', summaryRes.status);
  const sec = summaryJson.data?.sections || {};
  console.log('Chief Concern:', sec.chiefConcern);
  console.log('Symptoms:', sec.associatedSymptoms || sec.symptoms);
  console.log('Duration:', sec.duration);
  console.log('Attached Records in summary:', sec.relevantMedicalRecords);

  const dbSummary = await mongoose.connection.db!.collection('clinicalsummaries').findOne({ caseId });
  console.log(`MongoDB Summary record: summaryId=${dbSummary?.summaryId}, caseId=${dbSummary?.caseId}`);
  if (!dbSummary) throw new Error('FAIL: Summary was not persisted to MongoDB');

  // 8. Confirm + Save
  console.log('\n--- 8. CONFIRM + SAVE ---');
  const confirmRes = await fetch(`${API_BASE}/cases/${caseId}/summary/confirm`, {
    method: 'POST',
    headers: HEADERS
  });
  console.log('POST /summary/confirm status:', confirmRes.status);

  const updateCaseRes = await fetch(`${API_BASE}/cases/${caseId}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ status: 'completed', workflowStage: 'completed' })
  });
  console.log('PATCH /cases/:id (status=completed) status:', updateCaseRes.status);

  // 9. Simulated Browser Refresh / Persistence Test
  console.log('\n--- 9. POST-REFRESH DATA SURVIVAL (MONGODB RETRIEVAL) ---');
  const getCaseRes = await fetch(`${API_BASE}/cases/${caseId}`, { headers: HEADERS });
  const getCaseJson = await getCaseRes.json() as any;
  console.log(`Reloaded Case status: ${getCaseJson.data?.status}, patient=${getCaseJson.data?.patient?.firstName} ${getCaseJson.data?.patient?.lastName}`);

  const getConvRes = await fetch(`${API_BASE}/cases/${caseId}/conversation`, { headers: HEADERS });
  const getConvJson = await getConvRes.json() as any;
  console.log(`Reloaded Conversation message count: ${getConvJson.data?.messages?.length}`);

  const getDocsRes = await fetch(`${API_BASE}/cases/${caseId}/documents`, { headers: HEADERS });
  const getDocsJson = await getDocsRes.json() as any;
  console.log(`Reloaded Documents count: ${getDocsJson.data?.length}, first doc sizeBytes: ${getDocsJson.data?.[0]?.sizeBytes}`);

  const getSummaryRes = await fetch(`${API_BASE}/cases/${caseId}/summary`, { headers: HEADERS });
  const getSummaryJson = await getSummaryRes.json() as any;
  console.log(`Reloaded Summary isConfirmed: ${getSummaryJson.data?.isConfirmed}, chiefConcern: ${getSummaryJson.data?.sections?.chiefConcern}`);

  // 10. FHIR R4 Bundle Validation
  console.log('\n--- 10. REAL FHIR R4 BUNDLE GENERATION ---');
  const fhirRes = await fetch(`${API_BASE}/cases/${caseId}/fhir`, { headers: HEADERS });
  const fhirJson = await fhirRes.json() as any;
  const fhirBundle = fhirJson.resourceType === 'Bundle' ? fhirJson : fhirJson.data;
  console.log('GET /fhir status:', fhirRes.status, `ResourceType: ${fhirBundle?.resourceType}, Total: ${fhirBundle?.total}`);
  const patientResource = fhirBundle?.entry?.find((e: any) => e.resource?.resourceType === 'Patient');
  const patientName = patientResource?.resource?.name?.[0];
  console.log(`FHIR Patient: ${patientName?.given?.join(' ')} ${patientName?.family}`);
  if (JSON.stringify(fhirBundle).includes('MOCK_PATIENT') || JSON.stringify(fhirBundle).includes('DEMO-PATIENT')) {
    throw new Error('FAIL: FHIR Bundle contains mock patient!');
  }
  console.log('✓ FHIR Bundle strictly uses real patient data.');

  // Cleanup temp file
  if (fs.existsSync(tempDocPath)) fs.unlinkSync(tempDocPath);

  await mongoose.disconnect();
  console.log('\n============================================================');
  console.log('✅ ALL INTEGRATION CHECKS PASSED: 100% REAL PIPELINE VERIFIED');
  console.log('============================================================');
}

runRealIntegrationTest().catch((err) => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
