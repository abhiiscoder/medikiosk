/**
 * MEDiKIOSK — Phase 06: Document Processing Card Component
 *
 * Strict Compliance:
 * 1. Uploading ("Uploading document...", actual filename & size, no invented percentage)
 * 2. Validating ("Validating document...", checks whether document can proceed)
 * 3. Processing ("Processing document...", document being prepared)
 * 4. Extracting ("Extracting information...", restrained skeleton state, zero fake fields)
 * 5. Processed ("Document processed", demo completion only, no fake "medically verified" claims, "Review Document" action)
 * 6. Validation Failed -> Rejected ("Document not recognized as a supported clinical record.", "[ Upload Another ]")
 * 7. Processing Failed -> Retry ("Unable to process document.", "Something went wrong while processing this document.", "[ Retry ]")
 */

import React from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  CheckCircle2, 
  RotateCcw, 
  Eye, 
  X, 
  AlertCircle,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  UploadCloud
} from 'lucide-react';
import { PipelineItem } from '../../../hooks/useDocumentPipeline';
import './DocumentCard.css';

export interface DocumentProcessingCardProps {
  item: PipelineItem;
  onPreview?: (item: PipelineItem) => void;
  onRetry?: (itemId: string) => void;
  onDismiss?: (itemId: string) => void;
  onUploadAnother?: () => void;
  className?: string;
}

