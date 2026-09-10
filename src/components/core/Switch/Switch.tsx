/**
 * MEDiKIOSK — PHASE 00
 * Accessible Switch Component
 */

import React, { useId } from 'react';
import '../Checkbox/Checkbox.css';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  subtext?: string;
}

export const Switch: React.FC<SwitchProps> = ({
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
        role="switch"
        id={inputId}
        disabled={disabled}
        checked={checked}
        aria-checked={checked}
        {...props}
      />
      <span className="mk-switch-track" aria-hidden="true">
        <span className="mk-switch-thumb" />
      </span>
      <span className="mk-selection-control__label-group">
        <span>{label}</span>
        {subtext && <span className="mk-selection-control__subtext">{subtext}</span>}
      </span>
    </label>
  );
};
