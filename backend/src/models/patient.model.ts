/**
 * MEDiKIOSK Backend — Phase 02: Patient Model
 * Authoritative Patient entity schema and indices.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type Gender = 'male' | 'female' | 'other' | 'undisclosed';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';

export interface IPatient extends Document {
  patientId: string;
  ownerId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  age?: number;
  gender: Gender;
  bloodGroup: BloodGroup;
  contactNumber?: string;
  mrn: string;
  abhaId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema: Schema = new Schema<IPatient>(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    ownerId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: {
      type: String,
      trim: true
    },
    age: {
      type: Number
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'undisclosed'],
      default: 'undisclosed'
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
      default: 'unknown'
    },
    contactNumber: {
      type: String,
      trim: true
    },
    mrn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    abhaId: {
      type: String,
      trim: true
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

// Helpful compound index for owner lookups
PatientSchema.index({ ownerId: 1, createdAt: -1 });

export const Patient: Model<IPatient> =
  mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);
