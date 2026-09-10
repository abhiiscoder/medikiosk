/**
 * MEDiKIOSK — PHASE 00
 * Fictional Clinical Mock Data: Timeline, Medications, Insights, Summary
 */

import { ClinicalEvent, Medication, AIInsight, ClinicalSummary } from '../types/clinical.types';
import { MOCK_PATIENT } from './patient.mock';

export const MOCK_MEDICATIONS: Medication[] = [
  {
    id: 'med-01',
    name: 'Amlodipine Besylate',
    dosage: '5 mg',
    frequency: 'Once daily (morning)',
    route: 'Oral',
    startDate: '2024-03-15',
    status: 'active',
    source: 'document',
    verificationLevel: 'verified'
  },
  {
    id: 'med-02',
    name: 'Metformin Hydrochloride',
    dosage: '500 mg',
    frequency: 'Twice daily with meals',
    route: 'Oral',
    startDate: '2023-08-20',
    status: 'active',
    source: 'clinician',
    verificationLevel: 'verified'
  },
  {
    id: 'med-03',
    name: 'Atorvastatin Calcium',
    dosage: '10 mg',
    frequency: 'Once daily at bedtime',
    route: 'Oral',
    startDate: '2026-01-10',
    status: 'active',
    source: 'ai',
    verificationLevel: 'ai_proposed'
  }
];

export const MOCK_CLINICAL_EVENTS: ClinicalEvent[] = [
  {
    id: 'ev-01',
    timestamp: '2026-09-07T08:30:00Z',
    title: 'Reported Retrosternal Chest Discomfort',
    description: 'Patient stated dull substernal heaviness for 3 days, aggravated by brisk walking.',
    category: 'symptom',
    source: 'user',
    verificationLevel: 'unverified'
  },
  {
    id: 'ev-02',
    timestamp: '2026-09-07T08:35:00Z',
    title: 'AI Entity Extraction: Exertional Angina Candidate',
    description: 'Extracted symptom triad: substernal heaviness, exertional worsening, relief with rest.',
    category: 'diagnosis',
    source: 'ai',
    verificationLevel: 'ai_proposed',
    confidenceScore: 0.92
  },
  {
    id: 'ev-03',
    timestamp: '2026-09-07T08:42:00Z',
    title: 'ECG 12-Lead Scan Uploaded',
    description: 'Normal sinus rhythm, inverted T waves noted in V4-V6 leads from uploaded document.',
    category: 'lab_result',
    source: 'document',
    verificationLevel: 'clinician_reviewed',
    documentReferenceId: 'doc-02'
  },
  {
    id: 'ev-04',
    timestamp: '2026-09-07T09:10:00Z',
    title: 'Attending Physician Triage Confirmation',
    description: 'Dr. A. Verma reviewed intake summary. Ordered cardiac enzymes and urgent cardiology consult.',
    category: 'encounter',
    source: 'clinician',
    verificationLevel: 'verified'
  }
];

export const MOCK_AI_INSIGHTS: AIInsight[] = [
  {
    id: 'ins-01',
    title: 'Potential Drug Interaction Risk',
    finding: 'NSAID contraindication with moderate-to-severe renal profile and reported gastric bronchospasm.',
    reasoning: 'Patient has confirmed history of NSAID-induced respiratory distress. Patient profile flags risk if ketorolac/naproxen are prescribed.',
    confidenceScore: 0.94,
    citedSources: [
      {
        documentName: 'Intake Allergy Log',
        sourceType: 'user',
        quoteSnippet: 'Gastric distress & mild bronchospasm with Ibuprofen'
      }
    ],
    status: 'suggested',
    generatedAt: '2026-09-07T08:48:00Z'
  },
  {
    id: 'ins-02',
    title: 'Exertional Pattern Correlation',
    finding: 'High concordance with stable angina pectoris presentation (CCS Class II).',
    reasoning: 'Correlated reported symptoms of 3-day exertional heaviness with current Amlodipine regimen and elevated BP (138/88 mmHg).',
    confidenceScore: 0.88,
    citedSources: [
      {
        documentName: 'Prescription_Cardiology_Jan2026.pdf',
        pageNumber: 1,
        quoteSnippet: 'Amlodipine 5mg tab daily for baseline hypertension',
        sourceType: 'document'
      }
    ],
    status: 'accepted',
    generatedAt: '2026-09-07T08:50:00Z'
  }
];

export const MOCK_CLINICAL_SUMMARY: ClinicalSummary = {
  patientId: MOCK_PATIENT.id,
  caseId: 'case-9941',
  chiefComplaint: 'Substernal chest heaviness on moderate exertion for 3 days.',
  historyOfPresentIllness: '48-year-old male with chronic hypertension presents with gradual onset of dull central chest pressure. Episodes typically last 5 to 10 minutes and subside with rest. No radiation to left arm or jaw reported during this intake session.',
  pertinentPositives: [
    'Substernal heaviness exacerbated by brisk stair climbing',
    'Pre-existing hypertension under Amlodipine management',
    'Resting BP at kiosk: 138/88 mmHg'
  ],
  pertinentNegatives: [
    'No diaphoresis or syncope',
    'No acute shortness of breath at rest',
    'No fever or productive cough'
  ],
  currentMedications: MOCK_MEDICATIONS,
  knownAllergies: MOCK_PATIENT.allergies,
  proposedAssessments: [
    'Suspected Angina Pectoris (ICD-10 I20.9)',
    'Essential Primary Hypertension (ICD-10 I10)'
  ],
  recommendedNextSteps: [
    'Order urgent High-Sensitivity Troponin I & CK-MB stat',
    'Schedule 2D Echocardiogram within 24 hours',
    'Clinician bedside review before kiosk discharge'
  ],
  insights: MOCK_AI_INSIGHTS,
  overallVerification: 'clinician_reviewed',
  lastUpdated: '2026-09-07T09:12:00Z'
};
