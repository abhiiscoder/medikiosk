/**
 * MEDiKIOSK Backend — Phase R3: User & Clinician Account Model
 * Persists authenticated users in MongoDB with secure password hashing.
 * Passwords and salts are never returned in queries by default (select: false).
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'node:crypto';

export type UserRole =
  | 'kiosk_patient'
  | 'triage_nurse'
  | 'physician'
  | 'system_admin'
  | 'clinician';

export interface IUser extends Document {
  userId: string;
  medikioskId: string;
  name: string;
  mobileNumber?: string;
  email?: string;
  passwordHash?: string;
  salt?: string;
  role: UserRole;
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  verifyPassword(candidatePassword: string): boolean;
}

const UserSchema = new Schema<IUser>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    medikioskId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    mobileNumber: {
      type: String,
      trim: true,
      index: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      select: false
    },
    salt: {
      type: String,
      select: false
    },
    role: {
      type: String,
      enum: ['kiosk_patient', 'triage_nurse', 'physician', 'system_admin', 'clinician'],
      default: 'clinician'
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

/**
 * Hash a password using secure scrypt with a cryptographic salt
 */
export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

/**
 * Verify candidate password against stored hash and salt
 */
UserSchema.methods.verifyPassword = function (candidatePassword: string): boolean {
  if (!this.passwordHash || !this.salt) return false;
  const { hash } = hashPassword(candidatePassword, this.salt);
  return crypto.timingSafeEqual(Buffer.from(this.passwordHash, 'hex'), Buffer.from(hash, 'hex'));
};

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
