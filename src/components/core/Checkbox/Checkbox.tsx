/**
 * MEDiKIOSK — PHASE 00
 * Accessible Checkbox Component
 */

import React, { useId } from 'react';
import { Check } from 'lucide-react';
import './Checkbox.css';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  subtext?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
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
        type="checkbox"
        id={inputId}
        disabled={disabled}
        checked={checked}
        {...props}
      />
      <span className="mk-checkbox-box" aria-hidden="true">
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="mk-selection-control__label-group">
        <span>{label}</span>
        {subtext && <span className="mk-selection-control__subtext">{subtext}</span>}
      </span>
    </label>
  );
};
