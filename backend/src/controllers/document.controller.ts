/**
 * MEDiKIOSK Backend — Phase 05: Document Controller
 * Express HTTP handlers for medical document upload, listing, retrieval,
 * streaming, updating, and deletion.
 */

import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/document.service.js';
import { documentProcessingService } from '../services/documentProcessing.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * POST /api/v1/cases/:caseId/documents
 * Handles multipart file upload for medical documents attached to a Case.
 */
export async function uploadDocumentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;
    const file = req.file!;
    const documentId = (req as any).generatedDocumentId;

    const { type, category } = req.body || {};

    const document = await documentService.uploadDocument(
      userId,
      caseId,
      file,
      documentId,
      { type, category }
    );

    sendSuccess(res, document.toJSON(), 'Medical document uploaded successfully.', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/cases/:caseId/documents
 * Lists all medical documents attached to a Case.
 */
export async function listDocumentsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;

    const documents = await documentService.listDocuments(userId, caseId, req.query);
    const data = documents.map((d) => d.toJSON());

    sendSuccess(res, data, 'Medical documents retrieved successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/cases/:caseId/documents/:documentId
 * Retrieves metadata for a specific medical document.
 */
export async function getDocumentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId, documentId } = req.params;

    const document = await documentService.getDocument(userId, caseId, documentId);

    sendSuccess(res, document.toJSON(), 'Medical document metadata retrieved successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/cases/:caseId/documents/:documentId/file
 * Serves / streams the physical medical document file from server disk storage.
 */
export async function serveDocumentFileHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId, documentId } = req.params;

    const details = await documentService.getDocumentFilePath(userId, caseId, documentId);

    res.setHeader('Content-Type', details.mimeType);
    res.setHeader('Content-Length', details.sizeBytes);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(details.name)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.sendFile(details.resolvedPath);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/cases/:caseId/documents/:documentId
 * Updates organizational metadata of a medical document (type, category, name).
 */
export async function updateDocumentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId, documentId } = req.params;

    const document = await documentService.updateDocument(
      userId,
      caseId,
      documentId,
      req.body
    );

    sendSuccess(res, document.toJSON(), 'Medical document metadata updated successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/cases/:caseId/documents/:documentId
 * Permanently removes document metadata and physical file from server storage.
 */
export async function deleteDocumentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId, documentId } = req.params;

    await documentService.deleteDocument(userId, caseId, documentId);

    sendSuccess(res, { deleted: true, documentId }, 'Medical document deleted successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/cases/:caseId/documents/:documentId/process
 * Triggers text extraction / OCR processing on a document.
 */
export async function processDocumentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId, documentId } = req.params;

    const document = await documentProcessingService.processDocument(
      userId,
      caseId,
      documentId,
      req.body
    );

    sendSuccess(res, document, 'Medical document processed successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/cases/:caseId/documents/:documentId/text
 * Retrieves the extracted text content and extraction metadata of a document.
 */
export async function getDocumentTextHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId, documentId } = req.params;

    const data = await documentProcessingService.getDocumentText(
      userId,
      caseId,
      documentId
    );

    sendSuccess(res, data, 'Extracted document text retrieved successfully.');
  } catch (error) {
    next(error);
  }
}
