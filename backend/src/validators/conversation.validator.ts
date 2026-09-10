/**
 * MEDiKIOSK Backend — Phase 04: Conversation & AI Extraction Validators
 * Zod validation schemas for conversation HTTP endpoints and Gemini structured outputs.
 */

import { z } from 'zod';

export const postMessageSchema = {
  body: z.object({
    content: z
      .string({ required_error: 'Message content is required.' })
      .trim()
      .min(1, 'Message content cannot be empty.')
      .max(2000, 'Message content must not exceed 2000 characters.'),
    source: z
      .enum(['text', 'voice', 'selection', 'system'])
      .default('text')
      .optional()
  })
};

export type PostMessageInput = z.infer<typeof postMessageSchema['body']>;


/**
 * Validates the structured JSON payload returned by Gemini
 */
export const geminiExtractionSchema = z.object({
  answerUnderstanding: z.string().default(''),
  extractedData: z.record(z.unknown()).default({}),
  targetField: z.string().default(''),
  answerStatus: z
    .enum(['answered', 'partially_answered', 'needs_clarification', 'not_applicable', 'unclear'])
    .default('answered'),
  needsClarification: z.boolean().default(false),
  clarificationReason: z.string().nullable().optional(),
  suggestedNextQuestion: z.string().default('')
});

export type GeminiExtractionOutput = z.infer<typeof geminiExtractionSchema>;
