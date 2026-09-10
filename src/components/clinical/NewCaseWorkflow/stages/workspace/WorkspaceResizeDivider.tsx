/**
 * MEDiKIOSK — Clinical Workspace Resize Divider
 *
 * Draggable, keyboard-accessible vertical divider between Clinical History
 * and the Secondary Workspace in Split Mode:
 * - Smooth 60fps RAF drag resize with sensible clamping (28% to 72%)
 * - Full mouse & touch gesture support with 12px hit affordance
 * - Standard ARIA separator accessibility with arrow-key step controls
 * - Visual language matching MEDiKIOSK's dark obsidian and cyan/blue accents
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GripVertical } from 'lucide-react';

export interface WorkspaceResizeDividerProps {
  splitRatio: number;
  onSplitRatioChange: (ratio: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  minRatio?: number;
  maxRatio?: number;
  className?: string;
}

export const WorkspaceResizeDivider: React.FC<WorkspaceResizeDividerProps> = ({
  splitRatio,
  onSplitRatioChange,
  containerRef,
  minRatio = 28,
  maxRatio = 72,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const rafId = useRef<number | null>(null);

  const calculateRatio = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const rawPercent = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(minRatio, Math.min(maxRatio, rawPercent));
      onSplitRatioChange(clamped);
    },
    [containerRef, minRatio, maxRatio, onSplitRatioChange]
  );

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Touch drag handlers
  const handleTouchStart = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
      rafId.current = requestAnimationFrame(() => {
        calculateRatio(e.clientX);
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        if (rafId.current !== null) {
          cancelAnimationFrame(rafId.current);
        }
        rafId.current = requestAnimationFrame(() => {
          calculateRatio(e.touches[0].clientX);
        });
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [isDragging, calculateRatio]);

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    let target = splitRatio;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      target = Math.max(minRatio, splitRatio - 4);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      target = Math.min(maxRatio, splitRatio + 4);
    } else if (e.key === 'Home') {
      e.preventDefault();
      target = 50;
    } else if (e.key === 'End') {
      e.preventDefault();
      target = 70;
    } else {
      return;
    }
    onSplitRatioChange(target);
  };

  const roundedRatio = Math.round(splitRatio);

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-valuenow={roundedRatio}
      aria-valuemin={minRatio}
      aria-valuemax={maxRatio}
      aria-label={`Resize workspace split. Clinical History: ${roundedRatio}%, Secondary Workspace: ${100 - roundedRatio}%. Use left and right arrow keys to resize.`}
      title={`Resize workspace (Clinical History: ${roundedRatio}% / Other: ${100 - roundedRatio}%). Drag or use arrow keys.`}
      className={`mk-workspace-resize-divider ${
        isDragging ? 'mk-workspace-resize-divider--dragging' : ''
      } ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
    >
      <div className="mk-workspace-resize-divider__line" />
      <div className="mk-workspace-resize-divider__handle">
        <GripVertical size={14} className="mk-workspace-resize-grip-icon" aria-hidden="true" />
      </div>
    </div>
  );
};
