/**
 * MEDiKIOSK — PHASE 09
 * Clinical Summary Processing UI Component
 *
 * Dedicated state-driven component for the Phase 09 processing timeline.
 * Supports:
 * - 5 progressive processing steps (pending, active, completed, error)
 * - Acoustic resonance visual graphic matching reference image media_1788895806378.png
 * - Reusable error recovery state preserving all clinical case data
 * - Future backend integration compatibility (accepts external status updates)
 * - Zero medical fabrication
 */

import React from 'react';
import { 
  ClipboardList, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Info 
} from 'lucide-react';
import './ProcessingState.css';

export type ProcessingStepStatus = 'pending' | 'active' | 'completed' | 'error';

export interface ProcessingStepItem {
  id: string;
  label: string;
  description: string;
  status: ProcessingStepStatus;
  errorDetail?: string;
}

export interface ProcessingStateProps {
  steps: ProcessingStepItem[];
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  infoMessage?: string;
  className?: string;
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({
  steps,
  isError = false,
  errorMessage,
  onRetry,
  infoMessage = 'This may take a few moments. Please keep this window open.',
  className = ''
}) => {
  return (
    <div 
      className={`mk-p09-processing-root ${isError ? 'mk-p09-processing-root--error' : ''} ${className}`} 
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
    >
      {/* 1. Acoustic Resonance Graphic (Ref: media_1788895806378.png) */}
      <div className="mk-p09-resonance-container" aria-hidden="true">
        <svg 
          className="mk-p09-resonance-waves mk-p09-resonance-waves--left" 
          width="40" 
          height="54" 
          viewBox="0 0 40 54" 
          fill="none"
        >
          <path d="M10 9C4 16 4 38 10 45" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" opacity="0.3" />
          <path d="M22 14C17 19 17 35 22 40" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
          <path d="M34 19C31 22 31 32 34 35" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
        </svg>

        <div className="mk-p09-resonance-icon-box">
          <ClipboardList size={26} strokeWidth={1.8} className="mk-p09-resonance-icon" />
        </div>

        <svg 
          className="mk-p09-resonance-waves mk-p09-resonance-waves--right" 
          width="40" 
          height="54" 
          viewBox="0 0 40 54" 
          fill="none"
        >
          <path d="M6 19C9 22 9 32 6 35" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
          <path d="M18 14C23 19 23 35 18 40" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
          <path d="M30 9C36 16 36 38 30 45" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" opacity="0.3" />
        </svg>
      </div>

      {/* 2. Central Headings */}
      <h4 className="mk-p09-heading">Creating Your Clinical Summary</h4>
      <p className="mk-p09-subheading">Organizing information from this case.</p>

      {/* 3. State-Driven Vertical Processing Timeline */}
      <div className="mk-p09-timeline-list" role="list" aria-label="Summary preparation steps">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;

          return (
            <div 
              key={step.id || idx}
              className={`mk-p09-timeline-item mk-p09-timeline-item--${step.status}`}
              role="listitem"
              aria-current={step.status === 'active' ? 'step' : undefined}
            >
              {/* Left Column: Indicator + Connector */}
              <div className="mk-p09-timeline-gutter">
                <div className={`mk-p09-node-marker mk-p09-node-marker--${step.status}`}>
                  {step.status === 'completed' && (
                    <div className="mk-p09-node-check" title="Completed">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}

                  {step.status === 'active' && (
                    <div className="mk-p09-node-active" title="Processing in progress">
                      <span className="mk-p09-node-active__pulse" />
                      <span className="mk-p09-node-active__dot" />
                    </div>
                  )}

                  {step.status === 'pending' && (
                    <div className="mk-p09-node-pending" title="Pending step">
                      <span className="mk-p09-node-pending__ring" />
                    </div>
                  )}

                  {step.status === 'error' && (
                    <div className="mk-p09-node-error" title="Processing error">
                      <AlertTriangle size={11} strokeWidth={2.8} />
                    </div>
                  )}
                </div>

                {!isLast && (
                  <div 
                    className={`mk-p09-node-connector mk-p09-node-connector--${step.status}`} 
                    aria-hidden="true" 
                  />
                )}
              </div>

              {/* Right Column: Step Label & Description */}
              <div className="mk-p09-timeline-text">
                <span className="mk-p09-timeline-label">{step.label}</span>
                <span className="mk-p09-timeline-desc">
                  {step.status === 'error' && step.errorDetail 
                    ? step.errorDetail 
                    : step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Bottom State: Either Error Banner or Restrained Info Banner */}
      {isError ? (
        <div className="mk-p09-error-banner" role="alert">
          <div className="mk-p09-error-banner__header">
            <div className="mk-p09-error-icon-box">
              <AlertTriangle size={18} />
            </div>
            <div className="mk-p09-error-text-box">
              <h5 className="mk-p09-error-title">Unable to prepare clinical summary.</h5>
              <p className="mk-p09-error-desc">
                {errorMessage || 'Your collected case information has been preserved.'}
              </p>
            </div>
          </div>
          {onRetry && (
            <div className="mk-p09-error-actions">
              <button
                type="button"
                id="mk-btn-retry-summary"
                className="mk-p09-retry-button"
                onClick={onRetry}
                aria-label="Retry clinical summary preparation"
              >
                <RefreshCw size={13} />
                <span>Try Again</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mk-p09-info-pill" role="note">
          <Info size={14} className="mk-p09-info-icon" />
          <span>{infoMessage}</span>
        </div>
      )}
    </div>
  );
};
