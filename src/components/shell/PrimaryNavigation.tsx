/**
 * MEDiKIOSK — PHASE 01
 * Primary Navigation Component
 */

import React from 'react';
import { Home } from 'lucide-react';

export type NavItemId = 'home' | 'new-case';

export interface PrimaryNavigationProps {
  activeId: NavItemId;
  onSelect: (id: NavItemId) => void;
  collapsed?: boolean;
}

export const NAV_ITEMS = [
  { id: 'home' as NavItemId, label: 'Home', icon: <Home size={18} /> }
];

export const PrimaryNavigation: React.FC<PrimaryNavigationProps> = ({
  activeId,
  onSelect,
  collapsed = false
}) => {
  return (
    <nav className="sidebar-nav" aria-label="Primary clinical workspace navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === activeId;
        const classes = [
          'nav-item',
          isActive ? 'nav-item--active' : ''
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={item.id}
            type="button"
            className={classes}
            onClick={() => onSelect(item.id)}
            aria-current={isActive ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );
};
