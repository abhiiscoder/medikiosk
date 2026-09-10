/**
 * MEDiKIOSK — PHASE 00
 * Accessible Form Input Component
 */

import React, { useState, useId } from 'react';
import './Input.css';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  isSuccess?: boolean;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  requiredIndicator?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  errorMessage,
  isSuccess = false,
  leftAdornment,
  rightAdornment,
  requiredIndicator = false,
  disabled,
  id: customId,
  className = '',
  onFocus,
  onBlur,
  ...props
}) => {
  const autoId = useId();
  const inputId = customId || autoId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(errorMessage);

  const containerClasses = [
    'mk-field__input-container',
    isFocused ? 'mk-field__input-container--focused' : '',
    hasError ? 'mk-field__input-container--error' : '',
    isSuccess ? 'mk-field__input-container--success' : '',
    disabled ? 'mk-field__input-container--disabled' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`mk-field ${className}`}>
      {label && (
        <div className="mk-field__label-wrapper">
          <label htmlFor={inputId} className="mk-field__label">
            {label}
            {requiredIndicator && <span className="mk-field__required" aria-hidden="true">*</span>}
          </label>
        </div>
      )}

      <div className={containerClasses}>
        {leftAdornment && <div className="mk-field__adornment-left">{leftAdornment}</div>}
        <input
          id={inputId}
          className="mk-field__input"
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
        {rightAdornment && <div className="mk-field__adornment-right">{rightAdornment}</div>}
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
