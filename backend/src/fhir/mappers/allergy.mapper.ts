/**
 * MEDiKIOSK Backend — Phase 10: AllergyIntolerance FHIR Mapper
 * Maps explicitly recorded patient allergies to FHIR R4 AllergyIntolerance resources.
 * STRICT CLINICAL SAFETY RULE: Do NOT invent reactions or severity when not recorded.
 * Omit resources completely if patient reports no allergies (NKDA) or "Not provided".
 */

import { ICase } from '../../models/case.model.js';
import { IPatient } from '../../models/patient.model.js';
import { IClinicalHistory } from '../../models/clinicalHistory.model.js';
import { IClinicalSummary } from '../../models/clinicalSummary.model.js';
import { FhirAllergyIntolerance } from '../types.js';

const NEGATIVE_ALLERGY_INDICATORS = [
  'none',
  'none reported',
  'not provided',
  'no known allergies',
  'no known drug allergies',
  'nkda',
  'no allergies',
  'nil',
  'denies'
];

export function mapAllergiesToFhir(
  caseDoc: ICase,
  patient: IPatient,
  history?: IClinicalHistory | null,
  summary?: IClinicalSummary | null
): FhirAllergyIntolerance[] {
  const intolerances: FhirAllergyIntolerance[] = [];
  const patientRef = { reference: `Patient/${patient.patientId}` };
  const encounterRef = { reference: `Encounter/enc-${caseDoc.caseId}` };

  const processedAllergens = new Set<string>();
  let algIdx = 0;

  // 1. Structured allergies from Clinical History
  const historyAllergies = history?.structuredData?.allergies || [];
  for (const a of historyAllergies) {
    const allergen = a.allergen?.trim();
    if (!allergen || NEGATIVE_ALLERGY_INDICATORS.includes(allergen.toLowerCase())) {
      continue;
    }

    algIdx++;
    processedAllergens.add(allergen.toLowerCase());

    const item: FhirAllergyIntolerance = {
      resourceType: 'AllergyIntolerance',
      id: `alg-${caseDoc.caseId}-${algIdx}`,
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active',
            display: 'Active'
          }
        ]
      },
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
            code: 'confirmed',
            display: 'Confirmed'
          }
        ]
      },
      code: {
        text: allergen
      },
      patient: patientRef,
      encounter: encounterRef
    };

    // Only add reaction if manifestation or severity is actually known
    if (a.reaction || a.severity) {
      let sev: 'mild' | 'moderate' | 'severe' | undefined = undefined;
      if (a.severity === 'severe') sev = 'severe';
      else if (a.severity === 'moderate') sev = 'moderate';
      else if (a.severity === 'mild') sev = 'mild';

      item.reaction = [
        {
          manifestation: [
            {
              text: a.reaction ? a.reaction.trim() : 'Allergic reaction'
            }
          ],
          ...(sev ? { severity: sev } : {})
        }
      ];
    }

    intolerances.push(item);
  }

  // 2. Summary allergies if not already captured
  const summaryAllergies = summary?.sections?.allergies || [];
  for (const sAllergy of summaryAllergies) {
    const allergen = sAllergy?.trim();
    if (!allergen || NEGATIVE_ALLERGY_INDICATORS.includes(allergen.toLowerCase())) {
      continue;
    }
    if (processedAllergens.has(allergen.toLowerCase())) {
      continue;
    }

    algIdx++;
    processedAllergens.add(allergen.toLowerCase());

    intolerances.push({
      resourceType: 'AllergyIntolerance',
      id: `alg-${caseDoc.caseId}-${algIdx}`,
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active',
            display: 'Active'
          }
        ]
      },
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
            code: 'confirmed',
            display: 'Confirmed'
          }
        ]
      },
      code: {
        text: allergen
      },
      patient: patientRef,
      encounter: encounterRef
    });
  }

  return intolerances;
}
