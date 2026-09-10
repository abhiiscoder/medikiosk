/**
 * MEDiKIOSK — PHASE 00
 * Accessible Select Component
 */

import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import './Select.css';
import '../Input/Input.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  errorMessage?: string;
  requiredIndicator?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  helperText,
  errorMessage,
  requiredIndicator = false,
  disabled,
  id: customId,
  className = '',
  ...props
}) => {
  const autoId = useId();
  const selectId = customId || autoId;
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;
  const hasError = Boolean(errorMessage);

  return (
    <div className={`mk-field ${className}`}>
      {label && (
        <div className="mk-field__label-wrapper">
          <label htmlFor={selectId} className="mk-field__label">
            {label}
            {requiredIndicator && <span className="mk-field__required" aria-hidden="true">*</span>}
          </label>
        </div>
      )}

      <div className="mk-select-wrapper">
        <select
          id={selectId}
          className={`mk-select ${hasError ? 'mk-field__input-container--error' : ''}`}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="mk-select-icon" aria-hidden="true">
          <ChevronDown size={16} />
        </span>
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
