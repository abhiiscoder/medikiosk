/**
 * MEDiKIOSK — Phase 06: Extracted Clinical Information Component
 *
 * Data-driven, reusable clinical information extraction panel.
 *
 * Strict Compliance:
 * 1. Zero fabricated OCR or clinical information.
 * 2. Restrained skeleton during "Extracting information..." without fake text.
 * 3. Exact mandated empty state when no extraction data exists:
 *    "No clinical information extracted yet.
 *     Extracted information will appear here when processing is completed."
 * 4. Renders actual backend-provided data when available.
 * 5. Zero hardcoded confidence percentages (no 95%, 96%, 91%). Renders actual value only if provided.
 * 6. Edit action operates strictly on real extracted data.
 */

import React from 'react';
import { 
  Sparkles, 
  FileText, 
  AlertTriangle, 
  Clock, 
  Edit3,
  User,
  Calendar,
  Pill,
  Activity,
  Heart,
  FileCheck,
  Stethoscope
} from 'lucide-react';
import { ExtractedClinicalData, ExtractedEntity, ExtractionStatus } from '../../../types/document.types';
import { Skeleton } from '../../core/Skeleton/Skeleton';
import './ExtractedClinicalInformation.css';

export interface ExtractedClinicalInformationProps {
  data?: ExtractedClinicalData | null;
  extractedEntities?: ExtractedEntity[] | null;
  extractionStatus?: ExtractionStatus;
  isExtracting?: boolean;
  isRejected?: boolean;
  rejectionMessage?: string;
  className?: string;
  onEditField?: (fieldKey: string, currentValue: unknown) => void;
}

