/**
 * MEDiKIOSK — PHASE 01
 * Workspace Header Component
 */

import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, User, ChevronDown, LogOut } from 'lucide-react';
import { UserSession } from '../../services/auth.service';
import { NotificationPanel } from '../notifications/NotificationPanel';

export interface WorkspaceHeaderProps {
  onToggleMobileSidebar: () => void;
  onNotificationClick?: () => void;
  onUserMenuClick?: () => void;
  onSignInClick?: () => void;
  onLogout?: () => void;
  session?: UserSession | null;
  unreadCount?: number;
  isNotificationsOpen?: boolean;
  onCloseNotifications?: () => void;
  onNavigateAction?: (route: string) => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  onToggleMobileSidebar,
  onNotificationClick,
  onUserMenuClick,
  onSignInClick,
  onLogout,
  session = null,
  unreadCount = 0,
  isNotificationsOpen = false,
  onCloseNotifications,
  onNavigateAction
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const profilePopoverRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = Boolean(session);

  // Close user profile popover when clicking outside
  useEffect(() => {
    if (!isProfileOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        profilePopoverRef.current &&
        !profilePopoverRef.current.contains(target) &&
        profileBtnRef.current &&
        !profileBtnRef.current.contains(target)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  return (
    <header className="workspace-header" role="banner">
      {/* Left section: Hamburger + Titles */}
      <div className="header-left">
        <button
          type="button"
          className="header-menu-btn"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle workspace navigation sidebar"
          title="Toggle navigation"
        >
          <Menu size={20} />
        </button>

        <div className="header-titles">
          <h1 className="header-main-title">Clinical Workspace</h1>
          <span className="header-sub-title">Secure. Intelligent. Patient-Centric.</span>
        </div>
      </div>

      {/* Right section: Tools, User avatar, Slogan */}
      <div className="header-right">
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`header-icon-btn ${isNotificationsOpen ? 'header-icon-btn--active' : ''}`}
            onClick={onNotificationClick}
            aria-label="Notifications"
            title="Notifications"
            style={{ position: 'relative' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#1865F2',
                  boxShadow: '0 0 6px #1865F2'
                }}
                aria-label={`${unreadCount} unread notifications`}
              />
            )}
          </button>

          {isNotificationsOpen && (
            <NotificationPanel
              isOpen={isNotificationsOpen}
              onClose={onCloseNotifications || (() => {})}
              onNavigateAction={onNavigateAction}
            />
          )}
        </div>

        <div className="header-vertical-divider" aria-hidden="true" />

        {/* User Account / Profile Area (Reference 01 & 06) */}
        {isAuthenticated && session ? (
          <div style={{ position: 'relative' }}>
            <button
              ref={profileBtnRef}
              type="button"
              className="header-user-btn"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-label={`${session.userName} account menu`}
              title={`${session.userName} (${session.medikioskId})`}
            >
              <div className="header-user-avatar" aria-hidden="true">
                <User size={16} />
              </div>
              <ChevronDown size={14} color="var(--theme-text-muted)" aria-hidden="true" />
            </button>

            {isProfileOpen && (
              <div
                ref={profilePopoverRef}
                className="mk-user-profile-popover"
                role="menu"
                aria-label="User account menu"
              >
                <div className="mk-user-popover__name">{session.userName}</div>
                <div className="mk-user-popover__id">ID: {session.medikioskId}</div>
                <div className="mk-user-popover__role">
                  {session.role.replace('_', ' ').toUpperCase()}
                </div>
                <hr className="mk-user-popover__divider" />
                <button
                  type="button"
                  className="mk-user-popover__logout-btn"
                  role="menuitem"
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout?.();
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="header-user-btn"
            onClick={onSignInClick || onUserMenuClick}
            aria-label="Sign in to MEDiKIOSK"
            title="Sign in to MEDiKIOSK"
          >
            <div className="header-user-avatar" aria-hidden="true">
              <User size={16} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--theme-text-primary)', paddingRight: '2px' }}>
              Sign in
            </span>
            <ChevronDown size={14} color="var(--theme-text-muted)" aria-hidden="true" />
          </button>
        )}

        <div className="header-vertical-divider" aria-hidden="true" />

        <div className="header-phrase" aria-hidden="true">
          <span className="header-phrase-top">Smarter Care.</span>
          <span className="header-phrase-bottom">Together.</span>
        </div>
      </div>
    </header>
  );
};
