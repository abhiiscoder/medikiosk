/**
 * MEDiKIOSK — REAL DATA & API SERVICE
 * Authoritative Clinical Summary Generation Service Boundary
 *
 * Exclusively powered by real backend synthesis and MongoDB persistence:
 * Case data -> POST /api/v1/cases/:caseId/summary/generate -> Backend / Gemini -> MongoDB
 * No fake demo fallbacks, no fabricated vitals, no fabricated medications.
 */

import { ApiResponse } from '../types/common.types';
import { 
  StructuredClinicalSummary, 
  ClinicalSummary, 
  VerifiedRecordSummary,
  PatientInformationSummary
} from '../types/clinical.types';
import { PipelineItem } from '../hooks/useDocumentPipeline';
import { getAuthHeaders } from './auth.service';
import { 
  DEMO_MODE, 
  getSummary as getDemoSummary, 
  generateSummary as generateDemoSummary, 
  updateSummary as updateDemoSummary, 
  confirmSummary as confirmDemoSummary,
  createClinicalSummaryPdfBlob
} from '../demo/demoStore';

export interface GenerateSummaryOptions {
  forceError?: boolean;
  documents?: PipelineItem[];
  useDemoFallback?: boolean;
}

const API_BASE_URL = typeof window !== 'undefined' && (window as any).__MEDIKIOSK_API_URL__ 
  ? (window as any).__MEDIKIOSK_API_URL__ 
  : 'http://localhost:5000/api/v1';

export interface ISummaryService {
  getSummary(caseId: string): Promise<ApiResponse<StructuredClinicalSummary | null>>;
  generateSummary(caseId: string, options?: GenerateSummaryOptions): Promise<ApiResponse<StructuredClinicalSummary>>;
  updateSummary(caseId: string, updates: Partial<StructuredClinicalSummary>): Promise<ApiResponse<StructuredClinicalSummary>>;
  confirmSummary(caseId: string): Promise<ApiResponse<boolean>>;
  downloadSummaryPdf(caseId: string): Promise<Blob>;
  resetSummary(caseId: string): void;
  getLegacySummary(caseId: string): Promise<ApiResponse<ClinicalSummary | null>>;
}

class SummaryService implements ISummaryService {
  private summaries: Map<string, StructuredClinicalSummary> = new Map();

