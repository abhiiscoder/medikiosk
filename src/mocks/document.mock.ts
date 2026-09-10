/**
 * MEDiKIOSK — PHASE 00
 * Fictional Clinical Mock Data: Medical Documents
 */

import { MedicalDocument } from '../types/document.types';

export const MOCK_DOCUMENTS: MedicalDocument[] = [
  {
    id: 'doc-01',
    caseId: 'case-9941',
    name: 'Comprehensive_Metabolic_Lipid_Panel.pdf',
    type: 'lab_report',
    sizeBytes: 1248500,
    mimeType: 'application/pdf',
    uploadedAt: '2026-09-07T08:32:00Z',
    processingStatus: 'verified',
    verificationLevel: 'verified',
    ocrConfidence: 0.98,
    pageCount: 2,
    extractedEntities: [
      {
        id: 'ent-01',
        category: 'lab_value',
        rawText: 'Total Cholesterol: 242 mg/dL (High)',
        normalizedValue: '242 mg/dL',
        confidence: 0.99
      },
      {
        id: 'ent-02',
        category: 'lab_value',
        rawText: 'LDL: 154 mg/dL (High)',
        normalizedValue: '154 mg/dL',
        confidence: 0.97
      },
      {
        id: 'ent-03',
        category: 'lab_value',
        rawText: 'HbA1c: 6.4% (Prediabetes)',
        normalizedValue: '6.4%',
        confidence: 0.98
      }
    ]
  },
  {
    id: 'doc-02',
    caseId: 'case-9941',
    name: 'Resting_12_Lead_ECG_Scan.jpg',
    type: 'radiology',
    sizeBytes: 3420100,
    mimeType: 'image/jpeg',
    uploadedAt: '2026-09-07T08:40:00Z',
    processingStatus: 'ocr_complete',
    verificationLevel: 'clinician_reviewed',
    ocrConfidence: 0.91,
    pageCount: 1,
    extractedEntities: [
      {
        id: 'ent-04',
        category: 'diagnosis',
        rawText: 'Sinus rhythm 74 bpm, T-wave inversion in V4-V6',
        normalizedValue: 'T-wave inversion anterolateral',
        confidence: 0.89
      }
    ]
  },
  {
    id: 'doc-03',
    caseId: 'case-9941',
    name: 'Discharge_Summary_City_Hospital_2024.pdf',
    type: 'discharge_summary',
    sizeBytes: 2150000,
    mimeType: 'application/pdf',
    uploadedAt: '2026-09-07T08:44:00Z',
    processingStatus: 'needs_review',
    verificationLevel: 'ai_proposed',
    ocrConfidence: 0.86,
    pageCount: 4
  },
  {
    id: 'doc-04',
    caseId: 'case-9941',
    name: 'Handwritten_Prescription_Slip.png',
    type: 'prescription',
    sizeBytes: 854000,
    mimeType: 'image/png',
    uploadedAt: '2026-09-07T08:52:00Z',
    processingStatus: 'processing',
    verificationLevel: 'unverified',
    pageCount: 1
  },
  {
    id: 'doc-05',
    caseId: 'case-9941',
    name: 'Old_Damaged_Ultrasound_Film.jpg',
    type: 'other',
    sizeBytes: 420000,
    mimeType: 'image/jpeg',
    uploadedAt: '2026-09-07T08:55:00Z',
    processingStatus: 'failed',
    verificationLevel: 'unverified',
    errorMessage: 'Low resolution / severe motion blur prevents OCR text extraction. Please re-scan original document.'
  }
];
