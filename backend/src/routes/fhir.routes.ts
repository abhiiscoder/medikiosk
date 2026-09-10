/**
 * MEDiKIOSK Backend — Phase 10: FHIR Routes
 * REST routes for exporting Case clinical data as FHIR R4 resources.
 */

import { Router } from 'express';
import { getCaseFhirBundleHandler } from '../controllers/fhir.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// All FHIR endpoints require authenticated clinician context
router.use(requireAuth);

// GET /api/v1/cases/:caseId/fhir (Primary FHIR export endpoint)
router.get('/', getCaseFhirBundleHandler);

// GET /api/v1/cases/:caseId/fhir/bundle (Explicit alias for bundle export)
router.get('/bundle', getCaseFhirBundleHandler);

export default router;
