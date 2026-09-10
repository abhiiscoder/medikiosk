/**
 * MEDiKIOSK Backend — Phase 03: Clinical History Service
 * Manages structured clinical anamnesis state, answer ingestion, and deterministic
 * question→structuredData mapping across all 13 sections.
 */

import { ClinicalHistory, IClinicalHistory, IStructuredData } from '../models/clinicalHistory.model.js';
import { Answer } from '../models/answer.model.js';
import { Conversation, IConversationMessage } from '../models/conversation.model.js';
import { Case } from '../models/case.model.js';
import {
  getQuestionById,
  getNextQuestion,
  getFirstQuestion,
  isIntakeComplete,
  mapAnswerToStructuredUpdate,
  IStaticQuestion
} from '../utils/clinicalQuestions.js';
import {
  generateClinicalHistoryId,
  generateAnswerId,
  generateMessageId,
  generateConversationId
} from '../utils/idGenerator.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export interface SubmitAnswerInput {
  sessionId: string;
  questionId: string;
  value: unknown;
  source?: 'text' | 'voice' | 'selection' | 'system';
  messageContent?: string;
}

export interface SubmitAnswerResult {
  answerId: string;
  clinicalHistoryId: string;
  updatedState: IStructuredData;
  nextQuestion: IStaticQuestion | null;
}

class ClinicalHistoryService {
  /**
   * Retrieves or lazily creates initialized ClinicalHistory record for an owned case
   */
  async getOrCreateClinicalHistory(userId: string, caseId: string): Promise<IClinicalHistory> {
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    let historyDoc = await ClinicalHistory.findOne({ caseId, ownerId: userId });

    if (!historyDoc) {
      const firstQuestion = getFirstQuestion();
      historyDoc = new ClinicalHistory({
        clinicalHistoryId: generateClinicalHistoryId(),
        caseId: caseDoc.caseId,
        sessionId: `sess-init-${caseDoc.caseId}`,
        patientId: caseDoc.patientId,
        ownerId: userId,
        status: 'not_started',
        currentSection: firstQuestion.section,
        currentQuestionId: firstQuestion.questionId,
        structuredData: {}
      });

      await historyDoc.save();
      logger.info('Initialized clinical history record', { caseId, clinicalHistoryId: historyDoc.clinicalHistoryId });
    }

    return historyDoc;
  }

  /**
   * Directly updates structuredData fields for an owned case (PATCH endpoint)
   */
  async updateClinicalHistory(
    userId: string,
    caseId: string,
    updates: Partial<IStructuredData>
  ): Promise<IClinicalHistory> {
    const historyDoc = await this.getOrCreateClinicalHistory(userId, caseId);

    // Non-destructive merge into structuredData
    if (updates.chiefComplaint !== undefined) {
      historyDoc.structuredData.chiefComplaint = updates.chiefComplaint;
    }
    if (updates.historyOfPresentIllness !== undefined) {
      historyDoc.structuredData.historyOfPresentIllness = {
        ...historyDoc.structuredData.historyOfPresentIllness,
        ...updates.historyOfPresentIllness
      };
    }
    if (updates.duration !== undefined) historyDoc.structuredData.duration = updates.duration;
    if (updates.severity !== undefined) historyDoc.structuredData.severity = updates.severity;
    if (updates.symptoms !== undefined) historyDoc.structuredData.symptoms = updates.symptoms;
    if (updates.pastMedicalHistory !== undefined) historyDoc.structuredData.pastMedicalHistory = updates.pastMedicalHistory;
    if (updates.pastSurgicalHistory !== undefined) historyDoc.structuredData.pastSurgicalHistory = updates.pastSurgicalHistory;
    if (updates.medications !== undefined) historyDoc.structuredData.medications = updates.medications;
    if (updates.allergies !== undefined) historyDoc.structuredData.allergies = updates.allergies;
    if (updates.familyHistory !== undefined) historyDoc.structuredData.familyHistory = updates.familyHistory;
    if (updates.socialHistory !== undefined) {
      historyDoc.structuredData.socialHistory = {
        ...historyDoc.structuredData.socialHistory,
        ...updates.socialHistory
      };
    }
    if (updates.reviewOfSystems !== undefined) {
      historyDoc.structuredData.reviewOfSystems = {
        ...historyDoc.structuredData.reviewOfSystems,
        ...updates.reviewOfSystems
      };
    }
    if (updates.ayushHistory !== undefined) {
      historyDoc.structuredData.ayushHistory = {
        ...historyDoc.structuredData.ayushHistory,
        ...updates.ayushHistory
      };
    }

    historyDoc.markModified('structuredData');
    await historyDoc.save();
    logger.info('Updated clinical history record (direct)', { caseId });

    return historyDoc;
  }

