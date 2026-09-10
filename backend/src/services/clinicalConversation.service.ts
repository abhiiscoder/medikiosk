/**
 * MEDiKIOSK Backend — Phase 04 & Phase 05: LLM Clinical Conversation Engine & Adaptive Validation
 * Orchestrates clinical anamnesis dialogue using Google Gemini (@google/genai)
 * while maintaining the backend as the strict, authoritative workflow and state controller.
 */

import { Case } from '../models/case.model.js';
import { ClinicalSession } from '../models/session.model.js';
import { ClinicalHistory, IClinicalHistory, IStructuredData } from '../models/clinicalHistory.model.js';
import { Conversation, IConversation, IConversationMessage } from '../models/conversation.model.js';
import { Answer, AnswerStatus } from '../models/answer.model.js';
import { openRouterService } from './openrouter.service.js'; // DEMO MODE: OpenRouter is the only active AI provider
import {
  CLINICAL_INTAKE_SYSTEM_INSTRUCTION,
  buildClinicalExtractionPrompt
} from '../prompts/clinicalConversation.prompts.js';
import { geminiExtractionSchema, GeminiExtractionOutput } from '../validators/conversation.validator.js';
import {
  CLINICAL_QUESTION_CATALOG,
  getQuestionById,
  getNextQuestion,
  getFirstQuestion,
  mapAnswerToStructuredUpdate,
  IStaticQuestion,
  getAdaptiveNextQuestion,
  getMissingRequiredQuestions
} from '../utils/clinicalQuestions.js';
import { questionValidationService } from './questionValidation.service.js';
import {
  generateClinicalHistoryId,
  generateAnswerId,
  generateMessageId,
  generateConversationId
} from '../utils/idGenerator.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export interface SendMessageInput {
  content: string;
  source?: 'text' | 'voice' | 'selection' | 'system';
}

export interface ConversationResponseData {
  message: {
    id: string;
    role: 'assistant';
    content: string;
    source: string;
    timestamp: Date;
  };
  assistantMessage: {
    id: string;
    role: 'assistant';
    content: string;
    timestamp: string;
    provenance: string;
    stage: string;
    question?: {
      id: string;
      text: string;
      type: string;
    };
  };
  clinicalState: {
    currentSection?: string;
    currentField?: string;
    status: string;
  };
  structuredData?: IStructuredData;
  extractedData?: Record<string, unknown>;
  needsClarification?: boolean;
  isCompleted?: boolean;
  answerStatus: string;
  updatedFields: string[];
  conversationStatus: string;
  answer?: {
    answerStatus: string;
    clarificationCount: number;
    rawText: string;
    structuredUpdate: Record<string, unknown>;
  };
  currentQuestion?: {
    questionId: string;
    field: string;
    section: string;
    text: string;
  };
  nextAction: 'ASK_QUESTION' | 'CLARIFICATION' | 'COMPLETE';
  interviewStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  missingRequiredFields: string[];
  completedFields: string[];
}

export class ClinicalConversationService {
  private mockExtractor: ((prompt: string, patientAnswer: string) => Promise<GeminiExtractionOutput> | GeminiExtractionOutput) | null = null;

  public setMockExtractor(fn: ((prompt: string, patientAnswer: string) => Promise<GeminiExtractionOutput> | GeminiExtractionOutput) | null): void {
    this.mockExtractor = fn;
  }

  public resetMockExtractor(): void {
    this.mockExtractor = null;
  }

