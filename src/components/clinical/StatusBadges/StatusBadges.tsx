/**
 * MEDiKIOSK — PHASE 00
 * Specialized Clinical, Document, and Verification Status Indicators
 */

import React from 'react';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  FileSearch, 
  CheckCheck, 
  Bot, 
  UserCheck, 
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { ClinicalPriority, VerificationLevel } from '../../../types/common.types';
import { DocumentProcessingStatus } from '../../../types/document.types';
import './StatusBadges.css';

/**
 * 1. Clinical Priority / Triage Status
 */
export interface ClinicalStatusProps {
  priority: ClinicalPriority;
  className?: string;
}

export const ClinicalStatus: React.FC<ClinicalStatusProps> = ({ priority, className = '' }) => {
  const priorityMap: Record<ClinicalPriority, { label: string; icon: React.ReactNode }> = {
    routine: { label: 'Routine (Level 5)', icon: <Clock size={13} /> },
    urgent: { label: 'Urgent Priority (Level 3)', icon: <AlertCircle size={13} /> },
    emergency: { label: 'Emergency (Level 2)', icon: <ShieldAlert size={13} /> },
    stat: { label: 'STAT Resuscitation (Level 1)', icon: <ShieldAlert size={13} /> }
  };

  const item = priorityMap[priority] || priorityMap.routine;

  return (
    <span className={`mk-clinical-status mk-clinical-status--${priority} ${className}`}>
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
};

/**
 * 2. Medical Document Processing Status
 */
export interface DocumentStatusProps {
  status: DocumentProcessingStatus;
  className?: string;
}

export const DocumentStatus: React.FC<DocumentStatusProps> = ({ status, className = '' }) => {
  const statusMap: Record<DocumentProcessingStatus, { label: string; icon: React.ReactNode }> = {
    selected: { label: 'Selected', icon: <Clock size={13} /> },
    uploading: { label: 'Uploading...', icon: <Clock size={13} className="mk-btn__spinner" /> },
    uploaded: { label: 'Uploaded', icon: <Clock size={13} /> },
    pending_validation: { label: 'Pending Validation', icon: <Clock size={13} /> },
    validating: { label: 'Validating...', icon: <FileSearch size={13} className="mk-btn__spinner" /> },
    clinical_verified: { label: 'Clinically Verified', icon: <CheckCheck size={13} /> },
    non_clinical: { label: 'Non-Clinical Document', icon: <AlertCircle size={13} /> },
    processing: { label: 'OCR Processing...', icon: <FileSearch size={13} className="mk-btn__spinner" /> },
    ocr_complete: { label: 'OCR Extracted', icon: <CheckCircle2 size={13} /> },
    needs_review: { label: 'Needs Clinician Review', icon: <AlertCircle size={13} /> },
    verified: { label: 'Clinically Verified', icon: <CheckCheck size={13} /> },
    failed: { label: 'Processing Failed', icon: <AlertCircle size={13} /> }
  };

  const item = statusMap[status] || statusMap.uploaded;

  return (
    <span className={`mk-clinical-status mk-doc-status--${status} ${className}`}>
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
};

/**
 * 3. Clinical Verification Level (Crucial for AI vs Clinician distinction)
 */
export interface VerificationStatusProps {
  level: VerificationLevel;
  className?: string;
}

export const VerificationStatus: React.FC<VerificationStatusProps> = ({ level, className = '' }) => {
  const levelMap: Record<VerificationLevel, { label: string; icon: React.ReactNode }> = {
    unverified: { label: 'Unverified Data', icon: <HelpCircle size={13} /> },
    ai_proposed: { label: 'AI Proposed Finding', icon: <Bot size={13} /> },
    clinician_reviewed: { label: 'Clinician Reviewed', icon: <UserCheck size={13} /> },
    verified: { label: 'Physician Verified', icon: <CheckCheck size={13} /> }
  };

  const item = levelMap[level] || levelMap.unverified;

  return (
    <span className={`mk-clinical-status mk-verification--${level} ${className}`}>
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
};
