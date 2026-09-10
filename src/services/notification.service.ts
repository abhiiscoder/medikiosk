/**
 * MEDiKIOSK — Notification Service
 * Manages in-app notifications, preferences, and event persistence.
 */

export type NotificationCategory =
  | 'case_updates'
  | 'document_processing'
  | 'clinical_summaries'
  | 'account_security'
  | 'system_notifications';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionRoute?: string;
  metadata?: Record<string, unknown>;
}

export type NotificationPreferences = Record<NotificationCategory, boolean>;

const DEFAULT_PREFERENCES: NotificationPreferences = {
  case_updates: true,
  document_processing: true,
  clinical_summaries: true,
  account_security: true,
  system_notifications: true
};

const STORAGE_KEY_NOTIFS = 'medikiosk_notifications';
const STORAGE_KEY_PREFS = 'medikiosk_notification_preferences';

class NotificationService {
  private listeners: Set<() => void> = new Set();

  private readNotifications(): NotificationItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_NOTIFS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private writeNotifications(items: NotificationItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(items));
      this.notify();
    } catch {
      // Ignore storage errors
    }
  }

  public getPreferences(): NotificationPreferences {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFS);
      if (data) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(data) };
      }
    } catch {
      // Fallback
    }
    return { ...DEFAULT_PREFERENCES };
  }

  public setPreference(category: NotificationCategory, enabled: boolean): void {
    try {
      const current = this.getPreferences();
      current[category] = enabled;
      localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(current));
      this.notify();
    } catch {
      // Ignore
    }
  }

  public getNotifications(filter: 'all' | 'unread' = 'all'): NotificationItem[] {
    const prefs = this.getPreferences();
    const all = this.readNotifications();
    // Only return notifications for categories that are enabled
    const filteredByCategory = all.filter((item) => prefs[item.category] !== false);

    if (filter === 'unread') {
      return filteredByCategory.filter((item) => !item.read);
    }
    return filteredByCategory;
  }

  public getUnreadCount(): number {
    return this.getNotifications('unread').length;
  }

  public addNotification(
    category: NotificationCategory,
    title: string,
    message: string,
    actionRoute?: string,
    metadata?: Record<string, unknown>
  ): NotificationItem | null {
    const prefs = this.getPreferences();
    // Do not record if category disabled by user preference
    if (prefs[category] === false) {
      return null;
    }

    const item: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      category,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      actionRoute,
      metadata
    };

    const current = this.readNotifications();
    current.unshift(item);
    // Keep max 50 recent items
    const trimmed = current.slice(0, 50);
    this.writeNotifications(trimmed);
    return item;
  }

  public markAsRead(id: string): void {
    const current = this.readNotifications();
    const updated = current.map((item) => (item.id === id ? { ...item, read: true } : item));
    this.writeNotifications(updated);
  }

  public markAllAsRead(): void {
    const current = this.readNotifications();
    const updated = current.map((item) => ({ ...item, read: true }));
    this.writeNotifications(updated);
  }

  public clearAll(): void {
    this.writeNotifications([]);
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Safe listener execution
      }
    });
  }
}

export const notificationService = new NotificationService();