  /**
   * Primary entrypoint: receives a patient message, interprets it via Gemini,
   * validates output, updates structured state, enforces clinical answer rules,
   * and deterministically drives adaptive question progression.
   */
  public async sendMessage(
    userId: string,
    caseId: string,
    input: SendMessageInput
  ): Promise<ConversationResponseData> {
    const rawContent = input.content?.trim();
    if (!rawContent) {
      throw new AppError('Message content cannot be empty.', 400, 'INVALID_CONTENT');
    }

    // 1. Verify case ownership
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    // 2. Load or initialize ClinicalHistory and Conversation
    const historyDoc = await this.getOrCreateClinicalHistory(userId, caseDoc);
    const conversation = await this.getOrCreateConversation(userId, caseDoc, historyDoc.sessionId);

    // 3. Record raw patient user message
    const currentSequence = conversation.messages.length;
    const userMessage: IConversationMessage = {
      messageId: generateMessageId(),
      role: 'user',
      content: rawContent,
      sequence: currentSequence + 1,
      source: input.source || 'text',
      timestamp: new Date()
    };
    conversation.messages.push(userMessage);

    // 4. Identify active target and approved next target
    const currentQuestion = getQuestionById(historyDoc.currentQuestionId || '') || getFirstQuestion();
    const candidateNextQuestion = getNextQuestion(currentQuestion.questionId);

    const nextAllowedTarget = candidateNextQuestion
      ? {
          section: candidateNextQuestion.section,
          field: candidateNextQuestion.questionId,
          defaultQuestion: candidateNextQuestion.text
        }
      : {
          section: 'completed',
          field: 'intake_completed',
          defaultQuestion: 'Thank you. Your clinical history has been recorded for physician review.'
        };

    // 5. Gather bounded context for Gemini
    const recentDialog = conversation.messages
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    const extractionPrompt = buildClinicalExtractionPrompt({
      currentSection: historyDoc.currentSection || currentQuestion.section,
      targetField: currentQuestion.questionId,
      relevantStructuredData: this.getFilteredStructuredData(historyDoc.structuredData),
      recentDialog,
      patientAnswer: rawContent,
      nextAllowedTarget
    });

    // 6. [DEMO MODE] Invoke OpenRouter structured extraction — OpenRouter is the only active AI provider
    let extractionResult: GeminiExtractionOutput;
    if (this.mockExtractor) {
      extractionResult = await this.mockExtractor(extractionPrompt, rawContent);
    } else {
      try {
        if (!openRouterService.isConfigured()) {
          throw new AppError('OpenRouter API key is not configured in backend/.env.', 500, 'OPENROUTER_API_KEY_MISSING');
        }

        logger.info('AI clinical extraction request initiated', { selectedProvider: 'openrouter', model: openRouterService.getModel() });

        const rawJson = await openRouterService.generateStructuredJson<unknown>(extractionPrompt, {
          systemInstruction: CLINICAL_INTAKE_SYSTEM_INSTRUCTION,
          temperature: 0.2
        });

        const parsed = geminiExtractionSchema.safeParse(rawJson);
        if (parsed.success) {
          extractionResult = parsed.data;
          logger.info('AI clinical extraction completed', { selectedProvider: 'openrouter', finalProvider: 'openrouter', finalResult: 'success' });
        } else {
          logger.error('OpenRouter extraction output failed schema validation', {
            errors: parsed.error.issues
          });
          throw new AppError('AI returned a malformed clinical response. Please retry your message.', 502, 'OPENROUTER_MALFORMED_OUTPUT');
        }
      } catch (aiError) {
        logger.error('OpenRouter live conversation processing failed', {
          error: aiError instanceof Error ? openRouterService.sanitizeError(aiError.message) : String(aiError)
        });
        if (aiError instanceof AppError) {
          throw aiError;
        }
        throw new AppError(
          `Clinical AI service encountered an error: ${aiError instanceof Error ? aiError.message : 'Unknown error'}. Please retry.`,
          503,
          'OPENROUTER_SERVICE_ERROR'
        );
      }
    }

    // 7. Validate and sanitize extracted data
    const validatedData = this.sanitizeExtractedData(extractionResult.extractedData, rawContent);

    // 8. Phase 05 Clinical Question Validation & 6 Answer Rules
    const currentClarificationCount = (historyDoc.clarificationAttempts && historyDoc.clarificationAttempts[currentQuestion.questionId]) || 0;
    const validationResult = questionValidationService.evaluateAnswer(
      currentQuestion,
      rawContent,
      validatedData,
      currentClarificationCount,
      historyDoc.structuredData,
      extractionResult.needsClarification,
      extractionResult.clarificationReason,
      extractionResult.suggestedNextQuestion
    );

    const updatedFields: string[] = [];
    let nextQuestionText: string;
    let nextQuestionObj: IStaticQuestion | null = null;
    let isCompleted = false;
    let nextAction: 'ASK_QUESTION' | 'CLARIFICATION' | 'COMPLETE' = 'ASK_QUESTION';

    // 9. Adaptive state machine transition based on validation evaluation
    if (validationResult.needsClarification && !validationResult.isBreakLoopSafeguard) {
      // Clarification required: stay on current question, increment attempts
      const newAttempts = currentClarificationCount + 1;
      if (!historyDoc.clarificationAttempts) {
        historyDoc.clarificationAttempts = {};
      }
      historyDoc.clarificationAttempts[currentQuestion.questionId] = newAttempts;

      nextQuestionObj = currentQuestion;
      nextAction = 'CLARIFICATION';
      historyDoc.status = 'in_progress';

      // Select focused clarification text
      const rawClarification =
        validationResult.clarificationPrompt ||
        currentQuestion.clarificationText ||
        extractionResult.suggestedNextQuestion ||
        currentQuestion.text;

      nextQuestionText = this.sanitizeQuestionText(rawClarification, currentQuestion.text);

      // Non-destructively apply any partial components captured
      if (validationResult.normalizedFacts && Object.keys(validationResult.normalizedFacts).length > 0) {
        const applied = this.applyStructuredUpdates(historyDoc, validationResult.normalizedFacts);
        updatedFields.push(...applied);
      }
    } else {
      // Loop break safeguard OR Valid Answer (full, negative, or not applicable)
      if (validationResult.isBreakLoopSafeguard) {
        logger.warn('Safeguard: Breaking clarification loop after maximum attempts. Advancing adaptively.', {
          questionId: currentQuestion.questionId,
          attempts: currentClarificationCount
        });
      }

      // Reset clarification attempts for this question
      if (historyDoc.clarificationAttempts) {
        delete historyDoc.clarificationAttempts[currentQuestion.questionId];
      }

      // Apply updates to ClinicalHistory (Rule 6/10: overwrites with latest valid patient statements)
      const mergedUpdates: Partial<IStructuredData> = {
        ...validatedData,
        ...validationResult.normalizedFacts
      };
      if (Object.keys(mergedUpdates).length > 0) {
        const applied = this.applyStructuredUpdates(historyDoc, mergedUpdates);
        updatedFields.push(...applied);
      }

      // Track completed and skipped questions
      if (!historyDoc.completedQuestions) {
        historyDoc.completedQuestions = [];
      }
      if (!historyDoc.skippedQuestions) {
        historyDoc.skippedQuestions = [];
      }

      if (validationResult.answerStatus === 'not_applicable') {
        if (!historyDoc.skippedQuestions.includes(currentQuestion.questionId)) {
          historyDoc.skippedQuestions.push(currentQuestion.questionId);
        }
        if (!historyDoc.completedQuestions.includes(currentQuestion.questionId)) {
          historyDoc.completedQuestions.push(currentQuestion.questionId);
        }
      } else {
        for (const qid of validationResult.satisfiedQuestionIds) {
          if (!historyDoc.completedQuestions.includes(qid)) {
            historyDoc.completedQuestions.push(qid);
          }
        }
      }

      // Adaptive Next Question Selection (missing required > missing optional, auto-skips fulfilled)
      nextQuestionObj = getAdaptiveNextQuestion(
        historyDoc.structuredData,
        historyDoc.completedQuestions,
        historyDoc.skippedQuestions
      );

      if (!nextQuestionObj) {
        // Clinical intake complete
        isCompleted = true;
        nextAction = 'COMPLETE';
        historyDoc.status = 'completed';
        historyDoc.currentQuestionId = undefined;
        conversation.status = 'completed';
        conversation.endedAt = new Date();
        nextQuestionText = 'Thank you. Your clinical history has been recorded and synthesized for physician review.';
      } else {
        nextAction = 'ASK_QUESTION';
        historyDoc.currentSection = nextQuestionObj.section;
        historyDoc.currentQuestionId = nextQuestionObj.questionId;
        historyDoc.status = 'in_progress';

        // Gemini natural phrasing if aligned, else authoritative static text
        const geminiQuestion = extractionResult.suggestedNextQuestion?.trim();
        if (
          geminiQuestion &&
          geminiQuestion.length > 5 &&
          !this.containsProhibitedClaims(geminiQuestion) &&
          !extractionResult.needsClarification
        ) {
          nextQuestionText = geminiQuestion;
        } else {
          nextQuestionText = nextQuestionObj.text;
        }
      }
    }

    // 10. Update missing required fields list in ClinicalHistory
    const missingReqQuestions = getMissingRequiredQuestions(
      historyDoc.structuredData,
      historyDoc.completedQuestions
    );
    historyDoc.missingRequiredFields = missingReqQuestions.map((q) => q.field || q.questionId);

    // 11. Record Assistant Message in conversation
    const assistantMessage: IConversationMessage = {
      messageId: generateMessageId(),
      role: 'assistant',
      content: nextQuestionText,
      sequence: currentSequence + 2,
      source: 'system',
      timestamp: new Date()
    };
    conversation.messages.push(assistantMessage);

    // 12. Persist Answer document with answerStatus and clarificationCount
    const validAnswerStatuses: AnswerStatus[] = [
      'answered',
      'partially_answered',
      'unclear',
      'not_applicable',
      'needs_clarification'
    ];
    let sanitizedAnswerStatus: AnswerStatus = 'answered';
    if (validationResult?.answerStatus && validAnswerStatuses.includes(validationResult.answerStatus as AnswerStatus)) {
      sanitizedAnswerStatus = validationResult.answerStatus as AnswerStatus;
    } else if (validationResult?.needsClarification) {
      sanitizedAnswerStatus = 'needs_clarification';
    }

    const answerDoc = new Answer({
      answerId: generateAnswerId(),
      questionId: currentQuestion.questionId,
      conversationId: conversation.conversationId,
      messageId: userMessage.messageId,
      caseId,
      sessionId: historyDoc.sessionId,
      value: rawContent,
      normalizedValue: validationResult.normalizedFacts,
      answerStatus: sanitizedAnswerStatus,
      clarificationCount: (historyDoc.clarificationAttempts && historyDoc.clarificationAttempts[currentQuestion.questionId]) || 0,
      source: input.source || 'text',
      answeredAt: new Date()
    });

    // 13. Save all documents to MongoDB
    historyDoc.markModified('structuredData');
    historyDoc.markModified('clarificationAttempts');
    await Promise.all([
      historyDoc.save(),
      conversation.save(),
      answerDoc.save()
    ]);

    logger.info('Processed clinical conversation message with validation', {
      caseId,
      currentQuestionId: currentQuestion.questionId,
      answerStatus: validationResult.answerStatus,
      nextAction,
      nextQuestionId: nextQuestionObj?.questionId || 'completed',
      status: historyDoc.status,
      updatedFields
    });

    // 14. Assemble rich return payload
    const interviewStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = isCompleted
      ? 'COMPLETED'
      : 'IN_PROGRESS';

    return {
      message: {
        id: assistantMessage.messageId,
        role: 'assistant',
        content: assistantMessage.content,
        source: assistantMessage.source,
        timestamp: assistantMessage.timestamp
      },
      assistantMessage: {
        id: assistantMessage.messageId,
        role: 'assistant',
        content: assistantMessage.content,
        timestamp: assistantMessage.timestamp.toISOString(),
        provenance: 'ai',
        stage: isCompleted ? 'completed' : 'in_progress',
        question: nextQuestionObj
          ? {
              id: nextQuestionObj.questionId,
              text: nextQuestionText,
              type: nextQuestionObj.responseType
            }
          : undefined
      },
      clinicalState: {
        currentSection: historyDoc.currentSection,
        currentField: historyDoc.currentQuestionId,
        status: historyDoc.status
      },
      structuredData: historyDoc.structuredData,
      extractedData: validatedData,
      needsClarification: validationResult.needsClarification && !validationResult.isBreakLoopSafeguard,
      isCompleted,
      answerStatus: validationResult.answerStatus,
      updatedFields,
      conversationStatus: conversation.status,
      // Phase 05 extensions:
      answer: {
        answerStatus: validationResult.answerStatus,
        clarificationCount: (historyDoc.clarificationAttempts && historyDoc.clarificationAttempts[currentQuestion.questionId]) || 0,
        rawText: rawContent,
        structuredUpdate: validationResult.normalizedFacts as Record<string, unknown>
      },
      currentQuestion: {
        questionId: currentQuestion.questionId,
        field: currentQuestion.field || currentQuestion.questionId,
        section: currentQuestion.section,
        text: currentQuestion.text
      },
      nextAction,
      interviewStatus,
      missingRequiredFields: historyDoc.missingRequiredFields || [],
      completedFields: historyDoc.completedQuestions || []
    };
  }

