/**
 * MEDiKIOSK — Phase 01: New Case Architecture
 * WorkflowProgress Component
 *
 * Lightweight, non-dominant stage progression bar.
 * Supports: current, completed, upcoming, and disabled states.
 */

import React from 'react';
import { Check, CircleDot, Circle, Lock } from 'lucide-react';
import { useCaseWorkflow } from './hooks/useCaseWorkflow';
import { WORKFLOW_STAGES, WorkflowStageId } from './types';

export interface WorkflowProgressProps {
  className?: string;
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ className = '' }) => {
  const { currentStage, stageStatuses, setStage, canNavigateToStage } = useCaseWorkflow();

  return (
    <nav
      className={`mk-workflow-progress ${className}`}
      aria-label="New Case Workflow Progress"
      role="tablist"
    >
      {WORKFLOW_STAGES.map((stage, idx) => {
        const isCurrent = stage.id === currentStage;
        const status = stageStatuses[stage.id];
        const isCompleted = status === 'completed';
        const isUpcoming = status === 'upcoming';
        const isDisabled = status === 'disabled';
        const isClickable = canNavigateToStage(stage.id);

        const itemClasses = [
          'mk-progress-step',
          isCurrent ? 'mk-progress-step--current' : '',
          isCompleted ? 'mk-progress-step--completed' : '',
          isUpcoming ? 'mk-progress-step--upcoming' : '',
          isDisabled ? 'mk-progress-step--disabled' : '',
          isClickable ? 'mk-progress-step--clickable' : ''
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <React.Fragment key={stage.id}>
            {/* Step Button */}
            <button
              type="button"
              role="tab"
              id={`stage-tab-${stage.id}`}
              aria-controls={`stage-panel-${stage.id}`}
              aria-selected={isCurrent}
              aria-disabled={!isClickable}
              className={itemClasses}
              onClick={() => {
                if (isClickable) {
                  setStage(stage.id as WorkflowStageId);
                }
              }}
              title={
                isDisabled
                  ? `${stage.label} (Prerequisites required)`
                  : `${stage.label} (${status})`
              }
            >
              {/* Status Indicator Icon */}
              <span className="mk-progress-icon-wrapper" aria-hidden="true">
                {isCompleted ? (
                  <Check size={13} strokeWidth={2.5} className="mk-progress-icon-check" />
                ) : isCurrent ? (
                  <CircleDot size={14} strokeWidth={2.5} className="mk-progress-icon-current" />
                ) : isDisabled ? (
                  <Lock size={12} strokeWidth={2} className="mk-progress-icon-locked" />
                ) : (
                  <Circle size={13} strokeWidth={2} className="mk-progress-icon-upcoming" />
                )}
              </span>

              {/* Step Label */}
              <span className="mk-progress-label">
                <span className="mk-progress-step-num">{stage.order}.</span>
                <span>{stage.label}</span>
              </span>

              {/* SR Only Status */}
              <span className="visually-hidden">
                {isCurrent ? '(Current Stage)' : isCompleted ? '(Completed)' : '(Upcoming)'}
              </span>
            </button>

            {/* Connecting Connector Line between steps */}
            {idx < WORKFLOW_STAGES.length - 1 && (
              <div
                className={`mk-progress-divider ${
                  isCompleted ? 'mk-progress-divider--completed' : ''
                }`}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
