/**
 * MEDiKIOSK — PHASE 00
 * Clinical History, Events & AI Insights Types
 */

import { ID, ISO8601Date, ProvenanceSource, VerificationLevel } from './common.types';
import { Allergy } from './patient.types';

export interface Medication {
  id: ID;
  name: string;
  dosage: string;
  frequency: string;
  route?: string;
  startDate?: string;
  status: 'active' | 'discontinued' | 'as-needed';
  source: ProvenanceSource;
  verificationLevel: VerificationLevel;
}

export type ClinicalEventCategory = 
  | 'symptom' 
  | 'diagnosis' 
  | 'lab_result' 
  | 'medication' 
  | 'procedure' 
  | 'vital_check' 
  | 'encounter';

export interface ClinicalEvent {
  id: ID;
  timestamp: ISO8601Date;
  title: string;
  description: string;
  category: ClinicalEventCategory;
  source: ProvenanceSource;
  verificationLevel: VerificationLevel;
  confidenceScore?: number; // 0.0 - 1.0 for AI-derived entities
  documentReferenceId?: ID;
}

export interface AIInsight {
  id: ID;
  title: string;
  finding: string;
  reasoning: string;
  confidenceScore: number; // 0.0 - 1.0
  citedSources: Array<{
    documentName?: string;
    pageNumber?: number;
    quoteSnippet?: string;
    sourceType: ProvenanceSource;
  }>;
  status: 'suggested' | 'accepted' | 'rejected' | 'modified';
  generatedAt: ISO8601Date;
}

export interface ClinicalSummary {
  patientId: ID;
  caseId: ID;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pertinentPositives: string[];
  pertinentNegatives: string[];
  currentMedications: Medication[];
  knownAllergies: Allergy[];
  proposedAssessments: string[];
  recommendedNextSteps: string[];
  insights: AIInsight[];
  overallVerification: VerificationLevel;
  lastUpdated: ISO8601Date;
}

/**
 * MEDiKIOSK — PHASE 08 & 10: Clinical Summary Generation Types
 * Structured intake representation with zero fabrication and explicit source traceability.
 */
export type SummaryProvenance = 
  | 'conversation' 
  | 'structured_response' 
  | 'medical_record' 
  | 'manual_edit' 
  | 'kiosk_registration';

export interface SummaryField<T = string> {
  value: T;
  source: SummaryProvenance;
  sourceLabel: string;
  isProvided: boolean;
}

export interface PatientInformationSummary {
  name: string;
  age: string;
  sex: string;
  isProvided: boolean;
  source: SummaryProvenance;
  sourceLabel: string;
  isDemo?: boolean;
}

export interface VerifiedRecordSummary {
  id: string;
  name: string;
  category?: string;
  sizeBytes: number;
}

export interface StructuredClinicalSummary {
  caseId: string;
  generatedAt: string;
  lastUpdated?: string;
  // 1. Patient Information
  patientInformation: PatientInformationSummary;
  // 2. Clinical History
  chiefConcern: SummaryField<string>;
  symptoms: SummaryField<string[]>;
  timeline: SummaryField<string>;
  severity?: SummaryField<string>;
  // 3. Medical History
  relevantHistory: SummaryField<string>;
  // 4. Medications
  medications: SummaryField<string[]>;
  // 5. Allergies
  allergies: SummaryField<string[]>;
  // 6. Family History
  familyHistory: SummaryField<string>;
  // 7. Social History
  socialHistory: SummaryField<string>;
  // 8. AYUSH Information
  ayushInformation: SummaryField<string>;
  // Attached Medical Records & Document Evidence
  medicalRecords: {
    verifiedDocuments: VerifiedRecordSummary[];
    excludedDocumentsCount: number;
  };
  // 9. Clinical Information Summary (Objective Pre-Consultation Synthesis)
  clinicalInformationSummary: SummaryField<string>;
  additionalNotes: SummaryField<string>;
  isEdited?: boolean;
}


