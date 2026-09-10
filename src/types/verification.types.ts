/**
 * MEDiKIOSK — PHASE 00
 * Verification & Interoperability (FHIR) Types
 */

import { ID, ISO8601Date, VerificationLevel } from './common.types';

export interface ClinicianReviewer {
  id: ID;
  name: string;
  medicalLicense: string;
  role: 'Attending Physician' | 'Triage Nurse' | 'Resident' | 'Specialist';
  department: string;
}

export interface VerificationAuditEntry {
  id: ID;
  targetEntityId: ID;
  targetEntityType: 'clinical_history' | 'medication' | 'allergy' | 'document' | 'summary';
  previousLevel: VerificationLevel;
  newLevel: VerificationLevel;
  reviewer: ClinicianReviewer;
  clinicalNotes?: string;
  timestamp: ISO8601Date;
  cryptographicSignature?: string; // For SIH tamper-evident verification demonstration
}

/**
 * FHIR R4 Bundle interoperability representation
 */
export interface FhirResourceStub {
  resourceType: 'Patient' | 'Condition' | 'Observation' | 'MedicationStatement' | 'DocumentReference' | 'Bundle';
  id: string;
  status: string;
  code?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  subject?: {
    reference: string;
    display: string;
  };
}

export interface FhirBundleStub {
  resourceType: 'Bundle';
  type: 'transaction' | 'collection' | 'document';
  total: number;
  entry: Array<{
    fullUrl: string;
    resource: FhirResourceStub;
  }>;
}
