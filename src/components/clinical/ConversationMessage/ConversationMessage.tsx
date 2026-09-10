/**
 * MEDiKIOSK — PHASE 00
 * Accessible Clinical Conversation Message Component
 */

import React from 'react';
import { 
  Bot, 
  User, 
  Settings, 
  Volume2, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  Check, 
  Sparkles 
} from 'lucide-react';
import { ConversationMessage as MessageType, AIProcessingStage, ExtractedSnippet } from '../../../types/conversation.types';
import { Badge } from '../../core/Badge/Badge';
import { Button } from '../../core/Button/Button';
import './ConversationMessage.css';

export interface ConversationMessageProps {
  message: MessageType;
  onRetry?: (messageId: string) => void;
  className?: string;
}

const STAGE_LABELS: Record<AIProcessingStage, string> = {
  idle: 'Waiting',
  processing: 'Processing...',
  analyzing: 'Analyzing clinical context...',
  extracting: 'Extracting medical entities...',
  preparing: 'Preparing clinical summary...',
  waiting: 'Waiting for response...',
  completed: 'Completed',
  unable_to_process: 'Unable to process'
};

export const ConversationMessage: React.FC<ConversationMessageProps> = ({
  message,
  onRetry,
  className = ''
}) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderProvenanceBadge = () => {
    if (isUser) {
      return (
        <Badge variant="provenance-user" icon={<User size={11} />}>
          Patient Statement
        </Badge>
      );
    }
    if (isAssistant) {
      return (
        <Badge variant="provenance-ai" icon={<Bot size={11} />}>
          MEDiKIOSK AI
        </Badge>
      );
    }
    return (
      <Badge variant="provenance-sys" icon={<Settings size={11} />}>
        Clinical System
      </Badge>
    );
  };

  return (
    <div
      className={`mk-message-row mk-message-row--${message.role} ${className}`}
      role="article"
      aria-label={`${message.role} message at ${formatTime(message.timestamp)}`}
    >
      <div className="mk-message-meta">
        {renderProvenanceBadge()}
        <span>{formatTime(message.timestamp)}</span>
      </div>

      <div className="mk-message-bubble">
        {/* Processing state indicator */}
        {message.stage && message.stage !== 'completed' && message.stage !== 'idle' ? (
          <div className="mk-ai-stage-indicator" role="status" aria-live="polite">
            <Loader2 size={15} className="mk-btn__spinner" />
            <span>{STAGE_LABELS[message.stage]}</span>
          </div>
        ) : (
          <div>{message.content}</div>
        )}

        {/* Voice Audio Waveform Preview */}
        {message.audio && (
          <div className="mk-message-audio" aria-label="Audio voice recording">
            <Volume2 size={16} color="var(--color-brand-primary)" />
            <div className="mk-waveform-bars" aria-hidden="true">
              {(message.audio.waveformSample || [0.3, 0.6, 0.9, 0.4, 0.7, 0.5, 0.2]).map(
                (val: number, idx: number) => (
                  <span
                    key={idx}
                    className="mk-waveform-bar"
                    style={{ height: `${Math.max(val * 16, 3)}px` }}
                  />
                )
              )}
            </div>
            <span className="text-metadata text-mono">
              {message.audio.durationSeconds.toFixed(1)}s
            </span>
          </div>
        )}

        {/* Structured Findings Extracted from Message */}
        {message.extractedFindings && message.extractedFindings.length > 0 && (
          <div className="mk-message-findings" aria-label="Extracted clinical entities">
            {message.extractedFindings.map((finding: ExtractedSnippet) => (
              <Badge key={finding.id} variant="provenance-ai" icon={<Sparkles size={11} />}>
                {finding.entityName}: {finding.entityValue}
              </Badge>
            ))}
          </div>
        )}

        {/* Error and Retry */}
        {message.hasError && (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <div
              style={{
                color: 'var(--color-status-error)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: 'var(--font-size-metadata)'
              }}
            >
              <AlertCircle size={14} />
              <span>{message.errorMessage || 'Failed to send message.'}</span>
            </div>
            {message.canRetry && onRetry && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw size={12} />}
                onClick={() => onRetry(message.id)}
                style={{ marginTop: '4px' }}
              >
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
