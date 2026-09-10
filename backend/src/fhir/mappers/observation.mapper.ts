/**
 * MEDiKIOSK Backend — Phase 10: Observation FHIR Mapper
 * Maps validated clinical intake findings and verified document records to FHIR R4 Observation resources.
 * STRICT CLINICAL SAFETY RULE: Only map verified positive observations; do NOT invent lab values or reference ranges.
 */

import { ICase } from '../../models/case.model.js';
import { IPatient } from '../../models/patient.model.js';
import { IClinicalHistory } from '../../models/clinicalHistory.model.js';
import { IClinicalSummary } from '../../models/clinicalSummary.model.js';
import { IMedicalDocument } from '../../models/document.model.js';
import { FhirObservation } from '../types.js';

export function mapObservationsToFhir(
  caseDoc: ICase,
  patient: IPatient,
  history?: IClinicalHistory | null,
  summary?: IClinicalSummary | null,
  documents?: IMedicalDocument[]
): FhirObservation[] {
  const observations: FhirObservation[] = [];
  const patientRef = { reference: `Patient/${patient.patientId}` };
  const encounterRef = { reference: `Encounter/enc-${caseDoc.caseId}` };

  // 1. Map Chief Concern if present
  const chiefConcern = summary?.sections?.chiefConcern || history?.structuredData?.chiefComplaint?.text;
  if (chiefConcern && chiefConcern.trim().length > 0 && chiefConcern.toLowerCase() !== 'not provided') {
    observations.push({
      resourceType: 'Observation',
      id: `obs-${caseDoc.caseId}-cc`,
      status: 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'exam',
              display: 'Exam'
            }
          ]
        }
      ],
      code: {
        text: 'Chief Concern'
      },
      subject: patientRef,
      encounter: encounterRef,
      valueString: chiefConcern.trim()
    });
  }

  // 2. Map Structured Symptoms from Clinical History
  const symptoms = history?.structuredData?.symptoms || [];
  let symIdx = 0;
  for (const sym of symptoms) {
    if (sym.presence !== false && sym.name && sym.name.trim().length > 0) {
      symIdx++;
      const val = sym.severity ? `${sym.name.trim()} (${sym.severity})` : sym.name.trim();
      observations.push({
        resourceType: 'Observation',
        id: `obs-${caseDoc.caseId}-sym-${symIdx}`,
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'exam',
                display: 'Exam'
              }
            ]
          }
        ],
        code: {
          text: sym.name.trim()
        },
        subject: patientRef,
        encounter: encounterRef,
        valueString: val
      });
    }
  }

  // 3. Map Validated Clinical Documents (with provenance)
  const validDocs = (documents || []).filter(
    (d) => d.isClinicalDocument === true && d.validationStatus === 'validated'
  );

  let docIdx = 0;
  for (const doc of validDocs) {
    docIdx++;
    observations.push({
      resourceType: 'Observation',
      id: `obs-${caseDoc.caseId}-doc-${docIdx}`,
      status: 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'laboratory',
              display: 'Laboratory'
            }
          ]
        }
      ],
      code: {
        text: doc.category || doc.type
      },
      subject: patientRef,
      encounter: encounterRef,
      valueString: `${doc.category || doc.type}: ${doc.name}`,
      derivedFrom: [
        {
          reference: `DocumentReference/${doc.documentId}`,
          display: doc.name
        }
      ]
    });
  }

  return observations;
}
