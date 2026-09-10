/**
 * MEDiKIOSK — PHASE 00
 * Accessible Drawer Component
 */

import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../IconButton/IconButton';
import './Drawer.css';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer
}) => {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="mk-drawer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="mk-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mk-drawer-header">
          <h2 id={titleId} className="mk-drawer-title">
            {title}
          </h2>
          <IconButton
            icon={<X size={18} />}
            aria-label="Close drawer"
            variant="ghost"
            size="sm"
            onClick={onClose}
          />
        </div>
        <div className="mk-drawer-body">{children}</div>
        {footer && <div className="mk-drawer-footer">{footer}</div>}
      </div>
    </div>
  );
};
