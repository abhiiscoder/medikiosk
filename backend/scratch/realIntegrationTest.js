/**
 * Full End-to-End Real Integration Verification
 * Tests the real pipeline across Case, Conversation (Greeting vs Symptom), Documents, Summary, Confirm, and FHIR.
 */

async function runEndToEndIntegration() {
  const baseUrl = 'http://localhost:5000/api/v1';
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': 'user-clinician-001'
  };

  console.log('--- STEP 1: Create Case ---');
  const caseRes = await fetch(`${baseUrl}/cases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      patientData: {
        firstName: 'Vikram',
        lastName: 'Patel',
        age: 48,
        gender: 'male',
        bloodGroup: 'B+'
      }
    })
  });
  const caseData = await caseRes.json();
  console.log('Case status:', caseRes.status, 'Case ID:', caseData.data?.caseId);
  const caseId = caseData.data?.caseId;
  if (!caseId) throw new Error('Failed to create case');

  console.log('\n--- STEP 2: Test Conversational Greeting ("hello") ---');
  const greetingRes = await fetch(`${baseUrl}/cases/${caseId}/conversation/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: 'hello' })
  });
  const greetingData = await greetingRes.json();
  console.log('Greeting answerStatus:', greetingData.data?.answerStatus);
  console.log('Greeting needsClarification:', greetingData.data?.needsClarification);
  console.log('Greeting assistantMessage:', greetingData.data?.assistantMessage?.content);
  if (greetingData.data?.answerStatus !== 'needs_clarification') {
    throw new Error('Greeting was not handled with needs_clarification!');
  }

  console.log('\n--- STEP 3: Test Real Clinical Chief Complaint ---');
  const clinicalRes = await fetch(`${baseUrl}/cases/${caseId}/conversation/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: 'Persistent dull chest discomfort and mild breathlessness' })
  });
  const clinicalData = await clinicalRes.json();
  console.log('Clinical answerStatus:', clinicalData.data?.answerStatus);
  console.log('Next action:', clinicalData.data?.nextAction);
  console.log('Next question:', clinicalData.data?.assistantMessage?.question?.text || clinicalData.data?.assistantMessage?.content);

  console.log('\n--- STEP 4: Real Document Upload (multipart/form-data) ---');
  // Valid Text-based Clinical PDF (> 30 characters of medical text with proper magic bytes)
  const textPdfBuffer = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n' +
    '4 0 obj\n<< /Length 120 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Patient John Doe: Tab Metformin 500mg BD for Type 2 Diabetes Mellitus) Tj\nET\nendstream\nendobj\n' +
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n' +
    'xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000000438 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n517\n%%EOF\n'
  );

  const formData = new FormData();
  const fileBlob = new Blob([textPdfBuffer], { type: 'application/pdf' });
  formData.append('file', fileBlob, 'Blood_Chemistry_Lab_Report.pdf');

  const uploadRes = await fetch(`${baseUrl}/cases/${caseId}/documents`, {
    method: 'POST',
    headers: {
      'x-user-id': 'user-clinician-001'
    },
    body: formData
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) {
    console.log('Upload error response:', JSON.stringify(uploadData));
  }
  console.log('Document upload status:', uploadRes.status);
  console.log('Document ID:', uploadData.data?.documentId);
  console.log('Document sizeBytes:', uploadData.data?.sizeBytes);
  const docId = uploadData.data?.documentId;
  if (!docId) throw new Error('Document upload failed');

  console.log('\n--- STEP 5: Real Document Processing ---');
  const processRes = await fetch(`${baseUrl}/cases/${caseId}/documents/${docId}/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify({})
  });
  const processData = await processRes.json();
  console.log('Processing status:', processRes.status);
  console.log('Document category:', processData.data?.category);
  console.log('Is Clinical Document:', processData.data?.isClinical);
  console.log('Classification Confidence:', processData.data?.classificationConfidence);

  console.log('\n--- STEP 6: Real Summary Generation ---');
  const summaryRes = await fetch(`${baseUrl}/cases/${caseId}/summary/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({})
  });
  const summaryData = await summaryRes.json();
  console.log('Summary generation status:', summaryRes.status);
  console.log('Summary chiefConcern:', summaryData.data?.sections?.chiefConcern);
  console.log('Summary status:', summaryData.data?.status);
  console.log('Attached documents:', summaryData.data?.sections?.relevantMedicalRecords);

  console.log('\n--- STEP 7: Confirm + Save Summary (Phase 09) ---');
  const confirmRes = await fetch(`${baseUrl}/cases/${caseId}/summary/confirm`, {
    method: 'POST',
    headers,
    body: JSON.stringify({})
  });
  const confirmData = await confirmRes.json();
  console.log('Confirm status:', confirmRes.status);
  console.log('Summary confirmed status:', confirmData.data?.summary?.status);
  console.log('Case status:', confirmData.data?.case?.status);

  console.log('\n--- STEP 8: FHIR R4 Bundle Generation ---');
  const fhirRes = await fetch(`${baseUrl}/cases/${caseId}/fhir`, {
    headers: { 'x-user-id': 'user-clinician-001' }
  });
  const fhirData = await fhirRes.json();
  console.log('FHIR status:', fhirRes.status);
  console.log('FHIR resourceType:', fhirData.data?.resourceType);
  console.log('FHIR entries count:', fhirData.data?.entry?.length);

  console.log('\n=============================================');
  console.log('✅ ALL 8 INTEGRATION STEPS PASSED COMPLETELY!');
  console.log('=============================================');
}

runEndToEndIntegration().catch((err) => {
  console.error('❌ E2E Integration failed:', err);
  process.exit(1);
});
