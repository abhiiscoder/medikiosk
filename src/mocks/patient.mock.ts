/**
 * MEDiKIOSK — PHASE 00
 * Fictional Clinical Mock Data: Patient Demographics
 */

import { Patient } from '../types/patient.types';

export const MOCK_PATIENT: Patient = {
  id: 'pt-88219',
  mrn: 'MK-2026-0982',
  abhaId: '91-4582-7391-4402',
  firstName: 'Rajesh',
  lastName: 'Sharma',
  dateOfBirth: '1978-04-12',
  age: 48,
  gender: 'male',
  bloodGroup: 'B+',
  contactNumber: '+91 98450 12345',
  emergencyContact: {
    name: 'Sunita Sharma',
    relation: 'Spouse',
    phone: '+91 98450 98765'
  },
  allergies: [
    {
      id: 'alg-01',
      allergen: 'Penicillin G',
      reaction: 'Urticaria & facial angioedema',
      severity: 'severe',
      source: 'clinician',
      recordedAt: '2025-11-10T10:30:00Z'
    },
    {
      id: 'alg-02',
      allergen: 'NSAIDs (Ibuprofen)',
      reaction: 'Gastric distress & mild bronchospasm',
      severity: 'moderate',
      source: 'user',
      recordedAt: '2026-09-07T08:15:00Z'
    }
  ],
  vitals: {
    bloodPressureSystolic: 138,
    bloodPressureDiastolic: 88,
    heartRate: 76,
    respiratoryRate: 16,
    oxygenSaturation: 98,
    temperatureCelsius: 37.1,
    recordedAt: '2026-09-07T09:00:00Z',
    source: 'document'
  },
  triagePriority: 'urgent',
  caseStatus: 'conversing',
  registeredAt: '2026-09-07T08:45:00Z'
};
