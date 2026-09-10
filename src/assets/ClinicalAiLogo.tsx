/**
 * MEDiKIOSK — Clinical AI Abstract Logo Mark
 * Derived directly from reference image: 4 interconnected nodes with blue/cyan gradient
 */

import React from 'react';

export interface ClinicalAiLogoProps {
  size?: number;
  className?: string;
}

export const ClinicalAiLogo: React.FC<ClinicalAiLogoProps> = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="medikiosk-node-grad" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="60%" stopColor="#1865F2" />
          <stop offset="100%" stopColor="#0E47C2" />
        </linearGradient>
        <filter id="medikiosk-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#1865F2" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Network Cluster: 4 interconnected clinical capsules/nodes */}
      {/* Top node */}
      <circle cx="28" cy="14" r="5" fill="url(#medikiosk-node-grad)" filter="url(#medikiosk-glow)" />
      
      {/* Center Left node */}
      <circle cx="15" cy="22" r="5.5" fill="url(#medikiosk-node-grad)" filter="url(#medikiosk-glow)" />
      
      {/* Center Right node */}
      <circle cx="33" cy="26" r="6" fill="url(#medikiosk-node-grad)" filter="url(#medikiosk-glow)" />
      
      {/* Bottom Center node */}
      <circle cx="22" cy="34" r="5.5" fill="url(#medikiosk-node-grad)" filter="url(#medikiosk-glow)" />

      {/* Connected bridge pill */}
      <rect
        x="20"
        y="18"
        width="11"
        height="7"
        rx="3.5"
        transform="rotate(30 20 18)"
        fill="url(#medikiosk-node-grad)"
      />
    </svg>
  );
};
