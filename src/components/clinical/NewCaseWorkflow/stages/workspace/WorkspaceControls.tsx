/**
 * MEDiKIOSK — Clinical Workspace Layout Controls
 *
 * Subtle, discoverable, accessible controls in the Clinical History header:
 * - Focused mode (centered, spacious single-panel clinical intake)
 * - Split mode (side-by-side multitasking with Medical Records)
 * - Expand / Restore (maximizes Clinical History to full available workspace or restores previous mode)
 */

import React from 'react';
import { Columns2, Maximize2, Minimize2, Square } from 'lucide-react';
import { ClinicalWorkspaceMode } from '../../types';

export interface WorkspaceControlsProps {
  mode: ClinicalWorkspaceMode;
  onSelectMode: (mode: ClinicalWorkspaceMode) => void;
  onExpand: () => void;
  onRestore: () => void;
  className?: string;
}

export const WorkspaceControls: React.FC<WorkspaceControlsProps> = ({
  mode,
  onSelectMode,
  onExpand,
  onRestore,
  className = ''
}) => {
  const isExpanded = mode === 'expanded';

  return (
    <div
      className={`mk-workspace-controls ${className}`}
      role="group"
      aria-label="Clinical workspace layout controls"
    >
      {/* Mode Segmented Group */}
      <div className="mk-workspace-controls__group" role="radiogroup" aria-label="Layout view mode">
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'focused'}
          className={`mk-workspace-ctrl-btn ${
            mode === 'focused' ? 'mk-workspace-ctrl-btn--active' : ''
          }`}
          onClick={() => onSelectMode('focused')}
          title="Focused mode (generous single conversation view)"
          aria-label="Focused workspace mode"
        >
          <Square size={13} className="mk-workspace-ctrl-icon" aria-hidden="true" />
          <span className="mk-workspace-ctrl-label">Focused</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={mode === 'split'}
          className={`mk-workspace-ctrl-btn ${
            mode === 'split' ? 'mk-workspace-ctrl-btn--active' : ''
          }`}
          onClick={() => onSelectMode('split')}
          title="Split workspace (multitask with medical records side-by-side)"
          aria-label="Split workspace mode"
        >
          <Columns2 size={13} className="mk-workspace-ctrl-icon" aria-hidden="true" />
          <span className="mk-workspace-ctrl-label">Split</span>
        </button>
      </div>

      {/* Expand / Restore Action */}
      {isExpanded ? (
        <button
          type="button"
          className="mk-workspace-action-btn mk-workspace-action-btn--restore"
          onClick={onRestore}
          title="Restore workspace to standard view"
          aria-label="Restore workspace view"
        >
          <Minimize2 size={13} className="mk-workspace-action-icon" aria-hidden="true" />
          <span>Restore</span>
        </button>
      ) : (
        <button
          type="button"
          className="mk-workspace-action-btn mk-workspace-action-btn--expand"
          onClick={onExpand}
          title="Expand Clinical History to full available workspace"
          aria-label="Expand to full workspace"
        >
          <Maximize2 size={13} className="mk-workspace-action-icon" aria-hidden="true" />
          <span>Expand</span>
        </button>
      )}
    </div>
  );
};
