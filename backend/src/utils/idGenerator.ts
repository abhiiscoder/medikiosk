/**
 * MEDiKIOSK Backend — Phase 02: Authoritative Identifier Generators
 * Generates unique, collision-resistant identifiers for Patients, Cases, and Sessions.
 */

import crypto from 'node:crypto';

/**
 * Generates a human-friendly, authoritative Case ID matching MEDiKIOSK visual conventions
 * Example: "case-7017"
 */
export function generateCaseId(): string {
  // Generate a random 4-digit number between 1000 and 9999
  const num = crypto.randomInt(1000, 9999);
  return `case-${num}`;
}

/**
 * Generates an authoritative Patient ID
 * Example: "pt-88219"
 */
export function generatePatientId(): string {
  const num = crypto.randomInt(10000, 99999);
  return `pt-${num}`;
}

/**
 * Generates an authoritative Clinical Session ID
 * Example: "sess-7192"
 */
export function generateSessionId(): string {
  const num = crypto.randomInt(1000, 9999);
  return `sess-${num}`;
}

/**
 * Generates a Medical Record Number (MRN)
 * Example: "MK-2026-8921"
 */
export function generateMrn(): string {
  const year = new Date().getFullYear();
  const num = crypto.randomInt(1000, 9999);
  return `MK-${year}-${num}`;
}

/**
 * Generates an authoritative Clinical History ID
 * Example: "clh-7192"
 */
export function generateClinicalHistoryId(): string {
  const num = crypto.randomInt(1000, 9999);
  return `clh-${num}`;
}

/**
 * Generates an authoritative Answer ID
 * Example: "ans-4819"
 */
export function generateAnswerId(): string {
  const num = crypto.randomInt(1000, 9999);
  return `ans-${num}`;
}

/**
 * Generates an authoritative Message ID
 * Example: "msg-48192"
 */
export function generateMessageId(): string {
  const num = crypto.randomInt(10000, 99999);
  return `msg-${num}`;
}

/**
 * Generates an authoritative Conversation ID
 * Example: "conv-7192"
 */
export function generateConversationId(): string {
  const num = crypto.randomInt(1000, 9999);
  return `conv-${num}`;
}

/**
 * Generates an authoritative Medical Document ID
 * Example: "doc-3819"
 */
export function generateDocumentId(): string {
  const timeSlice = Date.now().toString().slice(-4);
  const num = crypto.randomInt(1000, 9999);
  return `doc-${timeSlice}${num}`;
}

/**
 * Generates an authoritative Clinical Summary ID
 * Example: "sum-719284"
 */
export function generateSummaryId(): string {
  const timeSlice = Date.now().toString().slice(-4);
  const num = crypto.randomInt(1000, 9999);
  return `sum-${timeSlice}${num}`;
}


