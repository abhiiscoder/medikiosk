/**
 * MEDiKIOSK — PHASE 00
 * Reusable Medical DocumentCard Component
 */

import React from 'react';
import { 
  FileText, 
  FileCheck, 
  Eye, 
  Trash2, 
  FileCode, 
  Activity 
} from 'lucide-react';
import { MedicalDocument, MedicalDocumentType } from '../../../types/document.types';
import { DocumentStatus } from '../StatusBadges/StatusBadges';
import { IconButton } from '../../core/IconButton/IconButton';
import './DocumentCard.css';

export interface DocumentCardProps {
  document: MedicalDocument;
  onPreview?: (doc: MedicalDocument) => void;
  onRemove?: (docId: string) => void;
  className?: string;
}

const TYPE_ICONS: Record<MedicalDocumentType, React.ReactNode> = {
  lab_report: <Activity size={18} />,
  prescription: <FileText size={18} />,
  radiology: <FileCheck size={18} />,
  discharge_summary: <FileCode size={18} />,
  clinical_note: <FileText size={18} />,
  identity_card: <FileCheck size={18} />,
  other: <FileText size={18} />
};

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: doc,
  onPreview,
  onRemove,
  className = ''
}) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`mk-doc-card ${className}`} role="article" aria-label={`Medical document ${doc.name}`}>
      <div className="mk-doc-card__main">
        <div className="mk-doc-card__icon-box" aria-hidden="true">
          {TYPE_ICONS[doc.type] || <FileText size={18} />}
        </div>
        <div className="mk-doc-card__details">
          <div className="mk-doc-card__name" title={doc.name}>
            {doc.name}
          </div>
          <div className="mk-doc-card__meta">
            <span>{formatSize(doc.sizeBytes)}</span>
            <span>•</span>
            <span>{formatDate(doc.uploadedAt)}</span>
            {doc.pageCount && (
              <>
                <span>•</span>
                <span>{doc.pageCount} pg</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mk-doc-card__actions">
        <DocumentStatus status={doc.processingStatus} />

        {onPreview && (
          <IconButton
            icon={<Eye size={15} />}
            aria-label={`Preview ${doc.name}`}
            size="sm"
            variant="ghost"
            onClick={() => onPreview(doc)}
          />
        )}

        {onRemove && (
          <IconButton
            icon={<Trash2 size={15} />}
            aria-label={`Delete ${doc.name}`}
            size="sm"
            variant="ghost"
            onClick={() => onRemove(doc.id)}
          />
        )}
      </div>
    </div>
  );
};
