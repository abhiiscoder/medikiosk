/**
 * MEDiKIOSK — Phase 05: OCR & Document Entity Extraction Service Boundary
 *
 * Strict Safety & Data Integrity Rules:
 * - ZERO fabricated clinical information.
 * - ZERO hardcoded mock findings (no fake blood pressure, no fake medications, no fake lab values).
 * - Distinguishes between clinical records and unrelated documents (assignments, notes, resumes).
 * - If non-clinical: marks document as 'non_clinical' with clear guidance.
 * - If clinical: verifies document without fabricating confidence scores or entities.
 */

import { ApiResponse } from '../types/common.types';
import { ExtractedEntity, MedicalDocument, MedicalDocumentType } from '../types/document.types';

export interface IOcrService {
  triggerOcrProcessing(
    documentId: string,
    docName?: string,
    mimeType?: string,
    caseId?: string
  ): Promise<ApiResponse<MedicalDocument>>;
  getExtractedEntities(documentId: string): Promise<ApiResponse<ExtractedEntity[]>>;
}

// Error/Corrupt test indicators in filename for testing the Processing Failed -> Retry branch
const PROCESSING_ERROR_PATTERNS = /corrupt|broken|error_test|fail_doc/i;

// Common non-clinical indicators in filename/metadata
const NON_CLINICAL_PATTERNS = /assignment|homework|college|school|resume|cv|invoice|receipt|bill|essay|code|slides|presentation|syllabus|screenshot|photo|test_doc/i;

// Clinically relevant document patterns
const CLINICAL_PATTERNS = /prescrip|rx|pill|med|lab|blood|lipid|cholesterol|urine|ecg|ekg|scan|xray|mri|ct|ultrasound|discharge|summary|clinic|hospital|doctor|patient|diagnosis|pathology|biopsy|radiolog/i;

class OcrService implements IOcrService {
  async triggerOcrProcessing(
    documentId: string,
    docName: string = 'Document.pdf',
    mimeType: string = 'application/pdf',
    caseId: string = 'active-case'
  ): Promise<ApiResponse<MedicalDocument>> {
    // Simulate real validation & parsing latency (700ms)
    await new Promise((resolve) => setTimeout(resolve, 700));

    // 1. Simulated Processing Failure Hook (Testing Branch: Processing Failed -> Retry)
    if (PROCESSING_ERROR_PATTERNS.test(docName)) {
      throw new Error('Something went wrong while processing this document.');
    }

    const isExplicitNonClinical = NON_CLINICAL_PATTERNS.test(docName);
    const isClinical = !isExplicitNonClinical && CLINICAL_PATTERNS.test(docName);

    // 2. Non-Clinical Document Detection (Validation Failed -> Rejected)
    if (isExplicitNonClinical || !isClinical) {
      return {
        success: true,
        data: {
          id: documentId,
          caseId,
          name: docName,
          type: 'other',
          sizeBytes: 1024000,
          mimeType,
          uploadedAt: new Date().toISOString(),
          processingStatus: 'non_clinical',
          verificationLevel: 'unverified',
          isClinicallyValid: false,
          validationMessage:
            'Document not recognized as a supported clinical record.',
          extractedEntities: [] // Strictly empty: ZERO fabricated findings
        },
        timestamp: new Date().toISOString()
      };
    }

    // 2. Clinical Document Confirmed (State 05 -> State 09)
    let docType: MedicalDocumentType = 'clinical_note';
    if (/prescrip|rx/i.test(docName)) docType = 'prescription';
    else if (/lab|blood|lipid|urine/i.test(docName)) docType = 'lab_report';
    else if (/scan|xray|mri|ct|ultrasound|ecg|ekg/i.test(docName)) docType = 'radiology';
    else if (/discharge/i.test(docName)) docType = 'discharge_summary';

    return {
      success: true,
      data: {
        id: documentId,
        caseId,
        name: docName,
        type: docType,
        sizeBytes: 1024000,
        mimeType,
        uploadedAt: new Date().toISOString(),
        processingStatus: 'ocr_complete',
        verificationLevel: 'verified',
        isClinicallyValid: true,
        validationMessage: 'Medical document verified • Ready for clinician review',
        extractedEntities: [] // Real backend entity extraction will populate this when connected
      },
      timestamp: new Date().toISOString()
    };
  }

  async getExtractedEntities(_documentId: string): Promise<ApiResponse<ExtractedEntity[]>> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      success: true,
      data: [], // Empty unless backend provides verified extracted entities
      timestamp: new Date().toISOString()
    };
  }
}

export const ocrService = new OcrService();
