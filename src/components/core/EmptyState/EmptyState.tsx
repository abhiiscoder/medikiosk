/**
 * MEDiKIOSK — PHASE 00
 * Reusable EmptyState Component
 */

import React from 'react';
import { Inbox } from 'lucide-react';
import './EmptyState.css';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = <Inbox size={24} />,
  action,
  className = ''
}) => {
  return (
    <div className={`mk-state-container ${className}`}>
      <div className="mk-state-icon mk-state-icon--empty" aria-hidden="true">
        {icon}
      </div>
      <h3 className="mk-state-title">{title}</h3>
      {description && <p className="mk-state-description">{description}</p>}
      {action && <div className="mk-state-action">{action}</div>}
    </div>
  );
};
