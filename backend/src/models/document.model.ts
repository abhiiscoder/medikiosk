/**
 * MEDiKIOSK Backend — Phase 05 & 06: Medical Document Model
 * Schema and interfaces for medical document records attached to a clinical Case.
 * Enforces controlled clinical categories, processing status, validation status,
 * clinical safety gating, and traceable provenance.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type MedicalDocumentType =
  | 'lab_report'
  | 'prescription'
  | 'radiology'
  | 'discharge_summary'
  | 'clinical_note'
  | 'identity_card'
  | 'other';

export type ControlledClinicalDocumentCategory =
  | 'Prescription'
  | 'Lab Report'
  | 'Imaging / Scan'
  | 'Discharge Summary'
  | 'Doctor Note'
  | 'Clinical Record'
  | 'Other Clinical Document'
  | 'NON_CLINICAL'
  | 'UNKNOWN';

export const CONTROLLED_DOCUMENT_CATEGORIES: ControlledClinicalDocumentCategory[] = [
  'Prescription',
  'Lab Report',
  'Imaging / Scan',
  'Discharge Summary',
  'Doctor Note',
  'Clinical Record',
  'Other Clinical Document',
  'NON_CLINICAL',
  'UNKNOWN'
];

export type MedicalDocumentCategory =
  | ControlledClinicalDocumentCategory
  | 'Laboratory Report'
  | 'Diagnostic / Imaging Report'
  | 'Other Medical Document';

export type DocumentProcessingStatus =
  | 'uploaded'
  | 'pending_processing'
  | 'processing'
  | 'processed'
  | 'ocr_complete'
  | 'verified'
  | 'failed'
  | 'rejected';

export type DocumentValidationStatus =
  | 'validation_pending'
  | 'validated'
  | 'rejected';

export type DocumentClassification =
  | 'CLINICAL'
  | 'NON_CLINICAL'
  | 'UNKNOWN';

export type ExtractionMethod = 'pdf_text' | 'ocr' | 'pdf_ocr' | 'none';

export type VerificationLevel =
  | 'unverified'
  | 'ocr_detected'
  | 'clinician_verified'
  | 'patient_stated';

export interface IDocumentProvenance {
  sourceType: 'medical_document';
  documentId: string;
  originalFileName: string;
  documentType: string;
  category?: string;
  extractionMethod: ExtractionMethod;
  pageCount?: number;
  extractedAt: Date;
}

export interface IExtractedClinicalData {
  medications: Array<{ name: string; dosage?: string; frequency?: string; route?: string }>;
  allergies: string[];
  diagnoses: string[];
  labValues: Array<{ testName: string; value: string; unit?: string; referenceRange?: string; interpretation?: string }>;
  dates: string[];
  doctors: string[];
  procedures: string[];
  summary?: string;
  source: 'medical_document';
  documentId: string;
}

export interface IMedicalDocument extends Document {
  documentId: string;
  caseId: string;
  patientId: string;
  ownerId: string;
  uploadedBy?: string;
  name: string;
  originalFileName?: string;
  storedFilename: string;
  storedFileName?: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  fileSize?: number;
  type: MedicalDocumentType;
  category?: string;
  documentType?: string;
  processingStatus: DocumentProcessingStatus;
  validationStatus: DocumentValidationStatus;
  classification: DocumentClassification;
  isClinicalDocument: boolean;
  classificationConfidence?: number | null;
  classificationReason?: string | null;
  verificationLevel: VerificationLevel;
  fileUrl: string;
  extractedText?: string | null;
  extractedTextLength?: number;
  extractionMethod?: ExtractionMethod;
  ocrConfidence?: number | null;
  provenance?: IDocumentProvenance | null;
  extractedClinicalData?: IExtractedClinicalData | null;
  processedAt?: Date | null;
  processingError?: string | null;
  metadata?: Record<string, unknown>;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalDocumentSchema: Schema = new Schema<IMedicalDocument>(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    caseId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    patientId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    ownerId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    storedFilename: {
      type: String,
      required: true,
      trim: true
    },
    storagePath: {
      type: String,
      required: true,
      trim: true
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 0
    },
    type: {
      type: String,
      enum: [
        'lab_report',
        'prescription',
        'radiology',
        'discharge_summary',
        'clinical_note',
        'identity_card',
        'other'
      ],
      default: 'clinical_note',
      index: true
    },
    category: {
      type: String,
      trim: true
    },
    processingStatus: {
      type: String,
      enum: [
        'uploaded',
        'pending_processing',
        'processing',
        'processed',
        'ocr_complete',
        'verified',
        'failed',
        'rejected'
      ],
      default: 'uploaded',
      index: true
    },
    validationStatus: {
      type: String,
      enum: ['validation_pending', 'validated', 'rejected'],
      default: 'validation_pending',
      index: true
    },
    classification: {
      type: String,
      enum: ['CLINICAL', 'NON_CLINICAL', 'UNKNOWN'],
      default: 'UNKNOWN',
      index: true
    },
    isClinicalDocument: {
      type: Boolean,
      default: false,
      index: true
    },
    classificationConfidence: {
      type: Number,
      default: null
    },
    classificationReason: {
      type: String,
      default: null
    },
    provenance: {
      sourceType: { type: String, default: 'medical_document' },
      documentId: { type: String },
      originalFileName: { type: String },
      documentType: { type: String },
      category: { type: String },
      extractionMethod: { type: String },
      pageCount: { type: Number, default: 1 },
      extractedAt: { type: Date }
    },
    verificationLevel: {
      type: String,
      enum: ['unverified', 'ocr_detected', 'clinician_verified', 'patient_stated'],
      default: 'unverified'
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true
    },
    extractedText: {
      type: String,
      default: null
    },
    extractedTextLength: {
      type: Number,
      default: 0
    },
    extractionMethod: {
      type: String,
      enum: ['pdf_text', 'ocr', 'pdf_ocr', 'none'],
      default: 'none',
      index: true
    },
    ocrConfidence: {
      type: Number,
      default: null
    },
    processedAt: {
      type: Date,
      default: null
    },
    processingError: {
      type: String,
      default: null
    },
    extractedClinicalData: {
      type: Schema.Types.Mixed,
      default: null
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({})
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret.documentId;
        ret.uploadedBy = ret.ownerId;
        ret.originalFileName = ret.name;
        ret.storedFileName = ret.storedFilename;
        ret.fileSize = ret.sizeBytes;
        ret.documentType = ret.category || ret.type;
        delete ret._id;
        delete ret.__v;
        // Do not expose internal server storage path to client
        delete ret.storagePath;
        delete ret.storedFilename;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret.documentId;
        ret.uploadedBy = ret.ownerId;
        ret.originalFileName = ret.name;
        ret.storedFileName = ret.storedFilename;
        ret.fileSize = ret.sizeBytes;
        ret.documentType = ret.category || ret.type;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Virtual properties for conceptual model parity
MedicalDocumentSchema.virtual('uploadedBy').get(function () {
  return this.ownerId;
});
MedicalDocumentSchema.virtual('originalFileName').get(function () {
  return this.name;
});
MedicalDocumentSchema.virtual('storedFileName').get(function () {
  return this.storedFilename;
});
MedicalDocumentSchema.virtual('fileSize').get(function () {
  return this.sizeBytes;
});
MedicalDocumentSchema.virtual('documentType').get(function () {
  return this.category || this.type;
});

// Compound indexes for querying documents by case, upload order, and status
MedicalDocumentSchema.index({ caseId: 1, uploadedAt: -1 });
MedicalDocumentSchema.index({ caseId: 1, ownerId: 1 });
MedicalDocumentSchema.index({ caseId: 1, processingStatus: 1 });
MedicalDocumentSchema.index({ caseId: 1, validationStatus: 1 });
MedicalDocumentSchema.index({ caseId: 1, isClinicalDocument: 1 });

export const MedicalDocument: Model<IMedicalDocument> =
  mongoose.models.MedicalDocument ||
  mongoose.model<IMedicalDocument>('MedicalDocument', MedicalDocumentSchema);
