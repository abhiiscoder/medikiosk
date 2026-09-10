/**
 * MEDiKIOSK Backend — Phase 10: FHIR R4 TypeScript Type Definitions
 * Definitions for Patient, Encounter, Observation, MedicationStatement,
 * AllergyIntolerance, and Bundle resources according to the HL7 FHIR R4 standard.
 */

export interface FhirCoding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: FhirCodeableConcept;
  system?: string;
  value: string;
}

export interface FhirHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
}

export interface FhirContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
}

export interface FhirReference {
  reference?: string;
  type?: string;
  identifier?: FhirIdentifier;
  display?: string;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirQuantity {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}

// ─── 1. FHIR Patient Resource ───

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
}

// ─── 2. FHIR Encounter Resource ───

export type FhirEncounterStatus =
  | 'planned'
  | 'arrived'
  | 'triaged'
  | 'in-progress'
  | 'onleave'
  | 'finished'
  | 'cancelled'
  | 'entered-in-error'
  | 'unknown';

export interface FhirEncounter {
  resourceType: 'Encounter';
  id: string;
  identifier?: FhirIdentifier[];
  status: FhirEncounterStatus;
  class: FhirCoding;
  subject: FhirReference;
  period?: FhirPeriod;
}

// ─── 3. FHIR Observation Resource ───

export type FhirObservationStatus =
  | 'registered'
  | 'preliminary'
  | 'final'
  | 'amended'
  | 'corrected'
  | 'cancelled'
  | 'entered-in-error'
  | 'unknown';

export interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  identifier?: FhirIdentifier[];
  status: FhirObservationStatus;
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: string;
  valueString?: string;
  valueQuantity?: FhirQuantity;
  valueCodeableConcept?: FhirCodeableConcept;
  derivedFrom?: FhirReference[];
}

// ─── 4. FHIR MedicationStatement Resource ───

export type FhirMedicationStatementStatus =
  | 'active'
  | 'completed'
  | 'entered-in-error'
  | 'intended'
  | 'stopped'
  | 'on-hold'
  | 'unknown'
  | 'not-taken';

export interface FhirDosage {
  text?: string;
}

export interface FhirMedicationStatement {
  resourceType: 'MedicationStatement';
  id: string;
  identifier?: FhirIdentifier[];
  status: FhirMedicationStatementStatus;
  medicationCodeableConcept: FhirCodeableConcept;
  subject: FhirReference;
  context?: FhirReference;
  effectiveDateTime?: string;
  dosage?: FhirDosage[];
}

// ─── 5. FHIR AllergyIntolerance Resource ───

export interface FhirAllergyIntoleranceReaction {
  manifestation: FhirCodeableConcept[];
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface FhirAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id: string;
  identifier?: FhirIdentifier[];
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  type?: 'allergy' | 'intolerance';
  category?: Array<'food' | 'medication' | 'environment' | 'biologic'>;
  criticality?: 'low' | 'high' | 'unable-to-assess';
  code: FhirCodeableConcept;
  patient: FhirReference;
  encounter?: FhirReference;
  recordedDate?: string;
  reaction?: FhirAllergyIntoleranceReaction[];
}

// ─── 6. FHIR Bundle Resource ───

export type FhirResource =
  | FhirPatient
  | FhirEncounter
  | FhirObservation
  | FhirMedicationStatement
  | FhirAllergyIntolerance;

export interface FhirBundleEntry {
  fullUrl?: string;
  resource: FhirResource;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'collection';
  timestamp: string;
  total?: number;
  entry: FhirBundleEntry[];
}
