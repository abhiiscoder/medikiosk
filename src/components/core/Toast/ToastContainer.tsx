/**
 * MEDiKIOSK — PHASE 00
 * Toast Container Component
 */

import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { useToast, ToastType, ToastItem } from '../../../hooks/useToast';
import './ToastContainer.css';

const ICONS: Record<ToastType, React.ReactNode> = {
  info: <Info size={18} />,
  success: <CheckCircle2 size={18} />,
  warning: <AlertTriangle size={18} />,
  error: <AlertCircle size={18} />
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="mk-toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`mk-toast mk-toast--${toast.type}`} role="status">
          <div className="mk-toast__icon" aria-hidden="true">
            {ICONS[toast.type]}
          </div>
          <div className="mk-toast__content">
            <div className="mk-toast__title">{toast.title}</div>
            {toast.message && <div className="mk-toast__message">{toast.message}</div>}
          </div>
          <button
            type="button"
            className="mk-toast__close"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
};
