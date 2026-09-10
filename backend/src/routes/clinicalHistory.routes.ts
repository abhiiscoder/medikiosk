/**
 * MEDiKIOSK Backend — Phase 03: Clinical History Routes
 * REST routes for reading, patching clinical anamnesis state, submitting answers,
 * and retrieving conversation history.
 */

import { Router } from 'express';
import {
  getClinicalHistoryHandler,
  updateClinicalHistoryHandler,
  submitAnswerHandler
} from '../controllers/clinicalHistory.controller.js';
import {
  getConversationHandler
} from '../controllers/conversation.controller.js';
import {
  updateClinicalHistorySchema,
  postAnswerMasterSchema
} from '../validators/clinicalHistory.validator.js';
import { validateRequest } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// All clinical history endpoints require clinician ownership context
router.use(requireAuth);

// GET  /api/v1/cases/:caseId/clinical-history
router.get('/', getClinicalHistoryHandler);

// PATCH /api/v1/cases/:caseId/clinical-history
router.patch('/', validateRequest(updateClinicalHistorySchema), updateClinicalHistoryHandler);

// POST /api/v1/cases/:caseId/clinical-history/answers
router.post('/answers', validateRequest(postAnswerMasterSchema), submitAnswerHandler);

// GET  /api/v1/cases/:caseId/clinical-history/conversation
router.get('/conversation', getConversationHandler);

export default router;
