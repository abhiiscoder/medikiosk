/**
 * MEDiKIOSK Backend — Phase 03: Clinical History Model
 * Authoritative Schema supporting 13 core clinical anamnesis sections
 * with clinicalHistoryId, status tracking, currentSection, and nested structuredData.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { CLINICAL_SECTIONS, ClinicalSection } from './question.model.js';

// ─── Structured Data Sub-Interfaces ───

export interface IChiefComplaintData {
  text: string;
  capturedAt?: Date;
  source?: string;
}

export interface IDurationData {
  value: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years' | 'unknown';
}

export interface IHpiData {
  narrative?: string;
  onset?: string;
  duration?: IDurationData;
  progression?: string;
  severity?: string;
  associatedSymptoms?: string[];
}

export interface ISymptomItem {
  name: string;
  presence: boolean;
  severity?: 'mild' | 'moderate' | 'severe';
  duration?: string;
  notes?: string;
}

export interface IPastMedicalHistoryItem {
  condition: string;
  status?: 'active' | 'resolved' | 'managed';
  notes?: string;
}

export interface IPastSurgicalHistoryItem {
  procedure: string;
  approximateDate?: string;
  notes?: string;
}

export interface IMedicationItem {
  name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  notes?: string;
}

export interface IAllergyItem {
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

export interface IFamilyHistoryItem {
  relationship: string;
  condition: string;
  notes?: string;
}

export interface ISocialHistory {
  smoking?: string;
  alcohol?: string;
  occupation?: string;
  lifestyle?: string;
  notes?: string;
}

export interface IReviewOfSystems {
  general?: string;
  respiratory?: string;
  cardiovascular?: string;
  gastrointestinal?: string;
  neurological?: string;
  musculoskeletal?: string;
  genitourinary?: string;
  skin?: string;
  other?: string;
}

export interface IAyushHistory {
  prakriti?: string;
  vikriti?: string;
  treatmentHistory?: string;
  medicines?: string[];
  therapies?: string[];
  notes?: string;
}

export interface IStructuredData {
  chiefComplaint?: IChiefComplaintData;
  historyOfPresentIllness?: IHpiData;
  duration?: IDurationData;
  severity?: 'mild' | 'moderate' | 'severe' | 'unknown';
  symptoms?: ISymptomItem[];
  pastMedicalHistory?: IPastMedicalHistoryItem[];
  pastSurgicalHistory?: IPastSurgicalHistoryItem[];
  medications?: IMedicationItem[];
  allergies?: IAllergyItem[];
  familyHistory?: IFamilyHistoryItem[];
  socialHistory?: ISocialHistory;
  reviewOfSystems?: IReviewOfSystems;
  ayushHistory?: IAyushHistory;
}

// ─── Top-Level Interface ───

export type ClinicalHistoryStatus = 'not_started' | 'in_progress' | 'completed';

export interface IClinicalHistory extends Document {
  clinicalHistoryId: string;
  caseId: string;
  sessionId: string;
  patientId: string;
  ownerId: string;
  status: ClinicalHistoryStatus;
  currentSection?: ClinicalSection;
  currentQuestionId?: string;
  clarificationAttempts?: Record<string, number>;
  completedQuestions?: string[];
  skippedQuestions?: string[];
  missingRequiredFields?: string[];
  structuredData: IStructuredData;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-Schemas ───

const ChiefComplaintSchema = new Schema<IChiefComplaintData>(
  {
    text: { type: String, default: '', trim: true },
    capturedAt: { type: Date },
    source: { type: String, trim: true }
  },
  { _id: false }
);

const DurationSchema = new Schema<IDurationData>(
  {
    value: { type: Number },
    unit: { type: String, enum: ['minutes', 'hours', 'days', 'weeks', 'months', 'years', 'unknown'] }
  },
  { _id: false }
);

const HpiSchema = new Schema<IHpiData>(
  {
    narrative: { type: String, trim: true },
    onset: { type: String, trim: true },
    duration: { type: DurationSchema },
    progression: { type: String, trim: true },
    severity: { type: String, trim: true },
    associatedSymptoms: [{ type: String, trim: true }]
  },
  { _id: false }
);

const SymptomItemSchema = new Schema<ISymptomItem>(
  {
    name: { type: String, required: true, trim: true },
    presence: { type: Boolean, default: true },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
    duration: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { _id: false }
);

const PastMedicalHistoryItemSchema = new Schema<IPastMedicalHistoryItem>(
  {
    condition: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'resolved', 'managed'] },
    notes: { type: String, trim: true }
  },
  { _id: false }
);

const PastSurgicalHistoryItemSchema = new Schema<IPastSurgicalHistoryItem>(
  {
    procedure: { type: String, required: true, trim: true },
    approximateDate: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { _id: false }
);

const MedicationItemSchema = new Schema<IMedicationItem>(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true },
    frequency: { type: String, trim: true },
    route: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { _id: false }
);

const AllergyItemSchema = new Schema<IAllergyItem>(
  {
    allergen: { type: String, required: true, trim: true },
    reaction: { type: String, trim: true },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
    notes: { type: String, trim: true }
  },
  { _id: false }
);

const FamilyHistoryItemSchema = new Schema<IFamilyHistoryItem>(
  {
    relationship: { type: String, required: true, trim: true },
    condition: { type: String, required: true, trim: true },
    notes: { type: String, trim: true }
  },
  { _id: false }
);

const SocialHistorySchema = new Schema<ISocialHistory>(
  {
    smoking: { type: String, trim: true },
    alcohol: { type: String, trim: true },
    occupation: { type: String, trim: true },
    lifestyle: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { _id: false }
);

const ReviewOfSystemsSchema = new Schema<IReviewOfSystems>(
  {
    general: { type: String, trim: true },
    respiratory: { type: String, trim: true },
    cardiovascular: { type: String, trim: true },
    gastrointestinal: { type: String, trim: true },
    neurological: { type: String, trim: true },
    musculoskeletal: { type: String, trim: true },
    genitourinary: { type: String, trim: true },
    skin: { type: String, trim: true },
    other: { type: String, trim: true }
  },
  { _id: false }
);

const AyushHistorySchema = new Schema<IAyushHistory>(
  {
    prakriti: { type: String, trim: true },
    vikriti: { type: String, trim: true },
    treatmentHistory: { type: String, trim: true },
    medicines: [{ type: String, trim: true }],
    therapies: [{ type: String, trim: true }],
    notes: { type: String, trim: true }
  },
  { _id: false }
);

const StructuredDataSchema = new Schema<IStructuredData>(
  {
    chiefComplaint: { type: ChiefComplaintSchema, default: () => ({}) },
    historyOfPresentIllness: { type: HpiSchema, default: () => ({}) },
    duration: { type: DurationSchema },
    severity: { type: String, enum: ['mild', 'moderate', 'severe', 'unknown'] },
    symptoms: [SymptomItemSchema],
    pastMedicalHistory: [PastMedicalHistoryItemSchema],
    pastSurgicalHistory: [PastSurgicalHistoryItemSchema],
    medications: [MedicationItemSchema],
    allergies: [AllergyItemSchema],
    familyHistory: [FamilyHistoryItemSchema],
    socialHistory: { type: SocialHistorySchema, default: () => ({}) },
    reviewOfSystems: { type: ReviewOfSystemsSchema, default: () => ({}) },
    ayushHistory: { type: AyushHistorySchema, default: () => ({}) }
  },
  { _id: false }
);

// ─── Top-Level Schema ───

const ClinicalHistorySchema: Schema = new Schema<IClinicalHistory>(
  {
    clinicalHistoryId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    caseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    sessionId: {
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
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
      index: true
    },
    currentSection: {
      type: String,
      enum: [...CLINICAL_SECTIONS],
      default: 'chief_complaint'
    },
    currentQuestionId: {
      type: String,
      trim: true
    },
    clarificationAttempts: {
      type: Schema.Types.Mixed,
      default: () => ({})
    },
    completedQuestions: [{
      type: String,
      trim: true
    }],
    skippedQuestions: [{
      type: String,
      trim: true
    }],
    missingRequiredFields: [{
      type: String,
      trim: true
    }],
    structuredData: {
      type: StructuredDataSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      }
    }
  }
);

ClinicalHistorySchema.index({ ownerId: 1, caseId: 1 });
ClinicalHistorySchema.index({ patientId: 1, createdAt: -1 });

export const ClinicalHistory: Model<IClinicalHistory> =
  mongoose.models.ClinicalHistory || mongoose.model<IClinicalHistory>('ClinicalHistory', ClinicalHistorySchema);
