/**
 * MEDiKIOSK Backend — Phase 10: MedicationStatement FHIR Mapper
 * Maps explicitly recorded medications to FHIR R4 MedicationStatement resources.
 * STRICT CLINICAL SAFETY RULE: Do NOT infer medications from symptoms or diagnoses.
 * Omit resources completely if no medications were reported.
 */

import { ICase } from '../../models/case.model.js';
import { IPatient } from '../../models/patient.model.js';
import { IClinicalHistory } from '../../models/clinicalHistory.model.js';
import { IClinicalSummary } from '../../models/clinicalSummary.model.js';
import { FhirMedicationStatement } from '../types.js';

const NEGATIVE_MED_INDICATORS = [
  'none',
  'none reported',
  'not provided',
  'no medications',
  'nil',
  'denies',
  'no regular medications'
];

export function mapMedicationsToFhir(
  caseDoc: ICase,
  patient: IPatient,
  history?: IClinicalHistory | null,
  summary?: IClinicalSummary | null
): FhirMedicationStatement[] {
  const statements: FhirMedicationStatement[] = [];
  const patientRef = { reference: `Patient/${patient.patientId}` };
  const encounterRef = { reference: `Encounter/enc-${caseDoc.caseId}` };

  // 1. First check structured items from Clinical History
  const historyMeds = history?.structuredData?.medications || [];
  const processedNames = new Set<string>();

  let medIdx = 0;
  for (const m of historyMeds) {
    const medName = m.name?.trim();
    if (!medName || NEGATIVE_MED_INDICATORS.includes(medName.toLowerCase())) {
      continue;
    }

    medIdx++;
    processedNames.add(medName.toLowerCase());

    const dosageParts: string[] = [];
    if (m.dosage) dosageParts.push(m.dosage.trim());
    if (m.frequency) dosageParts.push(m.frequency.trim());
    if (m.route) dosageParts.push(`Route: ${m.route.trim()}`);

    statements.push({
      resourceType: 'MedicationStatement',
      id: `med-${caseDoc.caseId}-${medIdx}`,
      status: 'active',
      medicationCodeableConcept: {
        text: medName
      },
      subject: patientRef,
      context: encounterRef,
      ...(dosageParts.length > 0 ? { dosage: [{ text: dosageParts.join(' ') }] } : {})
    });
  }

  // 2. Check summary medications if not already captured from history
  const summaryMeds = summary?.sections?.medications || [];
  for (const sMed of summaryMeds) {
    const medName = sMed?.trim();
    if (!medName || NEGATIVE_MED_INDICATORS.includes(medName.toLowerCase())) {
      continue;
    }
    if (processedNames.has(medName.toLowerCase())) {
      continue;
    }

    medIdx++;
    processedNames.add(medName.toLowerCase());

    statements.push({
      resourceType: 'MedicationStatement',
      id: `med-${caseDoc.caseId}-${medIdx}`,
      status: 'active',
      medicationCodeableConcept: {
        text: medName
      },
      subject: patientRef,
      context: encounterRef
    });
  }

  return statements;
}
