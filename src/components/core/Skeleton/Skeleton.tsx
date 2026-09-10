/**
 * MEDiKIOSK — PHASE 00
 * Accessible Skeleton Loading Placeholder
 */

import React from 'react';
import '../Progress/Progress.css';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius,
  className = ''
}) => {
  return (
    <div
      className={`mk-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius
      }}
      aria-hidden="true"
    />
  );
};
