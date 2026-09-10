/**
 * MEDiKIOSK Backend — Phase 03: Conversation Controller
 * HTTP handlers for conversation retrieval and reset.
 * Answer processing is centralized in clinicalHistory.controller.ts → submitAnswerHandler.
 */

import { Request, Response, NextFunction } from 'express';
import { conversationService } from '../services/conversation.service.js';
import { clinicalConversationService } from '../services/clinicalConversation.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * GET /api/v1/cases/:caseId/clinical-history/conversation
 * GET /api/v1/cases/:caseId/conversation (alias)
 * Retrieves conversation for a case
 */
export async function getConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;

    const conversation = await conversationService.getConversation(userId, caseId);
    sendSuccess(res, conversation, 'Conversation retrieved successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/cases/:caseId/conversation/reset
 * Resets conversation for a case
 */
export async function resetConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;

    await conversationService.resetConversation(userId, caseId);
    sendSuccess(res, null, 'Conversation reset successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/cases/:caseId/conversation/messages
 * Ingests a conversational patient response and drives the LLM anamnesis engine
 */
export async function sendMessageHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;

    const result = await clinicalConversationService.sendMessage(userId, caseId, req.body);
    sendSuccess(res, result, 'Message processed and clinical state updated.', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/clinical-sessions/:sessionId/messages
 * Session-based message entrypoint for clinical encounters
 */
export async function sendSessionMessageHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;

    const result = await clinicalConversationService.sendSessionMessage(userId, sessionId, req.body);
    sendSuccess(res, result, 'Message processed and clinical state updated.', 200);
  } catch (error) {
    next(error);
  }
}

