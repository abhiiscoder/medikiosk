/**
 * MEDiKIOSK Backend — Phase 10: FHIR Service Layer
 * Orchestrates loading validated internal clinical data, delegating to isolated
 * FHIR mappers, enforcing strict schema validation, and assembling a FHIR R4 Bundle.
 *
 * CRITICAL SAFETY & ARCHITECTURAL RULES:
 * 1. FHIR is an output representation; internal MongoDB schemas remain authoritative.
 * 2. Only confirmed cases/summaries can be exported to FHIR.
 * 3. Never map raw LLM output to FHIR; strictly map verified database records.
 * 4. Zero data invention: missing fields in source are omitted in FHIR.
 */

import { Case } from '../models/case.model.js';
import { Patient } from '../models/patient.model.js';
import { ClinicalSession } from '../models/session.model.js';
import { ClinicalHistory } from '../models/clinicalHistory.model.js';
import { ClinicalSummary } from '../models/clinicalSummary.model.js';
import { MedicalDocument } from '../models/document.model.js';
import { FhirBundle, FhirResource } from '../fhir/types.js';
import { mapPatientToFhir } from '../fhir/mappers/patient.mapper.js';
import { mapEncounterToFhir } from '../fhir/mappers/encounter.mapper.js';
import { mapObservationsToFhir } from '../fhir/mappers/observation.mapper.js';
import { mapMedicationsToFhir } from '../fhir/mappers/medication.mapper.js';
import { mapAllergiesToFhir } from '../fhir/mappers/allergy.mapper.js';
import { createFhirBundle } from '../fhir/mappers/bundle.mapper.js';
import { fhirBundleSchema } from '../fhir/validators/fhir.validator.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export class FhirService {
  /**
   * Generates a validated FHIR R4 Bundle for an owned, confirmed Case.
   */
  public async getCaseFhirBundle(userId: string, caseId: string): Promise<FhirBundle> {
    // 1. Verify case ownership
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    // 2. Find clinical summary and verify confirmed status
    const summary = await ClinicalSummary.findOne({ caseId, generatedBy: userId });
    if (!summary) {
      throw new AppError(`Clinical summary for case '${caseId}' was not found.`, 404, 'SUMMARY_NOT_FOUND');
    }

    if (summary.status !== 'confirmed' && caseDoc.status !== 'completed') {
      throw new AppError(
        `Cannot export FHIR for case '${caseId}'. Clinical summary has not been confirmed yet.`,
        400,
        'SUMMARY_NOT_CONFIRMED'
      );
    }

    // 3. Load authoritative Patient
    const patientDoc = await Patient.findOne({ patientId: caseDoc.patientId });
    if (!patientDoc) {
      throw new AppError(`Patient record for case '${caseId}' was not found.`, 404, 'PATIENT_NOT_FOUND');
    }

    // 4. Load Clinical Session, Clinical History, and Validated Documents
    const [sessionDoc, historyDoc, documents] = await Promise.all([
      ClinicalSession.findOne({ caseId }).sort({ startedAt: -1 }),
      ClinicalHistory.findOne({ caseId }),
      MedicalDocument.find({ caseId, isClinicalDocument: true, validationStatus: 'validated' })
    ]);

    // 5. Delegate to isolated mappers
    const patientResource = mapPatientToFhir(patientDoc);
    const encounterResource = mapEncounterToFhir(caseDoc, patientDoc, sessionDoc);
    const observationResources = mapObservationsToFhir(caseDoc, patientDoc, historyDoc, summary, documents);
    const medicationResources = mapMedicationsToFhir(caseDoc, patientDoc, historyDoc, summary);
    const allergyResources = mapAllergiesToFhir(caseDoc, patientDoc, historyDoc, summary);

    const allResources: FhirResource[] = [
      patientResource,
      encounterResource,
      ...observationResources,
      ...medicationResources,
      ...allergyResources
    ];

    // 6. Assemble into FHIR R4 Collection Bundle
    const rawBundle = createFhirBundle(caseDoc, allResources);

    // 7. Validate generated Bundle schema
    const validatedBundle = fhirBundleSchema.parse(rawBundle) as FhirBundle;

    // 8. Safe operational logging (no PHI or medical data)
    logger.info('Generated validated FHIR R4 Bundle for case', {
      caseId,
      resourceCount: validatedBundle.total
    });

    return validatedBundle;
  }
}

export const fhirService = new FhirService();
