/**
 * MEDiKIOSK — Phase 04: OtherCustomInput Component
 *
 * Dedicated custom text input rendered when patient selects "Other".
 */

import React from 'react';

export interface OtherCustomInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export const OtherCustomInput: React.FC<OtherCustomInputProps> = ({
  value,
  onChange,
  placeholder = 'Please specify...',
  disabled = false,
  hasError = false,
  errorMessage
}) => {
  return (
    <div className={`mk-question-other ${hasError ? 'mk-question-other--error' : ''}`}>
      <label htmlFor="mk-other-custom-input" className="mk-question-other__label">
        Please specify:
      </label>
      <div className="mk-question-other__input-wrapper">
        <input
          id="mk-other-custom-input"
          type="text"
          className="mk-question-other__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-invalid={hasError}
          aria-describedby={hasError && errorMessage ? 'mk-other-error-msg' : undefined}
        />
      </div>
      {hasError && errorMessage && (
        <span id="mk-other-error-msg" className="mk-question-other__error" role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  );
};
