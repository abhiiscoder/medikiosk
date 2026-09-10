/**
 * MEDiKIOSK — VoiceAssistantComposer Component
 * Target reference active voice assistant surface.
 *
 * Structure:
 * ┌─────────────────────────────────────────────────────────────┐
 * │   [■]        ┌──────── LIVE WAVEFORM ────────┐      [🎙]  [✕] │
 * └─────────────────────────────────────────────────────────────┘
 *
 * - Left Stop button (white square icon)
 * - Center glowing blue capsule containing live Web Audio VoiceWaveform
 * - Right Microphone button (mute / unmute)
 * - Right Close/End button (X icon)
 */

import React from 'react';
import { Square, Mic, MicOff, X, AlertCircle, RefreshCw } from 'lucide-react';
import { IconButton } from '../../core/IconButton/IconButton';
import { Tooltip } from '../../core/Tooltip/Tooltip';
import { VoiceWaveform } from './VoiceWaveform';
import { VoiceState } from '../../../hooks/useVoiceAssistant';
import './VoiceComposer.css';

export interface VoiceAssistantComposerProps {
  voiceState: VoiceState;
  isMuted: boolean;
  errorMessage?: string | null;
  transcript?: string;
  onStop: () => void;
  onToggleMute: () => void;
  onEnd: () => void;
  onRetry?: () => void;
  className?: string;
}

export const VoiceAssistantComposer: React.FC<VoiceAssistantComposerProps> = ({
  voiceState,
  isMuted,
  errorMessage,
  transcript,
  onStop,
  onToggleMute,
  onEnd,
  onRetry,
  className = ''
}) => {
  const isAISpeaking = voiceState === 'AI_SPEAKING';
  const isError = voiceState === 'ERROR';

  return (
    <div
      className={`mk-voice-assistant-composer ${className}`}
      role="region"
      aria-label="Active Clinical AI Voice Assistant"
    >
      {/* Error state presentation */}
      {isError ? (
        <div className="mk-voice-error-container" role="alert">
          <div className="mk-voice-error-text">
            <AlertCircle size={18} className="mk-voice-error-icon" />
            <span>{errorMessage || 'Voice interaction unavailable. Please try again.'}</span>
          </div>
          <div className="mk-voice-error-actions">
            {onRetry && (
              <button
                type="button"
                className="mk-voice-retry-btn"
                onClick={onRetry}
                aria-label="Retry voice interaction"
              >
                <RefreshCw size={14} />
                <span>Try again</span>
              </button>
            )}
            <IconButton
              icon={<X size={18} />}
              aria-label="End voice interaction"
              variant="ghost"
              size="sm"
              className="mk-voice-btn-close"
              onClick={onEnd}
            />
          </div>
        </div>
      ) : (
        <>
          {/* 1. Left Control: STOP (Square icon) */}
          <Tooltip content="Stop voice interaction">
            <IconButton
              icon={<Square size={16} fill="#FFFFFF" stroke="none" />}
              aria-label="Stop voice interaction"
              variant="ghost"
              size="md"
              className="mk-voice-btn-stop"
              onClick={onStop}
            />
          </Tooltip>

          {/* 2. Center Capsule: Glowing blue container with live VoiceWaveform */}
          <div className="mk-voice-assistant-capsule">
            <VoiceWaveform isMuted={isMuted} isAISpeaking={isAISpeaking} />

            {/* Subtle state overlay pill */}
            {isMuted ? (
              <span className="mk-voice-capsule-badge mk-voice-capsule-badge--muted">
                Microphone muted
              </span>
            ) : voiceState === 'AI_SPEAKING' ? (
              <span className="mk-voice-capsule-badge mk-voice-capsule-badge--ai">
                MEDiKIOSK speaking
              </span>
            ) : voiceState === 'TRANSCRIBING' || voiceState === 'AI_PROCESSING' ? (
              <span className="mk-voice-capsule-badge mk-voice-capsule-badge--process">
                {voiceState === 'TRANSCRIBING' ? 'Transcribing...' : 'Processing intake...'}
              </span>
            ) : null}
          </div>

          {/* 3. Right Controls: Microphone Mute/Unmute & Close/End */}
          <div className="mk-voice-assistant-right-controls">
            <Tooltip content={isMuted ? 'Unmute microphone' : 'Mute microphone'}>
              <IconButton
                icon={
                  isMuted ? (
                    <MicOff size={20} strokeWidth={2.2} color="#F87171" />
                  ) : (
                    <Mic size={20} strokeWidth={2.2} />
                  )
                }
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                variant="ghost"
                size="md"
                className={`mk-voice-btn-mic ${isMuted ? 'mk-voice-btn-mic--muted' : ''}`}
                onClick={onToggleMute}
              />
            </Tooltip>

            <Tooltip content="End voice interaction">
              <IconButton
                icon={<X size={20} strokeWidth={2.2} />}
                aria-label="End voice interaction"
                variant="ghost"
                size="md"
                className="mk-voice-btn-close"
                onClick={onEnd}
              />
            </Tooltip>
          </div>
        </>
      )}
    </div>
  );
};
