/**
 * MEDiKIOSK — Phase 03: AI Processing Indicator
 *
 * Subtle, left-aligned 3-dot pulse indicator:
 * MEDiKIOSK
 * • • •
 * Keeps conversation visible while indicating clinical assistant response generation.
 */

import React from 'react';
import { Bot } from 'lucide-react';

export const AIProcessingIndicator: React.FC = () => {
  return (
    <div
      className="mk-message-row mk-message-row--assistant"
      role="status"
      aria-live="polite"
      aria-label="MEDiKIOSK is preparing response"
    >
      <div className="mk-conversation-bubble mk-conversation-bubble--assistant mk-conversation-bubble--processing">
        <div className="mk-message-header">
          <span className="mk-message-speaker">
            <Bot size={13} className="mk-message-speaker-icon" />
            <span>MEDiKIOSK</span>
          </span>
        </div>
        <div className="mk-processing-dots" aria-hidden="true">
          <span className="mk-processing-dot" />
          <span className="mk-processing-dot" />
          <span className="mk-processing-dot" />
        </div>
      </div>
    </div>
  );
};
