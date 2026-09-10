/**
 * MEDiKIOSK — Patient Case Management Service Boundary
 * DEMO MODE: all operations are local, no backend required.
 */

import { ApiResponse } from '../types/common.types';
import { Patient } from '../types/patient.types';
import { getAuthHeaders } from './auth.service';
import { DEMO_MODE, createCase, updateCase, getCase, DEMO_PATIENTS } from '../demo/demoStore';

export interface CaseSession {
  caseId: string;
  patient: Patient;
  startedAt: string;
  currentPhase: string;
  isComplete: boolean;
}

export interface ICaseService {
  getActiveCase(): Promise<ApiResponse<CaseSession | null>>;
  startNewCase(patientData: Partial<Patient>): Promise<ApiResponse<CaseSession>>;
  updateCaseStatus(caseId: string, status: Patient['caseStatus']): Promise<ApiResponse<CaseSession>>;
}

const API_BASE_URL = typeof window !== 'undefined' && (window as any).__MEDIKIOSK_API_URL__ 
  ? (window as any).__MEDIKIOSK_API_URL__ 
  : 'http://localhost:5000/api/v1';

function createPatientModel(data: any = {}): Patient {
  return {
    id: data.patientId || data.id || 'patient-unregistered',
    mrn: data.mrn || 'PENDING',
    abhaId: data.abhaId,
    firstName: data.firstName || 'Patient',
    lastName: data.lastName || '',
    dateOfBirth: data.dateOfBirth || '',
    age: data.age ?? 0,
    gender: data.gender || 'undisclosed',
    bloodGroup: data.bloodGroup || 'unknown',
    contactNumber: data.contactNumber,
    allergies: [],
    triagePriority: 'routine',
    caseStatus: 'intake',
    registeredAt: data.createdAt || new Date().toISOString()
  };
}

class CaseService implements ICaseService {
  private currentCase: CaseSession | null = null;

  async getActiveCase(): Promise<ApiResponse<CaseSession | null>> {
    if (DEMO_MODE) {
      return { success: true, data: null, timestamp: new Date().toISOString() };
    }
    try {
      const response = await fetch(`${API_BASE_URL}/cases/active`, { headers: { ...getAuthHeaders() }, signal: AbortSignal.timeout(6000) });
      if (!response.ok) { this.currentCase = null; return { success: true, data: null, timestamp: new Date().toISOString() }; }
      const result = await response.json();
      if (result.success && result.data) {
        const p = result.data.patient || {};
        this.currentCase = { caseId: result.data.caseId, patient: createPatientModel({ ...p, patientId: result.data.patientId }), startedAt: result.data.createdAt || new Date().toISOString(), currentPhase: result.data.workflowStage || 'clinical_history', isComplete: result.data.status === 'completed' };
        return { success: true, data: this.currentCase, timestamp: new Date().toISOString() };
      }
    } catch { /* network offline */ }
    this.currentCase = null;
    return { success: true, data: null, timestamp: new Date().toISOString() };
  }

  async startNewCase(patientData: Partial<Patient>): Promise<ApiResponse<CaseSession>> {
    if (DEMO_MODE) {
      const demoCase = createCase();
      const pt = DEMO_PATIENTS.find((p: any) => p.patientId === demoCase.patientId) || DEMO_PATIENTS[0];
      this.currentCase = {
        caseId: demoCase.caseId,
        patient: createPatientModel({
          patientId: pt.patientId,
          firstName: pt.firstName,
          lastName: pt.lastName,
          age: pt.age,
          gender: pt.gender,
          bloodGroup: pt.bloodGroup,
          contactNumber: pt.phone,
          ...patientData
        }),
        startedAt: demoCase.createdAt,
        currentPhase: 'clinical_history',
        isComplete: false
      };
      return { success: true, data: this.currentCase, timestamp: new Date().toISOString() };
    }
    const payload: Record<string, unknown> = {};
    if (patientData && Object.keys(patientData).length > 0) {
      payload.patientData = {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        age: patientData.age,
        gender: patientData.gender,
        bloodGroup: patientData.bloodGroup,
        contactNumber: patientData.contactNumber,
        abhaId: patientData.abhaId
      };
    }

    const response = await fetch(`${API_BASE_URL}/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      const errMsg = errRes?.error?.message || `Failed to initialize case: HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error('Backend failed to return authoritative case information.');
    }

    const p = result.data.patient || {};
    this.currentCase = {
      caseId: result.data.caseId,
      patient: createPatientModel({
        ...p,
        patientId: result.data.patientId,
        ...patientData
      }),
      startedAt: result.data.createdAt || new Date().toISOString(),
      currentPhase: result.data.workflowStage || 'clinical_history',
      isComplete: false
    };

    return {
      success: true,
      data: this.currentCase,
      timestamp: new Date().toISOString()
    };
  }

  async updateCaseStatus(caseId: string, status: Patient['caseStatus']): Promise<ApiResponse<CaseSession>> {
    if (!caseId) throw new Error('Case ID is required.');
    if (DEMO_MODE) {
      const stageMap: Record<string, string> = { intake: 'clinical_history', conversing: 'clinical_history', document_collection: 'medical_records', clinical_review: 'summary', completed: 'completed' };
      updateCase(caseId, { status: status === 'completed' ? 'completed' : 'active', workflowStage: stageMap[String(status)] || 'clinical_history' });
      if (this.currentCase && this.currentCase.caseId === caseId) {
        this.currentCase.patient.caseStatus = status;
        this.currentCase.isComplete = status === 'completed';
      }
      return { success: true, data: this.currentCase!, timestamp: new Date().toISOString() };
    }

    const normalizedStatus = String(status).toLowerCase();
    const stageMap: Record<string, string> = {
      intake: 'clinical_history',
      conversing: 'clinical_history',
      document_collection: 'medical_records',
      clinical_review: 'summary',
      completed: 'completed'
    };

    const response = await fetch(`${API_BASE_URL}/cases/${caseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        status: normalizedStatus === 'completed' ? 'completed' : 'active',
        workflowStage: stageMap[normalizedStatus] || 'clinical_history'
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      const errMsg = errRes?.error?.message || `Failed to update case status: HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    if (this.currentCase && this.currentCase.caseId === caseId) {
      this.currentCase.patient.caseStatus = status;
      this.currentCase.isComplete = normalizedStatus === 'completed';
    }

    return {
      success: true,
      data: this.currentCase!,
      timestamp: new Date().toISOString()
    };
  }
}

export const caseService = new CaseService();
