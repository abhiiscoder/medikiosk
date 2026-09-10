/**
 * MEDiKIOSK — PHASE 00
 * Reusable StatusIndicator Component
 */

import React from 'react';
import '../EmptyState/EmptyState.css';

export type SystemStatusType = 'idle' | 'active' | 'processing' | 'success' | 'warning' | 'error' | 'offline';

export interface StatusIndicatorProps {
  status: SystemStatusType;
  label?: string;
  pulse?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  pulse = false,
  className = ''
}) => {
  return (
    <span
      className={`mk-status-indicator mk-status--${status} ${className}`}
      role="status"
      aria-label={`Status: ${label || status}`}
    >
      <span
        className={`mk-status-dot ${pulse ? 'mk-status-dot--pulse' : ''}`}
        aria-hidden="true"
      />
      {label && <span>{label}</span>}
    </span>
  );
};
