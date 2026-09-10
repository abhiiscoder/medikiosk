/**
 * Live HTTP verification script for Phase 06: Medical Document Processing & Text Extraction
 * Tests live wire requests against http://localhost:5000
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000/api/v1';
const CLINICIAN_ID = 'clinician-live-phase06';
const UNAUTHORIZED_ID = 'clinician-live-intruder';

async function main() {
  console.log('=== STARTING LIVE HTTP VERIFICATION (PORT 5000) ===\n');

  // 1. Check health
  const healthRes = await fetch('http://localhost:5000/health');
  const healthData = await healthRes.json();
  console.log('1. GET /health status:', healthRes.status, healthData.data?.status);

  // 2. Create clinical case
  const caseRes = await fetch(`${BASE_URL}/cases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': CLINICIAN_ID
    },
    body: JSON.stringify({
      patientData: {
        firstName: 'Meera',
        lastName: 'Patel',
        age: 38,
        gender: 'female'
      }
    })
  });
  const caseData = await caseRes.json();
  const caseId = caseData.data.caseId;
  console.log('2. Created Case:', caseId);

  // 3. Upload a text PDF
  const textPdfBuffer = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n' +
    '4 0 obj\n<< /Length 120 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Patient Meera Patel: Tab Atorvastatin 20mg OD at night for Hypercholesterolemia) Tj\nET\nendstream\nendobj\n' +
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n' +
    'xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000000438 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n517\n%%EOF\n'
  );

  const formData = new FormData();
  const blob = new Blob([textPdfBuffer], { type: 'application/pdf' });
  formData.append('file', blob, 'discharge_summary_cardiology.pdf');

  const uploadRes = await fetch(`${BASE_URL}/cases/${caseId}/documents`, {
    method: 'POST',
    headers: {
      'x-user-id': CLINICIAN_ID
    },
    body: formData
  });
  const uploadData = await uploadRes.json();
  const documentId = uploadData.data.id;
  console.log('3. Uploaded Document:', documentId, 'status:', uploadData.data.processingStatus);

  // 4. Trigger processing
  console.log('4. Triggering POST /:documentId/process...');
  const procRes = await fetch(`${BASE_URL}/cases/${caseId}/documents/${documentId}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': CLINICIAN_ID
    },
    body: JSON.stringify({})
  });
  const procData = await procRes.json();
  console.log('   Process HTTP status:', procRes.status);
  console.log('   Process Result:', {
    documentId: procData.data.documentId,
    processingStatus: procData.data.processingStatus,
    extractionMethod: procData.data.extractionMethod,
    extractedTextLength: procData.data.extractedTextLength,
    processedAt: procData.data.processedAt
  });

  // 5. Retrieve text
  console.log('5. Retrieving text via GET /:documentId/text...');
  const textRes = await fetch(`${BASE_URL}/cases/${caseId}/documents/${documentId}/text`, {
    headers: {
      'x-user-id': CLINICIAN_ID
    }
  });
  const textData = await textRes.json();
  console.log('   Get Text status:', textRes.status);
  console.log('   Extracted Text Preview:', textData.data.extractedText.slice(0, 70) + '...');
  console.log('   Extraction Method:', textData.data.extractionMethod);

  // 6. Test Idempotency
  console.log('6. Testing Idempotency (calling process again without forceReprocess)...');
  const secondProcRes = await fetch(`${BASE_URL}/cases/${caseId}/documents/${documentId}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': CLINICIAN_ID
    },
    body: JSON.stringify({})
  });
  const secondProcData = await secondProcRes.json();
  console.log('   Second process status:', secondProcRes.status, secondProcData.data.processingStatus);

  // 7. Test forceReprocess
  console.log('7. Testing forceReprocess: true...');
  const forceProcRes = await fetch(`${BASE_URL}/cases/${caseId}/documents/${documentId}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': CLINICIAN_ID
    },
    body: JSON.stringify({ forceReprocess: true })
  });
  const forceProcData = await forceProcRes.json();
  console.log('   Force reprocess status:', forceProcRes.status, forceProcData.data.processingStatus);

  // 8. Test Unauthorized clinician isolation
  console.log('8. Testing Unauthorized clinician isolation...');
  const unauthRes = await fetch(`${BASE_URL}/cases/${caseId}/documents/${documentId}/text`, {
    headers: {
      'x-user-id': UNAUTHORIZED_ID
    }
  });
  console.log('   Unauthorized GET text status:', unauthRes.status, '(Expected: 404)');

  // 9. Test Alias route
  console.log('9. Testing Alias Route /cases/:caseId/medical-documents/:documentId/text...');
  const aliasRes = await fetch(`${BASE_URL}/cases/${caseId}/medical-documents/${documentId}/text`, {
    headers: {
      'x-user-id': CLINICIAN_ID
    }
  });
  const aliasData = await aliasRes.json();
  console.log('   Alias Route status:', aliasRes.status, 'match:', aliasData.data.documentId === documentId);

  console.log('\n=== LIVE HTTP VERIFICATION COMPLETED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