  /**
   * Core answer ingestion pipeline:
   * 1. Validates caseId, sessionId, questionId, and ownership
   * 2. Creates and saves Answer document
   * 3. Appends sequence-ordered Message to conversation
   * 4. Updates only the relevant structuredData fields (non-destructive)
   * 5. Updates currentSection, currentQuestionId, and status
   * 6. Determines nextQuestion deterministically
   * 7. Marks status='completed' when all required questions are answered
   */
  async submitAnswer(
    userId: string,
    caseId: string,
    input: SubmitAnswerInput
  ): Promise<SubmitAnswerResult> {
    // 1. Validate ownership
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    // Validate question
    const question = getQuestionById(input.questionId);
    if (!question) {
      throw new AppError(`Question '${input.questionId}' not found in catalog.`, 400, 'INVALID_QUESTION');
    }

    // 2. Ensure ClinicalHistory + Conversation exist
    const historyDoc = await this.getOrCreateClinicalHistory(userId, caseId);
    const conversation = await this.getOrCreateConversation(userId, caseId, historyDoc.sessionId);

    const source = input.source || 'text';

    // 3. Create Answer document
    const answerId = generateAnswerId();
    const answerDoc = new Answer({
      answerId,
      questionId: input.questionId,
      conversationId: conversation.conversationId,
      caseId,
      sessionId: input.sessionId || historyDoc.sessionId,
      value: input.value,
      normalizedValue: input.value,
      answerStatus: 'answered',
      source,
      answeredAt: new Date()
    });
    await answerDoc.save();

    // 4. Append messages to conversation (user answer + optional assistant follow-up)
    const currentSequence = conversation.messages.length;

    const userMessage: IConversationMessage = {
      messageId: generateMessageId(),
      role: 'user',
      content: input.messageContent || String(input.value),
      sequence: currentSequence + 1,
      source,
      timestamp: new Date()
    };
    conversation.messages.push(userMessage);

    // 5. Map answer to structured clinical state (non-destructive)
    const structuredUpdate = mapAnswerToStructuredUpdate(input.questionId, input.value, source);
    this.applyStructuredUpdate(historyDoc, structuredUpdate);

    // 6. Determine next question
    const nextQuestion = getNextQuestion(input.questionId);

    // Update currentSection and currentQuestionId
    if (nextQuestion) {
      historyDoc.currentSection = nextQuestion.section;
      historyDoc.currentQuestionId = nextQuestion.questionId;
      historyDoc.status = 'in_progress';

      // Add assistant message for next question
      const assistantMessage: IConversationMessage = {
        messageId: generateMessageId(),
        role: 'assistant',
        content: nextQuestion.text,
        sequence: currentSequence + 2,
        source: 'system',
        timestamp: new Date()
      };
      conversation.messages.push(assistantMessage);
    }

    // 7. Check intake completion
    const allAnswers = await Answer.find({ caseId, conversationId: conversation.conversationId });
    const answeredIds = allAnswers.map((a) => a.questionId);
    if (!answeredIds.includes(input.questionId)) {
      answeredIds.push(input.questionId);
    }

    if (isIntakeComplete(answeredIds)) {
      historyDoc.status = 'completed';
      historyDoc.currentQuestionId = undefined;
      conversation.status = 'completed';
      conversation.endedAt = new Date();

      // Add completion message
      const completionMessage: IConversationMessage = {
        messageId: generateMessageId(),
        role: 'assistant',
        content: 'Thank you. Your clinical history has been recorded and synthesized for physician review.',
        sequence: conversation.messages.length + 1,
        source: 'system',
        timestamp: new Date()
      };
      conversation.messages.push(completionMessage);
    }

    // Persist all changes
    historyDoc.markModified('structuredData');
    await historyDoc.save();
    await conversation.save();

    logger.info('Processed answer and updated clinical state', {
      caseId,
      answerId,
      questionId: input.questionId,
      status: historyDoc.status
    });

    return {
      answerId,
      clinicalHistoryId: historyDoc.clinicalHistoryId,
      updatedState: historyDoc.structuredData,
      nextQuestion
    };
  }

