/**
 * MEDiKIOSK Backend — Phase 03: Question Model
 * Static question catalog with machine-readable section names and response types.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Machine-readable clinical anamnesis section identifiers.
 * Aligned with the master implementation prompt specification.
 */
export const CLINICAL_SECTIONS = [
  'chief_complaint',
  'history_of_present_illness',
  'duration',
  'severity',
  'symptoms',
  'past_medical_history',
  'past_surgical_history',
  'medications',
  'allergies',
  'family_history',
  'social_history',
  'review_of_systems',
  'ayush_history'
] as const;

export type ClinicalSection = typeof CLINICAL_SECTIONS[number];

export const RESPONSE_TYPES = [
  'text',
  'single_choice',
  'multiple_choice',
  'yes_no',
  'number',
  'duration',
  'severity',
  'voice',
  'other'
] as const;

export type ResponseType = typeof RESPONSE_TYPES[number];

export interface IQuestionOption {
  id: string;
  label: string;
  value: string;
  isOther?: boolean;
}

export interface IValidationRules {
  minLength?: number;
  allowedValues?: string[];
  regex?: string;
}

export interface IQuestion extends Document {
  questionId: string;
  section: ClinicalSection;
  field: string;
  text: string;
  responseType: ResponseType;
  options: IQuestionOption[];
  order: number;
  required: boolean;
  active: boolean;
  clarificationText?: string;
  maxClarificationAttempts?: number;
  validationRules?: IValidationRules;
}

const QuestionOptionSchema = new Schema<IQuestionOption>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: String, required: true },
    isOther: { type: Boolean, default: false }
  },
  { _id: false }
);

const QuestionSchema: Schema = new Schema<IQuestion>(
  {
    questionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    section: {
      type: String,
      enum: CLINICAL_SECTIONS,
      required: true,
      index: true
    },
    field: {
      type: String,
      required: true,
      trim: true,
      default: ''
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    responseType: {
      type: String,
      enum: RESPONSE_TYPES,
      required: true
    },
    options: [QuestionOptionSchema],
    order: {
      type: Number,
      required: true
    },
    required: {
      type: Boolean,
      default: true
    },
    active: {
      type: Boolean,
      default: true
    },
    clarificationText: {
      type: String,
      trim: true
    },
    maxClarificationAttempts: {
      type: Number,
      default: 2
    },
    validationRules: {
      minLength: { type: Number },
      allowedValues: [{ type: String }],
      regex: { type: String }
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

QuestionSchema.index({ section: 1, order: 1 });

export const Question: Model<IQuestion> =
  mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
