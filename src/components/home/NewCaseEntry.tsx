/**
 * MEDiKIOSK — PHASE 02
 * NewCaseEntry Component (Home Workspace Entry State)
 * Strictly matches the visual reference image for Phase 02
 */

import React from 'react';
import { ClinicalAiLogo } from '../../assets/ClinicalAiLogo';
import { StartNewCaseButton } from './StartNewCaseButton';
import { caseService, CaseSession } from '../../services/case.service';
import { ApiResponse } from '../../types/common.types';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface NewCaseEntryProps {
  onCaseStarted?: (caseId: string) => void;
  showCenterButton?: boolean;
  className?: string;
}

export const NewCaseEntry: React.FC<NewCaseEntryProps> = ({
  onCaseStarted,
  showCenterButton = true,
  className = ''
}) => {
  const { showToast } = useToast();
  const { execute, isLoading, isError, reset } = useAsync<ApiResponse<CaseSession>>();

  const handleStartCase = async () => {
    try {
      const response = await execute(async () => {
        return await caseService.startNewCase({});
      });

      if (response && response.success) {
        showToast(
          'success',
          'Case Initialized',
          `New patient case ${response.data.caseId} initialized. Routing to Clinical History.`
        );
        onCaseStarted?.(response.data.caseId);
      }
    } catch (err) {
      showToast(
        'error',
        'Case Creation Failed',
        'Unable to start a new case. Please try again.'
      );
    }
  };

  return (
    <div
      className={`workspace-empty-state ${className}`}
      role="main"
      aria-label="MEDiKIOSK Starting Workspace — Start New Patient Case"
    >
      {/* 1. Abstract Clinical-AI Logo Mark (Size 46px) */}
      <div className="empty-state-logo">
        <ClinicalAiLogo size={46} />
      </div>

      {/* 2. MEDiKIOSK Wordmark */}
      <div className="empty-state-wordmark">
        MEDi<span className="brand-accent">KIOSK</span>
      </div>

      {/* 3. Small Blue Accent Line */}
      <div className="empty-state-accent-pill" aria-hidden="true" />

      {/* 4. Primary Heading: Exactly "How can we help you today?" */}
      <h2 className="empty-state-heading">
        How can we help you today?
      </h2>

      {/* 5. Supporting Text (Two visually balanced lines) */}
      <div className="empty-state-supporting-text">
        <span>Start a new patient case to begin</span>
        <span>collecting clinical information.</span>
      </div>

      {/* 6. Error View or Primary CTA */}
      {isError ? (
        <div
          style={{
            marginTop: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
          role="alert"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#F87171',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            <AlertCircle size={16} />
            <span>Unable to start a new case. Please try again.</span>
          </div>

          <button
            type="button"
            className="empty-state-new-case-btn"
            style={{ width: '140px', height: '40px', gap: '6px', fontSize: '14px' }}
            onClick={() => {
              reset();
              handleStartCase();
            }}
          >
            <RefreshCw size={14} />
            <span>Try again</span>
          </button>
        </div>
      ) : showCenterButton ? (
        /* 7. Primary CTA: + Start New Case (Optional) */
        <StartNewCaseButton
          onClick={handleStartCase}
          isLoading={isLoading}
        />
      ) : null}
    </div>
  );
};
