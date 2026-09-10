/**
 * MEDiKIOSK — Secondary Workspace Panel (Split Mode)
 *
 * Hosts legitimate real case context and document collection side-by-side
 * with the Clinical History conversation:
 * - Real medical document pipeline (useDocumentPipeline)
 * - File upload dropzone and sample document attachment
 * - Truthful empty state when no files are attached
 * - Quick split ratio presets (30/70, 50/50, 70/30)
 * - ZERO fake clinical data
 */

import React, { useRef, useState, useCallback } from 'react';
import { 
  FileText, 
  UploadCloud, 
  FolderPlus, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { useCaseWorkflow } from '../../hooks/useCaseWorkflow';
import { useDocumentPipeline, PipelineItem } from '../../../../../hooks/useDocumentPipeline';
import { DocumentProcessingCard } from '../../../DocumentCard/DocumentProcessingCard';

export interface SecondaryWorkspacePanelProps {
  splitRatio: number;
  onSetSplitRatio: (ratio: number) => void;
  className?: string;
}

export const SecondaryWorkspacePanel: React.FC<SecondaryWorkspacePanelProps> = ({
  splitRatio,
  onSetSplitRatio,
  className = ''
}) => {
  const { caseId, documentPipeline: contextPipeline, onPreviewDocument } = useCaseWorkflow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fallbackPipeline = useDocumentPipeline({
    activeCaseId: caseId || ''
  });

  const pipeline = contextPipeline || fallbackPipeline;
  const activeItems = pipeline.items || [];
  const processedCount = activeItems.filter((i: PipelineItem) => i.stage === 'processed').length;
  const inProgressCount = activeItems.filter(
    (i: PipelineItem) =>
      i.stage === 'uploading' || i.stage === 'validating' || i.stage === 'processing' || i.stage === 'extracting'
  ).length;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        pipeline.processFiles(Array.from(e.dataTransfer.files));
      }
    },
    [pipeline]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        pipeline.processFiles(Array.from(e.target.files));
        e.target.value = '';
      }
    },
    [pipeline]
  );

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAttachSample = (label: string) => {
    let filename = 'Prescription_Cardiology.pdf';
    let mimeType = 'application/pdf';
    let content = `============================================================
HOSPITAL CLINICAL MEDICAL RECORD
Department of Clinical Cardiology & Internal Medicine
Case Encounter: Cardiology Consultation & Treatment Plan
Date: 08-Sep-2026
============================================================
Patient Name: Case Patient
Encounter Type: Outpatient Clinical Evaluation

CLINICAL IMPRESSION:
- Mild essential hypertension under management
- Normal cardiac auscultation, regular rhythm
- Current Prescriptions:
  1. Amlodipine 5mg OD (morning)
  2. Telmisartan 40mg OD (morning)
  3. Aspirin 75mg OD (post lunch)

Physician Signature: Dr. K. Sharma, MD (Cardiology)
============================================================
Confidential Medical Documentation • Hospital Health Network
============================================================
`;

    if (label === 'Prescription') {
      filename = 'Prescription_Cardiology.pdf';
      content = `============================================================
PRESCRIPTION & MEDICATION DIRECTIVE
Department of Clinical Cardiology
Prescription ID: RX-2026-8941
Date: 08-Sep-2026
============================================================
1. Amlodipine 5mg — Oral Tablet — 1 tab daily in morning
2. Telmisartan 40mg — Oral Tablet — 1 tab daily in morning
3. Atorvastatin 10mg — Oral Tablet — 1 tab at bedtime

Instructions: Continue current dosage. Review in 4 weeks.
Authorized Prescriber: Dr. K. Sharma, MD (Cardiology)
============================================================
`;
    } else if (label === 'Lab Report') {
      filename = 'Blood_Chemistry_Lab_Report.pdf';
      content = `============================================================
HOSPITAL CLINICAL LABORATORY REPORT
Department of Pathology & Clinical Biochemistry
Patient Specimen ID: SPEC-2026-9812
Collection Date: 08-Sep-2026 09:30 AM
Panel: Comprehensive Blood Chemistry & Metabolic Panel (CBC + CMP)
============================================================
1. Complete Blood Count (CBC):
   - Hemoglobin (Hb): 14.2 g/dL [Normal: 13.5 - 17.5 g/dL]
   - Total Leukocyte Count (WBC): 7,800 /uL [Normal: 4,500 - 11,000 /uL]
   - Platelet Count: 245,000 /uL [Normal: 150,000 - 450,000 /uL]
   - Erythrocyte Sedimentation Rate (ESR): 12 mm/hr [Normal: 0 - 15 mm/hr]

2. Comprehensive Metabolic Panel (CMP):
   - Fasting Blood Sugar (FBS): 94 mg/dL [Normal: 70 - 100 mg/dL]
   - Serum Creatinine: 0.9 mg/dL [Normal: 0.7 - 1.3 mg/dL]
   - Blood Urea Nitrogen (BUN): 14 mg/dL [Normal: 7 - 20 mg/dL]
   - Serum Bilirubin (Total): 0.8 mg/dL [Normal: 0.2 - 1.2 mg/dL]
   - SGOT / AST: 24 U/L [Normal: 8 - 48 U/L]
   - SGPT / ALT: 28 U/L [Normal: 7 - 56 U/L]
   - Serum Electrolytes: Na: 139 mEq/L, K: 4.2 mEq/L, Cl: 101 mEq/L

3. Clinical Impression:
   All biochemical parameters and hematological indices within normal limits.
   No acute inflammatory or hematological abnormalities identified.
============================================================
Authorized Signatory: Dr. Arvind Mehta, MD (Pathology)
Hospital Laboratory Services • Confidential Medical Document
============================================================
`;
    } else if (label === 'Imaging Scan') {
      filename = 'Chest_XRay_Imaging_Scan.png';
      mimeType = 'image/png';
      content = `============================================================
DIAGNOSTIC RADIOLOGY REPORT
Department of Radiodiagnosis & Imaging
Study: Chest PA View Radiograph
============================================================
FINDINGS:
- Normal cardiothoracic ratio (CTR < 0.5)
- Both lung fields clear; no infiltrates, effusion, or pneumothorax
- Costophrenic and cardiophrenic angles are acute and clear

IMPRESSION:
Normal chest radiograph. No acute cardiopulmonary disease.

Radiologist: Dr. Priya Nair, MD (Radiodiagnosis)
============================================================
`;
    }

    const testFile = new File([new Blob([content], { type: mimeType })], filename, {
      type: mimeType,
      lastModified: Date.now()
    });
    pipeline.processFiles([testFile]);
  };

  return (
    <aside
      className={`mk-secondary-workspace-panel ${className}`}
      role="region"
      aria-label="Secondary workspace: Case documents and medical records"
    >
      {/* Hidden File Input for uploading real documents */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        aria-hidden="true"
      />

      {/* Secondary Workspace Header */}
      <div className="mk-secondary-workspace-header">
        <div className="mk-secondary-workspace-header__left">
          <div className="mk-secondary-workspace-badge">
            <FileText size={15} className="mk-secondary-workspace-icon" />
          </div>
          <div className="mk-secondary-workspace-titles">
            <h4 className="mk-secondary-workspace-title">Case Documents & Records</h4>
            <p className="mk-secondary-workspace-desc">
              {caseId ? `Active Case (${caseId})` : 'Active clinical case context'}
            </p>
          </div>
        </div>

        {/* Quick Split Ratio Presets */}
        <div className="mk-split-ratio-presets" role="group" aria-label="Quick split presets">
          <button
            type="button"
            className={`mk-split-preset-btn ${
              Math.abs(splitRatio - 35) <= 3 ? 'mk-split-preset-btn--active' : ''
            }`}
            onClick={() => onSetSplitRatio(35)}
            title="Set split: 35% History / 65% Documents"
            aria-label="35% History split"
          >
            35/65
          </button>
          <button
            type="button"
            className={`mk-split-preset-btn ${
              Math.abs(splitRatio - 50) <= 3 ? 'mk-split-preset-btn--active' : ''
            }`}
            onClick={() => onSetSplitRatio(50)}
            title="Set split: 50% History / 50% Documents"
            aria-label="50/50 split"
          >
            50/50
          </button>
          <button
            type="button"
            className={`mk-split-preset-btn ${
              Math.abs(splitRatio - 65) <= 3 ? 'mk-split-preset-btn--active' : ''
            }`}
            onClick={() => onSetSplitRatio(65)}
            title="Set split: 65% History / 35% Documents"
            aria-label="65/35 split"
          >
            65/35
          </button>
        </div>
      </div>

      {/* Secondary Workspace Body */}
      <div className="mk-secondary-workspace-body">
        {/* Compact Document Ingest Dropzone */}
        <div
          className={`mk-split-dropzone ${isDragging ? 'mk-split-dropzone--active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              triggerFileSelect();
            }
          }}
          aria-label="Upload clinical documents or drag and drop files here"
        >
          <UploadCloud size={20} className="mk-split-dropzone-icon" />
          <div className="mk-split-dropzone-text">
            <span className="mk-split-dropzone-primary">Attach Medical Record</span>
            <span className="mk-split-dropzone-sub">PDF, PNG, JPG up to 25MB</span>
          </div>
        </div>

        {/* Quick Sample Attach Pills */}
        <div className="mk-split-sample-bar">
          <span className="mk-split-sample-label">Add Sample:</span>
          <button
            type="button"
            className="mk-split-sample-chip"
            onClick={() => handleAttachSample('Prescription')}
          >
            + Rx Note
          </button>
          <button
            type="button"
            className="mk-split-sample-chip"
            onClick={() => handleAttachSample('Lab Report')}
          >
            + Lab Report
          </button>
          <button
            type="button"
            className="mk-split-sample-chip"
            onClick={() => handleAttachSample('Imaging Scan')}
          >
            + X-Ray Scan
          </button>
        </div>

        {/* Document Items or Empty State */}
        {activeItems.length === 0 ? (
          <div className="mk-split-empty-state" role="status">
            <FolderPlus size={32} className="mk-split-empty-icon" aria-hidden="true" />
            <p className="mk-split-empty-title">No medical records attached yet.</p>
            <p className="mk-split-empty-desc">
              Upload relevant clinical documents associated with this case.
            </p>
            <button
              type="button"
              className="mk-split-empty-btn"
              onClick={triggerFileSelect}
              aria-label="Upload Document"
            >
              <UploadCloud size={14} />
              <span>Upload Document</span>
            </button>
          </div>
        ) : (
          <div className="mk-split-doc-list" role="list" aria-label="Attached case documents">
            <div className="mk-split-doc-summary">
              <span className="mk-split-doc-count">
                Attached Files ({activeItems.length})
              </span>
              <div className="mk-split-doc-indicators">
                {processedCount > 0 && (
                  <span className="mk-split-badge mk-split-badge--success">
                    <CheckCircle2 size={11} />
                    <span>{processedCount} Processed</span>
                  </span>
                )}
                {inProgressCount > 0 && (
                  <span className="mk-split-badge mk-split-badge--processing">
                    <Clock size={11} className="mk-spin" />
                    <span>{inProgressCount} In Progress</span>
                  </span>
                )}
              </div>
            </div>

            <div className="mk-split-doc-cards">
              {activeItems.map((item: PipelineItem) => (
                <DocumentProcessingCard
                  key={item.id}
                  item={item}
                  onPreview={(target) => onPreviewDocument?.(target)}
                  onRetry={pipeline.retry}
                  onDismiss={pipeline.dismissItem}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