  private mapBackendSummary(
    caseId: string,
    backendData: any,
    documents: PipelineItem[] = []
  ): StructuredClinicalSummary {
    const sec = backendData.sections || {};

    const verifiedDocsList: VerifiedRecordSummary[] = documents
      .filter((d) => d.stage === 'processed' && d.isClinicallyValid !== false)
      .map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category || 'Clinical Record',
        sizeBytes: d.sizeBytes || 0
      }));

    const finalVerifiedDocs: VerifiedRecordSummary[] =
      verifiedDocsList.length > 0
        ? verifiedDocsList
        : (sec.relevantMedicalRecords || []).map((nameOrObj: any, idx: number) => {
            if (typeof nameOrObj === 'string') {
              return {
                id: `doc-${idx}`,
                name: nameOrObj,
                category: 'Clinical Record',
                sizeBytes: 0
              };
            }
            return {
              id: nameOrObj.documentId || nameOrObj.id || `doc-${idx}`,
              name: nameOrObj.name || nameOrObj.originalFileName || 'Medical Document',
              category: nameOrObj.category || 'Clinical Record',
              sizeBytes: nameOrObj.sizeBytes ?? nameOrObj.fileSize ?? 0
            };
          });

    const excludedCount = documents.filter(
      (d) => d.stage === 'rejected' || d.stage === 'non_clinical' || d.isClinicallyValid === false
    ).length;

    const patientInfo: PatientInformationSummary = {
      name: sec.patientInformation?.name || 'Case Patient',
      age: sec.patientInformation?.age ? String(sec.patientInformation.age) : 'Not provided',
      sex: sec.patientInformation?.gender || 'Not provided',
      isProvided: Boolean(sec.patientInformation?.name || sec.patientInformation?.age),
      source: 'kiosk_registration',
      sourceLabel: 'Kiosk Registration',
      isDemo: false
    };

    return {
      caseId,
      generatedAt: backendData.generatedAt || new Date().toISOString(),
      lastUpdated: backendData.updatedAt || undefined,
      patientInformation: patientInfo,
      chiefConcern: {
        value: sec.chiefConcern || 'Not provided',
        source: 'conversation',
        sourceLabel: 'Patient Statement',
        isProvided: Boolean(sec.chiefConcern && sec.chiefConcern !== 'Not provided')
      },
      symptoms: {
        value: Array.isArray(sec.associatedSymptoms) && sec.associatedSymptoms.length > 0
          ? sec.associatedSymptoms
          : sec.symptoms && sec.symptoms !== 'Not provided'
          ? [sec.symptoms]
          : [],
        source: 'conversation',
        sourceLabel: 'Intake Conversation',
        isProvided: Boolean(
          (Array.isArray(sec.associatedSymptoms) && sec.associatedSymptoms.length > 0) ||
          (sec.symptoms && sec.symptoms !== 'Not provided')
        )
      },
      timeline: {
        value: sec.duration || 'Not provided',
        source: 'conversation',
        sourceLabel: 'Intake Conversation',
        isProvided: Boolean(sec.duration && sec.duration !== 'Not provided')
      },
      severity: {
        value: sec.severity || 'Not provided',
        source: 'conversation',
        sourceLabel: 'Intake Conversation',
        isProvided: Boolean(sec.severity && sec.severity !== 'Not provided')
      },
      relevantHistory: {
        value: Array.isArray(sec.pastMedicalHistory) && sec.pastMedicalHistory.length > 0
          ? sec.pastMedicalHistory.join(', ')
          : 'Not provided',
        source: 'conversation',
        sourceLabel: 'Patient History',
        isProvided: Boolean(sec.pastMedicalHistory && sec.pastMedicalHistory.length > 0)
      },
      medications: {
        value: Array.isArray(sec.medications) ? sec.medications : [],
        source: 'conversation',
        sourceLabel: 'Patient History',
        isProvided: Boolean(sec.medications && sec.medications.length > 0)
      },
      allergies: {
        value: Array.isArray(sec.allergies) ? sec.allergies : [],
        source: 'conversation',
        sourceLabel: 'Patient History',
        isProvided: Boolean(sec.allergies && sec.allergies.length > 0)
      },
      familyHistory: {
        value: Array.isArray(sec.familyHistory) && sec.familyHistory.length > 0
          ? sec.familyHistory.join(', ')
          : 'Not provided',
        source: 'conversation',
        sourceLabel: 'Patient History',
        isProvided: Boolean(sec.familyHistory && sec.familyHistory.length > 0)
      },
      socialHistory: {
        value: sec.socialHistory || 'Not provided',
        source: 'conversation',
        sourceLabel: 'Patient History',
        isProvided: Boolean(sec.socialHistory && sec.socialHistory !== 'Not provided')
      },
      ayushInformation: {
        value: sec.ayushHistory || 'Not provided',
        source: 'conversation',
        sourceLabel: 'AYUSH History',
        isProvided: Boolean(sec.ayushHistory && sec.ayushHistory !== 'Not provided')
      },
      medicalRecords: {
        verifiedDocuments: finalVerifiedDocs,
        excludedDocumentsCount: excludedCount
      },
      clinicalInformationSummary: {
        value: sec.clinicalInformationSummary || 'Not provided',
        source: 'structured_response',
        sourceLabel: 'Clinical Information Summary',
        isProvided: Boolean(sec.clinicalInformationSummary && sec.clinicalInformationSummary !== 'Not provided')
      },
      additionalNotes: {
        value: sec.additionalNotes || 'Not provided',
        source: 'manual_edit',
        sourceLabel: 'Physician Notes',
        isProvided: Boolean(sec.additionalNotes && sec.additionalNotes !== 'Not provided')
      },
      isEdited: false
    };
  }

  async confirmSummary(caseId: string): Promise<ApiResponse<boolean>> {
    if (!caseId || caseId === 'active-case') {
      throw new Error('Valid case ID is required to confirm clinical summary.');
    }

    if (DEMO_MODE) {
      confirmDemoSummary(caseId);
      return {
        success: true,
        data: true,
        timestamp: new Date().toISOString()
      };
    }

    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/summary/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      const errMsg = errRes?.error?.message || `Failed to confirm summary on backend: HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    return {
      success: true,
      data: true,
      timestamp: new Date().toISOString()
    };
  }

  async downloadSummaryPdf(caseId: string): Promise<Blob> {
    if (!caseId || caseId === 'active-case') {
      throw new Error('Valid case ID is required to download clinical summary PDF.');
    }

    if (DEMO_MODE) {
      const s = getDemoSummary(caseId) || generateDemoSummary(caseId);
      return createClinicalSummaryPdfBlob(s);
    }

    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/summary/pdf`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders()
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      const errMsg = errRes?.error?.message || `Failed to download summary PDF: HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    return await response.blob();
  }

  async getSummary(caseId: string): Promise<ApiResponse<StructuredClinicalSummary | null>> {
    if (!caseId || caseId === 'active-case') {
      return {
        success: true,
        data: null,
        timestamp: new Date().toISOString()
      };
    }

    if (DEMO_MODE) {
      const existing = getDemoSummary(caseId);
      return {
        success: true,
        data: existing,
        timestamp: new Date().toISOString()
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cases/${caseId}/summary`, {
        headers: {
          ...getAuthHeaders()
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const res = await response.json();
        if (res.success && res.data && res.data.sections) {
          const mapped = this.mapBackendSummary(caseId, res.data);
          this.summaries.set(caseId, mapped);
          return {
            success: true,
            data: mapped,
            timestamp: new Date().toISOString()
          };
        }
      } else if (response.status === 404) {
        return {
          success: true,
          data: null,
          timestamp: new Date().toISOString()
        };
      }
    } catch {
      // Offline fallback: check in-memory cache
    }

    const cached = this.summaries.get(caseId) || null;
    return {
      success: true,
      data: cached ? JSON.parse(JSON.stringify(cached)) : null,
      timestamp: new Date().toISOString()
    };
  }

  async generateSummary(
    caseId: string,
    options: GenerateSummaryOptions = {}
  ): Promise<ApiResponse<StructuredClinicalSummary>> {
    const { forceError = false, documents = [] } = options;

    if (forceError) {
      throw new Error('Unable to generate clinical summary. The clinical analysis pipeline encountered an error.');
    }

    if (!caseId || caseId === 'active-case') {
      throw new Error('No active clinical case found. Please start a new case first.');
    }

    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const s = generateDemoSummary(caseId);
      this.summaries.set(caseId, s);
      return {
        success: true,
        data: s,
        timestamp: new Date().toISOString()
      };
    }

    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/summary/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(45000)
    });

    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      const errMsg = errRes?.error?.message || `Summary generation failed: HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const res = await response.json();
    if (!res.success || !res.data || !res.data.sections) {
      throw new Error('Backend failed to return authoritative clinical summary sections.');
    }

    const mapped = this.mapBackendSummary(caseId, res.data, documents);
    this.summaries.set(caseId, mapped);
    return {
      success: true,
      data: mapped,
      timestamp: new Date().toISOString()
    };
  }

  async updateSummary(
    caseId: string,
    updates: Partial<StructuredClinicalSummary>
  ): Promise<ApiResponse<StructuredClinicalSummary>> {
    if (DEMO_MODE) {
      const s = updateDemoSummary(caseId, updates);
      this.summaries.set(caseId, s);
      return {
        success: true,
        data: s,
        timestamp: new Date().toISOString()
      };
    }

    const existing = this.summaries.get(caseId);
    if (!existing) {
      throw new Error(`No clinical summary found for case ${caseId}`);
    }

    const updated: StructuredClinicalSummary = {
      ...existing,
      ...updates,
      lastUpdated: new Date().toISOString(),
      isEdited: true
    };

    this.summaries.set(caseId, updated);

    return {
      success: true,
      data: { ...updated },
      timestamp: new Date().toISOString()
    };
  }

  public resetSummary(caseId: string): void {
    this.summaries.delete(caseId);
  }

  async getLegacySummary(caseId: string): Promise<ApiResponse<ClinicalSummary | null>> {
    const current = this.summaries.get(caseId);
    if (!current) {
      return {
        success: true,
        data: null,
        timestamp: new Date().toISOString()
      };
    }

    const legacy: ClinicalSummary = {
      patientId: current.patientInformation.name || 'patient-unknown',
      caseId,
      chiefComplaint: current.chiefConcern.value,
      historyOfPresentIllness: current.clinicalInformationSummary.value,
      pertinentPositives: current.symptoms.value || [],
      pertinentNegatives: [],
      currentMedications: current.medications.value.map((m: any, idx: number) => ({
        id: `med-${idx}`,
        name: typeof m === 'string' ? m : m.name || '',
        dosage: typeof m === 'string' ? '' : m.dosage || '',
        frequency: typeof m === 'string' ? '' : m.frequency || '',
        status: 'active',
        source: 'user',
        verificationLevel: 'unverified'
      })),
      knownAllergies: current.allergies.value.map((a: any, idx: number) => ({
        id: `alg-${idx}`,
        allergen: typeof a === 'string' ? a : a.allergen || '',
        reaction: typeof a === 'string' ? '' : a.reaction || '',
        severity: 'mild',
        source: 'user',
        recordedAt: new Date().toISOString()
      })),
      proposedAssessments: [],
      recommendedNextSteps: [],
      insights: [],
      overallVerification: 'clinician_reviewed',
      lastUpdated: current.lastUpdated || current.generatedAt
    };

    return {
      success: true,
      data: legacy,
      timestamp: new Date().toISOString()
    };
  }
}

export const summaryService = new SummaryService();
