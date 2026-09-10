/**
 * MEDiKIOSK — PHASE 00
 * Accessible VoiceComposer Component (Clinical Speech Intake)
 */

import React, { useState, useEffect } from 'react';
import { Mic, Square, X, Check, Volume2 } from 'lucide-react';
import { Button } from '../../core/Button/Button';
import { IconButton } from '../../core/IconButton/IconButton';
import './VoiceComposer.css';

export interface VoiceComposerProps {
  isRecording?: boolean;
  onCommitTranscript?: (transcript: string) => void;
  onCancel?: () => void;
  className?: string;
}

export const VoiceComposer: React.FC<VoiceComposerProps> = ({
  isRecording = true,
  onCommitTranscript,
  onCancel,
  className = ''
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [transcript, setTranscript] = useState(
    'I have been having this tight, heavy feeling in the center of my chest since 3 days...'
  );

  // Simulation timer for demonstration
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  // Simulated waveform bar heights
  const waveHeights = [8, 14, 26, 32, 18, 28, 36, 24, 16, 30, 22, 12, 28, 34, 20, 10, 24, 18];

  return (
    <div
      className={`mk-voice-composer ${className}`}
      role="region"
      aria-label="Voice input recording panel"
    >
      <div className="mk-voice-composer__header">
        <div className="mk-voice-composer__status">
          <span className="mk-voice-composer__rec-dot" aria-hidden="true" />
          <span>Patient Audio Intake Active</span>
        </div>
        <span className="text-metadata text-mono">{formatTime(elapsedSeconds)}</span>
      </div>

      {/* Waveform indicator */}
      <div className="mk-voice-waveform-display" aria-hidden="true">
        {waveHeights.map((h, i) => (
          <span
            key={i}
            className="mk-voice-wave-bar"
            style={{
              height: `${h}px`,
              animation: isRecording ? `mk-pulse-bar 0.8s ease-in-out ${i * 0.05}s infinite alternate` : 'none'
            }}
          />
        ))}
      </div>

      {/* Real-time speech-to-text transcript preview */}
      <div className="mk-voice-live-transcript" aria-live="polite">
        "{transcript}"
      </div>

      <div className="mk-voice-composer__controls">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<X size={14} />}
          onClick={onCancel}
        >
          Cancel Audio
        </Button>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Check size={14} />}
          onClick={() => onCommitTranscript?.(transcript)}
        >
          Commit Transcript
        </Button>
      </div>
    </div>
  );
};
