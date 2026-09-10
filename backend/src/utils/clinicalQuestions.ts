/**
 * MEDiKIOSK Backend — Phase 03 & Phase 05: Clinical Question Engine & Entity Mapping
 * Master question catalog covering 13 clinical anamnesis sections with machine-readable identifiers,
 * target schema field binding, adaptive progression logic, and structured-state update payloads.
 */

import { ClinicalSection, ResponseType, IValidationRules } from '../models/question.model.js';
import { IStructuredData } from '../models/clinicalHistory.model.js';

// ─── Static Question Definition ───

export interface IStaticQuestion {
  questionId: string;
  section: ClinicalSection;
  field: string;
  text: string;
  responseType: ResponseType;
  options?: Array<{ id: string; label: string; value: string; isOther?: boolean }>;
  order: number;
  required: boolean;
  active: boolean;
  clarificationText?: string;
  maxClarificationAttempts?: number;
  validationRules?: IValidationRules;
}

/**
 * Authoritative ordered sequence of clinical intake questions.
 * Covers all 13 clinical anamnesis sections with field bindings.
 */
export const CLINICAL_QUESTION_CATALOG: IStaticQuestion[] = [
  // 1. Chief Complaint
  {
    questionId: 'q-chief-complaint',
    section: 'chief_complaint',
    field: 'chiefComplaint',
    text: 'What is the main health problem that brought you here today?',
    responseType: 'text',
    order: 1,
    required: true,
    active: true,
    clarificationText: 'Could you please describe the main symptom or health concern you are experiencing?',
    maxClarificationAttempts: 2
  },
  // 2. HPI
  {
    questionId: 'q-hpi',
    section: 'history_of_present_illness',
    field: 'historyOfPresentIllness',
    text: 'Can you describe in detail how this problem started and progressed?',
    responseType: 'text',
    order: 2,
    required: true,
    active: true,
    clarificationText: 'Could you explain a bit more about how your symptoms began and if they have gotten better or worse?',
    maxClarificationAttempts: 2
  },
  // 3. Duration
  {
    questionId: 'q-duration',
    section: 'duration',
    field: 'duration',
    text: 'How long have you been experiencing these symptoms?',
    responseType: 'duration',
    order: 3,
    required: true,
    active: true,
    clarificationText: 'Approximately how many hours, days, weeks, or months have you had this issue?',
    maxClarificationAttempts: 2
  },
  // 4. Severity
  {
    questionId: 'q-severity',
    section: 'severity',
    field: 'severity',
    text: 'How would you rate the severity of your symptoms?',
    responseType: 'single_choice',
    options: [
      { id: 'opt-mild', label: 'Mild', value: 'mild' },
      { id: 'opt-moderate', label: 'Moderate', value: 'moderate' },
      { id: 'opt-severe', label: 'Severe', value: 'severe' }
    ],
    order: 4,
    required: true,
    active: true,
    clarificationText: 'Would you describe the discomfort as mild, moderate, or severe?',
    maxClarificationAttempts: 2,
    validationRules: {
      allowedValues: ['mild', 'moderate', 'severe']
    }
  },
  // 5. Symptoms
  {
    questionId: 'q-symptoms',
    section: 'symptoms',
    field: 'symptoms',
    text: 'Do you have any of these symptoms?',
    responseType: 'multiple_choice',
    options: [
      { id: 'opt-cough', label: 'Cough', value: 'Cough' },
      { id: 'opt-bodyache', label: 'Body ache', value: 'Body ache' },
      { id: 'opt-headache', label: 'Headache', value: 'Headache' },
      { id: 'opt-breathing', label: 'Breathing difficulty', value: 'Breathing difficulty' },
      { id: 'opt-other', label: 'Other', value: 'Other', isOther: true }
    ],
    order: 5,
    required: true,
    active: true,
    clarificationText: 'Are you having any additional symptoms like fever, cough, body ache, or breathing difficulty?',
    maxClarificationAttempts: 2
  },
  // 6. Past Medical History
  {
    questionId: 'q-past-medical',
    section: 'past_medical_history',
    field: 'pastMedicalHistory',
    text: 'Do you have any chronic conditions or past medical diagnoses?',
    responseType: 'text',
    order: 6,
    required: true,
    active: true,
    clarificationText: 'Do you have any diagnosed medical conditions such as diabetes, high blood pressure, or asthma?',
    maxClarificationAttempts: 2
  },
  // 7. Past Surgical History
  {
    questionId: 'q-past-surgical',
    section: 'past_surgical_history',
    field: 'pastSurgicalHistory',
    text: 'Have you had any previous surgeries or procedures?',
    responseType: 'text',
    order: 7,
    required: false,
    active: true,
    clarificationText: 'Have you ever undergone any surgical operations or major medical procedures in the past?',
    maxClarificationAttempts: 2
  },
  // 8. Medications
  {
    questionId: 'q-medications',
    section: 'medications',
    field: 'medications',
    text: 'Are you currently taking any medications?',
    responseType: 'text',
    order: 8,
    required: true,
    active: true,
    clarificationText: 'Are you currently taking any prescription drugs, over-the-counter medicines, or daily pills?',
    maxClarificationAttempts: 2
  },
  // 9. Allergies
  {
    questionId: 'q-allergies',
    section: 'allergies',
    field: 'allergies',
    text: 'Do you have any known allergies to medications or substances?',
    responseType: 'text',
    order: 9,
    required: true,
    active: true,
    clarificationText: 'Have you ever had an allergic reaction to medicines, foods, or environmental triggers?',
    maxClarificationAttempts: 2
  },
  // 10. Family History
  {
    questionId: 'q-family-history',
    section: 'family_history',
    field: 'familyHistory',
    text: 'Is there any significant health condition in your family history?',
    responseType: 'text',
    order: 10,
    required: false,
    active: true,
    clarificationText: 'Does anyone in your blood family have a history of heart disease, diabetes, or cancer?',
    maxClarificationAttempts: 2
  },
  // 11. Social History
  {
    questionId: 'q-social-history',
    section: 'social_history',
    field: 'socialHistory',
    text: 'Can you tell us about your lifestyle — occupation, smoking, alcohol, exercise?',
    responseType: 'text',
    order: 11,
    required: false,
    active: true,
    clarificationText: 'Do you currently work in a specific occupation, smoke, or consume alcohol?',
    maxClarificationAttempts: 2
  },
  // 12. Review of Systems
  {
    questionId: 'q-review-of-systems',
    section: 'review_of_systems',
    field: 'reviewOfSystems',
    text: 'Have you noticed any other symptoms in other body systems (respiratory, cardiac, GI, neurological, etc.)?',
    responseType: 'text',
    order: 12,
    required: false,
    active: true,
    clarificationText: 'Are you experiencing any other complaints like chest pain, digestive issues, or dizziness?',
    maxClarificationAttempts: 2
  },
  // 13. AYUSH History
  {
    questionId: 'q-ayush-history',
    section: 'ayush_history',
    field: 'ayushHistory',
    text: 'Have you used any AYUSH treatments (Ayurveda, Yoga, Unani, Siddha, Homeopathy)?',
    responseType: 'text',
    order: 13,
    required: false,
    active: true,
    clarificationText: 'Have you taken any Ayurvedic, Homeopathic, or traditional remedies for this condition?',
    maxClarificationAttempts: 2
  }
];

