/**
 * MEDiKIOSK — PHASE 00
 * Patient & Demographics Types
 */

import { ID, ISO8601Date, ClinicalPriority, ProvenanceSource } from './common.types';

export type Gender = 'male' | 'female' | 'other' | 'undisclosed';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';

export interface Allergy {
  id: ID;
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  source: ProvenanceSource;
  recordedAt: ISO8601Date;
}

export interface VitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  temperatureCelsius?: number;
  recordedAt: ISO8601Date;
  source: ProvenanceSource;
}

export interface Patient {
  id: ID;
  mrn: string;               // Medical Record Number
  abhaId?: string;           // Ayushman Bharat Health Account / National ID
  firstName: string;
  lastName: string;
  dateOfBirth: string;       // YYYY-MM-DD
  age: number;
  gender: Gender;
  bloodGroup: BloodGroup;
  contactNumber?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  allergies: Allergy[];
  vitals?: VitalSigns;
  triagePriority: ClinicalPriority;
  caseStatus: 'intake' | 'conversing' | 'document_collection' | 'clinical_review' | 'completed';
  registeredAt: ISO8601Date;
}
