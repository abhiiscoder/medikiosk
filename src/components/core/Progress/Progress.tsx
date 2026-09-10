/**
 * MEDiKIOSK — PHASE 00
 * Accessible Progress Component
 */

import React from 'react';
import './Progress.css';

export interface ProgressProps {
  value?: number; // 0 - 100
  max?: number;
  indeterminate?: boolean;
  status?: 'brand' | 'success' | 'warning' | 'error';
  label?: string;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value = 0,
  max = 100,
  indeterminate = false,
  status = 'brand',
  label,
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={`mk-progress-track ${indeterminate ? 'mk-progress-track--indeterminate' : ''} ${className}`}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label || 'Clinical Operation Progress'}
    >
      <div
        className={`mk-progress-bar mk-progress-bar--${status}`}
        style={{ width: indeterminate ? undefined : `${percentage}%` }}
      />
    </div>
  );
};