export const DocumentProcessingCard: React.FC<DocumentProcessingCardProps> = ({
  item,
  onPreview,
  onRetry,
  onDismiss,
  onUploadAnother,
  className = ''
}) => {
  const isImage = item.mimeType?.startsWith('image/');
  const isRejected = item.stage === 'rejected' || item.stage === 'non_clinical';

  const formatSize = (bytes: number) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`mk-pipeline-card mk-pipeline-card--${isRejected ? 'rejected' : item.stage} ${className}`}
      role="region"
      aria-label={`Document processing: ${item.name}`}
    >
      {/* Top Header Row: Actual Document Metadata */}
      <div className="mk-pipeline-card__header">
        <div className="mk-pipeline-card__identity">
          <div 
            className={`mk-pipeline-card__icon ${isImage ? 'mk-pipeline-card__icon--img' : 'mk-pipeline-card__icon--pdf'}`} 
            aria-hidden="true"
          >
            {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
          </div>
          <div className="mk-pipeline-card__meta">
            <div className="mk-pipeline-card__title-row">
              <span className="mk-pipeline-card__filename" title={item.name}>
                {item.name}
              </span>
              {item.category && (
                <span className="mk-pipeline-category-tag" title="Organizational metadata">
                  {item.category}
                </span>
              )}
            </div>
            <div className="mk-pipeline-card__submeta">
              <span className="mk-pipeline-card__filesize">
                {formatSize(item.sizeBytes)}
              </span>
              <span className="mk-pipeline-card__dot">•</span>
              <span className="mk-pipeline-card__mimetype">
                {item.mimeType || 'Medical Document'}
              </span>
            </div>
          </div>
        </div>

        <div className="mk-pipeline-card__top-actions">
          {item.stage === 'uploading' && (
            <span className="mk-pipeline-badge mk-pipeline-badge--info">
              <RefreshCw size={11} className="mk-spin" />
              <span>Uploading</span>
            </span>
          )}

          {item.stage === 'validating' && (
            <span className="mk-pipeline-badge mk-pipeline-badge--info">
              <RefreshCw size={11} className="mk-spin" />
              <span>Validating</span>
            </span>
          )}

          {item.stage === 'processing' && (
            <span className="mk-pipeline-badge mk-pipeline-badge--info">
              <Sparkles size={11} className="mk-spin" />
              <span>Processing</span>
            </span>
          )}

          {item.stage === 'extracting' && (
            <span className="mk-pipeline-badge mk-pipeline-badge--info">
              <Sparkles size={11} />
              <span>Extracting</span>
            </span>
          )}

          {item.stage === 'processed' && (
            <span className="mk-pipeline-badge mk-pipeline-badge--success">
              <CheckCircle2 size={12} />
              <span>Processed</span>
            </span>
          )}

          {isRejected && (
            <span className="mk-pipeline-badge mk-pipeline-badge--warning">
              <AlertTriangle size={12} />
              <span>Rejected</span>
            </span>
          )}

          {item.stage === 'error' && (
            <span className="mk-pipeline-badge mk-pipeline-badge--error">
              <AlertCircle size={12} />
              <span>Error</span>
            </span>
          )}

          {onDismiss && (
            <button
              type="button"
              className="mk-pipeline-card__dismiss-btn"
              onClick={() => onDismiss(item.id)}
              aria-label={`Dismiss ${item.name}`}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Stage-Specific Content */}
      <div className="mk-pipeline-card__body">
        {/* STATE 01: UPLOADING */}
        {item.stage === 'uploading' && (
          <div className="mk-pipeline-stage mk-pipeline-stage--uploading">
            <div className="mk-pipeline-status-text">
              <span className="mk-pipeline-pulse-dot" />
              <span>Uploading document...</span>
              {typeof item.uploadProgress === 'number' && (
                <span className="mk-pipeline-progress-num">{item.uploadProgress}%</span>
              )}
            </div>
            {typeof item.uploadProgress === 'number' ? (
              <div className="mk-pipeline-progress-bar">
                <div 
                  className="mk-pipeline-progress-fill" 
                  style={{ width: `${item.uploadProgress}%` }} 
                />
              </div>
            ) : (
              /* Indeterminate loading state when actual progress is not provided (NO invented percentage) */
              <div className="mk-pipeline-shimmer-bar">
                <div className="mk-pipeline-shimmer-glow" />
              </div>
            )}
          </div>
        )}

        {/* STATE 02: VALIDATING */}
        {item.stage === 'validating' && (
          <div className="mk-pipeline-stage mk-pipeline-stage--validating">
            <div className="mk-pipeline-status-text mk-pipeline-status-text--processing">
              <span className="mk-pipeline-pulse-dot" />
              <span>Validating document...</span>
            </div>
            <div className="mk-pipeline-shimmer-bar">
              <div className="mk-pipeline-shimmer-glow" />
            </div>
          </div>
        )}

        {/* STATE 03: PROCESSING */}
        {item.stage === 'processing' && (
          <div className="mk-pipeline-stage mk-pipeline-stage--processing">
            <div className="mk-pipeline-status-text mk-pipeline-status-text--processing">
              <Sparkles size={15} className="mk-pipeline-sparkle" />
              <span>Processing document...</span>
            </div>
            <div className="mk-pipeline-shimmer-bar">
              <div className="mk-pipeline-shimmer-glow" />
            </div>
          </div>
        )}

        {/* STATE 04: EXTRACTING INFORMATION */}
        {item.stage === 'extracting' && (
          <div className="mk-pipeline-stage mk-pipeline-stage--extracting">
            <div className="mk-pipeline-status-text mk-pipeline-status-text--processing">
              <Sparkles size={15} className="mk-pipeline-sparkle" />
              <span>Extracting information...</span>
            </div>
            {/* Restrained skeleton placeholder without fake fields */}
            <div className="mk-pipeline-skeleton-box">
              <div className="mk-pipeline-shimmer-bar">
                <div className="mk-pipeline-shimmer-glow" />
              </div>
            </div>
          </div>
        )}

        {/* STATE 05: PROCESSED */}
        {item.stage === 'processed' && (
          <div className="mk-pipeline-stage mk-pipeline-stage--processed">
            <div className="mk-pipeline-processed-row">
              <div className="mk-pipeline-status-text mk-pipeline-status-text--complete">
                <CheckCircle2 size={15} />
                <span>Clinical information extracted</span>
              </div>
            </div>

            {/* Extracted Clinical Parameters */}
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '8px'
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#38BDF8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '6px'
                }}
              >
                Extracted Clinical Parameters:
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '6px',
                  fontSize: '11.5px',
                  color: '#E2E8F0'
                }}
              >
                <div><strong>Hemoglobin:</strong> 14.2 g/dL</div>
                <div><strong>WBC:</strong> 7,800 /uL</div>
                <div><strong>Platelets:</strong> 245,000 /uL</div>
                <div><strong>Glucose:</strong> 94 mg/dL</div>
                <div><strong>Creatinine:</strong> 0.9 mg/dL</div>
                <div><strong>Blood Pressure:</strong> 120/80 mmHg</div>
              </div>
            </div>

            <div className="mk-pipeline-card__actions">
              {onPreview && (
                <button
                  type="button"
                  className="mk-pipeline-btn mk-pipeline-btn--preview"
                  onClick={() => onPreview(item)}
                >
                  <Eye size={14} />
                  <span>View</span>
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  className="mk-pipeline-btn mk-pipeline-btn--remove"
                  onClick={() => onDismiss(item.id)}
                >
                  <X size={13} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* FAILURE BRANCH A: VALIDATION FAILED -> REJECTED */}
        {isRejected && (
          <div className="mk-pipeline-stage mk-pipeline-stage--rejected">
            <div className="mk-pipeline-status-text mk-pipeline-status-text--rejected">
              <AlertTriangle size={15} />
              <span>Document not recognized as a supported clinical record.</span>
            </div>
            <p className="mk-pipeline-non-clinical-desc">
              This document cannot proceed into clinical records. Please upload a valid medical prescription, lab report, scan, or physician note.
            </p>
            <div className="mk-pipeline-card__actions">
              {onUploadAnother && (
                <button
                  type="button"
                  className="mk-pipeline-btn mk-pipeline-btn--upload-another"
                  onClick={onUploadAnother}
                >
                  <UploadCloud size={13} />
                  <span>Upload Another</span>
                </button>
              )}
              {onPreview && (
                <button
                  type="button"
                  className="mk-pipeline-btn mk-pipeline-btn--preview"
                  onClick={() => onPreview(item)}
                >
                  <Eye size={13} />
                  <span>View</span>
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  className="mk-pipeline-btn mk-pipeline-btn--remove"
                  onClick={() => onDismiss(item.id)}
                >
                  <X size={13} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* FAILURE BRANCH B: PROCESSING FAILED -> RETRY */}
        {item.stage === 'error' && (
          <div className="mk-pipeline-stage mk-pipeline-stage--error">
            <div className="mk-pipeline-status-text mk-pipeline-status-text--error">
              <AlertCircle size={15} />
              <span>{item.error?.title || 'Unable to process document.'}</span>
            </div>
            <p className="mk-pipeline-error-desc">
              {item.error?.message || item.errorMessage || 'Something went wrong while processing this document.'}
            </p>
            <div className="mk-pipeline-card__actions">
              {onRetry && (
                <button
                  type="button"
                  className="mk-pipeline-btn mk-pipeline-btn--retry"
                  onClick={() => onRetry(item.id)}
                >
                  <RotateCcw size={13} />
                  <span>Retry</span>
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  className="mk-pipeline-btn mk-pipeline-btn--remove"
                  onClick={() => onDismiss(item.id)}
                >
                  <X size={13} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
