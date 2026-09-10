/**
 * MEDiKIOSK — PHASE 00
 * Accessible Tooltip Component
 */

import React, { useId } from 'react';
import './Tooltip.css';

export interface TooltipProps {
  content: string;
  children: React.ReactElement<any>;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const tooltipId = useId();

  return (
    <div className="mk-tooltip-wrapper">
      {React.cloneElement(children, {
        'aria-describedby': tooltipId
      })}
      <div id={tooltipId} className="mk-tooltip-content" role="tooltip">
        {content}
      </div>
    </div>
  );
};
