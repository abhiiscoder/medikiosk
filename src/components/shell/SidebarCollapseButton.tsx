/**
 * MEDiKIOSK — PHASE 01
 * Sidebar Collapse Button Component
 */

import React from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface SidebarCollapseButtonProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const SidebarCollapseButton: React.FC<SidebarCollapseButtonProps> = ({
  collapsed,
  onToggle
}) => {
  return (
    <button
      type="button"
      className="sidebar-collapse-btn"
      onClick={onToggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
    </button>
  );
};
