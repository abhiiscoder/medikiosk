/**
 * MEDiKIOSK — Phase 04: Conversation Message Item
 *
 * Lightweight conversational message container:
 * - MEDiKIOSK messages: Left-aligned, assistant hierarchy, clear speaker distinction
 * - Patient messages: Right-aligned, user hierarchy
 * - Hosts structured question components dynamically when message.question is defined
 * - No huge avatars, no profile cards, no oversized cards
 */

import React from 'react';
import { Bot, User } from 'lucide-react';
import { ConversationMessage } from '../../../../../types/conversation.types';
import { QuestionResponse } from '../../../../../types/question.types';
import { QuestionRenderer } from './questions/QuestionRenderer';

export interface ConversationMessageItemProps {
  message: ConversationMessage;
  onQuestionSubmit?: (response: QuestionResponse) => void;
  onQuestionEdit?: (questionId: string) => void;
  disabled?: boolean;
}

export const ConversationMessageItem: React.FC<ConversationMessageItemProps> = ({
  message,
  onQuestionSubmit,
  onQuestionEdit,
  disabled = false
}) => {
  const isAssistant = message.role === 'assistant';

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      className={`mk-message-row ${
        isAssistant ? 'mk-message-row--assistant' : 'mk-message-row--patient'
      }`}
      role="listitem"
    >
      <div
        className={`mk-conversation-bubble ${
          isAssistant
            ? 'mk-conversation-bubble--assistant'
            : 'mk-conversation-bubble--patient'
        }`}
      >
        {/* Speaker identification */}
        <div className="mk-message-header">
          <span className="mk-message-speaker">
            {isAssistant ? (
              <>
                <Bot size={13} className="mk-message-speaker-icon" />
                <span>MEDiKIOSK</span>
              </>
            ) : (
              <>
                <User size={13} className="mk-message-speaker-icon" />
                <span>Patient</span>
              </>
            )}
          </span>
          {message.timestamp && (
            <time className="mk-message-time" dateTime={message.timestamp}>
              {formatTimestamp(message.timestamp)}
            </time>
          )}
        </div>

        {/* Message body */}
        <div className="mk-message-content">
          <p>{message.content}</p>
        </div>

        {/* Structured Clinical Question Component (Phase 04) */}
        {message.question && onQuestionSubmit && (
          <div className="mk-message-question-slot">
            <QuestionRenderer
              question={message.question}
              response={message.response}
              onSubmit={onQuestionSubmit}
              onEdit={onQuestionEdit}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  );
};
