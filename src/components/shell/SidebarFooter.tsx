/**
 * MEDiKIOSK — PHASE 01
 * Sidebar Footer & Session Area Component
 */

import React from 'react';
import { CircleHelp, Settings, User as UserIcon, ChevronRight } from 'lucide-react';
import { UserSession } from '../../services/auth.service';

export interface SidebarFooterProps {
  collapsed?: boolean;
  session?: UserSession | null;
  onHelp?: () => void;
  onSettings?: () => void;
  onUser?: () => void;
  onSignIn?: () => void;
  isHelpOpen?: boolean;
  isSettingsOpen?: boolean;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  collapsed = false,
  session = null,
  onHelp,
  onSettings,
  onUser,
  onSignIn,
  isHelpOpen = false,
  isSettingsOpen = false
}) => {
  const isAuthenticated = Boolean(session);

  return (
    <footer className="sidebar-footer" role="contentinfo">
      {/* Help & Support Link */}
      <button
        type="button"
        className={`nav-item ${isHelpOpen ? 'nav-item--active' : ''}`}
        onClick={onHelp}
        title={collapsed ? 'Help & Support' : undefined}
      >
        <span className="nav-icon" aria-hidden="true">
          <CircleHelp size={18} />
        </span>
        {!collapsed && <span>Help & Support</span>}
      </button>

      {/* Settings Link */}
      <button
        type="button"
        className={`nav-item ${isSettingsOpen ? 'nav-item--active' : ''}`}
        onClick={onSettings}
        title={collapsed ? 'System Settings' : undefined}
      >
        <span className="nav-icon" aria-hidden="true">
          <Settings size={18} />
        </span>
        {!collapsed && <span>Settings</span>}
      </button>

      {!collapsed && <hr className="sidebar-divider" />}

      {/* User / Session Area (Reference 01 & 06) */}
      <button
        type="button"
        className={`user-session-row ${!isAuthenticated ? 'user-session-row--sign-in' : ''}`}
        onClick={isAuthenticated ? onUser : (onSignIn || onUser)}
        aria-label={isAuthenticated ? `${session?.userName} profile` : 'Sign in to MEDiKIOSK'}
        title={
          collapsed
            ? isAuthenticated
              ? `${session?.userName} • Online`
              : 'Sign in'
            : undefined
        }
      >
        <div className="user-session-main">
          <div className="user-avatar-circle" aria-hidden="true">
            <UserIcon size={16} />
          </div>

          {!collapsed && (
            <div className="user-session-text">
              {isAuthenticated ? (
                <>
                  <span className="user-session-name">{session?.userName}</span>
                  <div className="user-session-status">
                    <span className="user-status-dot" aria-hidden="true" />
                    <span>Online</span>
                  </div>
                </>
              ) : (
                <span className="user-session-name" style={{ fontWeight: 500, color: 'var(--theme-text-primary)' }}>
                  Sign in
                </span>
              )}
            </div>
          )}
        </div>

        {!collapsed && (
          <ChevronRight size={15} color="var(--theme-text-muted)" aria-hidden="true" />
        )}
      </button>
    </footer>
  );
};
