/**
 * MEDiKIOSK — Phase 04: Structured Question Fixtures
 *
 * Isolated question definitions demonstrating all core question types:
 * 1. Single Choice
 * 2. Multiple Choice (with Other)
 * 3. Text Answer
 * 4. Yes / No
 * 5. Duration
 * 6. Voice Answer (Architecture only)
 *
 * Strict Privacy Rule:
 * ZERO fabricated patient identities, doctor names, case IDs, or diagnoses.
 */

import { QuestionDefinition } from '../types/question.types';

export const STRUCTURED_QUESTION_FIXTURES: QuestionDefinition[] = [
  {
    id: 'q-symptoms',
    type: 'multiple-choice',
    text: 'Do you have any of these symptoms?',
    section: 'Symptoms Check',
    options: [
      'Cough',
      'Body ache',
      'Headache',
      'Breathing difficulty',
      'Other'
    ],
    allowOther: true,
    otherPlaceholder: 'Specify other symptom...',
    required: true
  },
  {
    id: 'q-duration',
    type: 'duration',
    text: 'How long have you had these symptoms?',
    section: 'Duration',
    required: true
  },
  {
    id: 'q-fever',
    type: 'yes-no',
    text: 'Do you currently have a fever or chills?',
    section: 'Vital Indicators',
    required: true
  },
  {
    id: 'q-pain-severity',
    type: 'single-choice',
    text: 'How would you describe your overall discomfort level?',
    section: 'Severity',
    options: ['Mild', 'Moderate', 'Severe'],
    required: true
  },
  {
    id: 'q-additional-notes',
    type: 'text',
    text: 'Please describe any other health concerns or medications you are taking.',
    section: 'Additional Context',
    placeholder: 'Type any details here...',
    required: false
  },
  {
    id: 'q-voice-note',
    type: 'voice',
    text: 'Record an optional clinical voice note for your physician.',
    section: 'Voice Consultation',
    required: false
  }
];
