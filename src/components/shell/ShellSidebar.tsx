/**
 * MEDiKIOSK — PHASE 01
 * ShellSidebar Composite Component
 */

import React from 'react';
import { Brand } from './Brand';
import { SidebarCollapseButton } from './SidebarCollapseButton';
import { NewCaseButton } from './NewCaseButton';
import { PrimaryNavigation, NavItemId } from './PrimaryNavigation';
import { SidebarFooter } from './SidebarFooter';

import { UserSession } from '../../services/auth.service';

export interface ShellSidebarProps {
  activeNav: NavItemId;
  onSelectNav: (id: NavItemId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNewCase: () => void;
  onHelp: () => void;
  onSettings: () => void;
  onUser: () => void;
  isHelpOpen?: boolean;
  isSettingsOpen?: boolean;
  onSignIn?: () => void;
  session?: UserSession | null;
}

export const ShellSidebar: React.FC<ShellSidebarProps> = ({
  activeNav,
  onSelectNav,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onNewCase,
  onHelp,
  onSettings,
  onUser,
  onSignIn,
  session,
  isHelpOpen = false,
  isSettingsOpen = false
}) => {
  const sidebarClasses = [
    'shell-sidebar',
    collapsed ? 'shell-sidebar--collapsed' : '',
    mobileOpen ? 'shell-sidebar--open' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'sidebar-overlay--visible' : ''}`}
        onClick={onCloseMobile}
        role="presentation"
        aria-hidden={!mobileOpen}
      />

      <aside className={sidebarClasses} aria-label="MEDiKIOSK Navigation Sidebar">
        {/* Top Branding & Collapse button */}
        <div className="sidebar-header">
          <Brand collapsed={collapsed} />
          <SidebarCollapseButton collapsed={collapsed} onToggle={onToggleCollapse} />
        </div>

        {/* Primary CTA: + New Case */}
        <NewCaseButton
          onClick={onNewCase}
          collapsed={collapsed}
          isActive={activeNav === 'new-case'}
        />

        {/* Navigation items */}
        <PrimaryNavigation
          activeId={activeNav}
          onSelect={(id) => {
            onSelectNav(id);
            onCloseMobile();
          }}
          collapsed={collapsed}
        />

        {/* Footer actions: Help, Settings, User Online / Sign In */}
        <SidebarFooter
          collapsed={collapsed}
          session={session}
          onHelp={onHelp}
          onSettings={onSettings}
          onUser={onUser}
          onSignIn={onSignIn}
          isHelpOpen={isHelpOpen}
          isSettingsOpen={isSettingsOpen}
        />
      </aside>
    </>
  );
};
