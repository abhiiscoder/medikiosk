/**
 * MEDiKIOSK — Phase 01: New Case Architecture
 * useCaseWorkflow Hook
 */

import { useContext } from 'react';
import { CaseWorkflowContext } from '../context/CaseWorkflowContext';
import { CaseWorkflowContextValue } from '../types';

export const useCaseWorkflow = (): CaseWorkflowContextValue => {
  const context = useContext(CaseWorkflowContext);
  if (!context) {
    throw new Error('useCaseWorkflow must be used within a CaseWorkflowProvider');
  }
  return context;
};
