/**
 * MEDiKIOSK Backend — Phase 05 & 06: Document Service
 * Manages medical document upload persistence, case association, metadata,
 * streaming, and cleanup.
 */

import fs from 'fs';
import path from 'path';
import {
  MedicalDocument,
  IMedicalDocument,
  MedicalDocumentType,
  MedicalDocumentCategory
} from '../models/document.model.js';
import { Case } from '../models/case.model.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { UpdateDocumentInput, QueryDocumentsInput } from '../validators/document.validator.js';

export interface UploadDocumentOptions {
  type?: MedicalDocumentType;
  category?: string;
}

export interface DocumentFileDetails {
  resolvedPath: string;
  mimeType: string;
  name: string;
  sizeBytes: number;
}

class DocumentService {
  /**
   * Infers default document type and category from original filename
   */
  private inferTypeAndCategory(filename: string, hintedType?: MedicalDocumentType): {
    type: MedicalDocumentType;
    category: MedicalDocumentCategory;
  } {
    if (hintedType) {
      const categoryMap: Record<MedicalDocumentType, MedicalDocumentCategory> = {
        prescription: 'Prescription',
        lab_report: 'Lab Report',
        radiology: 'Imaging / Scan',
        discharge_summary: 'Discharge Summary',
        clinical_note: 'Doctor Note',
        identity_card: 'Other Clinical Document',
        other: 'Other Clinical Document'
      };
      return { type: hintedType, category: categoryMap[hintedType] || 'Other Clinical Document' };
    }

    const lower = filename.toLowerCase();
    if (lower.includes('assignment') || lower.includes('resume') || lower.includes('homework') || lower.includes('college_notes')) {
      return { type: 'other', category: 'NON_CLINICAL' };
    }
    if (lower.includes('rx') || lower.includes('prescription')) {
      return { type: 'prescription', category: 'Prescription' };
    }
    if (lower.includes('lab') || lower.includes('blood') || lower.includes('urine') || lower.includes('report') || lower.includes('panel')) {
      return { type: 'lab_report', category: 'Lab Report' };
    }
    if (lower.includes('xray') || lower.includes('mri') || lower.includes('ct') || lower.includes('ultrasound') || lower.includes('scan') || lower.includes('radiology')) {
      return { type: 'radiology', category: 'Imaging / Scan' };
    }
    if (lower.includes('discharge')) {
      return { type: 'discharge_summary', category: 'Discharge Summary' };
    }

    return { type: 'clinical_note', category: 'Other Clinical Document' };
  }

  /**
   * Uploads and registers a new medical document attached to an owned Case.
   */
  async uploadDocument(
    userId: string,
    caseId: string,
    file: Express.Multer.File,
    documentId: string,
    options: UploadDocumentOptions = {}
  ): Promise<IMedicalDocument> {
    // 1. Verify case exists and belongs to requesting clinician
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      // Clean up orphaned disk file before throwing
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (cleanupErr) {
        logger.warn('Failed to delete orphaned file after case validation failure', {
          path: file.path,
          error: String(cleanupErr)
        });
      }
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    // 2. Infer type and category
    const { type: inferredType, category: inferredCategory } = this.inferTypeAndCategory(
      file.originalname,
      options.type
    );

    const type = options.type || inferredType;
    const category = options.category || inferredCategory;

    // 3. Create document record
    const storagePath = path.relative(process.cwd(), file.path);
    const fileUrl = `/api/v1/cases/${caseId}/documents/${documentId}/file`;

    const documentDoc = new MedicalDocument({
      documentId,
      caseId: caseDoc.caseId,
      patientId: caseDoc.patientId,
      ownerId: userId,
      name: file.originalname,
      storedFilename: file.filename,
      storagePath,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      type,
      category,
      processingStatus: 'uploaded',
      validationStatus: 'validation_pending',
      classification: 'UNKNOWN',
      isClinicalDocument: false,
      verificationLevel: 'unverified',
      fileUrl,
      metadata: {
        originalExtension: path.extname(file.originalname).toLowerCase(),
        uploadSource: 'web'
      },
      uploadedAt: new Date()
    });

    await documentDoc.save();

    logger.info('Uploaded new medical document', {
      documentId,
      caseId,
      patientId: caseDoc.patientId,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      type,
      category
    });

    return documentDoc;
  }

  /**
   * Lists all medical documents attached to an owned Case.
   */
  async listDocuments(
    userId: string,
    caseId: string,
    filters: QueryDocumentsInput = {}
  ): Promise<IMedicalDocument[]> {
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    const query: Record<string, unknown> = {
      caseId,
      ownerId: userId
    };

    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.processingStatus) {
      query.processingStatus = filters.processingStatus;
    }
    if (filters.validationStatus) {
      query.validationStatus = filters.validationStatus;
    }
    if (filters.isClinicalDocument !== undefined) {
      query.isClinicalDocument = filters.isClinicalDocument;
    }

    const documents = await MedicalDocument.find(query).sort({ uploadedAt: -1 });
    return documents;
  }

  /**
   * Retrieves single document metadata by ID for an owned Case.
   */
  async getDocument(userId: string, caseId: string, documentId: string): Promise<IMedicalDocument> {
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    const doc = await MedicalDocument.findOne({ documentId, caseId, ownerId: userId });
    if (!doc) {
      throw new AppError(`Medical document with ID '${documentId}' was not found.`, 404, 'DOCUMENT_NOT_FOUND');
    }

    return doc;
  }

  /**
   * Resolves physical file path on disk for streaming/download.
   */
  async getDocumentFilePath(
    userId: string,
    caseId: string,
    documentId: string
  ): Promise<DocumentFileDetails> {
    const doc = await this.getDocument(userId, caseId, documentId);

    const resolvedPath = path.resolve(process.cwd(), doc.storagePath);
    if (!fs.existsSync(resolvedPath)) {
      logger.error('Document file missing from disk storage', {
        documentId,
        storagePath: doc.storagePath,
        resolvedPath
      });
      throw new AppError('Physical medical document file is missing on storage.', 404, 'FILE_NOT_FOUND');
    }

    return {
      resolvedPath,
      mimeType: doc.mimeType,
      name: doc.name,
      sizeBytes: doc.sizeBytes
    };
  }

  /**
   * Updates document organizational metadata (type, category, name).
   */
  async updateDocument(
    userId: string,
    caseId: string,
    documentId: string,
    input: UpdateDocumentInput
  ): Promise<IMedicalDocument> {
    const doc = await this.getDocument(userId, caseId, documentId);

    if (input.type) {
      doc.type = input.type;
    }
    if (input.category) {
      doc.category = input.category;
    }
    if (input.name) {
      doc.name = input.name;
    }

    await doc.save();
    logger.info('Updated medical document metadata', { documentId, caseId, updates: input });

    return doc;
  }

  /**
   * Deletes document metadata from MongoDB and unlinks physical file from storage.
   */
  async deleteDocument(userId: string, caseId: string, documentId: string): Promise<void> {
    const doc = await this.getDocument(userId, caseId, documentId);

    const resolvedPath = path.resolve(process.cwd(), doc.storagePath);
    try {
      if (fs.existsSync(resolvedPath)) {
        await fs.promises.unlink(resolvedPath);
      }
    } catch (fsErr) {
      logger.warn('Failed to delete physical file during document removal', {
        documentId,
        path: resolvedPath,
        error: String(fsErr)
      });
    }

    await MedicalDocument.deleteOne({ _id: doc._id });
    logger.info('Deleted medical document', { documentId, caseId });
  }
}

export const documentService = new DocumentService();
