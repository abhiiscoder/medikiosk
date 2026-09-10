/**
 * MEDiKIOSK — PHASE 00
 * Reusable Card Component
 */

import React from 'react';
import './Card.css';

export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  extraAction?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  highlight?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  extraAction,
  children,
  footer,
  padding = 'md',
  interactive = false,
  highlight = false,
  onClick,
  className = ''
}) => {
  const hasHeader = Boolean(title || subtitle || extraAction);

  const classes = [
    'mk-card',
    interactive ? 'mk-card--interactive' : '',
    highlight ? 'mk-card--highlight' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {hasHeader && (
        <div className="mk-card__header">
          <div className="mk-card__header-text">
            {title && <div className="mk-card__title">{title}</div>}
            {subtitle && <div className="mk-card__subtitle">{subtitle}</div>}
          </div>
          {extraAction && <div className="mk-card__action">{extraAction}</div>}
        </div>
      )}

      <div className={`mk-card__body mk-card__body--${padding}`}>{children}</div>

      {footer && <div className="mk-card__footer">{footer}</div>}
    </div>
  );
};
