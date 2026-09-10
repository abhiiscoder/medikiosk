/**
 * MEDiKIOSK Backend — Phase 05: Document Routes
 * REST routes for medical document upload, listing, retrieval, streaming, and deletion.
 */

import { Router } from 'express';
import {
  uploadDocumentHandler,
  listDocumentsHandler,
  getDocumentHandler,
  serveDocumentFileHandler,
  updateDocumentHandler,
  deleteDocumentHandler,
  processDocumentHandler,
  getDocumentTextHandler
} from '../controllers/document.controller.js';
import { uploadDocumentMiddleware } from '../middleware/upload.js';
import { validateRequest } from '../middleware/validate.js';
import {
  updateDocumentSchema,
  queryDocumentsSchema,
  processDocumentSchema
} from '../validators/document.validator.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// All document operations require clinician ownership context
router.use(requireAuth);

// POST /api/v1/cases/:caseId/documents (upload single medical document)
router.post('/', uploadDocumentMiddleware, uploadDocumentHandler);

// GET /api/v1/cases/:caseId/documents (list documents attached to case)
router.get('/', validateRequest(queryDocumentsSchema), listDocumentsHandler);

// GET /api/v1/cases/:caseId/documents/:documentId (retrieve document metadata)
router.get('/:documentId', getDocumentHandler);

// GET /api/v1/cases/:caseId/documents/:documentId/file (serve physical document file)
router.get('/:documentId/file', serveDocumentFileHandler);

// PATCH /api/v1/cases/:caseId/documents/:documentId (update document metadata)
router.patch('/:documentId', validateRequest(updateDocumentSchema), updateDocumentHandler);

// POST /api/v1/cases/:caseId/documents/:documentId/process (extract text & process document)
router.post('/:documentId/process', validateRequest(processDocumentSchema), processDocumentHandler);

// GET /api/v1/cases/:caseId/documents/:documentId/text (retrieve extracted text)
router.get('/:documentId/text', getDocumentTextHandler);

// DELETE /api/v1/cases/:caseId/documents/:documentId (delete document and file)
router.delete('/:documentId', deleteDocumentHandler);

export default router;
