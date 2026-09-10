import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Settings as SettingsIcon,
  ArrowLeft,
  Folder,
  FileText,
  FileCheck,
  Shield,
  Info,
  List,
  ChevronRight
} from 'lucide-react';
import {
  notificationService,
  NotificationItem,
  NotificationCategory,
  NotificationPreferences
} from '../../services/notification.service';
import './NotificationPanel.css';

export interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateAction?: (route: string) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  onNavigateAction
}) => {
  const [view, setView] = useState<'list' | 'settings'>('list');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    notificationService.getPreferences()
  );
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync notifications and preferences from service
  const refreshData = () => {
    setNotifications(notificationService.getNotifications(filter));
    setPreferences(notificationService.getPreferences());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = notificationService.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, [filter]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    // Delay listener slightly to prevent immediate toggle close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTogglePreference = (cat: NotificationCategory) => {
    const next = !preferences[cat];
    notificationService.setPreference(cat, next);
    setPreferences((prev) => ({ ...prev, [cat]: next }));
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead();
    refreshData();
  };

  const handleItemClick = (item: NotificationItem) => {
    notificationService.markAsRead(item.id);
    refreshData();
    if (item.actionRoute) {
      onNavigateAction?.(item.actionRoute);
      onClose();
    }
  };

  const formatTime = (iso: string) => {
    try {
      const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const getCategoryIcon = (cat: NotificationCategory) => {
    switch (cat) {
      case 'case_updates':
        return <Folder size={16} />;
      case 'document_processing':
        return <FileText size={16} />;
      case 'clinical_summaries':
        return <FileCheck size={16} />;
      case 'account_security':
        return <Shield size={16} />;
      case 'system_notifications':
        return <SettingsIcon size={16} />;
    }
  };

  return (
    <div
      ref={panelRef}
      className={`mk-notif-panel ${view === 'settings' ? 'mk-notif-panel--settings' : ''}`}
      role="region"
      aria-label="Notifications"
    >
      {/* Upward pointer notch aligned with header bell */}
      <div className="mk-notif-notch" aria-hidden="true" />

      {view === 'list' ? (
        <div className="mk-notif-view">
          {/* Main Panel Header */}
          <div className="mk-notif-header">
            <h2 className="mk-notif-title">Notifications</h2>
            <button
              type="button"
              className="mk-notif-gear-btn"
              onClick={() => setView('settings')}
              title="Notification settings"
              aria-label="Notification settings"
            >
              <SettingsIcon size={17} />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="mk-notif-filter-bar">
            <div className="mk-notif-pills" role="tablist" aria-label="Notification filters">
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'all'}
                className={`mk-notif-pill ${filter === 'all' ? 'mk-notif-pill--active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'unread'}
                className={`mk-notif-pill ${filter === 'unread' ? 'mk-notif-pill--active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                Unread
              </button>
            </div>

            <button
              type="button"
              className="mk-notif-mark-read-btn"
              onClick={handleMarkAllRead}
            >
              Mark all as read
            </button>
          </div>

          {/* Body Content */}
          {notifications.length === 0 ? (
            <div className="mk-notif-empty-state">
              <div className="mk-notif-empty-icon" aria-hidden="true">
                <Bell size={42} strokeWidth={1.4} />
              </div>
              <h3 className="mk-notif-empty-title">You're all caught up.</h3>
              <p className="mk-notif-empty-sub">No new notifications.</p>
              <p className="mk-notif-empty-text">
                We'll notify you here when there are updates about your cases, documents,
                summaries or important account activity.
              </p>

              <div className="mk-notif-empty-bottom">
                <button
                  type="button"
                  className="mk-notif-view-all-btn"
                  onClick={() => setFilter('all')}
                >
                  <List size={16} />
                  <span>View all notifications</span>
                  <ChevronRight size={15} className="mk-notif-chevron" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mk-notif-list" role="list">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`mk-notif-item ${!item.read ? 'mk-notif-item--unread' : ''}`}
                  onClick={() => handleItemClick(item)}
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleItemClick(item)}
                >
                  <div className="mk-notif-cat-badge">{getCategoryIcon(item.category)}</div>
                  <div className="mk-notif-item-body">
                    <div className="mk-notif-item-top">
                      <span className="mk-notif-item-title">{item.title}</span>
                      <span className="mk-notif-item-time">{formatTime(item.timestamp)}</span>
                    </div>
                    <p className="mk-notif-item-desc">{item.message}</p>
                  </div>
                  {!item.read && <span className="mk-notif-item-unread-dot" aria-label="Unread" />}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Notification Settings View (Reference A right panel) */
        <div className="mk-notif-settings-view">
          <div className="mk-notif-settings-header">
            <button
              type="button"
              className="mk-notif-back-btn"
              onClick={() => setView('list')}
              aria-label="Back to notifications"
              title="Back to notifications"
            >
              <ArrowLeft size={17} />
            </button>
            <h2 className="mk-notif-title">Notification settings</h2>
          </div>

          <p className="mk-notif-settings-subtext">
            Choose which MEDiKIOSK events you want to be notified about.
          </p>

          <div className="mk-notif-toggle-list">
            {/* Case updates */}
            <div className="mk-notif-toggle-row">
              <div className="mk-notif-toggle-icon">
                <Folder size={19} />
              </div>
              <div className="mk-notif-toggle-info">
                <h4 className="mk-notif-toggle-title">Case updates</h4>
                <p className="mk-notif-toggle-desc">
                  Get notified when your case is created, updated or processing is completed.
                </p>
              </div>
              <label className="mk-switch">
                <input
                  type="checkbox"
                  checked={preferences.case_updates}
                  onChange={() => handleTogglePreference('case_updates')}
                  aria-label="Toggle case updates notifications"
                />
                <span className="mk-slider" />
              </label>
            </div>

            {/* Document processing */}
            <div className="mk-notif-toggle-row">
              <div className="mk-notif-toggle-icon">
                <FileText size={19} />
              </div>
              <div className="mk-notif-toggle-info">
                <h4 className="mk-notif-toggle-title">Document processing</h4>
                <p className="mk-notif-toggle-desc">
                  Get notified when document upload, OCR or processing is completed.
                </p>
              </div>
              <label className="mk-switch">
                <input
                  type="checkbox"
                  checked={preferences.document_processing}
                  onChange={() => handleTogglePreference('document_processing')}
                  aria-label="Toggle document processing notifications"
                />
                <span className="mk-slider" />
              </label>
            </div>

            {/* Clinical summaries */}
            <div className="mk-notif-toggle-row">
              <div className="mk-notif-toggle-icon">
                <FileCheck size={19} />
              </div>
              <div className="mk-notif-toggle-info">
                <h4 className="mk-notif-toggle-title">Clinical summaries</h4>
                <p className="mk-notif-toggle-desc">
                  Get notified when a clinical summary is generated and ready.
                </p>
              </div>
              <label className="mk-switch">
                <input
                  type="checkbox"
                  checked={preferences.clinical_summaries}
                  onChange={() => handleTogglePreference('clinical_summaries')}
                  aria-label="Toggle clinical summaries notifications"
                />
                <span className="mk-slider" />
              </label>
            </div>

            {/* Account & security */}
            <div className="mk-notif-toggle-row">
              <div className="mk-notif-toggle-icon">
                <Shield size={19} />
              </div>
              <div className="mk-notif-toggle-info">
                <h4 className="mk-notif-toggle-title">Account & security</h4>
                <p className="mk-notif-toggle-desc">
                  Get important account and security notifications.
                </p>
              </div>
              <label className="mk-switch">
                <input
                  type="checkbox"
                  checked={preferences.account_security}
                  onChange={() => handleTogglePreference('account_security')}
                  aria-label="Toggle account and security notifications"
                />
                <span className="mk-slider" />
              </label>
            </div>

            {/* System notifications */}
            <div className="mk-notif-toggle-row">
              <div className="mk-notif-toggle-icon">
                <SettingsIcon size={19} />
              </div>
              <div className="mk-notif-toggle-info">
                <h4 className="mk-notif-toggle-title">System notifications</h4>
                <p className="mk-notif-toggle-desc">
                  Get notified about important system events and announcements.
                </p>
              </div>
              <label className="mk-switch">
                <input
                  type="checkbox"
                  checked={preferences.system_notifications}
                  onChange={() => handleTogglePreference('system_notifications')}
                  aria-label="Toggle system notifications"
                />
                <span className="mk-slider" />
              </label>
            </div>
          </div>

          <div className="mk-notif-settings-footer">
            <Info size={16} className="mk-notif-info-icon" aria-hidden="true" />
            <span>
              You will only receive notifications for events that are enabled and supported by
              your MEDiKIOSK account.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
