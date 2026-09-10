/**
 * MEDiKIOSK — useVoiceAssistant Hook
 * Explicit finite state machine for clinical voice assistant interaction.
 *
 * States:
 * IDLE -> LISTENING -> RECORDING -> TRANSCRIBING -> AI_PROCESSING -> AI_SPEAKING -> IDLE
 * Interruption: AI_SPEAKING -> INTERRUPTED -> IDLE
 * Error: ANY -> ERROR -> RETRY / IDLE
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { voiceService } from '../services/voice.service';

export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'RECORDING'
  | 'TRANSCRIBING'
  | 'AI_PROCESSING'
  | 'AI_SPEAKING'
  | 'INTERRUPTED'
  | 'ERROR';

export interface UseVoiceAssistantOptions {
  onTranscriptCommitted?: (transcript: string) => Promise<string | void> | string | void;
  onSessionEnded?: () => void;
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}) {
  const { onTranscriptCommitted, onSessionEnded } = options;

  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const stateRef = useRef<VoiceState>('IDLE');
  stateRef.current = voiceState;

  const animFrameRef = useRef<number | null>(null);

  // Monitor audio volume in real time when active
  useEffect(() => {
    const checkAudioLevel = () => {
      if (
        stateRef.current === 'LISTENING' ||
        stateRef.current === 'RECORDING' ||
        stateRef.current === 'AI_SPEAKING'
      ) {
        const vol = voiceService.getNormalizedVolume();
        setVolume(vol);

        // Transition between LISTENING and RECORDING based on real audio level
        if (stateRef.current === 'LISTENING' && vol > 0.08) {
          setVoiceState('RECORDING');
        } else if (stateRef.current === 'RECORDING' && vol < 0.04) {
          // Stay recording or drift back after debounce
        }
      } else {
        setVolume(0);
      }

      animFrameRef.current = requestAnimationFrame(checkAudioLevel);
    };

    if (voiceState !== 'IDLE' && voiceState !== 'ERROR') {
      animFrameRef.current = requestAnimationFrame(checkAudioLevel);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [voiceState]);

  // Start voice interaction
  const startSession = useCallback(async () => {
    try {
      setErrorMessage(null);
      setTranscript('');
      setIsMuted(false);
      setVoiceState('LISTENING');

      await voiceService.startAudioCapture();

      // Start speech recognition
      voiceService.startSpeechRecognition(
        (text) => {
          setTranscript(text);
          if (stateRef.current === 'LISTENING') {
            setVoiceState('RECORDING');
          }
        },
        (err) => {
          console.warn('[useVoiceAssistant] Speech recognition error:', err);
        }
      );
    } catch (err: any) {
      setVoiceState('ERROR');
      setErrorMessage(
        err?.message || 'Microphone access is required for voice interaction. Please check browser permissions.'
      );
    }
  }, []);

  // Mute / Unmute microphone without ending session
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      voiceService.setMuted(next);
      return next;
    });
  }, []);

  // Stop recording / commit transcript to live clinical pipeline
  const stopInteraction = useCallback(async () => {
    if (stateRef.current === 'AI_SPEAKING') {
      // User clicked stop during AI speech -> INTERRUPTED
      voiceService.stopAISpeaking();
      setVoiceState('INTERRUPTED');
      setTimeout(() => {
        setVoiceState('LISTENING');
      }, 500);
      return;
    }

    if (stateRef.current === 'LISTENING' || stateRef.current === 'RECORDING') {
      const finalPrompt = transcript.trim();
      if (!finalPrompt) {
        voiceService.stopSpeechRecognition();
        setVoiceState('LISTENING');
        return;
      }

      setVoiceState('TRANSCRIBING');
      voiceService.stopSpeechRecognition();

      // Short delay for transcription stabilization, then drive live backend/Gemini pipeline
      setTimeout(async () => {
        setVoiceState('AI_PROCESSING');

        try {
          const aiResponse = await onTranscriptCommitted?.(finalPrompt);

          if (aiResponse && typeof aiResponse === 'string' && aiResponse.trim().length > 0) {
            setVoiceState('AI_SPEAKING');
            voiceService.speakAIResponse(
              aiResponse,
              undefined,
              () => {
                if (stateRef.current === 'AI_SPEAKING') {
                  setVoiceState('LISTENING');
                  setTranscript('');
                  // Resume listening for next back-to-back question turn
                  voiceService.startSpeechRecognition(
                    (text) => {
                      setTranscript(text);
                      if (stateRef.current === 'LISTENING') {
                        setVoiceState('RECORDING');
                      }
                    },
                    (err) => console.warn('[useVoiceAssistant] continuous voice notification:', err)
                  );
                }
              }
            );
          } else {
            setVoiceState('LISTENING');
            setTranscript('');
            voiceService.startSpeechRecognition(
              (text) => {
                setTranscript(text);
                if (stateRef.current === 'LISTENING') {
                  setVoiceState('RECORDING');
                }
              },
              (err) => console.warn('[useVoiceAssistant] continuous voice notification:', err)
            );
          }
        } catch {
          // Graceful fallback to listening without error alerts
          setVoiceState('LISTENING');
          setTranscript('');
        }
      }, 400);
    }
  }, [transcript, onTranscriptCommitted]);

  // Cleanly terminate voice session and restore normal composer
  const endSession = useCallback(() => {
    voiceService.cleanup();
    setVoiceState('IDLE');
    setTranscript('');
    setIsMuted(false);
    setErrorMessage(null);
    setVolume(0);
    onSessionEnded?.();
  }, [onSessionEnded]);

  // Retry after error
  const retry = useCallback(() => {
    startSession();
  }, [startSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceService.cleanup();
    };
  }, []);

  return {
    voiceState,
    isMuted,
    volume,
    transcript,
    errorMessage,
    startSession,
    stopInteraction,
    toggleMute,
    endSession,
    retry
  };
}
