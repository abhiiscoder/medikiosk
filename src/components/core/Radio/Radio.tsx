/**
 * MEDiKIOSK — PHASE 00
 * Accessible Radio Component
 */

import React, { useId } from 'react';
import '../Checkbox/Checkbox.css';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  subtext?: string;
}

export const Radio: React.FC<RadioProps> = ({
  label,
  subtext,
  disabled,
  checked,
  id: customId,
  className = '',
  ...props
}) => {
  const autoId = useId();
  const inputId = customId || autoId;

  return (
    <label
      htmlFor={inputId}
      className={`mk-selection-control ${disabled ? 'mk-selection-control--disabled' : ''} ${className}`}
    >
      <input
        type="radio"
        id={inputId}
        disabled={disabled}
        checked={checked}
        {...props}
      />
      <span className="mk-radio-circle" aria-hidden="true">
        <span className="mk-radio-dot" />
      </span>
      <span className="mk-selection-control__label-group">
        <span>{label}</span>
        {subtext && <span className="mk-selection-control__subtext">{subtext}</span>}
      </span>
    </label>
  );
};
