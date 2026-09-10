/**
 * MEDiKIOSK — Phase 05: Medical Records Upload & Document Validation
 * Stage 2: Medical Records Interactive Workspace
 *
 * Capabilities:
 * 1. Safe clinical file ingestion (PDF, PNG, JPG, WebP <= 25MB)
 * 2. Drag & drop upload zone with browse file dialog
 * 3. Categorized clinical guidance (Rx, Lab, Imaging, Discharge, Notes)
 * 4. Document queue tracking all processing states:
 *    - Uploading (progress bar)
 *    - Validating (clinical relevance inspection)
 *    - Clinical Verified (truthful state, zero fake OCR observations)
 *    - Non-Clinical Flagged (safe alert, guidance message, isolated from summary)
 * 5. Document preview and dismissal / retry actions
 * 6. Smooth navigation to Stage 3 (Summary)
 */

import React, { useRef, useState, useCallback } from 'react';
import { 
  FileText, 
  UploadCloud, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  Info
} from 'lucide-react';
import { useCaseWorkflow } from '../hooks/useCaseWorkflow';
import { useDocumentPipeline, PipelineItem } from '../../../../hooks/useDocumentPipeline';
import { DocumentCollection } from '../../DocumentCollection';

export interface MedicalRecordsStageProps {
  className?: string;
}

const CLINICAL_CATEGORIES = [
  { label: 'Prescriptions', icon: '💊', desc: 'Rx, medication lists, active refills' },
  { label: 'Lab Reports', icon: '🧪', desc: 'Blood work, urinalysis, pathology' },
  { label: 'Imaging & Scans', icon: '🩻', desc: 'X-rays, CT scans, MRI, Ultrasound' },
  { label: 'Discharge Summaries', icon: '🏥', desc: 'Hospital admissions, surgical notes' },
  { label: 'Doctor Notes', icon: '🩺', desc: 'Physician visit notes, vitals records' }
];

