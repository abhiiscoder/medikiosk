/**
 * MEDiKIOSK — Phase 01: New Case Architecture
 * WorkflowStageContainer Component
 *
 * Hosts the currently active stage container with loading, error, and transition guards.
 */

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useCaseWorkflow } from './hooks/useCaseWorkflow';
import { ClinicalHistoryStage } from './stages/ClinicalHistoryStage';
import { MedicalRecordsStage } from './stages/MedicalRecordsStage';
import { SummaryStage } from './stages/SummaryStage';

export interface WorkflowStageContainerProps {
  className?: string;
}

export const WorkflowStageContainer: React.FC<WorkflowStageContainerProps> = ({
  className = ''
}) => {
  const { currentStage, error, initializeCase, isLoading } = useCaseWorkflow();

  // If there's a fatal workflow error
  if (error) {
    return (
      <div className={`mk-stage-error-state ${className}`} role="alert">
        <div className="mk-stage-error-icon">
          <AlertCircle size={28} />
        </div>
        <h4 className="mk-stage-error-title">Unable to Load Case</h4>
        <p className="mk-stage-error-desc">{error}</p>
        <button
          type="button"
          className="mk-stage-retry-btn"
          onClick={initializeCase}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'mk-spin' : ''} />
          <span>Try again</span>
        </button>
      </div>
    );
  }

  // Active Stage Renderer
  const renderActiveStage = () => {
    switch (currentStage) {
      case 'clinical-history':
        return <ClinicalHistoryStage />;
      case 'medical-records':
        return <MedicalRecordsStage />;
      case 'summary':
        return <SummaryStage />;
      default:
        return <ClinicalHistoryStage />;
    }
  };

  return (
    <div className={`mk-workflow-stage-viewport ${className}`}>
      {renderActiveStage()}
    </div>
  );
};