// ─── Question Lookup Utilities ───

/**
 * Retrieves a question by its questionId
 */
export function getQuestionById(questionId: string): IStaticQuestion | undefined {
  return CLINICAL_QUESTION_CATALOG.find((q) => q.questionId === questionId);
}

/**
 * Retrieves a question by its bound target field in structured clinical state
 */
export function getQuestionByField(field: string): IStaticQuestion | undefined {
  return CLINICAL_QUESTION_CATALOG.find((q) => q.field === field);
}

/**
 * Retrieves all active questions, optionally filtered by section
 */
export function getQuestionsBySection(section?: string): IStaticQuestion[] {
  const activeQuestions = CLINICAL_QUESTION_CATALOG.filter((q) => q.active);
  if (section) {
    return activeQuestions.filter((q) => q.section === section);
  }
  return activeQuestions;
}

/**
 * Deterministic next-question resolution.
 * Returns the next active question in the catalog after the given questionId, or null if finished.
 */
export function getNextQuestion(currentQuestionId: string): IStaticQuestion | null {
  const index = CLINICAL_QUESTION_CATALOG.findIndex((q) => q.questionId === currentQuestionId);
  if (index < 0) return null;

  for (let i = index + 1; i < CLINICAL_QUESTION_CATALOG.length; i++) {
    if (CLINICAL_QUESTION_CATALOG[i].active) {
      return CLINICAL_QUESTION_CATALOG[i];
    }
  }

  return null;
}

