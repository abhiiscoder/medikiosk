/**
 * MEDiKIOSK — PHASE 00
 * AppShell Layout Primitive
 */

import React, { useState } from 'react';
import { Sidebar, SidebarItem } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from '../core/Toast/ToastContainer';
import './Layout.css';

export interface AppShellProps {
  sidebarItems: SidebarItem[];
  activeItemId: string;
  onSelectItem: (id: string) => void;
  title?: string;
  stationName?: string;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  sidebarItems,
  activeItemId,
  onSelectItem,
  title = 'MEDiKIOSK Clinical Workspace',
  stationName = 'Kiosk Station 04',
  children
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="mk-app-shell">
      <Sidebar
        items={sidebarItems}
        activeId={activeItemId}
        onSelect={onSelectItem}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <div className="mk-workspace">
        <TopBar
          title={title}
          stationName={stationName}
        />
        <main className="mk-content-area" role="main">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
