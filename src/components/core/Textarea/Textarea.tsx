/**
 * MEDiKIOSK — PHASE 00
 * Accessible Form Textarea Component
 */

import React, { useState, useId } from 'react';
import '../Input/Input.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  requiredIndicator?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  helperText,
  errorMessage,
  requiredIndicator = false,
  disabled,
  id: customId,
  className = '',
  rows = 3,
  onFocus,
  onBlur,
  ...props
}) => {
  const autoId = useId();
  const textareaId = customId || autoId;
  const errorId = `${textareaId}-error`;
  const helperId = `${textareaId}-helper`;

  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(errorMessage);

  const containerClasses = [
    'mk-field__input-container',
    isFocused ? 'mk-field__input-container--focused' : '',
    hasError ? 'mk-field__input-container--error' : '',
    disabled ? 'mk-field__input-container--disabled' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`mk-field ${className}`}>
      {label && (
        <div className="mk-field__label-wrapper">
          <label htmlFor={textareaId} className="mk-field__label">
            {label}
            {requiredIndicator && <span className="mk-field__required" aria-hidden="true">*</span>}
          </label>
        </div>
      )}

      <div className={containerClasses}>
        <textarea
          id={textareaId}
          className="mk-field__textarea"
          rows={rows}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </div>

      {hasError ? (
        <div id={errorId} className="mk-field__message mk-field__message--error" role="alert">
          {errorMessage}
        </div>
      ) : helperText ? (
        <div id={helperId} className="mk-field__message mk-field__message--helper">
          {helperText}
        </div>
      ) : null}
    </div>
  );
};
