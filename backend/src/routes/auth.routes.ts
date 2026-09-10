/**
 * MEDiKIOSK Backend — Phase R3: Authentication Routes
 * Endpoints for user registration, credential login, mobile recovery, and session verification.
 */

import { Router } from 'express';
import {
  loginHandler,
  registerHandler,
  findByMobileHandler,
  getSessionHandler,
  logoutHandler
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Public auth endpoints
router.post('/login', loginHandler);
router.post('/register', registerHandler);
router.post('/find-by-mobile', findByMobileHandler);
router.post('/logout', logoutHandler);

// Protected session check
router.get('/session', requireAuth, getSessionHandler);

export default router;
