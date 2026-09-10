/**
 * Phase 05 Live HTTP Verification Script
 * Uses Node.js 22 native fetch and FormData to upload real files to http://localhost:5000
 */

import fs from 'fs';
import path from 'path';

async function runVerification() {
  console.log('--- Phase 05 Live Medical Document Upload Verification ---');

  const BASE_URL = 'http://localhost:5000';
  const headers = {
    'x-user-id': 'user-live-verifier'
  };

  // 1. Create a clinical case
  console.log('\n[1] Creating test case...');
  const caseRes = await fetch(`${BASE_URL}/api/v1/cases`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientData: {
        firstName: 'Devendra',
        lastName: 'Sharma',
        age: 58,
        gender: 'male'
      }
    })
  });

  const caseJson = await caseRes.json();
  if (!caseRes.ok) {
    throw new Error(`Failed to create case: ${JSON.stringify(caseJson)}`);
  }
  const caseId = caseJson.data.caseId;
  console.log(` Case created: ${caseId}`);

  try {
    // 2. Upload a Prescription PDF
    console.log('\n[2] Uploading synthetic Prescription PDF...');
    const pdfBytes = Buffer.from('%PDF-1.4\n% Synthetic Prescription for Devendra Sharma\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

    const formDataPdf = new FormData();
    formDataPdf.append('file', pdfBlob, 'Prescription_Cardiology_2026.pdf');
    formDataPdf.append('type', 'prescription');
    formDataPdf.append('category', 'Prescription');

    const uploadPdfRes = await fetch(`${BASE_URL}/api/v1/cases/${caseId}/documents`, {
      method: 'POST',
      headers, // fetch automatically computes boundary with multipart/form-data
      body: formDataPdf
    });

    const uploadPdfJson = await uploadPdfRes.json();
    console.log(' Upload PDF Status:', uploadPdfRes.status);
    console.log(' Upload PDF Response:', uploadPdfJson.data);
    const pdfDocId = uploadPdfJson.data.id;

    // 3. Upload a Lab Report Image (JPEG)
    console.log('\n[3] Uploading synthetic Lab Report JPEG...');
    const jpgBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01]);
    const jpgBlob = new Blob([jpgBytes], { type: 'image/jpeg' });

    const formDataJpg = new FormData();
    formDataJpg.append('file', jpgBlob, 'BloodTest_CompleteLipidPanel.jpg');

    const uploadJpgRes = await fetch(`${BASE_URL}/api/v1/cases/${caseId}/documents`, {
      method: 'POST',
      headers,
      body: formDataJpg
    });

    const uploadJpgJson = await uploadJpgRes.json();
    console.log(' Upload JPG Status:', uploadJpgRes.status);
    console.log(' Inferred Type:', uploadJpgJson.data.type);
    console.log(' Inferred Category:', uploadJpgJson.data.category);
    const jpgDocId = uploadJpgJson.data.id;

    // 4. List Documents for Case
    console.log('\n[4] Listing all documents for case...');
    const listRes = await fetch(`${BASE_URL}/api/v1/cases/${caseId}/documents`, {
      headers
    });
    const listJson = await listRes.json();
    console.log(' List status:', listRes.status, 'Total documents:', listJson.data.length);
    listJson.data.forEach((d: any, idx: number) => {
      console.log(`   [${idx + 1}] ID: ${d.id} | Name: ${d.name} | Type: ${d.type} | Size: ${d.sizeBytes}B | URL: ${d.fileUrl}`);
    });

    // 5. Download / Stream file
    console.log('\n[5] Streaming uploaded file from disk...');
    const streamRes = await fetch(`${BASE_URL}/api/v1/cases/${caseId}/documents/${pdfDocId}/file`, {
      headers
    });
    console.log(' Stream status:', streamRes.status);
    console.log(' Content-Type:', streamRes.headers.get('content-type'));
    console.log(' Content-Disposition:', streamRes.headers.get('content-disposition'));
    const streamBuffer = Buffer.from(await streamRes.arrayBuffer());
    console.log(' Streamed bytes matches original:', streamBuffer.equals(pdfBytes));

    // 6. Update Document Metadata
    console.log('\n[6] Updating document metadata...');
    const updateRes = await fetch(`${BASE_URL}/api/v1/cases/${caseId}/documents/${pdfDocId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Discharge Summary',
        type: 'discharge_summary'
      })
    });
    const updateJson = await updateRes.json();
    console.log(' Update status:', updateRes.status);
    console.log(' Updated type:', updateJson.data.type, 'category:', updateJson.data.category);

    // 7. Delete Document
    console.log('\n[7] Deleting document...');
    const deleteRes = await fetch(`${BASE_URL}/api/v1/cases/${caseId}/documents/${jpgDocId}`, {
      method: 'DELETE',
      headers
    });
    const deleteJson = await deleteRes.json();
    console.log(' Delete status:', deleteRes.status, 'Response:', deleteJson.data);

    // 8. Confirm remaining documents
    console.log('\n[8] Confirming remaining documents...');
    const listAfterRes = await fetch(`${BASE_URL}/api/v1/cases/${caseId}/documents`, {
      headers
    });
    const listAfterJson = await listAfterRes.json();
    console.log(' Remaining documents count:', listAfterJson.data.length);

    console.log('\n--- Phase 05 Live HTTP Verification COMPLETED SUCCESSFULLY! ---');
  } finally {
    // Cleanup case upload folder
    const uploadDir = path.resolve(process.cwd(), 'uploads', 'cases', caseId);
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
  }
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