/**
 * Returns the first active question in the catalog
 */
export function getFirstQuestion(): IStaticQuestion {
  return CLINICAL_QUESTION_CATALOG.find((q) => q.active) || CLINICAL_QUESTION_CATALOG[0];
}

/**
 * Determines whether a specific question has already been sufficiently fulfilled
 * in the structured clinical state (e.g. from direct answers or multi-fact responses).
 */
export function isQuestionFulfilled(question: IStaticQuestion, structuredData?: IStructuredData): boolean {
  if (!structuredData) return false;

  switch (question.questionId) {
    case 'q-chief-complaint':
      return Boolean(structuredData.chiefComplaint?.text && structuredData.chiefComplaint.text.trim().length > 0);

    case 'q-hpi':
      return Boolean(
        structuredData.historyOfPresentIllness?.narrative &&
        structuredData.historyOfPresentIllness.narrative.trim().length > 0
      );

    case 'q-duration':
      return Boolean(
        structuredData.duration &&
        structuredData.duration.value !== undefined &&
        structuredData.duration.unit !== undefined
      );

    case 'q-severity':
      return Boolean(structuredData.severity && structuredData.severity !== 'unknown');

    case 'q-symptoms':
      return Boolean(Array.isArray(structuredData.symptoms) && structuredData.symptoms.length > 0);

    case 'q-past-medical':
      return Boolean(Array.isArray(structuredData.pastMedicalHistory) && structuredData.pastMedicalHistory.length > 0);

    case 'q-past-surgical':
      return Boolean(Array.isArray(structuredData.pastSurgicalHistory) && structuredData.pastSurgicalHistory.length > 0);

    case 'q-medications':
      return Boolean(Array.isArray(structuredData.medications) && structuredData.medications.length > 0);

    case 'q-allergies':
      return Boolean(Array.isArray(structuredData.allergies) && structuredData.allergies.length > 0);

    case 'q-family-history':
      return Boolean(Array.isArray(structuredData.familyHistory) && structuredData.familyHistory.length > 0);

    case 'q-social-history':
      return Boolean(
        structuredData.socialHistory &&
        Object.values(structuredData.socialHistory).some((v) => typeof v === 'string' && v.trim().length > 0)
      );

    case 'q-review-of-systems':
      return Boolean(
        structuredData.reviewOfSystems &&
        Object.values(structuredData.reviewOfSystems).some((v) => typeof v === 'string' && v.trim().length > 0)
      );

    case 'ayush-history':
    case 'q-ayush-history':
      return Boolean(
        structuredData.ayushHistory &&
        Object.values(structuredData.ayushHistory).some((v) => typeof v === 'string' && v.trim().length > 0)
      );

    default:
      return false;
  }
}

/**
 * Returns a list of required questions that are still missing from structuredData
 */
export function getMissingRequiredQuestions(
  structuredData?: IStructuredData,
  completedQuestionIds: string[] = []
): IStaticQuestion[] {
  return CLINICAL_QUESTION_CATALOG.filter((q) => {
    if (!q.active || !q.required) return false;
    if (completedQuestionIds.includes(q.questionId)) return false;
    return !isQuestionFulfilled(q, structuredData);
  });
}

