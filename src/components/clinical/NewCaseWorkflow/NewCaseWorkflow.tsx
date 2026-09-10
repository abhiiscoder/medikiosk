/**
 * MEDiKIOSK — Phase 01: New Case Architecture
 * NewCaseWorkflow Master Container Component
 *
 * Structure:
 * NewCaseWorkflow
 *    ├── CaseWorkflowProvider (Context Boundary)
 *    │     ├── WorkflowHeader
 *    │     ├── WorkflowProgress
 *    │     └── WorkflowStageContainer
 *    │            ├── ClinicalHistoryStage (Stage 1) - Resizable / Split / Expanded
 *    │            ├── MedicalRecordsStage (Stage 2)
 *    │            └── SummaryStage (Stage 3)
 */

import React from 'react';
import { CaseWorkflowProvider } from './context/CaseWorkflowContext';
import { WorkflowHeader } from './WorkflowHeader';
import { WorkflowProgress } from './WorkflowProgress';
import { WorkflowStageContainer } from './WorkflowStageContainer';
import { WorkflowStageId, ClinicalWorkspaceLayoutState } from './types';
import { useCaseWorkflow } from './hooks/useCaseWorkflow';
import { PipelineItem, useDocumentPipeline } from '../../../hooks/useDocumentPipeline';
import './NewCaseWorkflow.css';

export interface NewCaseWorkflowProps {
  caseId?: string | null;
  initialStage?: WorkflowStageId;
  onReturnHome?: () => void;
  onStageChange?: (stage: WorkflowStageId) => void;
  onIntakeStateChange?: (started: boolean) => void;
  onSummaryProcessingChange?: (processing: boolean) => void;
  onWorkspaceLayoutChange?: (layout: ClinicalWorkspaceLayoutState) => void;
  documentPipeline?: ReturnType<typeof useDocumentPipeline>;
  onPreviewDocument?: (item: PipelineItem) => void;
  className?: string;
}

const NewCaseWorkflowContent: React.FC<{
  onReturnHome?: () => void;
  className?: string;
}> = ({ onReturnHome, className = '' }) => {
  const { workspaceLayout, currentStage } = useCaseWorkflow();
  const isClinicalHistory = currentStage === 'clinical-history';
  const modeClass = isClinicalHistory ? `mk-new-case-workflow--${workspaceLayout.mode}` : '';

  return (
    <section
      className={`mk-new-case-workflow ${modeClass} ${className}`}
      role="region"
      aria-label="New Case Clinical Intake Workflow"
      style={
        isClinicalHistory && workspaceLayout.mode === 'split'
          ? ({ '--mk-split-ratio': `${workspaceLayout.splitRatio}%` } as React.CSSProperties)
          : undefined
      }
    >
      {/* 1. Workflow Header: Communicates New Case, Case ID, Stage */}
      <WorkflowHeader onReturnHome={onReturnHome} />

      {/* 2. Reusable Workflow Progress Indicator */}
      <WorkflowProgress />

      {/* 3. Stage Container hosting the active stage */}
      <WorkflowStageContainer />
    </section>
  );
};

export const NewCaseWorkflow: React.FC<NewCaseWorkflowProps> = ({
  caseId,
  initialStage = 'clinical-history',
  onReturnHome,
  onStageChange,
  onIntakeStateChange,
  onSummaryProcessingChange,
  onWorkspaceLayoutChange,
  documentPipeline,
  onPreviewDocument,
  className = ''
}) => {
  return (
    <CaseWorkflowProvider
      initialCaseId={caseId}
      initialStage={initialStage}
      onStageChange={onStageChange}
      onIntakeStateChange={onIntakeStateChange}
      onSummaryProcessingChange={onSummaryProcessingChange}
      onWorkspaceLayoutChange={onWorkspaceLayoutChange}
      documentPipeline={documentPipeline}
      onPreviewDocument={onPreviewDocument}
    >
      <NewCaseWorkflowContent onReturnHome={onReturnHome} className={className} />
    </CaseWorkflowProvider>
  );
};
