/**
 * MEDiKIOSK — Canonical ConversationComposer Component
 *
 * Distinct modes:
 * 1. Normal Text Composer (Locked canonical layout):
 *    ┌──────────────────────────────────────────────────────────────┐
 *    │  (+)    Ask anything                         (🎙)     [  ≈  ]  │
 *    └──────────────────────────────────────────────────────────────┘
 * 2. Microphone Voice-to-Text Recording State (Target Reference 1):
 *    ┌──────────────────────────────────────────────────────────────┐
 *    │  (+)       ·········|||||||||||||||||||||||||·········   [■]  │
 *    └──────────────────────────────────────────────────────────────┘
 * 3. Separate AI Voice Assistant Composer:
 *    ┌──────────────────────────────────────────────────────────────┐
 *    │   [■]        ┌──────── LIVE WAVEFORM ────────┐      [🎙]  [✕] │
 *    └──────────────────────────────────────────────────────────────┘
 *
 * NOTE: The microphone (🎙) is strictly for Patient Speech-to-Text.
 * It does NOT trigger the AI assistant, does NOT speak back, and does NOT auto-send.
 * The transcribed text is inserted into the input for user review/editing.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mic, AudioLines, Send, Square, Paperclip } from 'lucide-react';
import { IconButton } from '../../core/IconButton/IconButton';
import { Tooltip } from '../../core/Tooltip/Tooltip';
import { VoiceAssistantComposer } from '../VoiceComposer/VoiceAssistantComposer';
import { VoiceState } from '../../../hooks/useVoiceAssistant';
import { useMicrophoneDictation } from '../../../hooks/useMicrophoneDictation';
import { MicrophoneWaveform } from './MicrophoneWaveform';
import './ConversationComposer.css';

export interface ConversationComposerProps {
  onSendMessage?: (text: string) => void;
  onToggleVoiceMode?: () => void;
  onPlusClick?: () => void;
  onAttachFile?: () => void;
  onFilesSelected?: (files: File[]) => void;
  isVoiceActive?: boolean;
  voiceState?: VoiceState;
  isMuted?: boolean;
  errorMessage?: string | null;
  onVoiceStop?: () => void;
  onVoiceToggleMute?: () => void;
  onVoiceEnd?: () => void;
  onVoiceRetry?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const ConversationComposer: React.FC<ConversationComposerProps> = ({
  onSendMessage,
  onToggleVoiceMode,
  onPlusClick,
  onAttachFile,
  onFilesSelected,
  isVoiceActive = false,
  voiceState = 'IDLE',
  isMuted = false,
  errorMessage,
  onVoiceStop,
  onVoiceToggleMute,
  onVoiceEnd,
  onVoiceRetry,
  isLoading = false,
  disabled = false,
  placeholder = 'Ask MEDiKIOSK',
  className = ''
}) => {
  const [text, setText] = useState('');
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);

  const attachmentPopoverRef = useRef<HTMLDivElement>(null);
  const plusBtnRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close attachment popover when clicking outside
  useEffect(() => {
    if (!isAttachmentMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        attachmentPopoverRef.current &&
        !attachmentPopoverRef.current.contains(target) &&
        plusBtnRef.current &&
        !plusBtnRef.current.contains(target)
      ) {
        setIsAttachmentMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAttachmentMenuOpen]);

  // Patient Microphone Voice-to-Text hook
  const {
    dictationState,
    isRecording: isMicRecording,
    isTranscribing: isMicTranscribing,
    startDictation,
    stopDictation
  } = useMicrophoneDictation({
    onTextReady: (transcribed) => {
      // Insert transcription into existing text composer input
      // STRICT RULE: DO NOT automatically send! Allow user to review/edit.
      setText((prev) => (prev ? `${prev} ${transcribed}` : transcribed));
    }
  });

  const handleSend = () => {
    if (disabled || isLoading) return;
    if (text.trim()) {
      onSendMessage?.(text.trim());
      setText('');
    } else if (onToggleVoiceMode) {
      // Blue circular button triggers separate AI Voice Assistant
      onToggleVoiceMode();
    } else {
      onSendMessage?.('Start intake');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePlusAction = () => {
    if (disabled || isLoading) return;
    setIsAttachmentMenuOpen((prev) => !prev);
    onPlusClick?.();
    onAttachFile?.();
  };

  const handleUploadFilesClick = () => {
    setIsAttachmentMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length > 0) {
      onFilesSelected?.(selectedFiles);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // State 1: Separate AI Voice Assistant active
  if (isVoiceActive) {
    return (
      <VoiceAssistantComposer
        voiceState={voiceState}
        isMuted={isMuted}
        errorMessage={errorMessage}
        onStop={onVoiceStop || (() => {})}
        onToggleMute={onVoiceToggleMute || (() => {})}
        onEnd={onVoiceEnd || (() => {})}
        onRetry={onVoiceRetry}
        className={className}
      />
    );
  }

  // State 2: Patient Microphone Recording / Transcribing state (Target Reference 1)
  if (isMicRecording || isMicTranscribing) {
    return (
      <div
        className={`mk-canonical-composer mk-canonical-composer--recording ${className}`}
        role="region"
        aria-label="Microphone speech recording active"
      >
        {/* Left Plus Action */}
        <Tooltip content="Attach medical record or clinical options">
          <IconButton
            icon={<Plus size={18} strokeWidth={2.2} />}
            aria-label="Attach clinical document or options"
            variant="ghost"
            size="md"
            className="mk-canonical-composer__plus-btn"
            disabled={isMicTranscribing}
            onClick={handlePlusAction}
          />
        </Tooltip>

        {/* Center Live Microphone Waveform / Transcribing */}
        {isMicTranscribing ? (
          <div className="mk-mic-transcribing-state" role="status">
            <span className="mk-mic-spinner" aria-hidden="true" />
            <span>Transcribing speech to text...</span>
          </div>
        ) : (
          <MicrophoneWaveform isRecording={isMicRecording} />
        )}

        {/* Right Stop Button (Target Reference 1: Dark circular button with white square icon) */}
        <Tooltip content="Stop voice input">
          <IconButton
            icon={<Square size={14} fill="#FFFFFF" stroke="none" />}
            aria-label="Stop voice input"
            variant="ghost"
            size="md"
            className="mk-mic-stop-btn"
            disabled={isMicTranscribing}
            onClick={stopDictation}
          />
        </Tooltip>
      </div>
    );
  }

  // State 3: Normal Locked Canonical Text Composer
  return (
    <div
      className={`mk-canonical-composer ${disabled ? 'mk-canonical-composer--disabled' : ''} ${className}`}
      role="region"
      aria-label="Clinical AI Conversation Composer"
    >
      {/* Attachment Popover Menu (Phase 07 & Reference Image) */}
      {isAttachmentMenuOpen && (
        <div
          ref={attachmentPopoverRef}
          className="mk-attachment-popover"
          role="menu"
          aria-label="Attachment options"
        >
          <button
            type="button"
            className="mk-attachment-popover__item"
            role="menuitem"
            onClick={handleUploadFilesClick}
          >
            <Paperclip size={18} className="mk-attachment-popover__icon" />
            <span>Upload files</span>
          </button>
        </div>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        aria-hidden="true"
        data-testid="mk-native-file-input"
      />

      {/* 1. Left Plus Control */}
      <div ref={plusBtnRef} className="mk-canonical-composer__plus-wrapper">
        <Tooltip content="Attach medical record or clinical options">
          <IconButton
            icon={<Plus size={18} strokeWidth={2.2} />}
            aria-label="Attach clinical document or options"
            variant="ghost"
            size="md"
            className={`mk-canonical-composer__plus-btn ${isAttachmentMenuOpen ? 'mk-canonical-composer__plus-btn--active' : ''}`}
            disabled={disabled || isLoading}
            onClick={handlePlusAction}
          />
        </Tooltip>
      </div>

      {/* 2. Center Text Input */}
      <div className="mk-canonical-composer__input-wrapper">
        <input
          type="text"
          className="mk-canonical-composer__input"
          value={text}
          disabled={disabled || isLoading}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Clinical workspace query or response input"
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      {/* 3. Small Microphone Button: Triggers Patient Voice-to-Text (NOT AI Assistant) */}
      <Tooltip content="Start voice input">
        <IconButton
          icon={<Mic size={18} strokeWidth={2} />}
          aria-label="Start voice input"
          variant="ghost"
          size="md"
          className="mk-canonical-composer__mic-btn"
          disabled={disabled || isLoading}
          onClick={startDictation}
        />
      </Tooltip>

      {/* 4. Rightmost Circular Electric Blue Button: Separate AI Voice Assistant / Send */}
      <Tooltip content={text.trim() ? 'Send message' : 'AI Voice Assistant'}>
        <IconButton
          icon={
            text.trim() ? (
              <Send size={16} strokeWidth={2.2} />
            ) : (
              <AudioLines size={18} strokeWidth={2.2} />
            )
          }
          aria-label={text.trim() ? 'Send clinical query' : 'AI Voice Assistant'}
          variant="primary"
          size="md"
          isLoading={isLoading}
          disabled={disabled}
          className="mk-canonical-composer__action-btn"
          onClick={handleSend}
        />
      </Tooltip>
    </div>
  );
};
