/**
 * MEDiKIOSK — Phase 03: Clinical Conversation Engine Fixtures
 * 
 * Strict isolation rules:
 * - UI demonstration fixtures ONLY.
 * - ZERO fabricated patient names, doctor names, case IDs, MRNs, or demographics.
 * - ZERO fabricated clinical diagnoses or condition inferencing.
 * - Demonstrates interaction/spatial model and message flow.
 */

import { ConversationMessage } from '../types/conversation.types';
import { STRUCTURED_QUESTION_FIXTURES } from './question.fixtures';

/**
 * Initial clinical conversational sequence for UI demonstration
 * Follows the master prompt specification:
 * 1. MEDiKIOSK: What is the main health problem that brought you here today?
 * 2. Patient: I have fever and cough.
 * 3. MEDiKIOSK: How long have you been experiencing these symptoms? (Duration structured question)
 */
export const INITIAL_CONVERSATION_FIXTURES: ConversationMessage[] = [
  {
    id: 'fixture-msg-1',
    role: 'assistant',
    content: 'What is the main health problem that brought you here today?',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    provenance: 'ai',
    stage: 'completed'
  },
  {
    id: 'fixture-msg-2',
    role: 'user',
    content: 'I have fever and cough.',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    provenance: 'user'
  },
  {
    id: 'fixture-msg-3',
    role: 'assistant',
    content: 'How long have you been experiencing these symptoms?',
    timestamp: new Date(Date.now() - 20000).toISOString(),
    provenance: 'ai',
    stage: 'completed',
    question: STRUCTURED_QUESTION_FIXTURES[1] // Duration Question
  }
];

/**
 * Lightweight response suggestions
 * NOTE: These are response options to expedite typing, NOT diagnoses!
 */
export const INITIAL_SUGGESTION_CHIPS: string[] = [
  'Fever',
  'Cough',
  'Headache',
  'Body aches',
  '3 to 4 days'
];

/**
 * Simulated generic clinical conversational follow-up questions
 * Purely for UI interaction flow demonstration in mock mode.
 */
export const SIMULATED_FOLLOW_UPS: string[] = [
  'Thank you for providing that detail. Have you noticed any other symptoms such as shortness of breath or chills?',
  'Understood. Are you currently taking any regular medications or over-the-counter treatments for this?',
  'Do you have any known allergies to medications or specific medical history your doctor should know?'
];
