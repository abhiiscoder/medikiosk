/**
 * MEDiKIOSK Backend — Phase 03: Conversation Routes
 * REST routes for conversation retrieval and reset (alias path).
 */

import { Router } from 'express';
import {
  getConversationHandler,
  resetConversationHandler,
  sendMessageHandler
} from '../controllers/conversation.controller.js';
import { submitAnswerHandler } from '../controllers/clinicalHistory.controller.js';
import { postMessageSchema } from '../validators/conversation.validator.js';
import { validateRequest } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// All conversation endpoints require clinician ownership context
router.use(requireAuth);

// GET  /api/v1/cases/:caseId/conversation
router.get('/', getConversationHandler);

// POST /api/v1/cases/:caseId/conversation/messages
router.post('/messages', validateRequest(postMessageSchema), sendMessageHandler);

// POST /api/v1/cases/:caseId/conversation/answers (convenience alias to clinical-history answer ingestion)
router.post('/answers', submitAnswerHandler);

// POST /api/v1/cases/:caseId/conversation/reset
router.post('/reset', resetConversationHandler);

export default router;

