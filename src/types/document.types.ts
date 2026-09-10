/**
 * MEDiKIOSK — PHASE 00
 * Medical Document & OCR Processing Types
 */

import { ID, ISO8601Date, VerificationLevel } from './common.types';

export type MedicalDocumentType = 
  | 'lab_report' 
  | 'prescription' 
  | 'radiology' 
  | 'discharge_summary' 
  | 'clinical_note' 
  | 'identity_card'
  | 'other';

/**
 * Phase 07 — Supported Clinical Categories (Organizational Metadata)
 */
export type MedicalDocumentCategory =
  | 'Prescription'
  | 'Laboratory Report'
  | 'Diagnostic / Imaging Report'
  | 'Discharge Summary'
  | 'Other Medical Document';

export type DocumentProcessingStatus = 
  | 'selected'
  | 'uploading'
  | 'uploaded' 
  | 'pending_validation'
  | 'validating'
  | 'clinical_verified'
  | 'non_clinical'
  | 'processing' 
  | 'ocr_complete' 
  | 'needs_review' 
  | 'verified' 
  | 'failed';

export interface ExtractedEntity {
  id: ID;
  category: 'medication' | 'lab_value' | 'diagnosis' | 'vital' | 'allergy' | 'doctor_name';
  rawText: string;
  normalizedValue: string;
  confidence?: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

/**
 * Phase 06 — Document Processing State Architecture
 * Separated conceptual state machine properties.
 * Not collapsed into isProcessed = true.
 */
export type DocumentStatus = 'selected' | 'uploading' | 'uploaded' | 'rejected' | 'error';
export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'rejected';
export type ProcessingStatus = 'idle' | 'processing' | 'processed' | 'failed';
export type ExtractionStatus = 'idle' | 'extracting' | 'extracted' | 'no_data' | 'failed';

export interface ProcessingError {
  stage: 'upload' | 'validation' | 'processing' | 'extraction';
  title: string;
  message: string;
  canRetry?: boolean;
}

/**
 * Extracted Clinical Information Data Model
 * Reusable and strictly data-driven. Zero fabricated values.
 */
export interface ExtractedClinicalData {
  doctor?: string | null;
  date?: string | null;
  medicines?: string[] | null;
  conditions?: string[] | null;
  laboratoryValues?: Array<{
    test: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    confidence?: number;
  }> | null;
  vitalSigns?: Array<{
    label: string;
    value: string;
    unit?: string;
    confidence?: number;
  }> | null;
  notes?: string | null;
  otherEntities?: Array<{
    id: string;
    label: string;
    value: string;
    confidence?: number;
  }> | null;
}

export interface MedicalDocument {
  id: ID;
  caseId: ID;
  name: string;
  type: MedicalDocumentType;
  category?: MedicalDocumentCategory;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: ISO8601Date;
  processingStatus: DocumentProcessingStatus;
  verificationLevel: VerificationLevel;
  ocrConfidence?: number;       // 0.0 - 1.0 (actual backend provided only)
  pageCount?: number;
  extractedEntities?: ExtractedEntity[];
  extractedClinicalData?: ExtractedClinicalData;
  thumbnailUrl?: string;
  fileUrl?: string;
  errorMessage?: string;
  isClinicallyValid?: boolean;
  validationMessage?: string;
}

