/**
 * MEDiKIOSK — REAL DATA & API SERVICE
 * Authoritative Medical Document Repository Service Boundary
 *
 * Real document upload -> Real disk storage -> Real MongoDB persistence -> Real processing
 */

import { ApiResponse } from '../types/common.types';
import { MedicalDocument } from '../types/document.types';
import { getAuthHeaders } from './auth.service';
import { DEMO_MODE } from '../demo/demoStore';

export interface IDocumentService {
  getDocuments(caseId: string): Promise<ApiResponse<MedicalDocument[]>>;
  uploadDocument(caseId: string, file: File): Promise<ApiResponse<MedicalDocument>>;
  updateDocument(documentId: string, partial: Partial<MedicalDocument>, caseId?: string): Promise<ApiResponse<MedicalDocument>>;
  removeDocument(documentId: string, caseId?: string): Promise<ApiResponse<boolean>>;
  subscribe(listener: () => void): () => void;
}

const API_BASE_URL = typeof window !== 'undefined' && (window as any).__MEDIKIOSK_API_URL__ 
  ? (window as any).__MEDIKIOSK_API_URL__ 
  : 'http://localhost:5000/api/v1';

class DocumentService implements IDocumentService {
  private documents: MedicalDocument[] = [];
  private listeners: Set<() => void> = new Set();
  private lastCaseId: string | null = null;

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Safe listener execution
      }
    });
  }

  async getDocuments(caseId: string): Promise<ApiResponse<MedicalDocument[]>> {
    if (!caseId || caseId === 'active-case') {
      this.documents = [];
      this.notify();
      return {
        success: true,
        data: [],
        timestamp: new Date().toISOString()
      };
    }

    if (DEMO_MODE) {
      this.lastCaseId = caseId;
      if (this.documents.length === 0) {
        this.documents = [
          {
            id: `doc-${caseId}-01`,
            caseId,
            name: 'Prescription_Record.pdf',
            type: 'prescription',
            category: 'Prescription',
            sizeBytes: 245000,
            mimeType: 'application/pdf',
            uploadedAt: new Date().toISOString(),
            processingStatus: 'verified',
            verificationLevel: 'verified'
          },
          {
            id: `doc-${caseId}-02`,
            caseId,
            name: 'Laboratory_Report.pdf',
            type: 'lab_report',
            category: 'Laboratory Report',
            sizeBytes: 312000,
            mimeType: 'application/pdf',
            uploadedAt: new Date().toISOString(),
            processingStatus: 'verified',
            verificationLevel: 'verified'
          }
        ];
      }
      this.notify();
      return {
        success: true,
        data: [...this.documents],
        timestamp: new Date().toISOString()
      };
    }

    this.lastCaseId = caseId;
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/documents`, {
      headers: {
        ...getAuthHeaders()
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`Failed to load medical documents: HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      const mapped: MedicalDocument[] = result.data.map((d: any) => ({
        id: d.documentId || d._id || d.id,
        caseId: d.caseId || caseId,
        name: d.originalName || d.originalFileName || d.name || 'Medical Document',
        type: d.type || 'clinical_note',
        category: d.category || 'Other Medical Document',
        sizeBytes: d.sizeBytes ?? d.fileSize ?? 0,
        mimeType: d.mimeType || 'application/pdf',
        uploadedAt: d.uploadedAt || new Date().toISOString(),
        processingStatus: (d.processingStatus || (d.status === 'processed' ? 'verified' : 'uploaded')) as any,
        verificationLevel: (d.isClinicalDocument || d.isClinical) ? 'verified' : 'unverified'
      }));

      this.documents = mapped;
      this.notify();
      return {
        success: true,
        data: [...this.documents],
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: [],
      timestamp: new Date().toISOString()
    };
  }

  async uploadDocument(caseId: string, file: File): Promise<ApiResponse<MedicalDocument>> {
    if (!caseId || caseId === 'active-case') {
      throw new Error('No active clinical case found. Please start a case before uploading documents.');
    }

    this.lastCaseId = caseId;

    if (DEMO_MODE) {
      const isRx = /rx|prescrip|pill|med/i.test(file.name);
      const isLab = /lab|blood|lipid|urine/i.test(file.name);
      const newDoc: MedicalDocument = {
        id: `doc-demo-${Date.now()}`,
        caseId,
        name: file.name,
        type: isRx ? 'prescription' : isLab ? 'lab_report' : 'clinical_note',
        category: isRx ? 'Prescription' : isLab ? 'Laboratory Report' : 'Other Medical Document',
        sizeBytes: file.size,
        mimeType: file.type || 'application/pdf',
        uploadedAt: new Date().toISOString(),
        processingStatus: 'verified',
        verificationLevel: 'verified'
      };
      this.documents.unshift(newDoc);
      this.notify();
      return {
        success: true,
        data: newDoc,
        timestamp: new Date().toISOString()
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/documents`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders()
      },
      body: formData,
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      throw new Error(errRes?.error?.message || `Failed to upload document: HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error('Backend failed to return authoritative document metadata.');
    }

    const d = result.data;
    const docId = d.documentId || d.id;

    const newDoc: MedicalDocument = {
      id: docId,
      caseId,
      name: d.originalName || d.originalFileName || d.name || file.name,
      type: d.type || 'clinical_note',
      category: d.category || 'Other Clinical Document',
      sizeBytes: d.sizeBytes ?? d.fileSize ?? file.size,
      mimeType: d.mimeType || file.type || 'application/pdf',
      uploadedAt: d.uploadedAt || new Date().toISOString(),
      processingStatus: d.processingStatus || 'uploaded',
      verificationLevel: (d.isClinicalDocument || d.isClinical) ? 'verified' : 'unverified'
    };

    this.documents.unshift(newDoc);
    this.notify();

    return {
      success: true,
      data: newDoc,
      timestamp: new Date().toISOString()
    };
  }

  async updateDocument(documentId: string, partial: Partial<MedicalDocument>, caseId?: string): Promise<ApiResponse<MedicalDocument>> {
    const targetCaseId = caseId || this.lastCaseId;
    if (!DEMO_MODE && targetCaseId && targetCaseId !== 'active-case') {
      const response = await fetch(`${API_BASE_URL}/cases/${targetCaseId}/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(partial),
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        const errRes = await response.json().catch(() => ({}));
        throw new Error(errRes?.error?.message || `Failed to update document: HTTP ${response.status}`);
      }
    }

    const idx = this.documents.findIndex((d) => d.id === documentId);
    if (idx !== -1) {
      this.documents[idx] = { ...this.documents[idx], ...partial };
      this.notify();
      return {
        success: true,
        data: this.documents[idx],
        timestamp: new Date().toISOString()
      };
    }

    throw new Error(`Document ${documentId} not found in repository.`);
  }

  async removeDocument(documentId: string, caseId?: string): Promise<ApiResponse<boolean>> {
    const targetCaseId = caseId || this.lastCaseId;
    if (!DEMO_MODE && targetCaseId && targetCaseId !== 'active-case') {
      const response = await fetch(`${API_BASE_URL}/cases/${targetCaseId}/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders()
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        const errRes = await response.json().catch(() => ({}));
        throw new Error(errRes?.error?.message || `Failed to delete document: HTTP ${response.status}`);
      }
    }

    this.documents = this.documents.filter((d) => d.id !== documentId);
    this.notify();
    return {
      success: true,
      data: true,
      timestamp: new Date().toISOString()
    };
  }
}

export const documentService = new DocumentService();
