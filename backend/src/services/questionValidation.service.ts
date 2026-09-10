/**
 * MEDiKIOSK Backend — Phase 05: Question Validation & Answer State Service
 * Deterministically evaluates patient answers against active clinical questions,
 * enforces the 6 Clinical Answer Rules, detects multi-fact and partial inputs,
 * and safeguards against infinite clarification loops.
 */

import { IStaticQuestion } from '../utils/clinicalQuestions.js';
import { IStructuredData } from '../models/clinicalHistory.model.js';
import { AnswerStatus } from '../models/answer.model.js';
import { logger } from '../utils/logger.js';

export interface ValidationEvaluationResult {
  answerStatus: AnswerStatus;
  isValid: boolean;
  needsClarification: boolean;
  clarificationReason?: string;
  clarificationPrompt?: string;
  isBreakLoopSafeguard?: boolean;
  isNegativeAnswer?: boolean;
  isNotApplicable?: boolean;
  isUnclear?: boolean;
  isPartial?: boolean;
  missingComponents?: string[];
  normalizedFacts: Partial<IStructuredData>;
  satisfiedQuestionIds: string[];
}

export class QuestionValidationService {
  /**
   * Evaluates a patient answer against the currently active question and extracted facts.
   * Authoritatively determines validation status, clinical answer rules, and clarification progression.
   */
  public evaluateAnswer(
    question: IStaticQuestion,
    rawAnswer: string,
    extractedFacts: Partial<IStructuredData>,
    currentClarificationAttempts: number = 0,
    fullStructuredState?: IStructuredData,
    aiNeedsClarification?: boolean,
    aiClarificationReason?: string | null,
    aiSuggestedPrompt?: string | null
  ): ValidationEvaluationResult {
    const trimmed = rawAnswer.trim();
    const lower = trimmed.toLowerCase();
    const maxAttempts = question.maxClarificationAttempts || 2;

    // 0. Check for conversational greeting / non-clinical pleasantry without symptoms (e.g. "hello", "hi", "namaste")
    if (this.isGreetingPattern(lower)) {
      logger.info('Answer evaluated as conversational greeting without clinical symptoms', {
        questionId: question.questionId,
        attempts: currentClarificationAttempts
      });

      if (currentClarificationAttempts >= maxAttempts) {
        return {
          answerStatus: 'unclear',
          isValid: true,
          needsClarification: false,
          isBreakLoopSafeguard: true,
          normalizedFacts: this.buildUnknownFact(question.questionId),
          satisfiedQuestionIds: [question.questionId]
        };
      }

      return {
        answerStatus: 'needs_clarification',
        isValid: false,
        needsClarification: true,
        clarificationReason: 'Patient greeted or provided pleasantry without describing clinical symptoms.',
        clarificationPrompt:
          aiSuggestedPrompt ||
          'Hello! Could you please describe what symptom or health issue you are experiencing today?',
        isUnclear: true,
        normalizedFacts: {},
        satisfiedQuestionIds: []
      };
    }

    // 1. Check for Rule 2: "I don't know" / Unclear
    if (this.isIdkPattern(lower)) {
      logger.info("Answer evaluated as unclear (Rule 2: I don't know)", {
        questionId: question.questionId,
        attempts: currentClarificationAttempts
      });

      // If already at max clarification attempts, break loop and advance with unknown
      if (currentClarificationAttempts >= maxAttempts) {
        return {
          answerStatus: 'unclear',
          isValid: true,
          needsClarification: false,
          isUnclear: true,
          isBreakLoopSafeguard: true,
          normalizedFacts: this.buildUnknownFact(question.questionId),
          satisfiedQuestionIds: [question.questionId]
        };
      }

      return {
        answerStatus: 'unclear',
        isValid: true,
        needsClarification: true,
        clarificationReason: 'Patient stated they are unsure or do not know.',
        clarificationPrompt:
          aiSuggestedPrompt ||
          question.clarificationText ||
          'Could you provide your best estimate or recollection regarding this?',
        isUnclear: true,
        normalizedFacts: {},
        satisfiedQuestionIds: []
      };
    }

    // 2. Check for Rule 3: "Not applicable" / "N/A"
    if (this.isNotApplicablePattern(lower)) {
      logger.info('Answer evaluated as not applicable (Rule 3)', { questionId: question.questionId });
      return {
        answerStatus: 'not_applicable',
        isValid: true,
        needsClarification: false,
        isNotApplicable: true,
        normalizedFacts: this.buildNegativeOrNAFact(question.questionId),
        satisfiedQuestionIds: [question.questionId]
      };
    }

    // 3. Check for Rule 1: Explicit Negative Answer ("No", "None", "No fever", "No medications")
    if (this.isExplicitNegativePattern(lower, question)) {
      logger.info('Answer evaluated as valid negative answer (Rule 1)', { questionId: question.questionId });
      const facts =
        extractedFacts && Object.keys(extractedFacts).length > 0
          ? extractedFacts
          : this.buildNegativeOrNAFact(question.questionId);
      return {
        answerStatus: 'answered',
        isValid: true,
        needsClarification: false,
        isNegativeAnswer: true,
        normalizedFacts: facts,
        satisfiedQuestionIds: [question.questionId]
      };
    }

    // 4. Check if AI extraction identified that clarification is needed
    if (aiNeedsClarification) {
      logger.info('Answer flagged for clarification via AI clinical analysis', {
        questionId: question.questionId,
        attempts: currentClarificationAttempts
      });

      if (currentClarificationAttempts >= maxAttempts) {
        return {
          answerStatus: 'unclear',
          isValid: true,
          needsClarification: false,
          isBreakLoopSafeguard: true,
          normalizedFacts: this.buildUnknownFact(question.questionId),
          satisfiedQuestionIds: [question.questionId]
        };
      }

      return {
        answerStatus: 'needs_clarification',
        isValid: false,
        needsClarification: true,
        clarificationReason: aiClarificationReason || 'AI extraction indicated clarification needed.',
        clarificationPrompt:
          aiSuggestedPrompt ||
          question.clarificationText ||
          'Could you please provide a little more detail about that?',
        normalizedFacts: {},
        satisfiedQuestionIds: []
      };
    }

    // 5. Check for response-type specific validation
    const typeValidation = this.validateByResponseType(question, trimmed, lower, extractedFacts);
    if (!typeValidation.isValid) {
      // Check clarification loop safeguard
      if (currentClarificationAttempts >= maxAttempts) {
        logger.warn('Clarification loop safeguard triggered: exceeding max attempts. Advancing with unknown.', {
          questionId: question.questionId,
          attempts: currentClarificationAttempts
        });
        return {
          answerStatus: 'unclear',
          isValid: true,
          needsClarification: false,
          isBreakLoopSafeguard: true,
          normalizedFacts: this.buildUnknownFact(question.questionId),
          satisfiedQuestionIds: [question.questionId]
        };
      }

      return {
        answerStatus: 'needs_clarification',
        isValid: false,
        needsClarification: true,
        clarificationReason: typeValidation.errorReason || 'Input does not satisfy question criteria.',
        clarificationPrompt: typeValidation.suggestedPrompt || question.clarificationText,
        normalizedFacts: {},
        satisfiedQuestionIds: []
      };
    }

    // 6. Check for Rule 4: Partial Answer (e.g., compound requirements)
    const partialCheck = this.checkPartialAnswer(question, trimmed, extractedFacts);
    if (partialCheck.isPartial) {
      logger.info('Answer evaluated as partially answered (Rule 4)', {
        questionId: question.questionId,
        missing: partialCheck.missingComponents
      });

      const facts = { ...extractedFacts, ...partialCheck.factsProvided };
      return {
        answerStatus: 'partially_answered',
        isValid: true,
        needsClarification: true,
        isPartial: true,
        missingComponents: partialCheck.missingComponents,
        clarificationReason: `Partial information captured. Still need: ${partialCheck.missingComponents.join(', ')}.`,
        clarificationPrompt: partialCheck.clarificationPrompt || question.clarificationText,
        normalizedFacts: facts,
        satisfiedQuestionIds: []
      };
    }

    // 7. Check for Rule 5: Multi-Fact Answer Detection
    const satisfiedQuestions = [question.questionId];
    if (extractedFacts.chiefComplaint && question.questionId !== 'q-chief-complaint') {
      satisfiedQuestions.push('q-chief-complaint');
    }
    if (extractedFacts.duration && question.questionId !== 'q-duration') {
      satisfiedQuestions.push('q-duration');
    }
    if (extractedFacts.severity && question.questionId !== 'q-severity') {
      satisfiedQuestions.push('q-severity');
    }
    if (extractedFacts.symptoms && extractedFacts.symptoms.length > 0 && question.questionId !== 'q-symptoms') {
      satisfiedQuestions.push('q-symptoms');
    }
    if (extractedFacts.medications && extractedFacts.medications.length > 0 && question.questionId !== 'q-medications') {
      satisfiedQuestions.push('q-medications');
    }
    if (extractedFacts.allergies && extractedFacts.allergies.length > 0 && question.questionId !== 'q-allergies') {
      satisfiedQuestions.push('q-allergies');
    }
    if (extractedFacts.pastMedicalHistory && extractedFacts.pastMedicalHistory.length > 0 && question.questionId !== 'q-past-medical') {
      satisfiedQuestions.push('q-past-medical');
    }

    // 8. Success: Valid answer
    return {
      answerStatus: 'answered',
      isValid: true,
      needsClarification: false,
      normalizedFacts: extractedFacts,
      satisfiedQuestionIds: satisfiedQuestions
    };
  }

