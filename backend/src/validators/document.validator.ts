/**
 * MEDiKIOSK Backend — Phase 05 & 06: Medical Document Validators
 * Zod validation schemas for document endpoints, controlled categories, and statuses.
 */

import { z } from 'zod';

export const documentTypeEnum = z.enum([
  'lab_report',
  'prescription',
  'radiology',
  'discharge_summary',
  'clinical_note',
  'identity_card',
  'other'
]);

export const controlledCategoryEnum = z.enum([
  'Prescription',
  'Lab Report',
  'Imaging / Scan',
  'Discharge Summary',
  'Doctor Note',
  'Clinical Record',
  'Other Clinical Document',
  'NON_CLINICAL',
  'UNKNOWN'
]);

export const documentProcessingStatusEnum = z.enum([
  'uploaded',
  'pending_processing',
  'processing',
  'processed',
  'ocr_complete',
  'verified',
  'failed',
  'rejected'
]);

export const documentValidationStatusEnum = z.enum([
  'validation_pending',
  'validated',
  'rejected'
]);

export const documentClassificationEnum = z.enum([
  'CLINICAL',
  'NON_CLINICAL',
  'UNKNOWN'
]);

export const updateDocumentSchema = {
  body: z
    .object({
      type: documentTypeEnum.optional(),
      category: z.string().trim().max(100).optional(),
      name: z.string().trim().min(1).max(255).optional()
    })
    .strict()
};

export const queryDocumentsSchema = {
  query: z
    .object({
      type: documentTypeEnum.optional(),
      category: z.string().optional(),
      processingStatus: documentProcessingStatusEnum.optional(),
      validationStatus: documentValidationStatusEnum.optional(),
      isClinicalDocument: z
        .string()
        .transform((val) => val === 'true')
        .optional()
    })
    .optional()
};

export const processDocumentSchema = {
  body: z
    .object({
      forceReprocess: z.boolean().optional()
    })
    .strict()
    .optional()
};

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema['body']>;
export type QueryDocumentsInput = z.infer<NonNullable<typeof queryDocumentsSchema['query']>>;
export type ProcessDocumentInput = z.infer<NonNullable<typeof processDocumentSchema['body']>>;
