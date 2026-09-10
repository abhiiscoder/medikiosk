/**
 * MEDiKIOSK — PHASE 00
 * Reusable IconButton Component
 */

import React from 'react';
import '../Button/Button.css';
import { ButtonVariant, ButtonSize } from '../Button/Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  'aria-label': string; // Accessible name is required
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  'aria-label': ariaLabel,
  variant = 'ghost',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  const classes = [
    'mk-btn',
    'mk-icon-btn',
    `mk-btn--${variant}`,
    `mk-icon-btn--${size}`,
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classes}
      aria-label={ariaLabel}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className="mk-btn__spinner" aria-hidden="true" /> : icon}
    </button>
  );
};
