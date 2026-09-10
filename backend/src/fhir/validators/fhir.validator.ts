/**
 * MEDiKIOSK Backend — Phase 10: FHIR R4 Zod Validators
 * Validates structural and semantic conformance of generated FHIR R4 resources.
 */

import { z } from 'zod';

export const fhirCodingSchema = z.object({
  system: z.string().optional(),
  version: z.string().optional(),
  code: z.string().optional(),
  display: z.string().optional(),
  userSelected: z.boolean().optional()
});

export const fhirCodeableConceptSchema = z.object({
  coding: z.array(fhirCodingSchema).optional(),
  text: z.string().optional()
});

export const fhirIdentifierSchema = z.object({
  use: z.enum(['usual', 'official', 'temp', 'secondary', 'old']).optional(),
  type: fhirCodeableConceptSchema.optional(),
  system: z.string().optional(),
  value: z.string().min(1)
});

export const fhirHumanNameSchema = z.object({
  use: z.enum(['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden']).optional(),
  text: z.string().optional(),
  family: z.string().optional(),
  given: z.array(z.string()).optional(),
  prefix: z.array(z.string()).optional(),
  suffix: z.array(z.string()).optional()
});

export const fhirContactPointSchema = z.object({
  system: z.enum(['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other']).optional(),
  value: z.string().optional(),
  use: z.enum(['home', 'work', 'temp', 'old', 'mobile']).optional(),
  rank: z.number().int().positive().optional()
});

export const fhirReferenceSchema = z.object({
  reference: z.string().min(1).optional(),
  type: z.string().optional(),
  identifier: fhirIdentifierSchema.optional(),
  display: z.string().optional()
});

export const fhirPeriodSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional()
});

// ─── 1. Patient Validator ───

export const fhirPatientSchema = z.object({
  resourceType: z.literal('Patient'),
  id: z.string().min(1),
  identifier: z.array(fhirIdentifierSchema).optional(),
  active: z.boolean().optional(),
  name: z.array(fhirHumanNameSchema).optional(),
  telecom: z.array(fhirContactPointSchema).optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  birthDate: z.string().optional()
});

// ─── 2. Encounter Validator ───

export const fhirEncounterSchema = z.object({
  resourceType: z.literal('Encounter'),
  id: z.string().min(1),
  identifier: z.array(fhirIdentifierSchema).optional(),
  status: z.enum([
    'planned',
    'arrived',
    'triaged',
    'in-progress',
    'onleave',
    'finished',
    'cancelled',
    'entered-in-error',
    'unknown'
  ]),
  class: fhirCodingSchema,
  subject: fhirReferenceSchema,
  period: fhirPeriodSchema.optional()
});

// ─── 3. Observation Validator ───

export const fhirObservationSchema = z.object({
  resourceType: z.literal('Observation'),
  id: z.string().min(1),
  identifier: z.array(fhirIdentifierSchema).optional(),
  status: z.enum([
    'registered',
    'preliminary',
    'final',
    'amended',
    'corrected',
    'cancelled',
    'entered-in-error',
    'unknown'
  ]),
  category: z.array(fhirCodeableConceptSchema).optional(),
  code: fhirCodeableConceptSchema,
  subject: fhirReferenceSchema,
  encounter: fhirReferenceSchema.optional(),
  effectiveDateTime: z.string().optional(),
  valueString: z.string().optional(),
  valueQuantity: z
    .object({
      value: z.number().optional(),
      unit: z.string().optional(),
      system: z.string().optional(),
      code: z.string().optional()
    })
    .optional(),
  valueCodeableConcept: fhirCodeableConceptSchema.optional(),
  derivedFrom: z.array(fhirReferenceSchema).optional()
});

// ─── 4. MedicationStatement Validator ───

export const fhirMedicationStatementSchema = z.object({
  resourceType: z.literal('MedicationStatement'),
  id: z.string().min(1),
  identifier: z.array(fhirIdentifierSchema).optional(),
  status: z.enum([
    'active',
    'completed',
    'entered-in-error',
    'intended',
    'stopped',
    'on-hold',
    'unknown',
    'not-taken'
  ]),
  medicationCodeableConcept: fhirCodeableConceptSchema,
  subject: fhirReferenceSchema,
  context: fhirReferenceSchema.optional(),
  effectiveDateTime: z.string().optional(),
  dosage: z.array(z.object({ text: z.string().optional() })).optional()
});

// ─── 5. AllergyIntolerance Validator ───

export const fhirAllergyIntoleranceSchema = z.object({
  resourceType: z.literal('AllergyIntolerance'),
  id: z.string().min(1),
  identifier: z.array(fhirIdentifierSchema).optional(),
  clinicalStatus: fhirCodeableConceptSchema.optional(),
  verificationStatus: fhirCodeableConceptSchema.optional(),
  type: z.enum(['allergy', 'intolerance']).optional(),
  category: z.array(z.enum(['food', 'medication', 'environment', 'biologic'])).optional(),
  criticality: z.enum(['low', 'high', 'unable-to-assess']).optional(),
  code: fhirCodeableConceptSchema,
  patient: fhirReferenceSchema,
  encounter: fhirReferenceSchema.optional(),
  recordedDate: z.string().optional(),
  reaction: z
    .array(
      z.object({
        manifestation: z.array(fhirCodeableConceptSchema),
        severity: z.enum(['mild', 'moderate', 'severe']).optional()
      })
    )
    .optional()
});

// ─── 6. Resource Union & Bundle Validator ───

export const fhirResourceSchema = z.discriminatedUnion('resourceType', [
  fhirPatientSchema,
  fhirEncounterSchema,
  fhirObservationSchema,
  fhirMedicationStatementSchema,
  fhirAllergyIntoleranceSchema
]);

export const fhirBundleEntrySchema = z.object({
  fullUrl: z.string().optional(),
  resource: fhirResourceSchema
});

export const fhirBundleSchema = z.object({
  resourceType: z.literal('Bundle'),
  id: z.string().min(1),
  type: z.literal('collection'),
  timestamp: z.string().min(1),
  total: z.number().int().nonnegative().optional(),
  entry: z.array(fhirBundleEntrySchema)
});
