/**
 * MEDiKIOSK — Phase 01: New Case Architecture
 * WorkflowHeader Component
 *
 * Dedicated workflow-level header communicating New Case session and active stage.
 * Preserves the existing MEDiKIOSK visual language and does not replace the global header.
 */

import React from 'react';
import { SquarePen, ChevronRight, Activity, CheckCircle2 } from 'lucide-react';
import { useCaseWorkflow } from './hooks/useCaseWorkflow';
import { WORKFLOW_STAGES } from './types';

export interface WorkflowHeaderProps {
  onReturnHome?: () => void;
  className?: string;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  onReturnHome,
  className = ''
}) => {
  const { caseId, currentStage, isIntakeStarted, stageStatuses } = useCaseWorkflow();

  const currentStageDef = WORKFLOW_STAGES.find((s) => s.id === currentStage);

  return (
    <div className={`mk-workflow-header ${className}`} role="region" aria-label="Case workflow header">
      <div className="mk-workflow-header__left">
        {/* New Case Badge */}
        <div className="mk-workflow-header__case-badge">
          <SquarePen size={14} className="mk-workflow-header__case-icon" />
          <span className="mk-workflow-header__case-title">New Case</span>
          {caseId && (
            <span className="mk-workflow-header__case-id">
              {caseId}
            </span>
          )}
        </div>

        <ChevronRight size={14} className="mk-workflow-header__separator" aria-hidden="true" />

        {/* Current Stage Indicator */}
        <div className="mk-workflow-header__stage-info">
          <span className="mk-workflow-header__stage-name">
            {currentStageDef?.label ?? 'Intake'}
          </span>
          <span className="mk-workflow-header__stage-num">
            Stage {currentStageDef?.order ?? 1} of 3
          </span>
        </div>
      </div>

      <div className="mk-workflow-header__right">
        {stageStatuses['clinical-history'] === 'completed' ? (
          <div className="mk-workflow-header__live-status mk-workflow-header__live-status--completed">
            <CheckCircle2 size={13} className="mk-workflow-header__completed-icon" />
            <span>Clinical History Complete</span>
          </div>
        ) : isIntakeStarted ? (
          <div className="mk-workflow-header__live-status">
            <Activity size={13} className="mk-workflow-header__live-icon" />
            <span>Clinical Session Active</span>
          </div>
        ) : (
          <div className="mk-workflow-header__live-status mk-workflow-header__live-status--pre-intake">
            <span className="mk-workflow-header__status-dot" aria-hidden="true" />
            <span>Pre-Intake Ready</span>
          </div>
        )}
        {onReturnHome && (
          <button
            type="button"
            className="mk-workflow-header__home-link"
            onClick={onReturnHome}
            aria-label="Return to clinical workspace home"
          >
            Exit to Home
          </button>
        )}
      </div>
    </div>
  );
};
