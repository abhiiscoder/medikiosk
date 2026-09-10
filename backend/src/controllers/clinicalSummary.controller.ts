/**
 * MEDiKIOSK Backend — Phase 07 & 08: Clinical Summary Controller
 * Express HTTP handlers for generating, retrieving, reviewing, and editing clinical summaries.
 */

import { Request, Response, NextFunction } from 'express';
import { clinicalSummaryService } from '../services/clinicalSummary.service.js';
import { summaryPdfService } from '../services/summaryPdf.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * POST /api/v1/cases/:caseId/summary/generate
 * Synthesizes validated case data and documents into a structured clinical summary.
 */
export async function generateSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;

    const summary = await clinicalSummaryService.generateSummary(userId, caseId, req.body);

    sendSuccess(res, summary.toJSON(), 'Clinical summary generated successfully.', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/cases/:caseId/summary
 * Retrieves the clinical summary for an owned Case.
 */
export async function getSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;

    const summary = await clinicalSummaryService.getSummary(userId, caseId);

    sendSuccess(res, summary.toJSON(), 'Clinical summary retrieved successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/cases/:caseId/summary/review
 * Marks a clinical summary as reviewed by the clinician (Phase 08).
 */
export async function reviewSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;
    const { notes } = req.body || {};

    const summary = await clinicalSummaryService.reviewSummary(userId, caseId, notes);

    sendSuccess(res, summary.toJSON(), 'Clinical summary reviewed successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/cases/:caseId/summary
 * Applies schema-validated edits to a summary, updating version and revision history (Phase 08).
 */
export async function editSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;

    const summary = await clinicalSummaryService.editSummary(userId, caseId, req.body);

    sendSuccess(res, summary.toJSON(), 'Clinical summary updated successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/cases/:caseId/summary/confirm
 * Confirms the clinical summary, saves the final state, and completes the case (Phase 09).
 */
export async function confirmSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;

    const result = await clinicalSummaryService.confirmSummary(userId, caseId, req.body);

    sendSuccess(res, result, 'Clinical summary confirmed and case completed successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/cases/:caseId/summary/pdf
 * Generates and downloads the official PDF for a confirmed clinical summary.
 */
export async function downloadSummaryPdfHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;

    const { pdfBuffer, filename } = await summaryPdfService.generateConfirmedSummaryPdf(userId, caseId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

