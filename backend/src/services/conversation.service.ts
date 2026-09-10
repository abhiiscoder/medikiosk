/**
 * MEDiKIOSK Backend — Phase 03: Conversation Service
 * Manages conversational clinical intake — retrieval, messaging, and conversation state.
 * Answer processing is delegated to ClinicalHistoryService.submitAnswer().
 */

import { Conversation, IConversation } from '../models/conversation.model.js';
import { Case } from '../models/case.model.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

class ConversationService {
  /**
   * Retrieves conversation for an owned case (lazily creates initial state if not found)
   */
  async getConversation(userId: string, caseId: string): Promise<IConversation> {
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    const conversation = await Conversation.findOne({ caseId, ownerId: userId });
    if (!conversation) {
      throw new AppError(`No conversation found for case '${caseId}'.`, 404, 'CONVERSATION_NOT_FOUND');
    }

    return conversation;
  }

  /**
   * Resets conversation history for a case
   */
  async resetConversation(userId: string, caseId: string): Promise<void> {
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    await Conversation.deleteOne({ caseId, ownerId: userId });
    logger.info('Conversation reset for case', { caseId });
  }
}

export const conversationService = new ConversationService();
