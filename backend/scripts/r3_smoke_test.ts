/**
 * MEDiKIOSK Phase R3: Full End-to-End Real Smoke Test
 * Tests the entire authoritative real chain:
 * Register -> Login -> Create Case -> Conversation -> Voice Input -> Document Upload
 * -> Gemini Processing -> Summary Synthesis -> Confirm -> PDF Export -> Refresh/Verify Persisted Data
 */

import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { app } from '../src/app.js';
import request from 'supertest';

async function runSmokeTest() {
  console.log('--- STARTING PHASE R3 E2E SMOKE TEST ---');
  await connectDatabase();

  const mobileNumber = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

  // 1. REGISTER
  console.log('1. Registering new clinician user...');
  const regRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Dr. Arjun Rampal',
      mobileNumber,
      password: 'LivePassword#2026',
      role: 'clinician'
    });
  assert.equal(regRes.status, 201);
  const { medikioskId, session } = regRes.body.data;
  console.log(`   Registered successfully: ${medikioskId}`);

  // 2. LOGIN
  console.log('2. Logging in with MEDiKIOSK ID & password...');
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      medikioskId,
      password: 'LivePassword#2026'
    });
  assert.equal(loginRes.status, 200);
  const token = loginRes.body.data.token;
  const authHeader = `Bearer ${token}`;
  console.log('   Logged in, JWT token issued.');

  // 3. GET SESSION
  console.log('3. Verifying session...');
  const sessionRes = await request(app)
    .get('/api/v1/auth/session')
    .set('Authorization', authHeader);
  assert.equal(sessionRes.status, 200);
  assert.equal(sessionRes.body.data.medikioskId, medikioskId);
  console.log('   Session verified.');

  // 4. CREATE CASE
  console.log('4. Creating new patient case...');
  const caseRes = await request(app)
    .post('/api/v1/cases')
    .set('Authorization', authHeader)
    .send({
      patientData: {
        firstName: 'Meera',
        lastName: 'Nair',
        age: 38,
        gender: 'female'
      }
    });
  assert.equal(caseRes.status, 201);
  const caseId = caseRes.body.data.caseId;
  console.log(`   Case created: ${caseId}`);

  // 5. CLINICAL CONVERSATION (TEXT)
  console.log('5. Submitting clinical anamnesis input (text)...');
  const textMsgRes = await request(app)
    .post(`/api/v1/cases/${caseId}/conversation/messages`)
    .set('Authorization', authHeader)
    .send({
      content: 'I have severe migraine headache for two days and nausea.',
      source: 'text'
    });
  assert.equal(textMsgRes.status, 200);
  assert.ok(textMsgRes.body.data.assistantMessage);
  console.log(`   Gemini AI Response: "${textMsgRes.body.data.assistantMessage.content.slice(0, 70)}..."`);

  // 6. VOICE INPUT (VOICE SOURCE)
  console.log('6. Submitting clinical voice input (source: voice)...');
  const voiceMsgRes = await request(app)
    .post(`/api/v1/cases/${caseId}/conversation/messages`)
    .set('Authorization', authHeader)
    .send({
      content: 'No fever or visual aura, but sensitive to bright light.',
      source: 'voice'
    });
  assert.equal(voiceMsgRes.status, 200);
  assert.ok(voiceMsgRes.body.data.assistantMessage);
  console.log(`   Gemini Voice Response: "${voiceMsgRes.body.data.assistantMessage.content.slice(0, 70)}..."`);

  // 7. MEDICAL DOCUMENT UPLOAD
  console.log('7. Uploading medical document...');
  const clinicalPdfBuffer = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n' +
    '4 0 obj\n<< /Length 180 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(CLINICAL PRESCRIPTION: Sumatriptan 50mg tablets PO PRN for acute migraine. Diagnosed Migraine Cephalea. Dr. R. Sharma MD Reg 44921) Tj\nET\nendstream\nendobj\n' +
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n' +
    'xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000244 00000 n \n0000000475 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n555\n%%EOF'
  );

  const uploadRes = await request(app)
    .post(`/api/v1/cases/${caseId}/documents`)
    .set('Authorization', authHeader)
    .attach('file', clinicalPdfBuffer, 'Migraine_Prescription.pdf');
  assert.equal(uploadRes.status, 201);
  const documentId = uploadRes.body.data.documentId;
  console.log(`   Document uploaded: ${documentId}`);

  // 8. GEMINI DOCUMENT PROCESSING
  console.log('8. Processing medical document with Gemini...');
  const processRes = await request(app)
    .post(`/api/v1/cases/${caseId}/documents/${documentId}/process`)
    .set('Authorization', authHeader);
  assert.equal(processRes.status, 200);
  assert.equal(processRes.body.data.isClinicalDocument, true);
  console.log(`   Document validated: ${processRes.body.data.classification}`);

  // 9. CLINICAL SUMMARY GENERATION
  console.log('9. Synthesizing clinical summary via Gemini...');
  const summaryRes = await request(app)
    .post(`/api/v1/cases/${caseId}/summary/generate`)
    .set('Authorization', authHeader);
  assert.equal(summaryRes.status, 201);
  assert.equal(summaryRes.body.data.status, 'draft');
  console.log('   Summary synthesized in MongoDB.');

  // 10. CONFIRM SUMMARY
  console.log('10. Confirming summary...');
  const confirmRes = await request(app)
    .post(`/api/v1/cases/${caseId}/summary/confirm`)
    .set('Authorization', authHeader);
  assert.equal(confirmRes.status, 200);
  assert.equal(confirmRes.body.data.summary.status, 'confirmed');
  console.log('   Summary confirmed.');

  // 11. PDF EXPORT
  console.log('11. Exporting vector PDF...');
  const pdfRes = await request(app)
    .get(`/api/v1/cases/${caseId}/summary/pdf`)
    .set('Authorization', authHeader)
    .buffer(true)
    .parse((res, callback) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    });
  assert.equal(pdfRes.status, 200);
  assert.equal(pdfRes.headers['content-type'], 'application/pdf');
  assert.ok(pdfRes.body.toString('latin1').startsWith('%PDF-'));
  console.log(`   Vector PDF generated: ${pdfRes.body.length} bytes`);

  // 12. REFRESH / RESTORE PERSISTED STATE
  console.log('12. Simulating browser refresh and verifying persisted MongoDB state...');
  const reloadCase = await request(app)
    .get(`/api/v1/cases/${caseId}`)
    .set('Authorization', authHeader);
  assert.equal(reloadCase.status, 200);
  assert.equal(reloadCase.body.data.caseId, caseId);
  assert.equal(reloadCase.body.data.patient.firstName, 'Meera');

  const reloadSummary = await request(app)
    .get(`/api/v1/cases/${caseId}/summary`)
    .set('Authorization', authHeader);
  assert.equal(reloadSummary.status, 200);
  assert.equal(reloadSummary.body.data.status, 'confirmed');

  const reloadConversation = await request(app)
    .get(`/api/v1/cases/${caseId}/conversation`)
    .set('Authorization', authHeader);
  assert.equal(reloadConversation.status, 200);
  assert.ok(reloadConversation.body.data.messages.length >= 4);

  console.log('--- PHASE R3 E2E SMOKE TEST PASSED COMPLETELY ---');
  await disconnectDatabase();
}

runSmokeTest().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
