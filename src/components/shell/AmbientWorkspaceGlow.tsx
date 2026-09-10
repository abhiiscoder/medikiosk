/**
 * MEDiKIOSK — PHASE 01
 * Ambient Workspace Lighting Component
 * Provides calm, subtle blue/indigo illumination & atmospheric halo arc
 */

import React from 'react';

export const AmbientWorkspaceGlow: React.FC = () => {
  return (
    <div className="ambient-glow-container" aria-hidden="true">
      {/* Soft central radial glow */}
      <div className="ambient-glow-radial" />

      {/* Atmospheric upper halo arc framing the clinical empty state */}
      <div className="ambient-halo-arc" />
    </div>
  );
};
