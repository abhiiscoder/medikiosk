/**
 * MEDiKIOSK Backend — Phase 03: Clinical History & Conversation Request Validators
 * Zod validation schemas for structured answers, clinical history updates, and question queries.
 */

import { z } from 'zod';

/**
 * POST /api/v1/cases/:caseId/clinical-history/answers
 * Master answer submission schema
 */
export const postAnswerMasterSchema = {
  body: z.object({
    sessionId: z.string().trim().min(1, 'sessionId is required'),
    questionId: z.string().trim().min(1, 'questionId is required'),
    value: z.any(),
    source: z.enum(['text', 'voice', 'selection', 'system']).default('text'),
    messageContent: z.string().trim().optional()
  })
};

/**
 * GET /api/v1/clinical-history/questions?section=...
 * Optional section filter for question catalog
 */
export const queryQuestionsSchema = {
  query: z.object({
    section: z.string().trim().optional()
  })
};

/**
 * PATCH /api/v1/cases/:caseId/clinical-history
 * Direct update to structured clinical data
 */
export const updateClinicalHistorySchema = {
  body: z
    .object({
      chiefComplaint: z
        .object({
          text: z.string().trim().optional(),
          capturedAt: z.string().trim().optional(),
          source: z.string().trim().optional()
        })
        .optional(),
      historyOfPresentIllness: z
        .object({
          narrative: z.string().trim().optional(),
          onset: z.string().trim().optional(),
          duration: z
            .object({
              value: z.number().min(0),
              unit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months', 'years', 'unknown'])
            })
            .optional(),
          progression: z.string().trim().optional(),
          severity: z.string().trim().optional(),
          associatedSymptoms: z.array(z.string().trim()).optional()
        })
        .optional(),
      duration: z
        .object({
          value: z.number().min(0),
          unit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months', 'years', 'unknown'])
        })
        .optional(),
      severity: z.enum(['mild', 'moderate', 'severe', 'unknown']).optional(),
      symptoms: z
        .array(
          z.object({
            name: z.string().trim().min(1),
            presence: z.boolean().default(true),
            severity: z.enum(['mild', 'moderate', 'severe']).optional(),
            duration: z.string().trim().optional(),
            notes: z.string().trim().optional()
          })
        )
        .optional(),
      pastMedicalHistory: z
        .array(
          z.object({
            condition: z.string().trim().min(1),
            status: z.enum(['active', 'resolved', 'managed']).optional(),
            notes: z.string().trim().optional()
          })
        )
        .optional(),
      pastSurgicalHistory: z
        .array(
          z.object({
            procedure: z.string().trim().min(1),
            approximateDate: z.string().trim().optional(),
            notes: z.string().trim().optional()
          })
        )
        .optional(),
      medications: z
        .array(
          z.object({
            name: z.string().trim().min(1),
            dosage: z.string().trim().optional(),
            frequency: z.string().trim().optional(),
            route: z.string().trim().optional(),
            notes: z.string().trim().optional()
          })
        )
        .optional(),
      allergies: z
        .array(
          z.object({
            allergen: z.string().trim().min(1),
            reaction: z.string().trim().optional(),
            severity: z.enum(['mild', 'moderate', 'severe']).optional(),
            notes: z.string().trim().optional()
          })
        )
        .optional(),
      familyHistory: z
        .array(
          z.object({
            relationship: z.string().trim().min(1),
            condition: z.string().trim().min(1),
            notes: z.string().trim().optional()
          })
        )
        .optional(),
      socialHistory: z
        .object({
          smoking: z.string().trim().optional(),
          alcohol: z.string().trim().optional(),
          occupation: z.string().trim().optional(),
          lifestyle: z.string().trim().optional(),
          notes: z.string().trim().optional()
        })
        .optional(),
      reviewOfSystems: z
        .object({
          general: z.string().trim().optional(),
          respiratory: z.string().trim().optional(),
          cardiovascular: z.string().trim().optional(),
          gastrointestinal: z.string().trim().optional(),
          neurological: z.string().trim().optional(),
          musculoskeletal: z.string().trim().optional(),
          genitourinary: z.string().trim().optional(),
          skin: z.string().trim().optional(),
          other: z.string().trim().optional()
        })
        .optional(),
      ayushHistory: z
        .object({
          prakriti: z.string().trim().optional(),
          vikriti: z.string().trim().optional(),
          treatmentHistory: z.string().trim().optional(),
          medicines: z.array(z.string().trim()).optional(),
          therapies: z.array(z.string().trim()).optional(),
          notes: z.string().trim().optional()
        })
        .optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one clinical field must be provided for update.'
    })
};
