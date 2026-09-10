/**
 * MEDiKIOSK Backend — Phase 10: Encounter FHIR Mapper
 * Maps MEDiKIOSK Case and Clinical Session to FHIR R4 Encounter resource.
 */

import { ICase } from '../../models/case.model.js';
import { IPatient } from '../../models/patient.model.js';
import { IClinicalSession } from '../../models/session.model.js';
import { FhirEncounter, FhirEncounterStatus } from '../types.js';

export function mapEncounterToFhir(
  caseDoc: ICase,
  patient: IPatient,
  session?: IClinicalSession | null
): FhirEncounter {
  // Map internal case status to FHIR R4 encounter status
  let fhirStatus: FhirEncounterStatus = 'in-progress';
  if (caseDoc.status === 'completed') {
    fhirStatus = 'finished';
  } else if (caseDoc.status === 'active') {
    fhirStatus = 'in-progress';
  } else if (caseDoc.status === 'draft') {
    fhirStatus = 'planned';
  } else if (caseDoc.status === 'archived') {
    fhirStatus = 'cancelled';
  }

  const startTime = session?.startedAt || caseDoc.createdAt;
  const endTime = session?.endedAt || (caseDoc.status === 'completed' ? caseDoc.updatedAt : undefined);

  const encounter: FhirEncounter = {
    resourceType: 'Encounter',
    id: `enc-${caseDoc.caseId}`,
    identifier: [
      {
        system: 'urn:ietf:rfc:3986',
        value: `urn:medikiosk:case:${caseDoc.caseId}`
      }
    ],
    status: fhirStatus,
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory'
    },
    subject: {
      reference: `Patient/${patient.patientId}`,
      display: `${patient.firstName} ${patient.lastName}`.trim()
    },
    period: {
      start: startTime.toISOString(),
      ...(endTime ? { end: endTime.toISOString() } : {})
    }
  };

  return encounter;
}
