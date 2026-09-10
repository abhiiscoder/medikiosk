/**
 * MEDiKIOSK — PHASE 00
 * Accessible Alert Component
 */

import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';
import './Alert.css';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const ICONS: Record<AlertType, React.ReactNode> = {
  info: <Info size={18} />,
  success: <CheckCircle2 size={18} />,
  warning: <AlertTriangle size={18} />,
  error: <AlertCircle size={18} />
};

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onClose,
  className = ''
}) => {
  return (
    <div className={`mk-alert mk-alert--${type} ${className}`} role="alert">
      <div className="mk-alert__icon" aria-hidden="true">
        {ICONS[type]}
      </div>
      <div className="mk-alert__content">
        {title && <div className="mk-alert__title">{title}</div>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          className="mk-alert__close"
          onClick={onClose}
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
