/**
 * MEDiKIOSK — Phase 03: Clinical Conversation View
 *
 * Primary conversational workspace for Stage 1 (Clinical History):
 * - Clean, spacious conversational center area
 * - Independent scroll container with auto-scroll to latest
 * - Section context badge (Chief Complaint)
 * - Message sequence (MEDiKIOSK left, Patient right)
 * - Quick response suggestion chips
 * - AI processing indicator
 * - Error/retry state
 */

import React from 'react';
import { RotateCcw, AlertCircle, Bookmark } from 'lucide-react';
import { useClinicalConversation } from '../../../../../hooks/useClinicalConversation';
import { ConversationMessageItem } from './ConversationMessageItem';
import { AIProcessingIndicator } from './AIProcessingIndicator';

export interface ConversationViewProps {
  caseId?: string | null;
  className?: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  caseId,
  className = ''
}) => {
  const {
    messages,
    suggestionChips,
    isProcessing,
    error,
    sendMessage,
    submitQuestionResponse,
    editQuestionResponse,
    retry,
    messagesEndRef
  } = useClinicalConversation({ caseId });

  const activeSection =
    [...messages].reverse().find((m) => m.question?.section)?.question?.section ||
    'Chief Complaint';

  const handleChipClick = (chip: string) => {
    if (isProcessing) return;
    sendMessage(chip);
  };

  return (
    <div
      className={`mk-conversation-view ${className}`}
      role="region"
      aria-label="Clinical history conversational exchange"
    >
      {/* Section Context (Subtle secondary badge) */}
      <div className="mk-conversation-section-header">
        <span className="mk-section-badge">
          <Bookmark size={12} className="mk-section-badge-icon" />
          <span>Section: {activeSection}</span>
        </span>
      </div>

      {/* Scrollable Message History Area */}
      <div
        className="mk-conversation-messages"
        role="list"
        aria-live="polite"
        aria-label="Conversation messages"
      >
        {messages.map((message) => (
          <ConversationMessageItem
            key={message.id}
            message={message}
            onQuestionSubmit={submitQuestionResponse}
            onQuestionEdit={editQuestionResponse}
            disabled={isProcessing}
          />
        ))}

        {/* AI Processing Indicator */}
        {isProcessing && <AIProcessingIndicator />}

        {/* Error / Retry State */}
        {error && (
          <div className="mk-conversation-error" role="alert">
            <div className="mk-conversation-error__icon">
              <AlertCircle size={16} />
            </div>
            <div className="mk-conversation-error__text">
              <p className="mk-conversation-error__title">
                Unable to process your response.
              </p>
              <p className="mk-conversation-error__desc">{error}</p>
            </div>
            <button
              type="button"
              className="mk-conversation-error__retry-btn"
              onClick={retry}
              disabled={isProcessing}
            >
              <RotateCcw size={13} />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Anchor for automatic smooth scrolling */}
        <div ref={messagesEndRef} className="mk-conversation-anchor" />
      </div>

      {/* Suggestion Chips (Quick response options, NOT medical diagnoses) */}
      {suggestionChips.length > 0 && !isProcessing && (
        <div
          className="mk-suggestion-chips-container"
          role="group"
          aria-label="Quick response suggestions"
        >
          <span className="mk-suggestion-chips-label">Suggestions:</span>
          <div className="mk-suggestion-chips-list">
            {suggestionChips.map((chip) => (
              <button
                key={chip}
                type="button"
                className="mk-suggestion-chip-btn"
                onClick={() => handleChipClick(chip)}
                disabled={isProcessing}
                aria-label={`Send suggested response: ${chip}`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