export const MedicalRecordsStage: React.FC<MedicalRecordsStageProps> = ({ className = '' }) => {
  const { 
    caseId, 
    setStage, 
    documentPipeline: contextPipeline, 
    onPreviewDocument 
  } = useCaseWorkflow();

  // Fallback if pipeline not provided through context
  const fallbackPipeline = useDocumentPipeline({
    activeCaseId: caseId || ''
  });

  const pipeline = contextPipeline || fallbackPipeline;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      pipeline.processFiles(droppedFiles);
    }
  }, [pipeline]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      pipeline.processFiles(selectedFiles);
      e.target.value = '';
    }
  }, [pipeline]);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAttachSample = useCallback((label: string) => {
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

    if (label === 'Prescriptions') {
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
    } else if (label === 'Lab Reports') {
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
    } else if (label === 'Imaging & Scans') {
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
- Normal bony thorax and soft tissue structures

IMPRESSION:
Normal chest radiograph. No acute cardiopulmonary disease.

Radiologist: Dr. Priya Nair, MD (Radiodiagnosis)
============================================================
`;
    } else if (label === 'Discharge Summaries') {
      filename = 'Inpatient_Hospital_Discharge_Summary.pdf';
      content = `============================================================
HOSPITAL INPATIENT DISCHARGE SUMMARY
Department of General Internal Medicine
Discharge ID: DS-2026-4410
============================================================
Admission Date: 01-Sep-2026
Discharge Date: 04-Sep-2026
Condition at Discharge: Stable, afebrile, ambulating independently

Summary of Hospital Course:
Patient admitted with acute uncomplicated gastrointestinal symptoms.
Hydration therapy and symptomatic anti-emetics administered.
Resolution of symptoms achieved within 48 hours.

Discharge Medications:
1. Pantoprazole 40mg OD before breakfast for 5 days
2. Oral Rehydration Solution as required

Attending Physician: Dr. R. V. Kulkarni, MD
============================================================
`;
    } else if (label === 'Doctor Notes') {
      filename = 'Clinical_Physician_Consultation_Note.pdf';
      content = `============================================================
CLINICAL PHYSICIAN CONSULTATION NOTE
Department of General Medicine
Encounter: Routine Clinical Review
============================================================
Subjective: Patient reports good overall health. Occasional mild fatigue.
Objective: BP: 124/82 mmHg, HR: 74 bpm, SpO2: 99% on room air.
Assessment: Stable clinical state. Normal vitals.
Plan: Continue balanced diet and regular physical activity.

Consultant: Dr. S. Bannerjee, MD
============================================================
`;
    } else if (label === 'non_clinical') {
      filename = 'College_Homework_Assignment.pdf';
      content = `Computer Science Department - Homework Assignment 3: Algorithms and Data Structures.`;
    } else if (label === 'error') {
      filename = 'error_test_diagnostic.pdf';
      content = `Error test payload.`;
    }

    const testFile = new File([new Blob([content], { type: mimeType })], filename, {
      type: mimeType,
      lastModified: Date.now()
    });

    pipeline.processFiles([testFile]);
  }, [pipeline]);

  const activeItems = pipeline.items || [];
  const rejectedCount = activeItems.filter((i: PipelineItem) => i.stage === 'rejected' || i.stage === 'non_clinical').length;
  const isBusyProcessing = activeItems.some(
    (i: PipelineItem) => i.stage === 'uploading' || i.stage === 'validating' || i.stage === 'processing' || i.stage === 'extracting'
  );

  return (
    <div
      className={`mk-stage-container mk-stage-medical-records ${className}`}
      role="tabpanel"
      id="stage-panel-medical-records"
      aria-labelledby="stage-tab-medical-records"
    >
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        aria-hidden="true"
      />

      {/* 1. Stage Header Banner */}
      <div className="mk-stage-header">
        <div className="mk-stage-icon-badge">
          <FileText size={20} strokeWidth={2} />
        </div>
        <div className="mk-stage-header-text">
          <h3 className="mk-stage-title">Medical Records & Diagnostic Reports</h3>
          <p className="mk-stage-subtitle">
            Upload clinical documents to attach verified medical history to patient case {caseId ? `(${caseId})` : ''}
          </p>
        </div>
        <div className="mk-stage-status-pill mk-stage-status-pill--current">
          <span className="mk-stage-status-dot" aria-hidden="true" />
          <span>Stage 2</span>
        </div>
      </div>

      {/* 2. Supported Categories Guidance Banner */}
      <div className="mk-mr-categories-strip" aria-label="Supported medical document categories">
        <div className="mk-mr-categories-label">
          <Info size={14} />
          <span>Supported Clinical Categories:</span>
        </div>
        <div className="mk-mr-categories-list">
          {CLINICAL_CATEGORIES.map((cat) => (
            <div 
              key={cat.label} 
              className="mk-mr-category-chip" 
              title={`${cat.desc} • Click to test attach`}
              role="button"
              tabIndex={0}
              onClick={() => handleAttachSample(cat.label)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleAttachSample(cat.label);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <span className="mk-mr-category-emoji" aria-hidden="true">{cat.icon}</span>
              <span className="mk-mr-category-name">{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Attach Clinical Samples Strip */}
      <div className="mk-mr-demo-strip" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', margin: '2px 0 10px 0' }}>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Attach Clinical Record:</span>
        <button
          type="button"
          className="mk-mr-demo-btn"
          onClick={() => handleAttachSample('Prescriptions')}
          style={{ background: 'rgba(24, 101, 242, 0.12)', border: '1px solid rgba(24, 101, 242, 0.3)', color: '#60A5FA', borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 500, cursor: 'pointer' }}
        >
          + Prescription (Rx)
        </button>
        <button
          type="button"
          className="mk-mr-demo-btn"
          onClick={() => handleAttachSample('Lab Reports')}
          style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34D399', borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 500, cursor: 'pointer' }}
        >
          + Laboratory Report
        </button>
        <button
          type="button"
          className="mk-mr-demo-btn"
          onClick={() => handleAttachSample('Doctor Notes')}
          style={{ background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#C084FC', borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 500, cursor: 'pointer' }}
        >
          + Doctor Consultation Note
        </button>
      </div>


      {/* 3. Interactive Upload Dropzone */}
      <div
        className={`mk-mr-dropzone ${isDragging ? 'mk-mr-dropzone--active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        role="button"
        tabIndex={0}
        aria-label="Upload medical documents"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerFileSelect();
          }
        }}
      >
        <div className="mk-mr-dropzone-icon">
          <UploadCloud size={24} strokeWidth={2} />
        </div>
        <div className="mk-mr-dropzone-content">
          <h4 className="mk-mr-dropzone-title">
            Drop medical documents here, or <span className="mk-mr-browse-link">browse files</span>
          </h4>
          <p className="mk-mr-dropzone-subtitle">
            Accepts PDF, PNG, JPG, or WebP up to 25 MB • Verified against non-clinical content
          </p>
        </div>
        <div className="mk-mr-dropzone-compliance">
          <ShieldCheck size={14} />
          <span>Client-Validated</span>
        </div>
      </div>

      {/* 4. Rejection Notice if any files rejected */}
      {rejectedCount > 0 && (
        <div className="mk-mr-non-clinical-alert" role="alert">
          <div className="mk-mr-non-clinical-alert-icon">
            <AlertTriangle size={18} />
          </div>
          <div className="mk-mr-non-clinical-alert-text">
            <strong>Document not recognized as a supported clinical record.</strong>
            <p>
              {rejectedCount} {rejectedCount === 1 ? 'file was' : 'files were'} flagged as non-medical and isolated. Non-clinical documents (such as homework, resumes, or bills) cannot be included in clinical summaries.
            </p>
          </div>
        </div>
      )}

      {/* 5. Reusable Document Collection (Phase 07) */}
      <DocumentCollection
        items={activeItems}
        onViewDocument={onPreviewDocument || (() => {})}
        onRemoveDocument={pipeline.dismissItem}
        onRetryDocument={pipeline.retry}
        onUploadMore={triggerFileSelect}
      />



      {/* 6. Navigation Footer Controls */}
      <div className="mk-mr-navigation-footer">
        <button
          type="button"
          className="mk-mr-back-btn"
          onClick={() => setStage('clinical-history')}
        >
          <ArrowLeft size={16} />
          <span>Back to Clinical History</span>
        </button>

        <div className="mk-mr-footer-info">
          <span>Records are optional • Proceed at any time</span>
        </div>

        <button
          type="button"
          className="mk-mr-continue-btn"
          onClick={() => setStage('summary')}
          disabled={isBusyProcessing}
          title={isBusyProcessing ? 'Please wait for documents to finish processing' : 'Proceed to clinical summary'}
        >
          <span>Continue to Summary</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
