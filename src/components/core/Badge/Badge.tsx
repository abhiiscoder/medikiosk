/**
 * MEDiKIOSK — PHASE 00
 * Reusable Badge Component
 */

import React from 'react';
import './Badge.css';

export type BadgeVariant = 
  | 'default' 
  | 'brand' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info'
  | 'provenance-user'
  | 'provenance-ai'
  | 'provenance-doc'
  | 'provenance-verified'
  | 'provenance-sys';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  pill?: boolean;
  withDot?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  pill = false,
  withDot = false,
  icon,
  className = ''
}) => {
  const classes = [
    'mk-badge',
    `mk-badge--${variant}`,
    pill ? 'mk-badge--pill' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {withDot && <span className="mk-badge__dot" aria-hidden="true" />}
      {icon && <span className="mk-badge__icon" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
