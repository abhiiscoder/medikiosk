/**
 * MEDiKIOSK — PHASE 00
 * Reusable Button Component
 */

import React from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  const classes = [
    'mk-btn',
    `mk-btn--${variant}`,
    `mk-btn--${size}`,
    fullWidth ? 'mk-btn--full' : '',
    isLoading ? 'mk-btn--loading' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="mk-btn__spinner" aria-hidden="true" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="mk-btn__icon-left">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="mk-btn__icon-right">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
