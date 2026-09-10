/**
 * MEDiKIOSK — PHASE 00
 * Divider Component
 */

import React from 'react';
import '../Progress/Progress.css';

export interface DividerProps {
  vertical?: boolean;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ vertical = false, className = '' }) => {
  return (
    <div
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      className={`mk-divider ${vertical ? 'mk-divider--vertical' : ''} ${className}`}
    />
  );
};
