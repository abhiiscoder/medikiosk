/**
 * MEDiKIOSK — PHASE 01
 * Primary "+ New Case" Action Button
 */

import React from 'react';
import { SquarePen } from 'lucide-react';

export interface NewCaseButtonProps {
  onClick?: () => void;
  collapsed?: boolean;
  isCenter?: boolean;
  isActive?: boolean;
  className?: string;
}

export const NewCaseButton: React.FC<NewCaseButtonProps> = ({
  onClick,
  collapsed = false,
  isCenter = false,
  isActive = false,
  className = ''
}) => {
  const btnClasses = isCenter
    ? `empty-state-new-case-btn ${className}`
    : `sidebar-new-case-btn ${isActive ? 'sidebar-new-case-btn--active' : ''} ${className}`;

  return (
    <button
      type="button"
      className={btnClasses}
      onClick={onClick}
      aria-label="Start New Patient Case"
      title="Start New Patient Case"
    >
      <SquarePen size={18} strokeWidth={2} />
      {(!collapsed || isCenter) && <span>New Case</span>}
    </button>
  );
};
