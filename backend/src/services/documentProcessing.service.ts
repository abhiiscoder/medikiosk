/**
 * MEDiKIOSK Backend — Phase 05 & 06: Document Processing Service
 * Orchestrates medical document processing lifecycle, concurrency locks,
 * text extraction, clinical document validation, and provenance persistence.
 */

import fs from 'fs';
import path from 'path';
import {
  MedicalDocument,
  IMedicalDocument,
  IDocumentProvenance,
  IExtractedClinicalData,
  MedicalDocumentType
} from '../models/document.model.js';
import { Case } from '../models/case.model.js';
import { textExtractionService } from './textExtraction.service.js';
import { clinicalDocumentClassifierService } from './clinicalDocumentClassifier.service.js';
import { validateBufferSignature } from '../utils/fileSignature.util.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export interface ProcessDocumentOptions {
  forceReprocess?: boolean;
}

export interface DocumentProcessingResponse {
  documentId: string;
  caseId: string;
  processingStatus: string;
  validationStatus: string;
  classification: string;
  isClinicalDocument: boolean;
  documentType: string;
  extractionMethod: string;
  extractedTextLength: number;
  provenance?: IDocumentProvenance | null;
  extractedClinicalData?: IExtractedClinicalData | null;
  processedAt?: Date | null;
  sampleSnippet?: string;
  processingError?: string | null;
}

export interface DocumentTextResponse {
  documentId: string;
  caseId: string;
  processingStatus: string;
  validationStatus: string;
  classification: string;
  isClinicalDocument: boolean;
  extractionMethod: string;
  extractedText: string | null;
  extractedTextLength: number;
  ocrConfidence?: number | null;
  provenance?: IDocumentProvenance | null;
  extractedClinicalData?: IExtractedClinicalData | null;
  processedAt?: Date | null;
  processingError?: string | null;
}

export class DocumentProcessingService {
  /**
   * Processes a medical document:
   * 1. Validates ownership & existence
   * 2. Guards against concurrent duplicate processing (409)
   * 3. Checks file existence & magic bytes
   * 4. Extracts text (PDF text -> OCR fallback; Image -> OCR)
   * 5. Classifies document (CLINICAL vs NON_CLINICAL vs UNKNOWN)
   * 6. Enforces Clinical Safety Rule: rejects non-clinical / unknown docs
   * 7. Builds provenance and persists results to MongoDB
   */
  public async processDocument(
    userId: string,
    caseId: string,
    documentId: string,
    options: ProcessDocumentOptions = {}
  ): Promise<DocumentProcessingResponse> {
    // 1. Verify case ownership
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    // 2. Verify document existence and ownership
    const document = await MedicalDocument.findOne({ documentId, caseId, ownerId: userId });
    if (!document) {
      throw new AppError(`Medical document with ID '${documentId}' was not found.`, 404, 'DOCUMENT_NOT_FOUND');
    }

    // 3. Concurrency guard: prevent duplicate simultaneous processing
    if (document.processingStatus === 'processing') {
      logger.warn('Attempted to process document already in processing state', { documentId, caseId });
      throw new AppError(
        'Document is currently being processed. Please wait for the current operation to complete.',
        409,
        'DOCUMENT_ALREADY_PROCESSING'
      );
    }

    // 4. Idempotency check: if already processed and not forced, return cached result
    if (
      document.processingStatus === 'processed' &&
      !options.forceReprocess &&
      document.extractedText
    ) {
      logger.info('Document already processed; returning cached extraction metadata', { documentId, caseId });
      return this.formatProcessingResponse(document);
    }

    // 5. Verify physical file exists on disk
    const resolvedPath = path.resolve(process.cwd(), document.storagePath);
    if (!fs.existsSync(resolvedPath)) {
      document.processingStatus = 'failed';
      document.processingError = 'Physical medical document file is missing on storage.';
      await document.save();
      logger.error('Physical document file missing during processing', { documentId, storagePath: document.storagePath });
      throw new AppError('Physical medical document file is missing on server storage.', 404, 'FILE_NOT_FOUND');
    }

    // 6. Transition state to 'processing'
    document.processingStatus = 'processing';
    document.processingError = null;
    await document.save();

    logger.info('Starting document processing & text extraction pipeline', {
      documentId,
      caseId,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes
    });

    try {
      // 7. Read file buffer and validate file signature
      const fileBuffer = await fs.promises.readFile(resolvedPath);
      validateBufferSignature(fileBuffer, document.mimeType, document.name);

      // 8. Execute text extraction strategy
      const extractionResult = await textExtractionService.extractTextFromDocument(
        fileBuffer,
        document.mimeType
      );

      // 9. Classify document (CLINICAL vs NON_CLINICAL vs UNKNOWN) and extract clinical data
      const classificationResult = await clinicalDocumentClassifierService.classifyDocument(
        extractionResult.text,
        document.documentId,
        document.name
      );

      // 10. Enforce Critical Clinical Safety Rule
      const isClinical = classificationResult.classification === 'CLINICAL';
      const validationStatus = isClinical ? 'validated' : 'rejected';

      // 11. Build traceable Provenance object
      const provenance: IDocumentProvenance = {
        sourceType: 'medical_document',
        documentId: document.documentId,
        originalFileName: document.name,
        documentType: classificationResult.documentType,
        category: classificationResult.documentType,
        extractionMethod: extractionResult.method,
        pageCount: 1,
        extractedAt: new Date()
      };

      // 12. Persist successful results
      document.processingStatus = 'processed';
      document.validationStatus = validationStatus;
      document.classification = classificationResult.classification;
      document.isClinicalDocument = isClinical;
      document.classificationConfidence = classificationResult.confidence;
      document.classificationReason = classificationResult.reason;
      document.category = classificationResult.documentType;
      document.type = this.mapCategoryToType(classificationResult.documentType, document.type);
      document.extractedText = extractionResult.text;
      document.extractedTextLength = extractionResult.text.length;
      document.extractionMethod = extractionResult.method;
      document.ocrConfidence = extractionResult.confidence ?? null;
      document.provenance = provenance;
      document.extractedClinicalData = classificationResult.extractedClinicalData || null;
      document.processedAt = new Date();
      document.processingError = null;
      await document.save();

      logger.info('Document processing completed successfully', {
        documentId,
        caseId,
        classification: classificationResult.classification,
        documentType: classificationResult.documentType,
        validationStatus,
        isClinicalDocument: isClinical,
        extractionMethod: extractionResult.method,
        extractedTextLength: extractionResult.text.length
      });

      return this.formatProcessingResponse(document);
    } catch (processingError) {
      // 13. Persist failure state safely without leaking stack traces
      const safeErrorMsg =
        processingError instanceof AppError
          ? processingError.message
          : 'Medical document processing failed.';

      document.processingStatus = 'failed';
      document.processingError = safeErrorMsg;
      await document.save();

      logger.error('Document processing failed', {
        documentId,
        caseId,
        error: safeErrorMsg
      });

      throw processingError;
    }
  }

