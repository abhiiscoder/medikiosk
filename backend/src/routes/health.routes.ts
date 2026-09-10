/**
 * MEDiKIOSK Backend — Phase 01: Health Routes
 * Exposes /health endpoint for reachability and monitoring.
 */

import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

router.get('/', getHealth);

export default router;