  // ─── Pattern Matching Helpers ───

  private isGreetingPattern(text: string): boolean {
    const trimmed = text.trim().toLowerCase();
    return /^(hello|hi|hey|greetings|good\s+(morning|afternoon|evening)|namaste|halo|howdy)(\s+there|\s+bot|\s+doctor|\s+assistant)?[\.\?!]*$/i.test(
      trimmed
    );
  }

  private isIdkPattern(text: string): boolean {
    const trimmed = text.trim().toLowerCase();
    if (
      /^(i\s+(really\s+|truly\s+)?(don'?t|do not)\s+know|not sure|unsure|cannot recall|can'?t recall|can'?t remember|cannot remember|idk|dunno|no idea)$/i.test(
        trimmed
      )
    ) {
      return true;
    }
    if (
      /(^|\b)(i\s+(really\s+|truly\s+)?(don'?t|do not)\s+know|not sure|unsure|cannot recall|can'?t recall|can'?t remember|cannot remember|idk|dunno|no idea)\b/i.test(
        trimmed
      )
    ) {
      return true;
    }
    return false;
  }

  private isNotApplicablePattern(text: string): boolean {
    const trimmed = text.trim().toLowerCase();
    return (
      /^(not applicable|n\/a|na|does not apply|not relevant)\b/i.test(trimmed) ||
      /\b(not applicable|n\/a)\b/i.test(trimmed)
    );
  }

  private isExplicitNegativePattern(text: string, question: IStaticQuestion): boolean {
    const trimmed = text.trim().toLowerCase();

    // Universal negatives
    if (/^(no|none|never|nil|nothing|nope|not at all)$/i.test(trimmed)) {
      return true;
    }
    if (/^(no|none|never|nil|nothing|nope)\b/i.test(trimmed)) {
      return true;
    }

    // Section-specific negative sentences
    switch (question.section) {
      case 'medications':
        return /^(no medications?|not taking any|no medicines?|don'?t take any)/i.test(trimmed);
      case 'allergies':
        return /^(no allergies?|no known allergies?|not allergic|no drug allergy)/i.test(trimmed);
      case 'past_medical_history':
        return /^(no past medical|no medical history|no chronic illness|healthy|no illness|completely healthy)/i.test(trimmed);
      case 'past_surgical_history':
        return /^(no surgery|no surgeries|never had surgery|no operation)/i.test(trimmed);
      case 'symptoms':
        return /^(no symptoms|no other symptoms|nothing else|negative)/i.test(trimmed);
      case 'family_history':
        return /^(no family history|healthy family|no hereditary conditions?)/i.test(trimmed);
      case 'social_history':
        return /^(non-smoker|no alcohol|no smoking|neither)/i.test(trimmed);
      case 'ayush_history':
        return /^(no ayush|never used ayurveda|no homeopathy|never taken traditional medicines?)/i.test(trimmed);
      default:
        return false;
    }
  }

  // ─── Response-Type Validation ───

  private validateByResponseType(
    question: IStaticQuestion,
    rawText: string,
    lowerText: string,
    extractedFacts: Partial<IStructuredData>
  ): { isValid: boolean; errorReason?: string; suggestedPrompt?: string } {
    switch (question.responseType) {
      case 'single_choice': {
        if (!question.options || question.options.length === 0) {
          return { isValid: true };
        }

        // Check if raw text or extracted severity matches valid options
        const matchOption = question.options.find(
          (opt) =>
            opt.value.toLowerCase() === lowerText ||
            opt.label.toLowerCase() === lowerText ||
            opt.id.toLowerCase() === lowerText ||
            lowerText.includes(opt.value.toLowerCase()) ||
            (question.field === 'severity' && extractedFacts.severity === opt.value.toLowerCase())
        );

        if (!matchOption) {
          const optionsText = question.options.map((o) => o.label).join(', ');
          return {
            isValid: false,
            errorReason: `Invalid option '${rawText}'. Expected one of: ${optionsText}.`,
            suggestedPrompt: `Please select one of the following options: ${optionsText}.`
          };
        }
        return { isValid: true };
      }

      case 'multiple_choice': {
        // Can be empty or negative (which is handled earlier) or selections
        return { isValid: true };
      }

      case 'yes_no': {
        const isYes = /^(yes|yeah|yep|yup|positive|true)$/i.test(lowerText);
        const isNo = /^(no|nope|nah|negative|false)$/i.test(lowerText);

        if (!isYes && !isNo) {
          return {
            isValid: false,
            errorReason: `Invalid yes/no response '${rawText}'.`,
            suggestedPrompt: 'Please answer with Yes or No.'
          };
        }
        return { isValid: true };
      }

      case 'duration': {
        // Must contain either number + unit or recognizable duration phrase
        const hasExtractedDuration = Boolean(extractedFacts.duration && extractedFacts.duration.value);
        const hasDurationPhrase = /(\d+)\s*(minute|hour|day|week|month|year)/i.test(lowerText);
        const hasRelativePhrase = /(yesterday|today|since morning|few days|couple of days|recently)/i.test(lowerText);

        if (!hasExtractedDuration && !hasDurationPhrase && !hasRelativePhrase) {
          return {
            isValid: false,
            errorReason: 'Could not determine duration from response.',
            suggestedPrompt: 'Could you please specify how many days, weeks, or months you have had this?'
          };
        }
        return { isValid: true };
      }

      case 'text':
      default: {
        // Reject purely meaningless short noise (e.g. 1 char punctuation or empty)
        if (rawText.length < 2 && !/^\d+$/.test(rawText)) {
          return {
            isValid: false,
            errorReason: 'Response is too brief to understand.',
            suggestedPrompt: question.clarificationText || 'Could you please provide a little more detail?'
          };
        }
        return { isValid: true };
      }
    }
  }

  // ─── Partial Answer Detection (Rule 4) ───

  private checkPartialAnswer(
    question: IStaticQuestion,
    rawText: string,
    extractedFacts: Partial<IStructuredData>
  ): {
    isPartial: boolean;
    missingComponents: string[];
    factsProvided: Partial<IStructuredData>;
    clarificationPrompt?: string;
  } {
    // If the active question is compound (e.g. duration asked along with onset/severity)
    if (question.questionId === 'q-hpi') {
      const narrative = extractedFacts.historyOfPresentIllness?.narrative || '';
      // If patient only provided duration or timeframe without narrative progression/description
      const hasNarrativeDetail = narrative.length > 20 && !narrative.toLowerCase().startsWith('started');
      if (extractedFacts.duration && (!hasNarrativeDetail || /^(started|since|for)\s+\d+/i.test(rawText.trim()))) {
        return {
          isPartial: true,
          missingComponents: ['narrative progression'],
          factsProvided: { duration: extractedFacts.duration },
          clarificationPrompt:
            'Thank you for sharing the timeframe. Could you also describe how the symptoms have been progressing or changing?'
        };
      }
    }

    return {
      isPartial: false,
      missingComponents: [],
      factsProvided: {}
    };
  }

  // ─── Fact Constructors for Safe Schema Mutation ───

  private buildNegativeOrNAFact(questionId: string): Partial<IStructuredData> {
    switch (questionId) {
      case 'q-symptoms':
        return { symptoms: [{ name: 'None reported', presence: false }] };
      case 'q-past-medical':
        return { pastMedicalHistory: [{ condition: 'None reported', status: 'resolved' }] };
      case 'q-past-surgical':
        return { pastSurgicalHistory: [{ procedure: 'None reported' }] };
      case 'q-medications':
        return { medications: [{ name: 'None reported' }] };
      case 'q-allergies':
        return { allergies: [{ allergen: 'No known allergies' }] };
      case 'q-family-history':
        return { familyHistory: [{ relationship: 'Family', condition: 'None reported' }] };
      case 'q-social-history':
        return { socialHistory: { notes: 'None reported' } };
      case 'q-review-of-systems':
        return { reviewOfSystems: { other: 'None reported' } };
      case 'q-ayush-history':
        return { ayushHistory: { notes: 'None reported' } };
      default:
        return {};
    }
  }

  private buildUnknownFact(questionId: string): Partial<IStructuredData> {
    switch (questionId) {
      case 'q-duration':
        return { duration: { value: 0, unit: 'unknown' } };
      case 'q-severity':
        return { severity: 'unknown' };
      case 'q-past-medical':
        return { pastMedicalHistory: [{ condition: 'Unknown / Not recalled', status: 'managed' }] };
      case 'q-past-surgical':
        return { pastSurgicalHistory: [{ procedure: 'Unknown / Not recalled' }] };
      case 'q-medications':
        return { medications: [{ name: 'Unknown / Not recalled' }] };
      case 'q-allergies':
        return { allergies: [{ allergen: 'Unknown / Not recalled' }] };
      case 'q-family-history':
        return { familyHistory: [{ relationship: 'Family', condition: 'Unknown / Not recalled' }] };
      default:
        return {};
    }
  }
}

export const questionValidationService = new QuestionValidationService();
