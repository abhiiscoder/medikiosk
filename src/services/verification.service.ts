/**
 * MEDiKIOSK — PHASE 00
 * Clinician Verification & Audit Service Boundary
 */

import { ApiResponse, VerificationLevel } from '../types/common.types';
import { VerificationAuditEntry } from '../types/verification.types';

export interface IVerificationService {
  verifyEntity(
    entityId: string, 
    entityType: VerificationAuditEntry['targetEntityType'], 
    level: VerificationLevel, 
    notes?: string
  ): Promise<ApiResponse<VerificationAuditEntry>>;
  getAuditTrail(caseId: string): Promise<ApiResponse<VerificationAuditEntry[]>>;
}

class VerificationService implements IVerificationService {
  private auditTrail: VerificationAuditEntry[] = [];

  async verifyEntity(
    entityId: string,
    entityType: VerificationAuditEntry['targetEntityType'],
    level: VerificationLevel,
    notes?: string
  ): Promise<ApiResponse<VerificationAuditEntry>> {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const entry: VerificationAuditEntry = {
      id: `audit-${Date.now()}`,
      targetEntityId: entityId,
      targetEntityType: entityType,
      previousLevel: 'ai_proposed',
      newLevel: level,
      reviewer: {
        id: 'doc-004',
        name: 'Dr. Ananya Verma, MD',
        medicalLicense: 'MCI-DL-2015-88392',
        role: 'Attending Physician',
        department: 'General Internal Medicine'
      },
      clinicalNotes: notes || 'Reviewed and confirmed against patient statement & lab findings.',
      timestamp: new Date().toISOString(),
      cryptographicSignature: '0x8f2a991e4b3c9902bd88712a4f56e01a8849b3c'
    };
    this.auditTrail.unshift(entry);
    return {
      success: true,
      data: entry,
      timestamp: new Date().toISOString()
    };
  }

  async getAuditTrail(_caseId: string): Promise<ApiResponse<VerificationAuditEntry[]>> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      success: true,
      data: [...this.auditTrail],
      timestamp: new Date().toISOString()
    };
  }
}

export const verificationService = new VerificationService();