  /**
   * Session-based entrypoint: maps sessionId to active case and executes conversation engine.
   */
  public async sendSessionMessage(
    userId: string,
    sessionId: string,
    input: SendMessageInput
  ): Promise<ConversationResponseData> {
    const session = await ClinicalSession.findOne({ sessionId });
    if (!session) {
      throw new AppError(`Clinical session with ID '${sessionId}' was not found.`, 404, 'SESSION_NOT_FOUND');
    }

    // Verify session case ownership to prevent cross-user session access
    const caseDoc = await Case.findOne({ caseId: session.caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Clinical session with ID '${sessionId}' was not found.`, 404, 'SESSION_NOT_FOUND');
    }

    return this.sendMessage(userId, session.caseId, input);
  }

  // ─── Private Helper Methods ───

  private async getOrCreateClinicalHistory(userId: string, caseDoc: any): Promise<IClinicalHistory> {
    let history = await ClinicalHistory.findOne({ caseId: caseDoc.caseId, ownerId: userId });
    if (!history) {
      const firstQ = getFirstQuestion();
      history = new ClinicalHistory({
        clinicalHistoryId: generateClinicalHistoryId(),
        caseId: caseDoc.caseId,
        sessionId: `sess-${caseDoc.caseId}`,
        patientId: caseDoc.patientId,
        ownerId: userId,
        status: 'not_started',
        currentSection: firstQ.section,
        currentQuestionId: firstQ.questionId,
        structuredData: {},
        clarificationAttempts: {},
        completedQuestions: [],
        skippedQuestions: [],
        missingRequiredFields: CLINICAL_QUESTION_CATALOG.filter((q) => q.required).map((q) => q.field || q.questionId)
      });
      await history.save();
    } else {
      if (!history.clarificationAttempts) {
        history.clarificationAttempts = {};
      }
      if (!history.completedQuestions) {
        history.completedQuestions = [];
      }
      if (!history.skippedQuestions) {
        history.skippedQuestions = [];
      }
      if (!history.missingRequiredFields) {
        history.missingRequiredFields = [];
      }
    }
    return history;
  }

  private async getOrCreateConversation(userId: string, caseDoc: any, sessionId: string): Promise<IConversation> {
    let conversation = await Conversation.findOne({ caseId: caseDoc.caseId, ownerId: userId });
    if (!conversation) {
      const firstQ = getFirstQuestion();
      const initialMessage: IConversationMessage = {
        messageId: generateMessageId(),
        role: 'assistant',
        content: firstQ.text,
        sequence: 1,
        source: 'system',
        timestamp: new Date()
      };

      conversation = new Conversation({
        conversationId: generateConversationId(),
        caseId: caseDoc.caseId,
        sessionId,
        ownerId: userId,
        status: 'active',
        startedAt: new Date(),
        messages: [initialMessage]
      });
      await conversation.save();
    }
    return conversation;
  }

  /**
   * Strips undefined/empty top-level structured data keys before sending context to Gemini
   */
  private getFilteredStructuredData(sd: IStructuredData): Record<string, unknown> {
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(sd)) {
      if (v !== undefined && v !== null) {
        if (Array.isArray(v) && v.length === 0) continue;
        if (typeof v === 'object' && Object.keys(v).length === 0) continue;
        filtered[k] = v;
      }
    }
    return filtered;
  }

  /**
   * Sanitizes and validates extractedData against approved Clinical History schema.
   * Handles explicit negative answers (e.g. "no allergies", "no medications").
   */
  private sanitizeExtractedData(
    rawExtracted: Record<string, unknown>,
    rawPatientAnswer: string
  ): Partial<IStructuredData> {
    const sanitized: Partial<IStructuredData> = {};
    const lowerAnswer = rawPatientAnswer.toLowerCase();

    // 1. Chief Complaint
    if (typeof rawExtracted.chiefComplaint === 'string' && rawExtracted.chiefComplaint.trim().length > 0) {
      sanitized.chiefComplaint = {
        text: rawExtracted.chiefComplaint.trim(),
        capturedAt: new Date(),
        source: 'conversation'
      };
    } else if (rawExtracted.chiefComplaint && typeof rawExtracted.chiefComplaint === 'object') {
      const cc = rawExtracted.chiefComplaint as Record<string, unknown>;
      const text = String(cc.text || cc.complaint || '').trim();
      if (text.length > 0) {
        sanitized.chiefComplaint = {
          text,
          capturedAt: new Date(),
          source: 'conversation'
        };
      }
    }

    // 2. HPI
    if (typeof rawExtracted.historyOfPresentIllness === 'string' && rawExtracted.historyOfPresentIllness.trim().length > 0) {
      sanitized.historyOfPresentIllness = {
        narrative: rawExtracted.historyOfPresentIllness.trim()
      };
    } else if (typeof rawExtracted.hpi === 'string' && rawExtracted.hpi.trim().length > 0) {
      sanitized.historyOfPresentIllness = {
        narrative: rawExtracted.hpi.trim()
      };
    } else if (rawExtracted.historyOfPresentIllness && typeof rawExtracted.historyOfPresentIllness === 'object') {
      const hpi = rawExtracted.historyOfPresentIllness as Record<string, unknown>;
      sanitized.historyOfPresentIllness = {
        narrative: String(hpi.narrative || rawPatientAnswer).trim(),
        onset: typeof hpi.onset === 'string' ? hpi.onset.trim() : undefined,
        progression: typeof hpi.progression === 'string' ? hpi.progression.trim() : undefined
      };
    }

    // 3. Duration
    if (typeof rawExtracted.duration === 'string') {
      sanitized.duration = { value: 1, unit: 'days' };
    } else if (rawExtracted.duration && typeof rawExtracted.duration === 'object') {
      const dur = rawExtracted.duration as Record<string, unknown>;
      const value = Number(dur.value || dur.amount || 1);
      const rawUnit = String(dur.unit || 'days').toLowerCase();
      const validUnits = ['minutes', 'hours', 'days', 'weeks', 'months', 'years', 'unknown'] as const;
      const unit = validUnits.find((u) => rawUnit.includes(u)) || 'days';
      sanitized.duration = { value: isNaN(value) ? 1 : value, unit };
    }

    // 4. Severity
    if (typeof rawExtracted.severity === 'string') {
      const sev = rawExtracted.severity.toLowerCase();
      if (['mild', 'moderate', 'severe'].includes(sev)) {
        sanitized.severity = sev as 'mild' | 'moderate' | 'severe';
      }
    }

    // 5. Symptoms
    if (Array.isArray(rawExtracted.symptoms)) {
      sanitized.symptoms = rawExtracted.symptoms
        .filter(Boolean)
        .map((s) => {
          if (typeof s === 'string' && s.trim().length > 0) {
            return { name: s.trim(), presence: true };
          }
          if (s && typeof s === 'object' && typeof s.name === 'string' && s.name.trim().length > 0) {
            return {
              name: s.name.trim(),
              presence: s.presence !== false,
              severity: ['mild', 'moderate', 'severe'].includes(s.severity) ? s.severity : undefined,
              notes: typeof s.notes === 'string' ? s.notes.trim() : undefined
            };
          }
          return null;
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
    }

    // 6. Past Medical History & explicit negatives
    if (Array.isArray(rawExtracted.pastMedicalHistory) && rawExtracted.pastMedicalHistory.length > 0) {
      sanitized.pastMedicalHistory = rawExtracted.pastMedicalHistory
        .filter(Boolean)
        .map((m) => {
          if (typeof m === 'string' && m.trim().length > 0) {
            return { condition: m.trim(), status: 'active' as const };
          }
          if (m && typeof m === 'object' && typeof m.condition === 'string' && m.condition.trim().length > 0) {
            return {
              condition: m.condition.trim(),
              status: ['active', 'resolved', 'managed'].includes(m.status) ? m.status : ('active' as const),
              notes: typeof m.notes === 'string' ? m.notes.trim() : undefined
            };
          }
          return null;
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);
    } else if (
      lowerAnswer.includes('no past medical') ||
      lowerAnswer.includes('no medical history') ||
      lowerAnswer.includes('no chronic') ||
      lowerAnswer.includes('no illness')
    ) {
      sanitized.pastMedicalHistory = [{ condition: 'None reported', status: 'resolved' }];
    }

    // 7. Past Surgical History
    if (Array.isArray(rawExtracted.pastSurgicalHistory) && rawExtracted.pastSurgicalHistory.length > 0) {
      sanitized.pastSurgicalHistory = rawExtracted.pastSurgicalHistory
        .filter((s) => s && typeof s === 'object' && typeof s.procedure === 'string' && s.procedure.trim().length > 0)
        .map((s) => ({
          procedure: s.procedure.trim(),
          approximateDate: typeof s.approximateDate === 'string' ? s.approximateDate.trim() : undefined,
          notes: typeof s.notes === 'string' ? s.notes.trim() : undefined
        }));
    } else if (
      lowerAnswer.includes('no surger') ||
      lowerAnswer.includes('no past surger') ||
      lowerAnswer.includes('never had surgery')
    ) {
      sanitized.pastSurgicalHistory = [{ procedure: 'None reported' }];
    }

    // 8. Medications & explicit negatives
    if (Array.isArray(rawExtracted.medications) && rawExtracted.medications.length > 0) {
      sanitized.medications = rawExtracted.medications
        .filter((m) => m && typeof m === 'object' && typeof m.name === 'string' && m.name.trim().length > 0)
        .map((m) => ({
          name: m.name.trim(),
          dosage: typeof m.dosage === 'string' ? m.dosage.trim() : undefined,
          frequency: typeof m.frequency === 'string' ? m.frequency.trim() : undefined,
          notes: typeof m.notes === 'string' ? m.notes.trim() : undefined
        }));
    } else if (
      lowerAnswer.includes('no medication') ||
      lowerAnswer.includes('not taking any medication') ||
      lowerAnswer.includes('no medicine') ||
      lowerAnswer.includes('none')
    ) {
      sanitized.medications = [{ name: 'None reported' }];
    }

    // 9. Allergies & explicit negatives
    if (Array.isArray(rawExtracted.allergies) && rawExtracted.allergies.length > 0) {
      sanitized.allergies = rawExtracted.allergies
        .filter(Boolean)
        .map((a) => {
          if (typeof a === 'string' && a.trim().length > 0) {
            return { allergen: a.trim() };
          }
          if (a && typeof a === 'object' && typeof (a as any).allergen === 'string' && (a as any).allergen.trim().length > 0) {
            return {
              allergen: (a as any).allergen.trim(),
              reaction: typeof (a as any).reaction === 'string' ? (a as any).reaction.trim() : undefined,
              severity: ['mild', 'moderate', 'severe'].includes((a as any).severity) ? (a as any).severity : undefined
            };
          }
          return null;
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);
    } else if (
      lowerAnswer.includes('no allerg') ||
      lowerAnswer.includes('no known allerg') ||
      lowerAnswer.includes('not allergic')
    ) {
      sanitized.allergies = [{ allergen: 'No known allergies' }];
    }

    // 10. Family History
    if (lowerAnswer.includes('no family history') || lowerAnswer.includes('no relevant family')) {
      sanitized.familyHistory = [{ relationship: 'Family', condition: 'None reported' }];
    } else if (Array.isArray(rawExtracted.familyHistory)) {
      sanitized.familyHistory = rawExtracted.familyHistory
        .filter((f) => f && typeof f === 'object' && typeof f.condition === 'string' && f.condition.trim().length > 0)
        .map((f) => ({
          relationship: typeof f.relationship === 'string' ? f.relationship.trim() : 'Family',
          condition: f.condition.trim()
        }));
    }

    // 11. Social History
    if (rawExtracted.socialHistory && typeof rawExtracted.socialHistory === 'object') {
      const sh = rawExtracted.socialHistory as Record<string, unknown>;
      sanitized.socialHistory = {
        smoking:
          typeof sh.smoking === 'string'
            ? sh.smoking.trim()
            : typeof sh.tobacco === 'string'
            ? sh.tobacco.trim()
            : undefined,
        alcohol: typeof sh.alcohol === 'string' ? sh.alcohol.trim() : undefined,
        occupation: typeof sh.occupation === 'string' ? sh.occupation.trim() : undefined,
        lifestyle: typeof sh.lifestyle === 'string' ? sh.lifestyle.trim() : undefined,
        notes: typeof sh.notes === 'string' ? sh.notes.trim() : undefined
      };
    }

    // 12. Review of Systems
    if (rawExtracted.reviewOfSystems && typeof rawExtracted.reviewOfSystems === 'object') {
      const ros = rawExtracted.reviewOfSystems as Record<string, unknown>;
      sanitized.reviewOfSystems = {
        general: typeof ros.general === 'string' ? ros.general.trim() : undefined,
        respiratory: typeof ros.respiratory === 'string' ? ros.respiratory.trim() : undefined,
        cardiovascular: typeof ros.cardiovascular === 'string' ? ros.cardiovascular.trim() : undefined,
        gastrointestinal: typeof ros.gastrointestinal === 'string' ? ros.gastrointestinal.trim() : undefined,
        neurological: typeof ros.neurological === 'string' ? ros.neurological.trim() : undefined,
        other: typeof ros.other === 'string' ? ros.other.trim() : undefined
      };
    }

    // 13. AYUSH History
    if (rawExtracted.ayushHistory && typeof rawExtracted.ayushHistory === 'object') {
      const ay = rawExtracted.ayushHistory as Record<string, unknown>;
      sanitized.ayushHistory = {
        prakriti: typeof ay.prakriti === 'string' ? ay.prakriti.trim() : undefined,
        vikriti: typeof ay.vikriti === 'string' ? ay.vikriti.trim() : undefined,
        treatmentHistory: typeof ay.treatmentHistory === 'string' ? ay.treatmentHistory.trim() : undefined,
        notes: typeof ay.notes === 'string' ? ay.notes.trim() : undefined
      };
    }

    return sanitized;
  }

  /**
   * Applies validated extracted data into structuredData.
   * Enforces Rule 6 & 10: Updates fields with latest valid patient statements when changed.
   * Cleans up negative placeholders when positive values are added, and vice-versa.
   */
  private applyStructuredUpdates(
    historyDoc: IClinicalHistory,
    update: Partial<IStructuredData>
  ): string[] {
    const sd = historyDoc.structuredData;
    const updated: string[] = [];

    // Chief Complaint: Overwrite with latest valid statement
    if (update.chiefComplaint && update.chiefComplaint.text) {
      sd.chiefComplaint = update.chiefComplaint;
      if (!updated.includes('chiefComplaint')) updated.push('chiefComplaint');
    }

    // History of Present Illness: Update / merge
    if (update.historyOfPresentIllness) {
      sd.historyOfPresentIllness = {
        ...sd.historyOfPresentIllness,
        ...update.historyOfPresentIllness
      };
      if (!updated.includes('historyOfPresentIllness')) updated.push('historyOfPresentIllness');
    }

    // Duration: Overwrite with latest valid statement
    if (update.duration) {
      sd.duration = update.duration;
      if (!updated.includes('duration')) updated.push('duration');
    }

    // Severity: Overwrite with latest valid statement
    if (update.severity) {
      sd.severity = update.severity;
      if (!updated.includes('severity')) updated.push('severity');
    }

    // Symptoms: Update and merge
    if (update.symptoms && update.symptoms.length > 0) {
      const isNegative = update.symptoms.some(
        (s) => s.name.toLowerCase() === 'none reported' || s.presence === false
      );
      if (isNegative && update.symptoms.length === 1 && update.symptoms[0].name.toLowerCase() === 'none reported') {
        sd.symptoms = update.symptoms;
      } else {
        const filteredExisting = (sd.symptoms || []).filter((s) => s.name.toLowerCase() !== 'none reported');
        for (const item of update.symptoms) {
          const idx = filteredExisting.findIndex((e) => e.name.toLowerCase() === item.name.toLowerCase());
          if (idx >= 0) {
            filteredExisting[idx] = item;
          } else {
            filteredExisting.push(item);
          }
        }
        sd.symptoms = filteredExisting;
      }
      if (!updated.includes('symptoms')) updated.push('symptoms');
    }

    // Past Medical History
    if (update.pastMedicalHistory && update.pastMedicalHistory.length > 0) {
      const isNegative = update.pastMedicalHistory.some(
        (m) => m.condition.toLowerCase().includes('none reported') || m.condition.toLowerCase().includes('no past medical')
      );
      if (isNegative) {
        sd.pastMedicalHistory = update.pastMedicalHistory;
      } else {
        const filteredExisting = (sd.pastMedicalHistory || []).filter(
          (m) => !m.condition.toLowerCase().includes('none reported') && !m.condition.toLowerCase().includes('no past medical')
        );
        for (const item of update.pastMedicalHistory) {
          if (!filteredExisting.some((e) => e.condition.toLowerCase() === item.condition.toLowerCase())) {
            filteredExisting.push(item);
          }
        }
        sd.pastMedicalHistory = filteredExisting;
      }
      if (!updated.includes('pastMedicalHistory')) updated.push('pastMedicalHistory');
    }

    // Past Surgical History
    if (update.pastSurgicalHistory && update.pastSurgicalHistory.length > 0) {
      const isNegative = update.pastSurgicalHistory.some(
        (s) => s.procedure.toLowerCase().includes('none reported') || s.procedure.toLowerCase().includes('no surgery')
      );
      if (isNegative) {
        sd.pastSurgicalHistory = update.pastSurgicalHistory;
      } else {
        const filteredExisting = (sd.pastSurgicalHistory || []).filter(
          (s) => !s.procedure.toLowerCase().includes('none reported') && !s.procedure.toLowerCase().includes('no surgery')
        );
        for (const item of update.pastSurgicalHistory) {
          if (!filteredExisting.some((e) => e.procedure.toLowerCase() === item.procedure.toLowerCase())) {
            filteredExisting.push(item);
          }
        }
        sd.pastSurgicalHistory = filteredExisting;
      }
      if (!updated.includes('pastSurgicalHistory')) updated.push('pastSurgicalHistory');
    }

    // Medications
    if (update.medications && update.medications.length > 0) {
      const isNegative = update.medications.some(
        (m) => m.name.toLowerCase().includes('none reported') || m.name.toLowerCase().includes('no medication')
      );
      if (isNegative) {
        sd.medications = update.medications;
      } else {
        const filteredExisting = (sd.medications || []).filter(
          (m) => !m.name.toLowerCase().includes('none reported') && !m.name.toLowerCase().includes('no medication')
        );
        for (const item of update.medications) {
          if (!filteredExisting.some((e) => e.name.toLowerCase() === item.name.toLowerCase())) {
            filteredExisting.push(item);
          }
        }
        sd.medications = filteredExisting;
      }
      if (!updated.includes('medications')) updated.push('medications');
    }

    // Allergies
    if (update.allergies && update.allergies.length > 0) {
      const isNegative = update.allergies.some(
        (a) => a.allergen.toLowerCase().includes('no known') || a.allergen.toLowerCase() === 'none reported'
      );
      if (isNegative) {
        sd.allergies = update.allergies;
      } else {
        const filteredExisting = (sd.allergies || []).filter(
          (a) => !a.allergen.toLowerCase().includes('no known') && a.allergen.toLowerCase() !== 'none reported'
        );
        for (const item of update.allergies) {
          if (!filteredExisting.some((e) => e.allergen.toLowerCase() === item.allergen.toLowerCase())) {
            filteredExisting.push(item);
          }
        }
        sd.allergies = filteredExisting;
      }
      if (!updated.includes('allergies')) updated.push('allergies');
    }

    // Family History
    if (update.familyHistory && update.familyHistory.length > 0) {
      const isNegative = update.familyHistory.some((f) => f.condition.toLowerCase().includes('none reported'));
      if (isNegative) {
        sd.familyHistory = update.familyHistory;
      } else {
        const filteredExisting = (sd.familyHistory || []).filter(
          (f) => !f.condition.toLowerCase().includes('none reported')
        );
        for (const item of update.familyHistory) {
          if (!filteredExisting.some((e) => e.condition.toLowerCase() === item.condition.toLowerCase())) {
            filteredExisting.push(item);
          }
        }
        sd.familyHistory = filteredExisting;
      }
      if (!updated.includes('familyHistory')) updated.push('familyHistory');
    }

    // Social History
    if (update.socialHistory) {
      sd.socialHistory = { ...sd.socialHistory, ...update.socialHistory };
      if (!updated.includes('socialHistory')) updated.push('socialHistory');
    }

    // Review of Systems
    if (update.reviewOfSystems) {
      sd.reviewOfSystems = { ...sd.reviewOfSystems, ...update.reviewOfSystems };
      if (!updated.includes('reviewOfSystems')) updated.push('reviewOfSystems');
    }

    // AYUSH History
    if (update.ayushHistory) {
      sd.ayushHistory = { ...sd.ayushHistory, ...update.ayushHistory };
      if (!updated.includes('ayushHistory')) updated.push('ayushHistory');
    }

    return updated;
  }

  /**
   * Deterministic fallback when Gemini is unavailable or returns invalid JSON.
   */
  private createDeterministicFallback(questionId: string, answerText: string): GeminiExtractionOutput {
    const trimmed = answerText.trim();
    const isGreeting = /^(hello|hi|hey|greetings|good\s+(morning|afternoon|evening)|namaste|halo|howdy)(\s+there|\s+bot|\s+doctor|\s+assistant)?[\.\?!]*$/i.test(
      trimmed
    );

    if (isGreeting) {
      return {
        answerUnderstanding: 'Patient greeted or provided pleasantry without describing clinical symptoms.',
        extractedData: {},
        targetField: questionId,
        answerStatus: 'needs_clarification',
        needsClarification: true,
        clarificationReason: 'Greeting received instead of clinical symptoms.',
        suggestedNextQuestion: 'Hello! Could you please describe what symptom or health issue you are experiencing today?'
      };
    }

    const isAmbiguous =
      trimmed.length < 3 || /^(maybe|perhaps|not sure|dunno|idk|sometime)$/i.test(trimmed);

    if (isAmbiguous) {
      return {
        answerUnderstanding: 'Answer was ambiguous or too brief.',
        extractedData: {},
        targetField: questionId,
        answerStatus: 'needs_clarification',
        needsClarification: true,
        clarificationReason: 'Insufficient detail provided.',
        suggestedNextQuestion: 'Could you please provide a little more detail about that?'
      };
    }

    const structured = mapAnswerToStructuredUpdate(questionId, answerText, 'text');
    const nextQ = getNextQuestion(questionId);

    return {
      answerUnderstanding: `Deterministic recording for ${questionId}`,
      extractedData: structured as Record<string, unknown>,
      targetField: questionId,
      answerStatus: 'answered',
      needsClarification: false,
      clarificationReason: null,
      suggestedNextQuestion: nextQ ? nextQ.text : 'Thank you for completing your intake.'
    };
  }

  /**
   * Sanitizes question text to ensure it does not prescribe or diagnose.
   */
  private sanitizeQuestionText(question: string, fallback: string): string {
    const trimmed = question.trim();
    if (!trimmed || this.containsProhibitedClaims(trimmed)) {
      return fallback;
    }
    return trimmed;
  }

  /**
   * Checks if question contains disallowed prescriptive or diagnostic assertions.
   */
  private containsProhibitedClaims(text: string): boolean {
    const lower = text.toLowerCase();
    const disallowed = [
      'you have',
      'diagnosed with',
      'i diagnose',
      'you are suffering from',
      'you should take',
      'take this medication',
      'prescribe',
      'dosage of'
    ];
    return disallowed.some((d) => lower.includes(d));
  }
}

export const clinicalConversationService = new ClinicalConversationService();
