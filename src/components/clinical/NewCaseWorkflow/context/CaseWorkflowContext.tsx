/**
 * MEDiKIOSK — Phase 01: New Case Architecture
 * Case Workflow Context & Provider
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  WorkflowStageId, 
  StageStatus, 
  CaseWorkflowContextValue, 
  WORKFLOW_STAGES,
  ClinicalWorkspaceMode,
  ClinicalWorkspaceLayoutState 
} from '../types';
import { caseService, CaseSession } from '../../../../services/case.service';
import { PipelineItem, useDocumentPipeline } from '../../../../hooks/useDocumentPipeline';
import { DEMO_MODE, getCase, DEMO_PATIENTS } from '../../../../demo/demoStore';

const defaultStatuses: Record<WorkflowStageId, StageStatus> = {
  'clinical-history': 'current',
  'medical-records': 'upcoming',
  'summary': 'disabled'
};

export const CaseWorkflowContext = createContext<CaseWorkflowContextValue | null>(null);

export interface CaseWorkflowProviderProps {
  initialCaseId?: string | null;
  initialStage?: WorkflowStageId;
  onStageChange?: (stage: WorkflowStageId) => void;
  onIntakeStateChange?: (started: boolean) => void;
  onSummaryProcessingChange?: (processing: boolean) => void;
  onWorkspaceLayoutChange?: (layout: ClinicalWorkspaceLayoutState) => void;
  documentPipeline?: ReturnType<typeof useDocumentPipeline>;
  onPreviewDocument?: (item: PipelineItem) => void;
  children: React.ReactNode;
}

export const CaseWorkflowProvider: React.FC<CaseWorkflowProviderProps> = ({
  initialCaseId = null,
  initialStage = 'clinical-history',
  onStageChange,
  onIntakeStateChange,
  onSummaryProcessingChange,
  onWorkspaceLayoutChange,
  documentPipeline,
  onPreviewDocument,
  children
}) => {
  const [caseId, setCaseId] = useState<string | null>(initialCaseId);
  const [currentStage, setCurrentStageState] = useState<WorkflowStageId>(initialStage);
  const [caseSession, setCaseSession] = useState<CaseSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isIntakeStarted, setIsIntakeStarted] = useState<boolean>(Boolean(initialCaseId));
  const [isSummaryProcessing, setIsSummaryProcessingState] = useState<boolean>(false);

  // Phase 09: Notify parent when summary processing state changes
  const setSummaryProcessing = useCallback((processing: boolean) => {
    setIsSummaryProcessingState(processing);
    onSummaryProcessingChange?.(processing);
  }, [onSummaryProcessingChange]);

  // Notify parent of intake status changes
  useEffect(() => {
    onIntakeStateChange?.(isIntakeStarted);
  }, [isIntakeStarted, onIntakeStateChange]);

  // Derive statuses based on workflow order and actual progress
  const [stageStatuses, setStageStatuses] = useState<Record<WorkflowStageId, StageStatus>>(defaultStatuses);

  // Sync stage status with currentStage
  const updateStageStatuses = useCallback((activeStage: WorkflowStageId) => {
    const activeOrder = WORKFLOW_STAGES.find((s) => s.id === activeStage)?.order ?? 1;

    const updated: Record<WorkflowStageId, StageStatus> = {
      'clinical-history': 'disabled',
      'medical-records': 'disabled',
      'summary': 'disabled'
    };

    WORKFLOW_STAGES.forEach((stage) => {
      if (stage.order < activeOrder) {
        updated[stage.id] = 'completed';
      } else if (stage.order === activeOrder) {
        updated[stage.id] = 'current';
      } else if (stage.order === activeOrder + 1) {
        updated[stage.id] = 'upcoming';
      } else {
        updated[stage.id] = 'disabled';
      }
    });

    setStageStatuses(updated);
  }, []);

  // Initialize or fetch active case session from caseService
  const initializeCase = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if a specific initialCaseId was supplied (e.g. from workspace or direct navigation)
      if (initialCaseId) {
        if (DEMO_MODE) {
          const dc = getCase(initialCaseId);
          if (dc) {
            const pt = DEMO_PATIENTS.find((p: any) => p.patientId === dc.patientId) || DEMO_PATIENTS[0];
            const sess: CaseSession = {
              caseId: dc.caseId,
              patient: {
                id: pt.patientId,
                mrn: 'MK-' + pt.patientId.slice(-4),
                firstName: pt.firstName,
                lastName: pt.lastName,
                dateOfBirth: '1980-01-01',
                age: pt.age,
                gender: (pt.gender as any) || 'undisclosed',
                bloodGroup: (pt.bloodGroup as any) || 'unknown',
                contactNumber: pt.phone,
                allergies: [],
                triagePriority: 'routine',
                caseStatus: dc.status === 'completed' ? 'completed' : 'intake',
                registeredAt: dc.createdAt
              },
              startedAt: dc.createdAt,
              currentPhase: dc.workflowStage,
              isComplete: dc.status === 'completed'
            };
            setCaseId(dc.caseId);
            setCaseSession(sess);
            setIsIntakeStarted(true);
            return;
          }
        }
      }

      // Check if there is an active case already
      const activeRes = await caseService.getActiveCase();
      if (activeRes && activeRes.success && activeRes.data) {
        setCaseId(activeRes.data.caseId);
        setCaseSession(activeRes.data);
      } else {
        // Otherwise start a new case
        const startRes = await caseService.startNewCase({});
        if (startRes && startRes.success && startRes.data) {
          setCaseId(startRes.data.caseId);
          setCaseSession(startRes.data);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load case session. Please check backend connection.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [initialCaseId]);

  // Load session on mount if not already loaded
  useEffect(() => {
    if (!caseSession) {
      initializeCase();
    }
  }, [caseSession, initializeCase]);

  // Stage navigation validation
  const canNavigateToStage = useCallback(
    (targetStage: WorkflowStageId): boolean => {
      const status = stageStatuses[targetStage];
      // User can navigate to current, completed, or immediate upcoming stage
      return status === 'current' || status === 'completed' || status === 'upcoming';
    },
    [stageStatuses]
  );

  const setStage = useCallback(
    (targetStage: WorkflowStageId) => {
      if (!canNavigateToStage(targetStage)) return;
      setCurrentStageState(targetStage);
      updateStageStatuses(targetStage);
      onStageChange?.(targetStage);
    },
    [canNavigateToStage, updateStageStatuses, onStageChange]
  );

  const startClinicalHistory = useCallback(() => {
    setIsIntakeStarted(true);
  }, []);

  const resetWorkflow = useCallback(() => {
    setCurrentStageState('clinical-history');
    updateStageStatuses('clinical-history');
    setIsIntakeStarted(false);
    setCaseSession(null);
    setCaseId(null);
    setError(null);
  }, [updateStageStatuses]);

  const startNewCaseSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await caseService.startNewCase({});
      if (res && res.success && res.data) {
        setCaseId(res.data.caseId);
        setCaseSession(res.data);
        setCurrentStageState('clinical-history');
        updateStageStatuses('clinical-history');
        setIsIntakeStarted(false);
        setIsSummaryProcessingState(false);
        onStageChange?.('clinical-history');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to start a new case session. Please check backend connection.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [updateStageStatuses, onStageChange]);

  // Workspace layout state (Focused, Split, Expanded)
  const [workspaceLayout, setWorkspaceLayout] = useState<ClinicalWorkspaceLayoutState>(() => {
    try {
      const savedMode = localStorage.getItem('mk_clinical_workspace_mode') as ClinicalWorkspaceMode | null;
      const savedRatio = Number(localStorage.getItem('mk_clinical_split_ratio'));
      return {
        mode: savedMode && ['focused', 'split', 'expanded'].includes(savedMode) ? savedMode : 'focused',
        splitRatio: !isNaN(savedRatio) && savedRatio >= 28 && savedRatio <= 72 ? savedRatio : 50
      };
    } catch {
      return { mode: 'focused', splitRatio: 50 };
    }
  });

  const setWorkspaceMode = useCallback((mode: ClinicalWorkspaceMode) => {
    setWorkspaceLayout((prev) => {
      const next: ClinicalWorkspaceLayoutState = {
        ...prev,
        mode,
        previousMode: prev.mode !== 'expanded' ? prev.mode : prev.previousMode
      };
      try {
        localStorage.setItem('mk_clinical_workspace_mode', mode);
      } catch {
        // ignore
      }
      onWorkspaceLayoutChange?.(next);
      return next;
    });
  }, [onWorkspaceLayoutChange]);

  const setSplitRatio = useCallback((ratio: number) => {
    const clamped = Math.max(28, Math.min(72, ratio));
    setWorkspaceLayout((prev) => {
      const next: ClinicalWorkspaceLayoutState = {
        ...prev,
        splitRatio: clamped
      };
      try {
        localStorage.setItem('mk_clinical_split_ratio', String(clamped));
      } catch {
        // ignore
      }
      onWorkspaceLayoutChange?.(next);
      return next;
    });
  }, [onWorkspaceLayoutChange]);

  const expandWorkspace = useCallback(() => {
    setWorkspaceLayout((prev) => {
      const next: ClinicalWorkspaceLayoutState = {
        ...prev,
        mode: 'expanded',
        previousMode: prev.mode !== 'expanded' ? prev.mode : 'focused'
      };
      try {
        localStorage.setItem('mk_clinical_workspace_mode', 'expanded');
      } catch {
        // ignore
      }
      onWorkspaceLayoutChange?.(next);
      return next;
    });
  }, [onWorkspaceLayoutChange]);

  const restoreWorkspace = useCallback(() => {
    setWorkspaceLayout((prev) => {
      const targetMode = prev.previousMode && prev.previousMode !== 'expanded' ? prev.previousMode : 'focused';
      const next: ClinicalWorkspaceLayoutState = {
        ...prev,
        mode: targetMode
      };
      try {
        localStorage.setItem('mk_clinical_workspace_mode', targetMode);
      } catch {
        // ignore
      }
      onWorkspaceLayoutChange?.(next);
      return next;
    });
  }, [onWorkspaceLayoutChange]);

  // Initial sync with parent on mount
  useEffect(() => {
    onWorkspaceLayoutChange?.(workspaceLayout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const contextValue: CaseWorkflowContextValue = {
    caseId,
    currentStage,
    stageStatuses,
    caseSession,
    isLoading,
    error,
    isIntakeStarted,
    isSummaryProcessing,
    setSummaryProcessing,
    startClinicalHistory,
    setStage,
    canNavigateToStage,
    initializeCase,
    resetWorkflow,
    startNewCaseSession,
    documentPipeline,
    onPreviewDocument,
    workspaceLayout,
    setWorkspaceMode,
    setSplitRatio,
    expandWorkspace,
    restoreWorkspace
  };

  return (
    <CaseWorkflowContext.Provider value={contextValue}>
      {children}
    </CaseWorkflowContext.Provider>
  );
};