  /**
   * Retrieves full extracted text, clinical classification, and provenance for an owned document.
   */
  public async getDocumentText(
    userId: string,
    caseId: string,
    documentId: string
  ): Promise<DocumentTextResponse> {
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    const document = await MedicalDocument.findOne({ documentId, caseId, ownerId: userId });
    if (!document) {
      throw new AppError(`Medical document with ID '${documentId}' was not found.`, 404, 'DOCUMENT_NOT_FOUND');
    }

    return {
      documentId: document.documentId,
      caseId: document.caseId,
      processingStatus: document.processingStatus,
      validationStatus: document.validationStatus || 'validation_pending',
      classification: document.classification || 'UNKNOWN',
      isClinicalDocument: !!document.isClinicalDocument,
      extractionMethod: document.extractionMethod || 'none',
      extractedText: document.extractedText || null,
      extractedTextLength: document.extractedTextLength || 0,
      ocrConfidence: document.ocrConfidence ?? null,
      provenance: document.provenance || null,
      extractedClinicalData: document.extractedClinicalData || null,
      processedAt: document.processedAt || null,
      processingError: document.processingError || null
    };
  }

  private mapCategoryToType(category: string, defaultType: MedicalDocumentType): MedicalDocumentType {
    const lower = (category || '').toLowerCase();
    if (lower.includes('prescription')) return 'prescription';
    if (lower.includes('lab')) return 'lab_report';
    if (lower.includes('imaging') || lower.includes('scan') || lower.includes('radiology')) return 'radiology';
    if (lower.includes('discharge')) return 'discharge_summary';
    if (lower.includes('doctor note') || lower.includes('clinical record')) return 'clinical_note';
    return defaultType || 'other';
  }

  private formatProcessingResponse(doc: IMedicalDocument): DocumentProcessingResponse {
    const text = doc.extractedText || '';
    const sampleSnippet =
      text.length > 100 ? `${text.slice(0, 100)}...` : text;

    return {
      documentId: doc.documentId,
      caseId: doc.caseId,
      processingStatus: doc.processingStatus,
      validationStatus: doc.validationStatus || 'validation_pending',
      classification: doc.classification || 'UNKNOWN',
      isClinicalDocument: !!doc.isClinicalDocument,
      documentType: doc.category || doc.type,
      extractionMethod: doc.extractionMethod || 'none',
      extractedTextLength: doc.extractedTextLength || 0,
      provenance: doc.provenance || null,
      extractedClinicalData: doc.extractedClinicalData || null,
      processedAt: doc.processedAt || null,
      sampleSnippet,
      processingError: doc.processingError || null
    };
  }
}

export const documentProcessingService = new DocumentProcessingService();
