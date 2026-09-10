/**
 * MEDiKIOSK Backend — Phase 07 & 08: Clinical Summary Validators
 * Zod validation schemas for generation, review, editing, and Gemini structured output.
 */

import { z } from 'zod';

export const summarySectionsSchema = z.object({
  chiefConcern: z.string().trim().max(1000).default('Not provided'),
  symptoms: z.string().trim().max(2000).default('Not provided'),
  historyOfPresentIllness: z.string().trim().max(5000).default('Not provided'),
  duration: z.string().trim().max(500).default('Not provided'),
  severity: z.string().trim().max(500).default('Not provided'),
  associatedSymptoms: z.array(z.string().trim().max(255)).default([]),
  pastMedicalHistory: z.array(z.string().trim().max(255)).default([]),
  pastSurgicalHistory: z.array(z.string().trim().max(255)).default([]),
  medications: z.array(z.string().trim().max(255)).default([]),
  allergies: z.array(z.string().trim().max(255)).default([]),
  familyHistory: z.array(z.string().trim().max(255)).default([]),
  socialHistory: z.string().trim().max(2000).default('Not provided'),
  reviewOfSystems: z.string().trim().max(3000).default('Not provided'),
  ayushHistory: z.string().trim().max(2000).default('Not provided'),
  relevantMedicalRecords: z.array(z.string().trim().max(500)).default([]),
  clinicalInformationSummary: z.string().trim().max(5000).default('Not provided')
});

export const generateSummarySchema = {
  body: z
    .object({
      forceRegenerate: z.boolean().optional()
    })
    .strict()
    .optional()
};

export const reviewSummarySchema = {
  body: z
    .object({
      notes: z.string().trim().max(1000).optional()
    })
    .strict()
    .optional()
};

export const editSummarySchema = {
  body: z
    .object({
      chiefConcern: z.string().trim().max(1000).optional(),
      symptoms: z.string().trim().max(2000).optional(),
      historyOfPresentIllness: z.string().trim().max(5000).optional(),
      duration: z.string().trim().max(500).optional(),
      severity: z.string().trim().max(500).optional(),
      associatedSymptoms: z.array(z.string().trim().max(255)).optional(),
      pastMedicalHistory: z.array(z.string().trim().max(255)).optional(),
      pastSurgicalHistory: z.array(z.string().trim().max(255)).optional(),
      medications: z.array(z.string().trim().max(255)).optional(),
      allergies: z.array(z.string().trim().max(255)).optional(),
      familyHistory: z.array(z.string().trim().max(255)).optional(),
      socialHistory: z.string().trim().max(2000).optional(),
      reviewOfSystems: z.string().trim().max(3000).optional(),
      ayushHistory: z.string().trim().max(2000).optional(),
      relevantMedicalRecords: z.array(z.string().trim().max(500)).optional(),
      clinicalInformationSummary: z.string().trim().max(5000).optional()
    })
    .strict()
};

export const confirmSummarySchema = {
  body: z
    .object({
      summaryId: z.string().trim().optional(),
      version: z.number().int().positive().optional(),
      notes: z.string().trim().max(1000).optional()
    })
    .strict()
    .optional()
};

export const geminiSummaryOutputSchema = z.object({
  sections: summarySectionsSchema,
  conflicts: z
    .array(
      z.object({
        field: z.string().trim(),
        description: z.string().trim(),
        sources: z.array(z.string().trim()).default([])
      })
    )
    .default([])
});

export type GenerateSummaryInput = z.infer<NonNullable<typeof generateSummarySchema['body']>>;
export type ReviewSummaryInput = z.infer<NonNullable<typeof reviewSummarySchema['body']>>;
export type EditSummaryInput = z.infer<typeof editSummarySchema['body']>;
export type ConfirmSummaryInput = z.infer<NonNullable<typeof confirmSummarySchema['body']>>;
export type GeminiSummaryOutput = z.infer<typeof geminiSummaryOutputSchema>;
