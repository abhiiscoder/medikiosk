/**
 * MEDiKIOSK Backend — Phase 02: Case Model
 * Authoritative Clinical Case workflow entity schema and indices.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type CaseStatus = 'draft' | 'active' | 'completed' | 'archived';
export type WorkflowStage = 'clinical_history' | 'medical_records' | 'summary' | 'completed';

export interface ICase extends Document {
  caseId: string;
  patientId: string;
  ownerId: string;
  status: CaseStatus;
  workflowStage: WorkflowStage;
  createdAt: Date;
  updatedAt: Date;
}

const CaseSchema: Schema = new Schema<ICase>(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
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
      enum: ['draft', 'active', 'completed', 'archived'],
      default: 'active',
      index: true
    },
    workflowStage: {
      type: String,
      enum: ['clinical_history', 'medical_records', 'summary', 'completed'],
      default: 'clinical_history',
      index: true
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

// Helpful compound indices for queries
CaseSchema.index({ ownerId: 1, createdAt: -1 });
CaseSchema.index({ ownerId: 1, status: 1 });
CaseSchema.index({ patientId: 1, createdAt: -1 });

export const Case: Model<ICase> =
  mongoose.models.Case || mongoose.model<ICase>('Case', CaseSchema);
