/**
 * MEDiKIOSK Backend — Phase 10: FHIR Controller
 * Handles HTTP requests for FHIR R4 Bundle export.
 * Returns direct standard FHIR JSON conforming to the HL7 FHIR R4 specification.
 */

import { Request, Response, NextFunction } from 'express';
import { fhirService } from '../services/fhir.service.js';

/**
 * GET /api/v1/cases/:caseId/fhir
 * GET /api/v1/cases/:caseId/fhir/bundle
 * Returns the FHIR R4 Bundle for an owned, confirmed clinical case.
 */
export async function getCaseFhirBundleHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { caseId } = req.params;

    const fhirBundle = await fhirService.getCaseFhirBundle(userId, caseId);

    // Return direct standard FHIR JSON without proprietary envelope
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json(fhirBundle);
  } catch (error) {
    next(error);
  }
}
