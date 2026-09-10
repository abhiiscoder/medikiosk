/**
 * MEDiKIOSK — Phase 06: Document Preview & Clinical Extraction Modal
 *
 * Strict Compliance:
 * 1. Uses ACTUAL uploaded document (image/PDF embed with blob URL).
 * 2. Displays actual metadata: filename, file size, MIME type, processing state.
 * 3. Does not replace uploaded documents with generated examples.
 * 4. Integrates the reusable data-driven ExtractedClinicalInformation component.
 * 5. Does not imply "medically verified", "clinically correct", or "doctor approved".
 * 6. Zero fabricated confidence scores (no hardcoded 95%, 96%, 91%).
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Image as ImageIcon, 
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { PipelineItem } from '../../../hooks/useDocumentPipeline';
import { ExtractedClinicalInformation } from '../ExtractedClinicalInformation';
import './DocumentCard.css';

export interface DocumentPreviewModalProps {
  item: PipelineItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  item,
  isOpen,
  onClose
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [item?.previewUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const isImage = item.mimeType?.startsWith('image/') && !imageError;
  const isPdf = item.mimeType === 'application/pdf' || item.name?.toLowerCase().endsWith('.pdf');
  const isRejected = item.stage === 'rejected' || item.stage === 'non_clinical';

  const formatSize = (bytes: number) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div 
      className="mk-preview-modal-overlay" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="mk-preview-title"
      onClick={onClose}
    >
      <div 
        className="mk-preview-modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header: Actual Metadata */}
        <div className="mk-preview-modal-header">
          <div className="mk-preview-header-left">
            <div className={`mk-preview-type-icon ${isImage ? 'mk-preview-type-icon--img' : 'mk-preview-type-icon--pdf'}`}>
              {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <h2 id="mk-preview-title" className="mk-preview-title">
                {item.name}
              </h2>
              <div className="mk-preview-subtitle">
                <span>{formatSize(item.sizeBytes)}</span>
                <span>•</span>
                <span>{item.mimeType || 'Medical Document'}</span>
                <span>•</span>
                {isRejected ? (
                  <span className="mk-preview-status-pill mk-preview-status-pill--warning">
                    <AlertTriangle size={12} />
                    <span>Rejected</span>
                  </span>
                ) : item.stage === 'processed' ? (
                  <span className="mk-preview-status-pill mk-preview-status-pill--success">
                    <CheckCircle2 size={12} />
                    <span>Processed</span>
                  </span>
                ) : item.stage === 'error' ? (
                  <span className="mk-preview-status-pill mk-preview-status-pill--error" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#F87171' }}>
                    <AlertCircle size={12} />
                    <span>Error</span>
                  </span>
                ) : (
                  <span className="mk-preview-status-pill">
                    <Clock size={12} />
                    <span>In Pipeline ({item.stage})</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mk-preview-header-actions">
            <a
              href={item.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mk-preview-btn-icon"
              title="Open document in new tab"
            >
              <ExternalLink size={16} />
            </a>
            <button
              type="button"
              className="mk-preview-btn-icon"
              onClick={onClose}
              aria-label="Close preview modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Split view (Left: Actual Document Render, Right: Clinical Extraction Component) */}
        <div className="mk-preview-modal-body">
          {/* Document View Pane — Uses ACTUAL uploaded document */}
          <div className="mk-preview-doc-pane">
            {isImage ? (
              <div className="mk-preview-image-wrapper">
                <img 
                  src={item.previewUrl} 
                  alt={item.name} 
                  className="mk-preview-image"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={item.previewUrl}
                title={item.name}
                className="mk-preview-pdf-frame"
              />
            ) : (
              <div className="mk-preview-fallback">
                <FileText size={48} className="mk-preview-fallback-icon" />
                <p>Medical document safely attached to active case record.</p>
                <a 
                  href={item.previewUrl} 
                  download={item.name}
                  className="mk-preview-download-link"
                >
                  Download raw file
                </a>
              </div>
            )}
          </div>

          {/* Clinical Extraction Pane — Reusable, data-driven ExtractedClinicalInformation */}
          <div className="mk-preview-findings-pane">
            <ExtractedClinicalInformation
              data={item.extractedData}
              extractedEntities={item.extractedEntities}
              extractionStatus={item.extractionStatus}
              isExtracting={item.stage === 'extracting'}
              isRejected={isRejected}
              rejectionMessage={item.validationMessage}
            />

            <div className="mk-preview-footer-note">
              <span>
                {isRejected
                  ? 'Rejected non-clinical files are isolated from clinical decision support.'
                  : 'Document safely attached to active case record for clinician evaluation.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
