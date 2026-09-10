/**
 * MEDiKIOSK — PHASE 01
 * Central Workspace Empty State Component
 * Strictly conforms to Section 20-24 specifications & visual reference
 */

import React from 'react';
import { ClinicalAiLogo } from '../../assets/ClinicalAiLogo';
import { NewCaseButton } from './NewCaseButton';

export interface WorkspaceEmptyStateProps {
  onNewCase?: () => void;
}

export const WorkspaceEmptyState: React.FC<WorkspaceEmptyStateProps> = ({ onNewCase }) => {
  return (
    <div className="workspace-empty-state" role="main" aria-label="Clinical workspace entry state">
      {/* Abstract Clinical-AI Logo Mark (Size 46px) */}
      <div className="empty-state-logo">
        <ClinicalAiLogo size={46} />
      </div>

      {/* MEDiKIOSK Wordmark */}
      <div className="empty-state-wordmark">
        MEDi<span className="brand-accent">KIOSK</span>
      </div>

      {/* Subtitle */}
      <div className="empty-state-subtitle">
        AI-Powered Clinical Workspace
      </div>

      {/* Short blue horizontal accent pill line */}
      <div className="empty-state-accent-pill" aria-hidden="true" />

      {/* Prescribed clinical copy */}
      <p className="empty-state-copy-line-1">
        Select a case or start a new case to continue.
      </p>
      <p className="empty-state-copy-line-2">
        Your clinical workflow begins here.
      </p>

      {/* Primary CTA: + New Case */}
      <NewCaseButton onClick={onNewCase} isCenter />
    </div>
  );
};