/**
 * Adaptive question resolution:
 * Identifies the next priority question that has NOT yet been answered or skipped.
 * Automatically skips questions whose fields were already fulfilled by multi-fact answers.
 */
export function getAdaptiveNextQuestion(
  structuredData?: IStructuredData,
  completedQuestionIds: string[] = [],
  skippedQuestionIds: string[] = []
): IStaticQuestion | null {
  // Priority 1: Missing Required Questions (ordered by medical priority)
  const missingRequired = CLINICAL_QUESTION_CATALOG.filter((q) => {
    if (!q.active || !q.required) return false;
    if (completedQuestionIds.includes(q.questionId)) return false;
    if (skippedQuestionIds.includes(q.questionId)) return false;
    return !isQuestionFulfilled(q, structuredData);
  });

  if (missingRequired.length > 0) {
    return missingRequired[0];
  }

  // Priority 2: Missing Optional/Relevant Questions
  const missingOptional = CLINICAL_QUESTION_CATALOG.filter((q) => {
    if (!q.active || q.required) return false;
    if (completedQuestionIds.includes(q.questionId)) return false;
    if (skippedQuestionIds.includes(q.questionId)) return false;
    return !isQuestionFulfilled(q, structuredData);
  });

  if (missingOptional.length > 0) {
    return missingOptional[0];
  }

  // All required and optional clinical questions satisfied
  return null;
}

/**
 * Evaluates whether all required intake questions are fulfilled
 */
export function isIntakeComplete(
  answeredQuestionIds: string[] = [],
  structuredData?: IStructuredData
): boolean {
  const missingRequired = getMissingRequiredQuestions(structuredData, answeredQuestionIds);
  return missingRequired.length === 0;
}

// ─── Structured State Mapping ───

type IDurationUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years' | 'unknown';

/**
 * Maps a raw answer value to the relevant structuredData field update.
 * Fully deterministic — preserves negative answers, handles "I don't know" and "not applicable".
 */
