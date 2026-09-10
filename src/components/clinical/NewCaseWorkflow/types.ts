/**
 * MEDiKIOSK — Phase 01: New Case Architecture
 * Workflow Types & State Model
 */

import { CaseSession } from '../../../services/case.service';
import { PipelineItem, useDocumentPipeline } from '../../../hooks/useDocumentPipeline';

export type WorkflowStageId = 'clinical-history' | 'medical-records' | 'summary';

export type StageStatus = 'current' | 'completed' | 'upcoming' | 'disabled';

export interface WorkflowStageDefinition {
  id: WorkflowStageId;
  label: string;
  order: number;
  description: string;
}

export const WORKFLOW_STAGES: readonly WorkflowStageDefinition[] = [
  {
    id: 'clinical-history',
    label: 'Clinical History',
    order: 1,
    description: 'Patient symptom narrative and clinical timeline'
  },
  {
    id: 'medical-records',
    label: 'Medical Records',
    order: 2,
    description: 'Document ingest, OCR extraction, and diagnostic records'
  },
  {
    id: 'summary',
    label: 'Summary',
    order: 3,
    description: 'Structured clinical summary and doctor sign-off'
  }
] as const;

export type ClinicalWorkspaceMode = 'focused' | 'split' | 'expanded';

export interface ClinicalWorkspaceLayoutState {
  mode: ClinicalWorkspaceMode;
  splitRatio: number; // percentage width of Clinical History (28 to 72)
  previousMode?: ClinicalWorkspaceMode;
}

export interface CaseWorkflowContextValue {
  caseId: string | null;
  currentStage: WorkflowStageId;
  stageStatuses: Record<WorkflowStageId, StageStatus>;
  caseSession: CaseSession | null;
  isLoading: boolean;
  error: string | null;
  isIntakeStarted: boolean;
  isSummaryProcessing: boolean;
  setSummaryProcessing: (processing: boolean) => void;
  startClinicalHistory: () => void;
  setStage: (stage: WorkflowStageId) => void;
  canNavigateToStage: (stage: WorkflowStageId) => boolean;
  initializeCase: () => Promise<void>;
  resetWorkflow: () => void;
  startNewCaseSession?: () => Promise<void>;
  documentPipeline?: ReturnType<typeof useDocumentPipeline>;
  onPreviewDocument?: (item: PipelineItem) => void;
  workspaceLayout: ClinicalWorkspaceLayoutState;
  setWorkspaceMode: (mode: ClinicalWorkspaceMode) => void;
  setSplitRatio: (ratio: number) => void;
  expandWorkspace: () => void;
  restoreWorkspace: () => void;
}



