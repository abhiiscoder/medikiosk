/**
 * MEDiKIOSK Backend — Phase 05: Medical Records & Document Upload Tests
 * Validates:
 * 1. Upload valid PDF document, disk persistence, and MongoDB metadata creation
 * 2. Upload valid image document with type inference
 * 3. List documents for a case with filtering
 * 4. Retrieve single document metadata
 * 5. Stream/download physical document file with security headers
 * 6. Update document metadata
 * 7. Delete document metadata and remove file from disk
 * 8. Ownership isolation / unauthorized clinician rejection
 * 9. Rejection of unsupported file types (400)
 * 10. Rejection of missing file in upload (400)
 * 11. Rejection of upload to non-existent case (404)
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Case } from '../src/models/case.model.js';
import { Patient } from '../src/models/patient.model.js';
import { MedicalDocument } from '../src/models/document.model.js';
import { config } from '../src/config/index.js';

describe('Phase 05: Medical Records & Document Upload Foundation', () => {
  let caseId: string;
  let patientId: string;
  let uploadedDocId: string;
  let uploadedImagePath: string;
  const clinicianUser = 'user-clinician-phase05';
  const unauthorizedUser = 'user-clinician-unauthorized';

  // Synthetic dummy files for testing
  const dummyPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const dummyJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01]);

  before(async () => {
    await connectDatabase();

    // Create a clinical case
    const caseRes = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: {
          firstName: 'Vikram',
          lastName: 'Singhania',
          age: 46,
          gender: 'male'
        }
      });

    assert.equal(caseRes.status, 201);
    caseId = caseRes.body.data.caseId;
    patientId = caseRes.body.data.patientId;
  });

  after(async () => {
    if (caseId) {
      await Case.deleteOne({ caseId });
      await Patient.deleteOne({ patientId });
      await MedicalDocument.deleteMany({ caseId });

      // Clean up physical test directory
      const caseUploadDir = path.resolve(process.cwd(), config.UPLOAD_DIR, 'cases', caseId);
      try {
        if (fs.existsSync(caseUploadDir)) {
          fs.rmSync(caseUploadDir, { recursive: true, force: true });
        }
      } catch {
        // Safe cleanup
      }
    }
    await disconnectDatabase();
  });

  // 1. Upload PDF
  test('1. POST /cases/:caseId/documents uploads valid PDF and creates metadata', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/documents`)
      .set('x-user-id', clinicianUser)
      .attach('file', dummyPdfBuffer, 'prescription_scan.pdf');

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.caseId, caseId);
    assert.equal(res.body.data.name, 'prescription_scan.pdf');
    assert.equal(res.body.data.mimeType, 'application/pdf');
    assert.equal(res.body.data.sizeBytes, dummyPdfBuffer.length);
    assert.equal(res.body.data.type, 'prescription'); // inferred from name
    assert.equal(res.body.data.processingStatus, 'uploaded');
    assert.equal(res.body.data.verificationLevel, 'unverified');
    assert.ok(res.body.data.fileUrl.includes(`/api/v1/cases/${caseId}/documents/`));

    uploadedDocId = res.body.data.id;

    // Verify record in MongoDB
    const docInDb = await MedicalDocument.findOne({ documentId: uploadedDocId });
    assert.ok(docInDb);
    assert.equal(docInDb.ownerId, clinicianUser);

    // Verify physical file exists on disk
    const diskPath = path.resolve(process.cwd(), docInDb.storagePath);
    assert.ok(fs.existsSync(diskPath));
    const diskContent = fs.readFileSync(diskPath);
    assert.equal(diskContent.toString(), dummyPdfBuffer.toString());
  });

  // 2. Upload image with explicit type override
  test('2. POST /cases/:caseId/documents uploads JPEG image with explicit type', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/documents`)
      .set('x-user-id', clinicianUser)
      .field('type', 'lab_report')
      .field('category', 'Laboratory Report')
      .attach('file', dummyJpgBuffer, 'blood_test.jpg');

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.type, 'lab_report');
    assert.equal(res.body.data.category, 'Laboratory Report');
    assert.equal(res.body.data.mimeType, 'image/jpeg');

    const docInDb = await MedicalDocument.findOne({ documentId: res.body.data.id });
    assert.ok(docInDb);
    uploadedImagePath = path.resolve(process.cwd(), docInDb.storagePath);
  });

  // 3. List documents
  test('3. GET /cases/:caseId/documents lists all documents for the case', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseId}/documents`)
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 2);

    // Filter by type
    const filterRes = await request(app)
      .get(`/api/v1/cases/${caseId}/documents?type=prescription`)
      .set('x-user-id', clinicianUser);

    assert.equal(filterRes.status, 200);
    assert.equal(filterRes.body.data.length, 1);
    assert.equal(filterRes.body.data[0].type, 'prescription');
  });

  // 4. Retrieve single document metadata
  test('4. GET /cases/:caseId/documents/:documentId returns document metadata', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseId}/documents/${uploadedDocId}`)
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, uploadedDocId);
    assert.equal(res.body.data.name, 'prescription_scan.pdf');
  });

  // 5. Stream / download physical document file
  test('5. GET /cases/:caseId/documents/:documentId/file streams file from disk', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseId}/documents/${uploadedDocId}/file`)
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['content-disposition'].includes('inline'));
    assert.equal(res.body.toString(), dummyPdfBuffer.toString());
  });

  // 6. Update document metadata
  test('6. PATCH /cases/:caseId/documents/:documentId updates metadata', async () => {
    const res = await request(app)
      .patch(`/api/v1/cases/${caseId}/documents/${uploadedDocId}`)
      .set('x-user-id', clinicianUser)
      .send({
        type: 'radiology',
        category: 'Diagnostic / Imaging Report'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.type, 'radiology');
    assert.equal(res.body.data.category, 'Diagnostic / Imaging Report');

    const updated = await MedicalDocument.findOne({ documentId: uploadedDocId });
    assert.equal(updated?.type, 'radiology');
  });

  // 7. Delete document metadata and remove file
  test('7. DELETE /cases/:caseId/documents/:documentId removes record and file', async () => {
    const doc = await MedicalDocument.findOne({ documentId: uploadedDocId });
    assert.ok(doc);
    const filePath = path.resolve(process.cwd(), doc.storagePath);
    assert.ok(fs.existsSync(filePath));

    const res = await request(app)
      .delete(`/api/v1/cases/${caseId}/documents/${uploadedDocId}`)
      .set('x-user-id', clinicianUser);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.deleted, true);

    // Verify deleted from MongoDB
    const deletedDoc = await MedicalDocument.findOne({ documentId: uploadedDocId });
    assert.equal(deletedDoc, null);

    // Verify deleted from disk
    assert.equal(fs.existsSync(filePath), false);
  });

  // 8. Ownership isolation
  test('8. Endpoints reject requests from unauthorized clinicians', async () => {
    const listRes = await request(app)
      .get(`/api/v1/cases/${caseId}/documents`)
      .set('x-user-id', unauthorizedUser);

    assert.equal(listRes.status, 404);
    assert.equal(listRes.body.error.code, 'CASE_NOT_FOUND');

    const uploadRes = await request(app)
      .post(`/api/v1/cases/${caseId}/documents`)
      .set('x-user-id', unauthorizedUser)
      .attach('file', dummyPdfBuffer, 'unauth.pdf');

    assert.equal(uploadRes.status, 404);
    assert.equal(uploadRes.body.error.code, 'CASE_NOT_FOUND');
  });

  // 9. Rejection of unsupported file type
  test('9. Upload rejects unsupported file extensions/types', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/documents`)
      .set('x-user-id', clinicianUser)
      .attach('file', Buffer.from('echo malicious'), 'script.sh');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'UNSUPPORTED_FILE_TYPE');
  });

  // 10. Rejection of missing file
  test('10. Upload rejects requests missing file payload', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/documents`)
      .set('x-user-id', clinicianUser)
      .send({ type: 'lab_report' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'FILE_REQUIRED');
  });

  // 11. Rejection of upload for non-existent case
  test('11. Upload rejects non-existent case with 404', async () => {
    const res = await request(app)
      .post('/api/v1/cases/case-nonexistent-9999/documents')
      .set('x-user-id', clinicianUser)
      .attach('file', dummyPdfBuffer, 'test.pdf');

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
  });
});
