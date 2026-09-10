/**
 * MEDiKIOSK — PHASE 00
 * Accessible Tabs Component
 */

import React, { useState, useId } from 'react';
import './Tabs.css';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  activeTabId?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTabId,
  activeTabId: controlledActiveId,
  onChange,
  className = ''
}) => {
  const [internalActiveId, setInternalActiveId] = useState<string>(
    controlledActiveId || defaultTabId || tabs[0]?.id || ''
  );
  const activeId = controlledActiveId !== undefined ? controlledActiveId : internalActiveId;
  const baseId = useId();

  const handleSelect = (tabId: string) => {
    if (controlledActiveId === undefined) {
      setInternalActiveId(tabId);
    }
    onChange?.(tabId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else {
      return;
    }

    e.preventDefault();
    const nextTab = tabs[nextIndex];
    if (nextTab && !nextTab.disabled) {
      handleSelect(nextTab.id);
      const tabElement = document.getElementById(`${baseId}-tab-${nextTab.id}`);
      tabElement?.focus();
    }
  };

  const currentTab = tabs.find((t) => t.id === activeId);

  return (
    <div className={`mk-tabs ${className}`}>
      <div className="mk-tab-list" role="tablist">
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeId;
          const tabElementId = `${baseId}-tab-${tab.id}`;
          const panelElementId = `${baseId}-panel-${tab.id}`;

          return (
            <button
              key={tab.id}
              id={tabElementId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelElementId}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              className={`mk-tab-btn ${isActive ? 'mk-tab-btn--active' : ''}`}
              onClick={() => handleSelect(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge && <span>{tab.badge}</span>}
            </button>
          );
        })}
      </div>

      {currentTab && (
        <div
          id={`${baseId}-panel-${currentTab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${currentTab.id}`}
          className="mk-tab-panel"
          tabIndex={0}
        >
          {currentTab.content}
        </div>
      )}
    </div>
  );
};
