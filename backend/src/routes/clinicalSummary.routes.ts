/**
 * MEDiKIOSK Backend — Phase 07 & 08: Clinical Summary Routes
 * REST routes for clinical summary generation, retrieval, review, and editing.
 */

import { Router } from 'express';
import {
  generateSummaryHandler,
  getSummaryHandler,
  reviewSummaryHandler,
  editSummaryHandler,
  confirmSummaryHandler,
  downloadSummaryPdfHandler
} from '../controllers/clinicalSummary.controller.js';
import { validateRequest } from '../middleware/validate.js';
import {
  generateSummarySchema,
  reviewSummarySchema,
  editSummarySchema,
  confirmSummarySchema
} from '../validators/clinicalSummary.validator.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// All summary operations require clinician context
router.use(requireAuth);

// POST /api/v1/cases/:caseId/summary/generate (Generate clinical summary)
router.post('/generate', validateRequest(generateSummarySchema), generateSummaryHandler);

// GET /api/v1/cases/:caseId/summary (Get current clinical summary)
router.get('/', getSummaryHandler);

// POST /api/v1/cases/:caseId/summary/review (Review summary - Phase 08)
router.post('/review', validateRequest(reviewSummarySchema), reviewSummaryHandler);

// PATCH /api/v1/cases/:caseId/summary (Edit summary - Phase 08)
router.patch('/', validateRequest(editSummarySchema), editSummaryHandler);

// POST /api/v1/cases/:caseId/summary/confirm (Confirm & save summary - Phase 09)
router.post('/confirm', validateRequest(confirmSummarySchema), confirmSummaryHandler);

// GET /api/v1/cases/:caseId/summary/pdf (Download official PDF for confirmed summary - Phase R2)
router.get('/pdf', downloadSummaryPdfHandler);

export default router;
