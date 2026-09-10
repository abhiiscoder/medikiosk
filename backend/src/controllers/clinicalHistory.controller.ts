/**
 * MEDiKIOSK Backend — Phase 03: Clinical History Controller
 * HTTP request handlers for structured clinical anamnesis, answer submission, and question catalog.
 */

import { Request, Response, NextFunction } from 'express';
import { clinicalHistoryService } from '../services/clinicalHistory.service.js';
import { getQuestionsBySection } from '../utils/clinicalQuestions.js';
import { sendSuccess } from '../utils/response.js';

/**
 * GET /api/v1/cases/:caseId/clinical-history
 * Retrieves or initializes clinical history for a case
 */
export async function getClinicalHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;

    const history = await clinicalHistoryService.getOrCreateClinicalHistory(userId, caseId);
    sendSuccess(res, history, 'Clinical history retrieved successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/cases/:caseId/clinical-history
 * Directly updates structured clinical data fields
 */
export async function updateClinicalHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;

    const updated = await clinicalHistoryService.updateClinicalHistory(userId, caseId, req.body);
    sendSuccess(res, updated, 'Clinical history updated successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/cases/:caseId/clinical-history/answers
 * Ingests a structured answer, maps it to clinical state, and returns the next question
 */
export async function submitAnswerHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;

    const result = await clinicalHistoryService.submitAnswer(userId, caseId, req.body);
    sendSuccess(res, result, 'Answer recorded and clinical state updated.', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/clinical-history/questions[?section=...]
 * Returns the question catalog, optionally filtered by section
 */
export async function getQuestionsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const section = req.query.section as string | undefined;
    const questions = getQuestionsBySection(section);
    sendSuccess(res, questions, 'Clinical questions retrieved successfully.');
  } catch (error) {
    next(error);
  }
}