export const ExtractedClinicalInformation: React.FC<ExtractedClinicalInformationProps> = ({
  data,
  extractedEntities,
  extractionStatus,
  isExtracting = false,
  isRejected = false,
  rejectionMessage,
  className = '',
  onEditField
}) => {
  // Determine if there is actual, non-empty extracted data from the backend
  const hasStructuredData = Boolean(
    data &&
    (data.doctor ||
      data.date ||
      (data.medicines && data.medicines.length > 0) ||
      (data.conditions && data.conditions.length > 0) ||
      (data.laboratoryValues && data.laboratoryValues.length > 0) ||
      (data.vitalSigns && data.vitalSigns.length > 0) ||
      data.notes ||
      (data.otherEntities && data.otherEntities.length > 0))
  );

  const hasEntityList = Boolean(extractedEntities && extractedEntities.length > 0);
  const hasRealData = hasStructuredData || hasEntityList;

  const showExtracting = isExtracting || extractionStatus === 'extracting';
  const showRejected = isRejected;

  return (
    <div
      className={`mk-extracted-panel ${className}`}
      role="region"
      aria-label="Extracted Clinical Information"
    >
      {/* Panel Header */}
      <div className="mk-extracted-header">
        <div className="mk-extracted-title-wrap">
          <Sparkles size={16} className="mk-extracted-sparkle" aria-hidden="true" />
          <h3 className="mk-extracted-title">Extracted Clinical Information</h3>
        </div>

        {showRejected ? (
          <span className="mk-extracted-badge mk-extracted-badge--rejected">
            <AlertTriangle size={12} />
            <span>Rejected</span>
          </span>
        ) : showExtracting ? (
          <span className="mk-extracted-badge mk-extracted-badge--extracting">
            <Clock size={12} className="mk-spin" />
            <span>Extracting</span>
          </span>
        ) : null}
      </div>

      {/* STATE 1: REJECTED STATE */}
      {showRejected && (
        <div className="mk-extracted-rejected" role="alert">
          <AlertTriangle size={24} className="mk-extracted-rejected-icon" aria-hidden="true" />
          <h4 className="mk-extracted-rejected-title">
            {rejectionMessage || 'Document not recognized as a supported clinical record.'}
          </h4>
          <p className="mk-extracted-rejected-text">
            Non-medical documents cannot be processed for clinical information extraction. Please upload a supported medical record.
          </p>
        </div>
      )}

      {/* STATE 2: EXTRACTING SKELETON STATE */}
      {!showRejected && showExtracting && (
        <div className="mk-extracted-skeleton-wrap" aria-busy="true" aria-live="polite">
          <div className="mk-extracted-extracting-notice">
            <Clock size={14} className="mk-spin" />
            <span>Extracting information...</span>
          </div>

          {/* Restrained skeleton placeholders — ZERO fake text or mock clinical labels */}
          <div className="mk-extracted-skeleton-grid">
            <div className="mk-extracted-skeleton-row">
              <Skeleton width="30%" height="12px" borderRadius="4px" />
              <Skeleton width="75%" height="16px" borderRadius="4px" />
            </div>
            <div className="mk-extracted-skeleton-row">
              <Skeleton width="25%" height="12px" borderRadius="4px" />
              <Skeleton width="60%" height="16px" borderRadius="4px" />
            </div>
            <div className="mk-extracted-skeleton-row">
              <Skeleton width="35%" height="12px" borderRadius="4px" />
              <Skeleton width="85%" height="16px" borderRadius="4px" />
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: NO EXTRACTION DATA STATE (Phase 07 Mandate) */}
      {!showRejected && !showExtracting && !hasRealData && (
        <div className="mk-extracted-empty" role="status">
          <FileText size={28} className="mk-extracted-empty-icon" aria-hidden="true" />
          <p className="mk-extracted-empty-primary">
            No clinical information available yet.
          </p>
          <p className="mk-extracted-empty-secondary">
            Extracted information will appear here when processing is completed.
          </p>
        </div>
      )}

      {/* STATE 4: REAL DATA STATE (Rendered strictly from backend data) */}
      {!showRejected && !showExtracting && hasRealData && (
        <div className="mk-extracted-data-grid">
          {/* Doctor */}
          {data?.doctor && (
            <div className="mk-extracted-field-card">
              <div className="mk-extracted-field-header">
                <span className="mk-extracted-field-label">
                  <User size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Doctor
                </span>
                {onEditField && (
                  <button
                    type="button"
                    className="mk-extracted-edit-btn"
                    onClick={() => onEditField('doctor', data.doctor)}
                    aria-label="Edit doctor"
                  >
                    <Edit3 size={11} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              <p className="mk-extracted-field-value">{data.doctor}</p>
            </div>
          )}

          {/* Date */}
          {data?.date && (
            <div className="mk-extracted-field-card">
              <div className="mk-extracted-field-header">
                <span className="mk-extracted-field-label">
                  <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Date
                </span>
                {onEditField && (
                  <button
                    type="button"
                    className="mk-extracted-edit-btn"
                    onClick={() => onEditField('date', data.date)}
                    aria-label="Edit date"
                  >
                    <Edit3 size={11} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              <p className="mk-extracted-field-value">{data.date}</p>
            </div>
          )}

          {/* Medicines */}
          {data?.medicines && data.medicines.length > 0 && (
            <div className="mk-extracted-field-card">
              <div className="mk-extracted-field-header">
                <span className="mk-extracted-field-label">
                  <Pill size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Medicines
                </span>
                {onEditField && (
                  <button
                    type="button"
                    className="mk-extracted-edit-btn"
                    onClick={() => onEditField('medicines', data.medicines)}
                    aria-label="Edit medicines"
                  >
                    <Edit3 size={11} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              <div className="mk-extracted-field-chips">
                {data.medicines.map((med, idx) => (
                  <span key={idx} className="mk-extracted-chip">
                    {med}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Conditions */}
          {data?.conditions && data.conditions.length > 0 && (
            <div className="mk-extracted-field-card">
              <div className="mk-extracted-field-header">
                <span className="mk-extracted-field-label">
                  <Stethoscope size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Conditions
                </span>
                {onEditField && (
                  <button
                    type="button"
                    className="mk-extracted-edit-btn"
                    onClick={() => onEditField('conditions', data.conditions)}
                    aria-label="Edit conditions"
                  >
                    <Edit3 size={11} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              <div className="mk-extracted-field-chips">
                {data.conditions.map((cond, idx) => (
                  <span key={idx} className="mk-extracted-chip">
                    {cond}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Laboratory Values */}
          {data?.laboratoryValues && data.laboratoryValues.length > 0 && (
            <div className="mk-extracted-field-card">
              <div className="mk-extracted-field-header">
                <span className="mk-extracted-field-label">
                  <Activity size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Laboratory Values
                </span>
              </div>
              <div className="mk-extracted-field-chips">
                {data.laboratoryValues.map((lab, idx) => (
                  <span key={idx} className="mk-extracted-chip">
                    <strong>{lab.test}:</strong>&nbsp;{lab.value}&nbsp;{lab.unit || ''}
                    {/* Render actual backend confidence score ONLY if provided */}
                    {typeof lab.confidence === 'number' && (
                      <span className="mk-extracted-field-conf">
                        {Math.round(lab.confidence * 100)}%
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Vital Signs */}
          {data?.vitalSigns && data.vitalSigns.length > 0 && (
            <div className="mk-extracted-field-card">
              <div className="mk-extracted-field-header">
                <span className="mk-extracted-field-label">
                  <Heart size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Vital Signs
                </span>
              </div>
              <div className="mk-extracted-field-chips">
                {data.vitalSigns.map((vital, idx) => (
                  <span key={idx} className="mk-extracted-chip">
                    <strong>{vital.label}:</strong>&nbsp;{vital.value}&nbsp;{vital.unit || ''}
                    {typeof vital.confidence === 'number' && (
                      <span className="mk-extracted-field-conf">
                        {Math.round(vital.confidence * 100)}%
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {data?.notes && (
            <div className="mk-extracted-field-card">
              <div className="mk-extracted-field-header">
                <span className="mk-extracted-field-label">
                  <FileText size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Notes
                </span>
              </div>
              <p className="mk-extracted-field-value">{data.notes}</p>
            </div>
          )}

          {/* Other Clinical Entities */}
          {data?.otherEntities && data.otherEntities.length > 0 && (
            <div className="mk-extracted-field-card">
              <div className="mk-extracted-field-header">
                <span className="mk-extracted-field-label">
                  <FileCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Other Clinical Entities
                </span>
              </div>
              <div className="mk-extracted-field-chips">
                {data.otherEntities.map((entity) => (
                  <span key={entity.id} className="mk-extracted-chip">
                    <strong>{entity.label}:</strong>&nbsp;{entity.value}
                    {typeof entity.confidence === 'number' && (
                      <span className="mk-extracted-field-conf">
                        {Math.round(entity.confidence * 100)}%
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Raw Extracted Entities list if available */}
          {extractedEntities && extractedEntities.length > 0 && !hasStructuredData && (
            <div className="mk-extracted-field-card">
              <div className="mk-extracted-field-header">
                <span className="mk-extracted-field-label">Clinical Findings</span>
              </div>
              <div className="mk-extracted-field-chips">
                {extractedEntities.map((entity) => (
                  <span key={entity.id} className="mk-extracted-chip">
                    <strong>{entity.category.replace('_', ' ').toUpperCase()}:</strong>&nbsp;{entity.normalizedValue}
                    {typeof entity.confidence === 'number' && (
                      <span className="mk-extracted-field-conf">
                        {Math.round(entity.confidence * 100)}%
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
