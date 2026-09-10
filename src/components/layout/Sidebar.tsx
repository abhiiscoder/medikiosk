/**
 * MEDiKIOSK — PHASE 00
 * Sidebar Navigation Component
 */

import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  ShieldCheck 
} from 'lucide-react';
import { IconButton } from '../core/IconButton/IconButton';
import './Layout.css';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}

export interface SidebarProps {
  items: SidebarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeId,
  onSelect,
  collapsed = false,
  onToggleCollapse
}) => {
  return (
    <aside
      className={`mk-sidebar ${collapsed ? 'mk-sidebar--collapsed' : ''}`}
      aria-label="Clinical workspace navigation"
    >
      <div className="mk-sidebar__header">
        {!collapsed && (
          <div className="mk-sidebar__brand">
            <Activity size={22} color="var(--color-brand-primary)" />
            <span>MEDiKIOSK</span>
          </div>
        )}
        {onToggleCollapse && (
          <IconButton
            icon={collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
          />
        )}
      </div>

      <nav className="mk-sidebar__nav">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              className={`mk-sidebar__item ${isActive ? 'mk-sidebar__item--active' : ''}`}
              onClick={() => onSelect(item.id)}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="mk-sidebar__item-icon" aria-hidden="true">
                {item.icon}
              </span>
              {!collapsed && (
                <>
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  {item.badge}
                </>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mk-sidebar__footer">
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="var(--color-status-success)" />
            <span className="text-metadata text-muted">SIH'26 Clinical Sandbox</span>
          </div>
        )}
      </div>
    </aside>
  );
};
