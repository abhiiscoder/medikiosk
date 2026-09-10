/**
 * MEDiKIOSK Backend — Phase 01+03: API v1 Router Aggregator
 * Root router for versioned /api/v1 endpoints.
 */

import { Router } from 'express';
import healthRoutes from './health.routes.js';
import caseRoutes from './case.routes.js';
import aiRoutes from './ai.routes.js';
import sessionRoutes from './session.routes.js';
import authRoutes from './auth.routes.js';
import { getQuestionsHandler } from '../controllers/clinicalHistory.controller.js';
import { validateRequest } from '../middleware/validate.js';
import { queryQuestionsSchema } from '../validators/clinicalHistory.validator.js';
import { sendSuccess } from '../utils/response.js';

const apiV1Router = Router();

// Version 1 Base Information
apiV1Router.get('/', (req, res) => {
  sendSuccess(res, {
    name: 'MEDiKIOSK Authoritative API',
    version: 'v1',
    status: 'active',
    documentation: '/api/v1/health'
  }, 'MEDiKIOSK API v1 Foundation');
});

// Mount Module Routes
apiV1Router.use('/auth', authRoutes);
apiV1Router.use('/health', healthRoutes);
apiV1Router.use('/cases', caseRoutes);
apiV1Router.use('/ai', aiRoutes);
apiV1Router.use('/clinical-sessions', sessionRoutes);



// Top-level clinical history questions endpoint (no case context needed)
apiV1Router.get('/clinical-history/questions', validateRequest(queryQuestionsSchema), getQuestionsHandler);

export default apiV1Router;

