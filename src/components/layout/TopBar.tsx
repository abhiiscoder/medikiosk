/**
 * MEDiKIOSK — PHASE 00
 * TopBar Component
 */

import React from 'react';
import { Wifi, Lock, Bell } from 'lucide-react';
import { StatusIndicator } from '../core/StatusIndicator/StatusIndicator';
import { Badge } from '../core/Badge/Badge';
import './Layout.css';

export interface TopBarProps {
  title?: string;
  stationName?: string;
  rightSlot?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({
  title = 'MEDiKIOSK Foundation Explorer',
  stationName = 'Station 04 (Adult Intake)',
  rightSlot
}) => {
  return (
    <header className="mk-topbar" role="banner">
      <div className="mk-topbar__left">
        <h2 className="text-title-page" style={{ fontSize: '1.0625rem', fontWeight: 600 }}>
          {title}
        </h2>
        <Badge variant="brand" pill>
          {stationName}
        </Badge>
      </div>

      <div className="mk-topbar__right">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusIndicator status="active" label="Kiosk Mesh Connected" pulse />
          <Wifi size={16} color="var(--color-status-success)" />
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-border-default)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Lock size={14} color="var(--color-text-muted)" />
          <span className="text-metadata text-mono">ABDM Gateway: Ready</span>
        </div>

        {rightSlot}
      </div>
    </header>
  );
};
