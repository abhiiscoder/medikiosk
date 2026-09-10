/**
 * MEDiKIOSK Backend — Phase 04: Clinical Session Routes
 * REST routes for session-based clinical conversation endpoints.
 */

import { Router } from 'express';
import { sendSessionMessageHandler } from '../controllers/conversation.controller.js';
import { postMessageSchema } from '../validators/conversation.validator.js';
import { validateRequest } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Requires clinician authentication context
router.use(requireAuth);

// POST /api/v1/clinical-sessions/:sessionId/messages
router.post('/:sessionId/messages', validateRequest(postMessageSchema), sendSessionMessageHandler);

export default router;
