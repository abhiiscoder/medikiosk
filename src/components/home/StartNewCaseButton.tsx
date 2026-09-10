/**
 * MEDiKIOSK — PHASE 02
 * StartNewCaseButton Component
 * Supports default, hover, active, focus, loading, and disabled states
 */

import React from 'react';
import { Plus, Loader2 } from 'lucide-react';

export interface StartNewCaseButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const StartNewCaseButton: React.FC<StartNewCaseButtonProps> = ({
  onClick,
  isLoading = false,
  disabled = false,
  className = ''
}) => {
  return (
    <button
      type="button"
      className={`empty-state-new-case-btn ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-label="Start New Patient Case"
      title="Start New Patient Case (Phase 02 Entry Point)"
      style={{
        width: isLoading ? '190px' : '182px'
      }}
    >
      {isLoading ? (
        <>
          <Loader2 size={17} className="mk-btn__spinner" />
          <span>Starting case...</span>
        </>
      ) : (
        <>
          <Plus size={18} strokeWidth={2.5} />
          <span>Start New Case</span>
        </>
      )}
    </button>
  );
};