  /**
   * Non-destructively applies a structured data update to the clinical history.
   * Does not overwrite existing populated fields — only fills in missing data.
   */
  private applyStructuredUpdate(historyDoc: IClinicalHistory, update: Partial<IStructuredData>): void {
    const sd = historyDoc.structuredData;

    if (update.chiefComplaint && (!sd.chiefComplaint || !sd.chiefComplaint.text)) {
      sd.chiefComplaint = update.chiefComplaint;
    }
    if (update.historyOfPresentIllness) {
      sd.historyOfPresentIllness = {
        ...sd.historyOfPresentIllness,
        ...update.historyOfPresentIllness
      };
    }
    if (update.duration && !sd.duration) {
      sd.duration = update.duration;
    }
    if (update.severity && !sd.severity) {
      sd.severity = update.severity;
    }
    if (update.symptoms && update.symptoms.length > 0) {
      const existing = sd.symptoms || [];
      for (const newSym of update.symptoms) {
        const alreadyExists = existing.some(
          (s) => s.name.toLowerCase() === newSym.name.toLowerCase()
        );
        if (!alreadyExists) {
          existing.push(newSym);
        }
      }
      sd.symptoms = existing;
    }
    if (update.pastMedicalHistory && update.pastMedicalHistory.length > 0) {
      sd.pastMedicalHistory = [...(sd.pastMedicalHistory || []), ...update.pastMedicalHistory];
    }
    if (update.pastSurgicalHistory && update.pastSurgicalHistory.length > 0) {
      sd.pastSurgicalHistory = [...(sd.pastSurgicalHistory || []), ...update.pastSurgicalHistory];
    }
    if (update.medications && update.medications.length > 0) {
      sd.medications = [...(sd.medications || []), ...update.medications];
    }
    if (update.allergies && update.allergies.length > 0) {
      sd.allergies = [...(sd.allergies || []), ...update.allergies];
    }
    if (update.familyHistory && update.familyHistory.length > 0) {
      sd.familyHistory = [...(sd.familyHistory || []), ...update.familyHistory];
    }
    if (update.socialHistory) {
      sd.socialHistory = { ...sd.socialHistory, ...update.socialHistory };
    }
    if (update.reviewOfSystems) {
      sd.reviewOfSystems = { ...sd.reviewOfSystems, ...update.reviewOfSystems };
    }
    if (update.ayushHistory) {
      sd.ayushHistory = { ...sd.ayushHistory, ...update.ayushHistory };
    }
  }

  /**
   * Retrieves or lazily creates a Conversation document for the case.
   */
  private async getOrCreateConversation(userId: string, caseId: string, sessionId: string) {
    let conversation = await Conversation.findOne({ caseId, ownerId: userId });

    if (!conversation) {
      const firstQuestion = getFirstQuestion();

      const initialMessage: IConversationMessage = {
        messageId: generateMessageId(),
        role: 'assistant',
        content: firstQuestion.text,
        sequence: 1,
        source: 'system',
        timestamp: new Date()
      };

      conversation = new Conversation({
        conversationId: generateConversationId(),
        caseId,
        sessionId,
        ownerId: userId,
        status: 'active',
        startedAt: new Date(),
        messages: [initialMessage]
      });

      await conversation.save();
      logger.info('Initialized conversation for case', { caseId, conversationId: conversation.conversationId });
    }

    return conversation;
  }
}

export const clinicalHistoryService = new ClinicalHistoryService();
