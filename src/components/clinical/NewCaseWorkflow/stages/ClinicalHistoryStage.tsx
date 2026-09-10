/**
 * MEDiKIOSK — Phase 02: Clinical History Introduction & Flexible Resizable Workspace
 * Stage 1: Clinical History
 *
 * Capabilities:
 * - Pre-Intake Introduction Screen or Active Conversational Intake
 * - Flexible Resizable Workspace Modes:
 *   1. Focused: Spacious, centered clinical intake
 *   2. Split: Multitasking with case records and draggable resize boundary
 *   3. Expanded: Full application workspace
 * - Subtle workspace controls in header
 * - State persistence across questions and answers
 * - Absolute UI and clinical integrity preservation
 */

import React, { useRef } from 'react';
import { MessageSquare, ListChecks, ShieldCheck, ArrowRight, Stethoscope, Sparkles } from 'lucide-react';
import { Button } from '../../../core/Button/Button';
import { useCaseWorkflow } from '../hooks/useCaseWorkflow';
import { ConversationView } from './conversation/ConversationView';
import { WorkspaceControls } from './workspace/WorkspaceControls';
import { WorkspaceResizeDivider } from './workspace/WorkspaceResizeDivider';
import { SecondaryWorkspacePanel } from './workspace/SecondaryWorkspacePanel';

export interface ClinicalHistoryStageProps {
  className?: string;
}

export const ClinicalHistoryStage: React.FC<ClinicalHistoryStageProps> = ({ className = '' }) => {
  const {
    caseId,
    isLoading,
    isIntakeStarted,
    startClinicalHistory,
    workspaceLayout,
    setWorkspaceMode,
    setSplitRatio,
    expandWorkspace,
    restoreWorkspace
  } = useCaseWorkflow();

  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Reusable Stage Content (Loading / Intro / Active Conversation)
  const renderStageContent = () => {
    if (isLoading) {
      return (
        <div className="mk-stage-state-box" role="status">
          <span className="mk-stage-spinner" aria-hidden="true" />
          <p className="mk-stage-state-title">Preparing clinical intake session...</p>
          <p className="mk-stage-state-desc">
            Initializing case context {caseId ? `(${caseId})` : ''}
          </p>
        </div>
      );
    }

    if (!isIntakeStarted) {
      return (
        /* ============================================================
           PHASE 02: CLINICAL HISTORY INTRODUCTION (PRE-INTAKE)
           ============================================================ */
        <div className="mk-stage-intro">
          {/* Primary Hierarchy */}
          <div className="mk-stage-intro__badge">
            <Sparkles size={14} className="mk-stage-intro__badge-icon" />
            <span>Patient Clinical Intake</span>
          </div>

          <h2 className="mk-stage-intro__heading">
            Understand your current health condition.
          </h2>

          <p className="mk-stage-intro__description">
            MEDiKIOSK will guide you through a simple conversation about your current
            health concerns and relevant history.
          </p>

          {/* Lightweight Supporting Concepts (Horizontal Badges, Not Oversized Cards) */}
          <div
            className="mk-stage-intro__concepts"
            role="list"
            aria-label="Key aspects of clinical history"
          >
            <div className="mk-stage-intro__concept-chip" role="listitem">
              <MessageSquare size={16} className="mk-stage-intro__concept-icon" />
              <span>Natural Conversation</span>
            </div>

            <div className="mk-stage-intro__concept-chip" role="listitem">
              <ListChecks size={16} className="mk-stage-intro__concept-icon" />
              <span>Guided Questions</span>
            </div>

            <div className="mk-stage-intro__concept-chip" role="listitem">
              <ShieldCheck size={16} className="mk-stage-intro__concept-icon" />
              <span>Privacy Protected</span>
            </div>
          </div>

          {/* Single Primary Action */}
          <div className="mk-stage-intro__actions">
            <Button
              variant="primary"
              size="lg"
              className="mk-stage-intro__cta-btn"
              onClick={startClinicalHistory}
              rightIcon={<ArrowRight size={16} />}
            >
              Start Clinical History
            </Button>
          </div>
        </div>
      );
    }

    /* ============================================================
       PHASE 03: CLINICAL CONVERSATION ENGINE WORKSPACE
       ============================================================ */
    return <ConversationView caseId={caseId} />;
  };

  const isSplit = workspaceLayout.mode === 'split';

  return (
    <div
      className={`mk-stage-container mk-stage-clinical-history mk-stage-clinical-history--${workspaceLayout.mode} ${className}`}
      role="tabpanel"
      id="stage-panel-clinical-history"
      aria-labelledby="stage-tab-clinical-history"
    >
      {/* Stage Header Banner */}
      <div className="mk-stage-header">
        <div className="mk-stage-header__left">
          <div className="mk-stage-icon-badge">
            <Stethoscope size={20} strokeWidth={2} />
          </div>
          <div className="mk-stage-header-text">
            <h3 className="mk-stage-title">Clinical History</h3>
            <p className="mk-stage-subtitle">
              {isIntakeStarted
                ? 'Patient clinical intake conversation'
                : 'Pre-intake introduction and session preparation'}
            </p>
          </div>
        </div>

        <div className="mk-stage-header__right">
          <div
            className={`mk-stage-status-pill ${
              !isIntakeStarted ? 'mk-stage-status-pill--upcoming' : ''
            }`}
          >
            <span className="mk-stage-status-dot" aria-hidden="true" />
            <span>{isIntakeStarted ? 'Active Intake' : 'Pre-Intake'}</span>
          </div>

          {/* Subtle Workspace Layout Controls */}
          <WorkspaceControls
            mode={workspaceLayout.mode}
            onSelectMode={setWorkspaceMode}
            onExpand={expandWorkspace}
            onRestore={restoreWorkspace}
          />
        </div>
      </div>

      {/* Stage Body Container: Flexible Workspace Switcher */}
      {isSplit ? (
        <div
          ref={splitContainerRef}
          className="mk-split-workspace-container"
          style={
            {
              '--mk-split-ratio': `${workspaceLayout.splitRatio}%`
            } as React.CSSProperties
          }
        >
          {/* Primary Pane: Clinical History */}
          <div
            className="mk-split-pane mk-split-pane--primary"
            style={{ width: `calc(${workspaceLayout.splitRatio}% - 4px)` }}
          >
            <div
              className={`mk-stage-card ${
                isIntakeStarted ? 'mk-stage-card--conversation' : ''
              }`}
            >
              {renderStageContent()}
            </div>
          </div>

          {/* Draggable Vertical Resize Divider */}
          <WorkspaceResizeDivider
            splitRatio={workspaceLayout.splitRatio}
            onSplitRatioChange={setSplitRatio}
            containerRef={splitContainerRef}
          />

          {/* Secondary Pane: Medical Records & Case Documents (Real Pipeline) */}
          <div
            className="mk-split-pane mk-split-pane--secondary"
            style={{ width: `calc(${100 - workspaceLayout.splitRatio}% - 4px)` }}
          >
            <SecondaryWorkspacePanel
              splitRatio={workspaceLayout.splitRatio}
              onSetSplitRatio={setSplitRatio}
            />
          </div>
        </div>
      ) : (
        <div
          className={`mk-stage-card ${
            isIntakeStarted ? 'mk-stage-card--conversation' : ''
          } ${
            workspaceLayout.mode === 'expanded'
              ? 'mk-stage-card--expanded'
              : 'mk-stage-card--focused'
          }`}
        >
          {renderStageContent()}
        </div>
      )}
    </div>
  );
};
