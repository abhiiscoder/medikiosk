/**
 * MEDiKIOSK — PHASE 00
 * Reusable LoadingState Component
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import '../EmptyState/EmptyState.css';

export interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Processing clinical data...',
  description,
  className = ''
}) => {
  return (
    <div className={`mk-state-container ${className}`} role="status" aria-live="polite">
      <div className="mk-state-icon mk-state-icon--loading" aria-hidden="true">
        <Loader2 size={24} className="mk-btn__spinner" />
      </div>
      <h3 className="mk-state-title">{title}</h3>
      {description && <p className="mk-state-description">{description}</p>}
    </div>
  );
};
