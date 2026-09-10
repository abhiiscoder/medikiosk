/**
 * MEDiKIOSK — PHASE 00
 * Common & Infrastructure Types
 */

export type ID = string;
export type ISO8601Date = string;

/**
 * Information provenance hierarchy:
 * Crucial clinical distinction of data origins
 */
export type ProvenanceSource = 'user' | 'ai' | 'document' | 'clinician' | 'system';

/**
 * Clinical verification state
 */
export type VerificationLevel = 'unverified' | 'ai_proposed' | 'clinician_reviewed' | 'verified';

/**
 * Clinical priority / triage level
 */
export type ClinicalPriority = 'routine' | 'urgent' | 'emergency' | 'stat';

/**
 * Standardized asynchronous state handling across all components and services
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
  isRetrying?: boolean;
}

/**
 * API Response envelope for all backend service boundaries
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: ISO8601Date;
  code?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
