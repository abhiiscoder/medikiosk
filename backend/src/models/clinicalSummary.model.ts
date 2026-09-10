/**
 * MEDiKIOSK Backend — Phase 07 & 08: Clinical Summary Model
 * Schema and interfaces for structured clinical summaries generated from
 * Clinical History, structured answers, and validated clinical documents.
 * Supports review, schema-constrained editing, and non-destructive versioning.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type SummaryStatus = 'draft' | 'reviewed' | 'edited' | 'confirmed';

export interface ISummarySections {
  chiefConcern: string;
  symptoms: string;
  historyOfPresentIllness: string;
  duration: string;
  severity: string;
  associatedSymptoms: string[];
  pastMedicalHistory: string[];
  pastSurgicalHistory: string[];
  medications: string[];
  allergies: string[];
  familyHistory: string[];
  socialHistory: string;
  reviewOfSystems: string;
  ayushHistory: string;
  relevantMedicalRecords: string[];
  clinicalInformationSummary: string;
}

export interface ISummarySourceReference {
  sourceType: 'clinical_history' | 'patient_answer' | 'medical_document';
  sourceId: string;
  label: string;
  details?: Record<string, unknown>;
}

export interface ISummaryConflict {
  field: string;
  description: string;
  sources: string[];
}

export interface ISummaryRevision {
  version: number;
  editedBy: string;
  editedAt: Date;
  sections: ISummarySections;
  diffSummary?: string;
}

export interface IClinicalSummary extends Document {
  summaryId: string;
  caseId: string;
  patientId: string;
  generatedBy: string;
  status: SummaryStatus;
  version: number;
  sections: ISummarySections;
  sourceReferences: ISummarySourceReference[];
  conflicts: ISummaryConflict[];
  originalGeneratedSummary?: ISummarySections | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  editedBy?: string | null;
  editedAt?: Date | null;
  confirmedBy?: string | null;
  confirmedAt?: Date | null;
  confirmedVersion?: number | null;
  revisionHistory: ISummaryRevision[];
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SummarySectionsSchema = new Schema<ISummarySections>(
  {
    chiefConcern: { type: String, default: 'Not provided', trim: true },
    symptoms: { type: String, default: 'Not provided', trim: true },
    historyOfPresentIllness: { type: String, default: 'Not provided', trim: true },
    duration: { type: String, default: 'Not provided', trim: true },
    severity: { type: String, default: 'Not provided', trim: true },
    associatedSymptoms: { type: [String], default: [] },
    pastMedicalHistory: { type: [String], default: [] },
    pastSurgicalHistory: { type: [String], default: [] },
    medications: { type: [String], default: [] },
    allergies: { type: [String], default: [] },
    familyHistory: { type: [String], default: [] },
    socialHistory: { type: String, default: 'Not provided', trim: true },
    reviewOfSystems: { type: String, default: 'Not provided', trim: true },
    ayushHistory: { type: String, default: 'Not provided', trim: true },
    relevantMedicalRecords: { type: [String], default: [] },
    clinicalInformationSummary: { type: String, default: 'Not provided', trim: true }
  },
  { _id: false }
);

const SourceReferenceSchema = new Schema<ISummarySourceReference>(
  {
    sourceType: {
      type: String,
      enum: ['clinical_history', 'patient_answer', 'medical_document'],
      required: true
    },
    sourceId: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    details: { type: Schema.Types.Mixed, default: () => ({}) }
  },
  { _id: false }
);

const ConflictSchema = new Schema<ISummaryConflict>(
  {
    field: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    sources: { type: [String], default: [] }
  },
  { _id: false }
);

const RevisionSchema = new Schema<ISummaryRevision>(
  {
    version: { type: Number, required: true },
    editedBy: { type: String, required: true, trim: true },
    editedAt: { type: Date, default: Date.now },
    sections: { type: SummarySectionsSchema, required: true },
    diffSummary: { type: String, trim: true }
  },
  { _id: false }
);

const ClinicalSummarySchema = new Schema<IClinicalSummary>(
  {
    summaryId: {
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
    generatedBy: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'reviewed', 'edited', 'confirmed'],
      default: 'draft',
      index: true
    },
    version: {
      type: Number,
      default: 1,
      min: 1
    },
    sections: {
      type: SummarySectionsSchema,
      required: true
    },
    sourceReferences: {
      type: [SourceReferenceSchema],
      default: []
    },
    conflicts: {
      type: [ConflictSchema],
      default: []
    },
    originalGeneratedSummary: {
      type: SummarySectionsSchema,
      default: null
    },
    reviewedBy: {
      type: String,
      default: null,
      trim: true
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewNotes: {
      type: String,
      default: null,
      trim: true
    },
    editedBy: {
      type: String,
      default: null,
      trim: true
    },
    editedAt: {
      type: Date,
      default: null
    },
    confirmedBy: {
      type: String,
      default: null,
      trim: true
    },
    confirmedAt: {
      type: Date,
      default: null
    },
    confirmedVersion: {
      type: Number,
      default: null
    },
    revisionHistory: {
      type: [RevisionSchema],
      default: []
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret.summaryId;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret.summaryId;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound indexes
ClinicalSummarySchema.index({ caseId: 1, version: -1 });
ClinicalSummarySchema.index({ caseId: 1, status: 1 });
ClinicalSummarySchema.index({ caseId: 1, generatedBy: 1 });

export const ClinicalSummary: Model<IClinicalSummary> =
  mongoose.models.ClinicalSummary ||
  mongoose.model<IClinicalSummary>('ClinicalSummary', ClinicalSummarySchema);
