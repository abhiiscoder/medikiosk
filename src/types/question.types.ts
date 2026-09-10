/**
 * MEDiKIOSK — Phase 04: Structured Question Component System Types
 *
 * Data-driven clinical question definitions and structured response models.
 */

import { ID } from './common.types';

export type QuestionType =
  | 'single-choice'
  | 'multiple-choice'
  | 'text'
  | 'yes-no'
  | 'duration'
  | 'voice';

export type DurationUnit = 'hours' | 'days' | 'weeks' | 'months' | 'years';

export interface DurationValue {
  amount: number;
  unit: DurationUnit;
}

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  isOther?: boolean;
}

export interface QuestionDefinition {
  id: ID;
  type: QuestionType;
  text: string;
  section?: string;
  options?: (string | QuestionOption)[];
  allowOther?: boolean;
  otherPlaceholder?: string;
  required?: boolean;
  placeholder?: string;
  metadata?: Record<string, unknown>;
}

export type QuestionResponseValue =
  | string
  | string[]
  | boolean
  | DurationValue;

export interface QuestionResponse {
  questionId: ID;
  type: QuestionType;
  value: QuestionResponseValue;
  displayValue: string;
  timestamp: string;
  otherText?: string;
}

export type QuestionState =
  | 'idle'
  | 'selected'
  | 'editing'
  | 'submitting'
  | 'submitted'
  | 'disabled'
  | 'error';
