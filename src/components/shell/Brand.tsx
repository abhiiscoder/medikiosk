/**
 * MEDiKIOSK — PHASE 01
 * Sidebar Brand Component
 */

import React from 'react';
import { ClinicalAiLogo } from '../../assets/ClinicalAiLogo';

export interface BrandProps {
  collapsed?: boolean;
}

export const Brand: React.FC<BrandProps> = ({ collapsed = false }) => {
  return (
    <div className="brand-wrapper" title="MEDiKIOSK — AI-Powered Clinical Workspace">
      <div className="brand-logo-icon">
        <ClinicalAiLogo size={32} />
      </div>

      {!collapsed && (
        <div className="brand-text-block">
          <div className="brand-wordmark">
            MEDi<span className="brand-accent">KIOSK</span>
          </div>
          <span className="brand-subtitle">AI-Powered Clinical Workspace</span>
        </div>
      )}
    </div>
  );
};
