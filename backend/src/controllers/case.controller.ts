/**
 * MEDiKIOSK Backend — Phase 02: Case & Session Controllers
 * HTTP request handlers for case creation, retrieval, updates, and sessions.
 */

import { Request, Response, NextFunction } from 'express';
import { caseService } from '../services/case.service.js';
import { sendSuccess } from '../utils/response.js';

export async function createCaseHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await caseService.createCase(userId, req.body);
    sendSuccess(res, result, `Authoritative clinical case ${result.caseId} initialized successfully.`, 201);
  } catch (error) {
    next(error);
  }
}

export async function getCaseHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;
    const result = await caseService.getCaseById(userId, caseId);
    sendSuccess(res, result, `Case ${caseId} retrieved.`);
  } catch (error) {
    next(error);
  }
}

export async function getActiveCaseHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await caseService.getActiveCase(userId);
    sendSuccess(res, result, result ? 'Active case session retrieved.' : 'No active case found.');
  } catch (error) {
    next(error);
  }
}

export async function listCasesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { status, workflowStage, page, limit } = req.query as Record<string, string | undefined>;
    const result = await caseService.listCases(userId, {
      status,
      workflowStage,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined
    });
    sendSuccess(res, result, 'Cases retrieved successfully.');
  } catch (error) {
    next(error);
  }
}

export async function updateCaseHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;
    const result = await caseService.updateCase(userId, caseId, req.body);
    sendSuccess(res, result, `Case ${caseId} workflow state updated.`);
  } catch (error) {
    next(error);
  }
}

export async function createSessionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;
    const session = await caseService.createSession(userId, caseId);
    sendSuccess(res, session, `Clinical session ${session.sessionId} started for case ${caseId}.`, 201);
  } catch (error) {
    next(error);
  }
}

export async function listSessionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;
    const sessions = await caseService.listSessions(userId, caseId);
    sendSuccess(res, sessions, `Sessions for case ${caseId} retrieved.`);
  } catch (error) {
    next(error);
  }
}