export function mapAnswerToStructuredUpdate(
  questionId: string,
  value: unknown,
  source: string = 'text'
): Partial<IStructuredData> {
  const update: Partial<IStructuredData> = {};
  const strVal = String(value || '').trim();
  const lowerVal = strVal.toLowerCase();

  // Recognize "I don't know" / unclear statements
  const isUnclear = /^(i don'?t know|not sure|unsure|cannot recall|can'?t remember|idk|dunno)$/i.test(strVal);

  switch (questionId) {
    case 'q-chief-complaint': {
      if (strVal.length > 0) {
        update.chiefComplaint = {
          text: strVal,
          capturedAt: new Date(),
          source
        };
      }
      break;
    }

    case 'q-hpi': {
      if (strVal.length > 0) {
        update.historyOfPresentIllness = {
          narrative: strVal
        };
      }
      break;
    }

    case 'q-duration': {
      if (isUnclear) {
        update.duration = { value: 0, unit: 'unknown' };
      } else if (typeof value === 'object' && value !== null) {
        const val = value as { amount?: number; value?: number; unit?: string };
        const amount = typeof val.amount === 'number' ? val.amount : typeof val.value === 'number' ? val.value : 1;
        const rawUnit = String(val.unit || 'days').toLowerCase();
        const validUnits: IDurationUnit[] = ['minutes', 'hours', 'days', 'weeks', 'months', 'years', 'unknown'];
        const unit = validUnits.find((u) => rawUnit.includes(u)) || 'days';
        update.duration = { value: amount, unit };
      } else {
        // Regex parse duration string like "3 days", "2 weeks"
        const match = strVal.match(/(\d+)\s*(minute|hour|day|week|month|year)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          const rawUnit = match[2].toLowerCase() + 's';
          const unit = (['minutes', 'hours', 'days', 'weeks', 'months', 'years'] as const).find(u => u.startsWith(rawUnit.slice(0, 3))) || 'days';
          update.duration = { value: num, unit };
        } else {
          update.duration = { value: 1, unit: 'days' };
        }
      }
      break;
    }

    case 'q-severity': {
      if (isUnclear) {
        update.severity = 'unknown';
      } else if (['mild', 'moderate', 'severe'].includes(lowerVal)) {
        update.severity = lowerVal as 'mild' | 'moderate' | 'severe';
      } else if (lowerVal.includes('severe') || lowerVal.includes('bad') || lowerVal.includes('worst')) {
        update.severity = 'severe';
      } else if (lowerVal.includes('moderate') || lowerVal.includes('medium')) {
        update.severity = 'moderate';
      } else if (lowerVal.includes('mild') || lowerVal.includes('slight') || lowerVal.includes('little')) {
        update.severity = 'mild';
      } else {
        update.severity = 'unknown';
      }
      break;
    }

    case 'q-symptoms': {
      // Rule 1: Negative answer preservation ("No", "None", "No other symptoms")
      if (/^(no|none|no symptoms|nothing else|negative)$/i.test(strVal)) {
        update.symptoms = [{ name: 'None reported', presence: false }];
      } else if (Array.isArray(value)) {
        update.symptoms = value.map((name) => ({
          name: String(name).trim(),
          presence: true
        }));
      } else if (strVal.length > 0) {
        update.symptoms = [{ name: strVal, presence: true }];
      }
      break;
    }

    case 'q-past-medical': {
      // Rule 1 & Rule 3: Negative / N/A answer ("None", "No medical history", "No chronic illness")
      if (/^(no|none|no past medical|no medical history|no chronic illness|healthy|n\/a)$/i.test(strVal)) {
        update.pastMedicalHistory = [{ condition: 'None reported', status: 'resolved' }];
      } else if (strVal.length > 0) {
        update.pastMedicalHistory = [{ condition: strVal, status: 'active' }];
      }
      break;
    }

    case 'q-past-surgical': {
      // Rule 1 & Rule 3: Negative / N/A answer ("No surgeries", "Never had surgery")
      if (/^(no|none|no surgery|no surgeries|never had surgery|n\/a)$/i.test(strVal)) {
        update.pastSurgicalHistory = [{ procedure: 'None reported' }];
      } else if (strVal.length > 0) {
        update.pastSurgicalHistory = [{ procedure: strVal }];
      }
      break;
    }

    case 'q-medications': {
      // Rule 1 & Rule 3: Negative / N/A answer ("No medications", "I don't take any medicines")
      if (/^(no|none|no medications?|not taking any|no medicines?|n\/a)$/i.test(strVal)) {
        update.medications = [{ name: 'None reported' }];
      } else if (strVal.length > 0) {
        update.medications = [{ name: strVal }];
      }
      break;
    }

    case 'q-allergies': {
      // Rule 1 & Rule 3: Negative answer ("No allergies", "No known allergies")
      if (/^(no|none|no allergies?|no known allergies?|not allergic|n\/a)$/i.test(strVal)) {
        update.allergies = [{ allergen: 'No known allergies' }];
      } else if (strVal.length > 0) {
        update.allergies = [{ allergen: strVal }];
      }
      break;
    }

    case 'q-family-history': {
      if (/^(no|none|no family history|healthy family|n\/a)$/i.test(strVal)) {
        update.familyHistory = [{ relationship: 'Family', condition: 'None reported' }];
      } else if (strVal.length > 0) {
        update.familyHistory = [{ relationship: 'Family', condition: strVal }];
      }
      break;
    }

    case 'q-social-history': {
      if (strVal.length > 0) {
        update.socialHistory = { notes: strVal };
      }
      break;
    }

    case 'q-review-of-systems': {
      if (/^(no|none|no other symptoms|all clear|n\/a)$/i.test(strVal)) {
        update.reviewOfSystems = { other: 'None reported' };
      } else if (strVal.length > 0) {
        update.reviewOfSystems = { other: strVal };
      }
      break;
    }

    case 'q-ayush-history': {
      if (/^(no|none|no ayush|never used|n\/a)$/i.test(strVal)) {
        update.ayushHistory = { notes: 'None reported' };
      } else if (strVal.length > 0) {
        update.ayushHistory = { notes: strVal };
      }
      break;
    }

    default:
      break;
  }

  return update;
}
