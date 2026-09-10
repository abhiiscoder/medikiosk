/**
 * MEDiKIOSK Backend — Phase 02: Case & Session Request Validation Schemas
 * Authoritative Zod schemas for case creation, updates, and sessions.
 */

import { z } from 'zod';

export const createCaseSchema = {
  body: z.object({
    patientId: z.string().trim().min(1).optional(),
    patientData: z
      .object({
        firstName: z.string().trim().min(1, 'First name cannot be empty').optional(),
        lastName: z.string().trim().min(1, 'Last name cannot be empty').optional(),
        dateOfBirth: z.string().trim().optional(),
        age: z.number().int().min(0).max(130).optional(),
        gender: z.enum(['male', 'female', 'other', 'undisclosed']).optional(),
        bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).optional(),
        contactNumber: z.string().trim().optional(),
        abhaId: z.string().trim().optional(),
        mrn: z.string().trim().optional()
      })
      .optional(),
    specialId: z.string().trim().optional()
  })
};

export const updateCaseSchema = {
  body: z
    .object({
      status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
      workflowStage: z.enum(['clinical_history', 'medical_records', 'summary', 'completed']).optional()
    })
    .refine((data) => data.status !== undefined || data.workflowStage !== undefined, {
      message: 'At least one field (status or workflowStage) must be provided for update.'
    })
};

export const queryCasesSchema = {
  query: z.object({
    status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
    workflowStage: z.enum(['clinical_history', 'medical_records', 'summary', 'completed']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
};

export const createSessionSchema = {
  body: z.object({}).optional()
};

export const caseIdParamSchema = {
  params: z.object({
    caseId: z
      .string()
      .trim()
      .min(1, 'caseId cannot be empty')
      .max(128, 'caseId exceeds maximum length')
      .regex(/^[a-zA-Z0-9_-]+$/, 'caseId must contain only alphanumeric characters, underscores, or hyphens')
  })
};

export const sessionIdParamSchema = {
  params: z.object({
    sessionId: z
      .string()
      .trim()
      .min(1, 'sessionId cannot be empty')
      .max(128, 'sessionId exceeds maximum length')
      .regex(/^[a-zA-Z0-9_-]+$/, 'sessionId must contain only alphanumeric characters, underscores, or hyphens')
  })
};
