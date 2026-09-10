/**
 * MEDiKIOSK — PHASE 00
 * Reusable ErrorState Component
 */

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../Button/Button';
import '../EmptyState/EmptyState.css';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Service Encountered An Issue',
  message = 'Unable to complete this clinical workflow. Please verify connection or retry.',
  onRetry,
  className = ''
}) => {
  return (
    <div className={`mk-state-container ${className}`} role="alert">
      <div className="mk-state-icon mk-state-icon--error" aria-hidden="true">
        <AlertCircle size={24} />
      </div>
      <h3 className="mk-state-title">{title}</h3>
      <p className="mk-state-description">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw size={14} />}
          onClick={onRetry}
        >
          Retry Action
        </Button>
      )}
    </div>
  );
};
