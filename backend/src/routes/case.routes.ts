/**
 * MEDiKIOSK Backend — Phase 02: Case & Clinical Session Routes
 * Defines authoritative REST endpoints for Case and Session lifecycles.
 */

import { Router } from 'express';
import {
  createCaseHandler,
  getCaseHandler,
  getActiveCaseHandler,
  listCasesHandler,
  updateCaseHandler,
  createSessionHandler,
  listSessionsHandler
} from '../controllers/case.controller.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createCaseSchema,
  updateCaseSchema,
  queryCasesSchema,
  createSessionSchema
} from '../validators/case.validator.js';
import { requireAuth } from '../middleware/auth.js';

import clinicalHistoryRoutes from './clinicalHistory.routes.js';
import conversationRoutes from './conversation.routes.js';
import documentRoutes from './document.routes.js';
import clinicalSummaryRoutes from './clinicalSummary.routes.js';
import fhirRoutes from './fhir.routes.js';

const router = Router();

// Ensure active user context exists
router.use(requireAuth);

// 1. Case Lifecycle Endpoints
router.post('/', validateRequest(createCaseSchema), createCaseHandler);
router.get('/', validateRequest(queryCasesSchema), listCasesHandler);
router.get('/active', getActiveCaseHandler);
router.get('/:caseId', getCaseHandler);
router.patch('/:caseId', validateRequest(updateCaseSchema), updateCaseHandler);

// 2. Clinical Session Endpoints
router.post('/:caseId/sessions', validateRequest(createSessionSchema), createSessionHandler);
router.get('/:caseId/sessions', listSessionsHandler);

// 3. Clinical History Anamnesis Endpoints (Phase 03)
router.use('/:caseId/clinical-history', clinicalHistoryRoutes);

// 4. Clinical Conversation Endpoints (Phase 03)
router.use('/:caseId/conversation', conversationRoutes);

// 5. Medical Document Endpoints (Phase 05 & Phase 06)
router.use('/:caseId/documents', documentRoutes);
router.use('/:caseId/medical-documents', documentRoutes);

// 6. Clinical Summary Endpoints (Phase 07 & Phase 08)
router.use('/:caseId/summary', clinicalSummaryRoutes);

// 7. FHIR R4 Interoperability Endpoints (Phase 10)
router.use('/:caseId/fhir', fhirRoutes);

export default router;
