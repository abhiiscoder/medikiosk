/**
 * MEDiKIOSK Backend — Foundation 03: AI Routes
 * Exposes AI diagnostic endpoints.
 */

import { Router } from 'express';
import { getAiHealth } from '../controllers/ai.controller.js';

const router = Router();

// GET /api/v1/ai/health
router.get('/health', getAiHealth);

export default router;
