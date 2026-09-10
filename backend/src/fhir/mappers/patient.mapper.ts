/**
 * MEDiKIOSK Backend — Phase 10: Patient FHIR Mapper
 * Maps internal MEDiKIOSK Patient documents to FHIR R4 Patient resources.
 * STRICT CLINICAL SAFETY RULE: Do NOT invent missing demographics (birthDate, phone, gender).
 */

import { IPatient } from '../../models/patient.model.js';
import { FhirPatient, FhirIdentifier, FhirContactPoint } from '../types.js';

export function mapPatientToFhir(patient: IPatient): FhirPatient {
  const identifiers: FhirIdentifier[] = [
    {
      use: 'official',
      type: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'MR',
            display: 'Medical Record Number'
          }
        ]
      },
      value: patient.mrn
    }
  ];

  if (patient.abhaId && patient.abhaId.trim().length > 0) {
    identifiers.push({
      use: 'secondary',
      system: 'https://healthid.ndhm.gov.in',
      value: patient.abhaId.trim()
    });
  }

  // Gender mapping to FHIR R4 ('male' | 'female' | 'other' | 'unknown')
  let fhirGender: FhirPatient['gender'] = 'unknown';
  if (patient.gender === 'male') fhirGender = 'male';
  else if (patient.gender === 'female') fhirGender = 'female';
  else if (patient.gender === 'other') fhirGender = 'other';
  else if (patient.gender === 'undisclosed') fhirGender = 'unknown';

  const fhirPatient: FhirPatient = {
    resourceType: 'Patient',
    id: patient.patientId,
    active: true,
    identifier: identifiers,
    name: [
      {
        use: 'official',
        family: patient.lastName,
        given: [patient.firstName],
        text: `${patient.firstName} ${patient.lastName}`.trim()
      }
    ],
    gender: fhirGender
  };

  // Only include birthDate if explicitly recorded (never calculate or guess from age)
  if (patient.dateOfBirth && patient.dateOfBirth.trim().length > 0) {
    fhirPatient.birthDate = patient.dateOfBirth.trim();
  }

  // Only include telecom if phone number is provided
  if (patient.contactNumber && patient.contactNumber.trim().length > 0) {
    const telecoms: FhirContactPoint[] = [
      {
        system: 'phone',
        value: patient.contactNumber.trim(),
        use: 'mobile'
      }
    ];
    fhirPatient.telecom = telecoms;
  }

  return fhirPatient;
}
