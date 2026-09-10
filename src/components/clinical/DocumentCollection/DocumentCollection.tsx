/**
 * MEDiKIOSK — Phase 07: Multiple Document Collection Component
 *
 * Capabilities:
 * 1. Data-driven collection of multiple independent clinical documents belonging to active case.
 * 2. Dynamic document count ("Uploaded Documents (N)", never hardcoded).
 * 3. Mixed concurrent document states (Processed, Processing, Rejected, Failed).
 * 4. Exact prompt-mandated empty state:
 *    "No medical records attached yet.
 *     Upload relevant clinical documents associated with this case.
 *     [ Upload Document ]"
 * 5. Reusable "+ Upload More Documents" trigger.
 * 6. Independent action handling: View, Remove, Retry.
 */

import React from 'react';
import { 
  FolderPlus, 
  UploadCloud, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Clock 
} from 'lucide-react';
import { PipelineItem } from '../../../hooks/useDocumentPipeline';
import { DocumentProcessingCard } from '../DocumentCard/DocumentProcessingCard';
import './DocumentCollection.css';

export interface DocumentCollectionProps {
  items: PipelineItem[];
  onViewDocument: (item: PipelineItem) => void;
  onRemoveDocument: (itemId: string) => void;
  onRetryDocument: (itemId: string) => void;
  onUploadMore: () => void;
  className?: string;
}

export const DocumentCollection: React.FC<DocumentCollectionProps> = ({
  items,
  onViewDocument,
  onRemoveDocument,
  onRetryDocument,
  onUploadMore,
  className = ''
}) => {
  const totalCount = items.length;
  const processedCount = items.filter((i) => i.stage === 'processed').length;
  const rejectedCount = items.filter((i) => i.stage === 'rejected' || i.stage === 'non_clinical').length;
  const errorCount = items.filter((i) => i.stage === 'error').length;
  const inProgressCount = items.filter(
    (i) => i.stage === 'uploading' || i.stage === 'validating' || i.stage === 'processing' || i.stage === 'extracting'
  ).length;

  return (
    <section 
      className={`mk-doc-collection ${className}`}
      role="region"
      aria-label={`Case Medical Documents Collection (${totalCount} files)`}
    >
      {/* 1. EMPTY STATE (Exact mandated copy) */}
      {totalCount === 0 ? (
        <div className="mk-doc-collection-empty" role="status">
          <FolderPlus size={36} className="mk-doc-collection-empty-icon" aria-hidden="true" />
          <h4 className="mk-doc-collection-empty-title">No medical records attached yet.</h4>
          <p className="mk-doc-collection-empty-desc">
            Upload relevant clinical documents associated with this case.
          </p>
          <button 
            type="button" 
            className="mk-doc-collection-empty-btn"
            onClick={onUploadMore}
            aria-label="Upload Document"
          >
            <UploadCloud size={16} />
            <span>Upload Document</span>
          </button>
        </div>
      ) : (
        <>
          {/* 2. COLLECTION HEADER */}
          <div className="mk-doc-collection__header">
            <div className="mk-doc-collection__title-area">
              <h3 className="mk-doc-collection__title">
                <span>Uploaded Documents</span>
                {/* Dynamically calculated count — NEVER hardcoded */}
                <span className="mk-doc-collection__count-pill">{totalCount}</span>
              </h3>

              <div className="mk-doc-collection__badges">
                {processedCount > 0 && (
                  <span className="mk-doc-pill mk-doc-pill--processed">
                    <CheckCircle2 size={12} />
                    <span>{processedCount} Processed</span>
                  </span>
                )}
                {inProgressCount > 0 && (
                  <span className="mk-doc-pill mk-doc-pill--progress">
                    <Clock size={12} className="mk-spin" />
                    <span>{inProgressCount} Processing</span>
                  </span>
                )}
                {rejectedCount > 0 && (
                  <span className="mk-doc-pill mk-doc-pill--rejected">
                    <AlertTriangle size={12} />
                    <span>{rejectedCount} Rejected</span>
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="mk-doc-pill mk-doc-pill--error">
                    <AlertCircle size={12} />
                    <span>{errorCount} Error</span>
                  </span>
                )}
              </div>
            </div>

            {/* Reusable "+ Upload More Documents" Button */}
            <button
              type="button"
              className="mk-doc-collection__upload-btn"
              onClick={onUploadMore}
              aria-label="Upload More Documents"
            >
              <Plus size={15} />
              <span>+ Upload More Documents</span>
            </button>
          </div>

          {/* 3. MULTIPLE INDEPENDENT DOCUMENT CARDS */}
          <div className="mk-doc-collection__list" role="list">
            {items.map((item) => (
              <div key={item.id} role="listitem">
                <DocumentProcessingCard
                  item={item}
                  onPreview={onViewDocument}
                  onRetry={onRetryDocument}
                  onDismiss={onRemoveDocument}
                  onUploadAnother={onUploadMore}
                />
              </div>
            ))}
          </div>

          {/* 4. BOTTOM ACTION BAR FOR CONVENIENCE */}
          <div className="mk-doc-collection__bottom-bar">
            <button
              type="button"
              className="mk-doc-collection__upload-more-card"
              onClick={onUploadMore}
              aria-label="Add more clinical documents to active case"
            >
              <Plus size={15} />
              <span>+ Upload More Documents</span>
            </button>
          </div>
        </>
      )}
    </section>
  );
};
