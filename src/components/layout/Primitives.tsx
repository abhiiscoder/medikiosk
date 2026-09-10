/**
 * MEDiKIOSK — PHASE 00
 * Layout Primitives (PageContainer, Section, SplitView, Stack, Inline, Grid, Panel)
 */

import React from 'react';
import './Layout.css';

/**
 * PageContainer
 */
export const PageContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => {
  return <div className={`page-container ${className}`}>{children}</div>;
};

/**
 * Section
 */
export interface SectionProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  action,
  children,
  className = ''
}) => {
  return (
    <section className={`mk-section ${className}`}>
      {(title || subtitle || action) && (
        <div className="mk-section__header">
          <div>
            {title && <h3 className="mk-section__title">{title}</h3>}
            {subtitle && <p className="mk-section__subtitle">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
};

/**
 * SplitView
 */
export interface SplitViewProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftTitle?: string;
  rightTitle?: string;
  className?: string;
}

export const SplitView: React.FC<SplitViewProps> = ({
  left,
  right,
  leftTitle,
  rightTitle,
  className = ''
}) => {
  return (
    <div className={`mk-split-view ${className}`}>
      <div className="mk-split-pane mk-split-pane--border-right">
        {leftTitle && <h4 className="text-heading-subsection">{leftTitle}</h4>}
        {left}
      </div>
      <div className="mk-split-pane">
        {rightTitle && <h4 className="text-heading-subsection">{rightTitle}</h4>}
        {right}
      </div>
    </div>
  );
};

/**
 * Stack (Vertical layout)
 */
export interface StackProps {
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8;
  children: React.ReactNode;
  className?: string;
}

export const Stack: React.FC<StackProps> = ({ gap = 4, children, className = '' }) => {
  return <div className={`layout-stack layout-stack-gap-${gap} ${className}`}>{children}</div>;
};

/**
 * Inline (Horizontal layout)
 */
export interface InlineProps {
  gap?: 1 | 2 | 3 | 4 | 6;
  wrap?: boolean;
  between?: boolean;
  align?: 'center' | 'flex-start' | 'flex-end';
  children: React.ReactNode;
  className?: string;
}

export const Inline: React.FC<InlineProps> = ({
  gap = 2,
  wrap = false,
  between = false,
  children,
  className = ''
}) => {
  const classes = [
    'layout-inline',
    `layout-inline-gap-${gap}`,
    wrap ? 'layout-inline-wrap' : '',
    between ? 'layout-inline-between' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
};

/**
 * Grid
 */
export interface GridProps {
  cols?: 2 | 3 | 4;
  gap?: 2 | 3 | 4 | 6;
  children: React.ReactNode;
  className?: string;
}

export const Grid: React.FC<GridProps> = ({ cols = 3, gap = 4, children, className = '' }) => {
  return (
    <div className={`layout-grid layout-grid-cols-${cols} layout-grid-gap-${gap} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Panel (Container / inspection panel)
 */
export const Panel: React.FC<{
  title?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, extra, children, className = '' }) => {
  return (
    <div className={`surface-card ${className}`} style={{ padding: 'var(--space-4)' }}>
      {(title || extra) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-3)'
          }}
        >
          {title && <h4 className="text-heading-subsection">{title}</h4>}
          {extra}
        </div>
      )}
      {children}
    </div>
  );
};
