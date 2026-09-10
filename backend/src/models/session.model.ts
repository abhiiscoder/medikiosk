/**
 * MEDiKIOSK Backend — Phase 02: Clinical Session Model
 * Clinical encounter / interaction lifecycle entity schema.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type SessionStatus = 'active' | 'completed' | 'cancelled';

export interface IClinicalSession extends Document {
  sessionId: string;
  caseId: string;
  patientId: string;
  status: SessionStatus;
  startedAt: Date;
  endedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ClinicalSessionSchema: Schema = new Schema<IClinicalSession>(
  {
    sessionId: {
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
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    endedAt: {
      type: Date,
      default: null
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

// Compound index for querying active sessions for a case
ClinicalSessionSchema.index({ caseId: 1, status: 1 });
ClinicalSessionSchema.index({ caseId: 1, createdAt: -1 });

export const ClinicalSession: Model<IClinicalSession> =
  mongoose.models.ClinicalSession || mongoose.model<IClinicalSession>('ClinicalSession', ClinicalSessionSchema);
