/**
 * MEDiKIOSK — PHASE 00
 * Accessible FileUploader Component
 */

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Progress } from '../Progress/Progress';
import './FileUploader.css';

export type FileUploadState = 'idle' | 'dragging' | 'uploading' | 'processing' | 'success' | 'error';

export interface FileUploaderProps {
  onFileSelect?: (file: File) => void;
  accept?: string;
  maxSizeBytes?: number;
  state?: FileUploadState;
  progressPercent?: number;
  statusText?: string;
  errorMessage?: string;
  disabled?: boolean;
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  accept = '.pdf,.png,.jpg,.jpeg',
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  state: controlledState,
  progressPercent = 0,
  statusText,
  errorMessage,
  disabled = false,
  className = ''
}) => {
  const [internalDragging, setInternalDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentState = controlledState || (internalDragging ? 'dragging' : 'idle');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setInternalDragging(true);
  };

  const handleDragLeave = () => {
    setInternalDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setInternalDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) validateAndProcess(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndProcess(file);
  };

  const validateAndProcess = (file: File) => {
    if (file.size > maxSizeBytes) {
      alert(`File size exceeds ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB limit.`);
      return;
    }
    onFileSelect?.(file);
  };

  const renderContent = () => {
    switch (currentState) {
      case 'uploading':
        return (
          <>
            <div className="mk-file-uploader__icon">
              <Loader2 size={24} className="mk-btn__spinner" />
            </div>
            <div className="mk-file-uploader__title">
              {statusText || 'Uploading medical document...'}
            </div>
            <div style={{ width: '200px' }}>
              <Progress value={progressPercent} status="brand" />
            </div>
          </>
        );
      case 'processing':
        return (
          <>
            <div className="mk-file-uploader__icon">
              <Loader2 size={24} className="mk-btn__spinner" />
            </div>
            <div className="mk-file-uploader__title">
              {statusText || 'AI OCR Entity Extraction in progress...'}
            </div>
            <div className="mk-file-uploader__hint">
              Detecting clinical lab markers, medications, and diagnosis records
            </div>
          </>
        );
      case 'success':
        return (
          <>
            <div className="mk-file-uploader__icon" style={{ color: 'var(--color-status-success)' }}>
              <CheckCircle2 size={24} />
            </div>
            <div className="mk-file-uploader__title" style={{ color: 'var(--color-status-success-text)' }}>
              {statusText || 'Document uploaded and analyzed'}
            </div>
            <div className="mk-file-uploader__hint">Click or drop to replace document</div>
          </>
        );
      case 'error':
        return (
          <>
            <div className="mk-file-uploader__icon" style={{ color: 'var(--color-status-error)' }}>
              <AlertCircle size={24} />
            </div>
            <div className="mk-file-uploader__title" style={{ color: 'var(--color-status-error-text)' }}>
              {errorMessage || 'Document upload or OCR parsing failed'}
            </div>
            <div className="mk-file-uploader__hint">Click to try again with a legible scan</div>
          </>
        );
      default:
        return (
          <>
            <div className="mk-file-uploader__icon">
              <UploadCloud size={24} />
            </div>
            <div className="mk-file-uploader__title">
              Drop medical report or prescription here, or browse
            </div>
            <div className="mk-file-uploader__hint">
              Supports PDF, PNG, JPG scans up to 10MB • HIPAA & ABDM Compliant Intake
            </div>
          </>
        );
    }
  };

  const classes = [
    'mk-file-uploader',
    `mk-file-uploader--${currentState}`,
    disabled ? 'mk-file-uploader--disabled' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="region"
      aria-label="Medical document file uploader"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleInputChange}
        aria-label="Upload medical file"
      />
      {renderContent()}
    </div>
  );
};
