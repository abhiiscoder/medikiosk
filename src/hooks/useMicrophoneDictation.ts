/**
 * MEDiKIOSK — useMicrophoneDictation Hook
 * Dedicated Voice-to-Text state machine strictly for Patient Speech Intake.
 *
 * States:
 * IDLE -> REQUESTING_PERMISSION -> RECORDING -> TRANSCRIBING -> TEXT_READY -> IDLE
 * Error handling: ERROR -> IDLE
 * No speech: NO_SPEECH -> IDLE
 *
 * NOTE: Independent from the AI Voice Assistant.
 * Does NOT generate AI speech, does NOT auto-submit, does NOT interpret clinical data.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { voiceService } from '../services/voice.service';

export type DictationState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'RECORDING'
  | 'TRANSCRIBING'
  | 'TEXT_READY'
  | 'NO_SPEECH'
  | 'ERROR';

export interface UseMicrophoneDictationOptions {
  onTextReady?: (transcribedText: string) => void;
  onError?: (errorMsg: string) => void;
  onNoSpeech?: () => void;
}

export function useMicrophoneDictation(options: UseMicrophoneDictationOptions = {}) {
  const { onTextReady, onError, onNoSpeech } = options;

  const [dictationState, setDictationState] = useState<DictationState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');

  const transcriptRef = useRef('');
  transcriptRef.current = accumulatedTranscript;

  const stateRef = useRef<DictationState>('IDLE');
  stateRef.current = dictationState;

  // Start voice-to-text recording
  const startDictation = useCallback(async () => {
    try {
      setErrorMessage(null);
      setAccumulatedTranscript('');
      transcriptRef.current = '';
      setDictationState('REQUESTING_PERMISSION');

      // Request microphone access
      await voiceService.startAudioCapture();

      setDictationState('RECORDING');

      // Start capturing speech in background
      voiceService.startSpeechRecognition(
        (text) => {
          setAccumulatedTranscript(text);
          transcriptRef.current = text;
        },
        (err) => {
          console.warn('[useMicrophoneDictation] Speech recognition notification:', err);
        }
      );
    } catch (err: any) {
      const msg =
        err?.message ||
        'Microphone access is required for voice input. Allow microphone access and try again.';
      setErrorMessage(msg);
      setDictationState('ERROR');
      onError?.(msg);
    }
  }, [onError]);

  // Stop recording & finalize transcription
  const stopDictation = useCallback(async () => {
    if (stateRef.current !== 'RECORDING') return;

    setDictationState('TRANSCRIBING');
    voiceService.stopSpeechRecognition();
    voiceService.stopAudioCapture();

    // Give a brief moment for speech recognition buffer to settle
    setTimeout(() => {
      const finalResult = transcriptRef.current.trim();

      if (!finalResult) {
        setDictationState('NO_SPEECH');
        onNoSpeech?.();
        setTimeout(() => {
          setDictationState('IDLE');
        }, 1200);
      } else {
        setDictationState('TEXT_READY');
        onTextReady?.(finalResult);
        setTimeout(() => {
          setDictationState('IDLE');
          setAccumulatedTranscript('');
        }, 300);
      }
    }, 600);
  }, [onNoSpeech, onTextReady]);

  // Cancel and clean up without saving
  const cancelDictation = useCallback(() => {
    voiceService.stopSpeechRecognition();
    voiceService.stopAudioCapture();
    setDictationState('IDLE');
    setAccumulatedTranscript('');
    setErrorMessage(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceService.stopSpeechRecognition();
      voiceService.stopAudioCapture();
    };
  }, []);

  return {
    dictationState,
    isRecording: dictationState === 'RECORDING',
    isTranscribing: dictationState === 'TRANSCRIBING',
    errorMessage,
    startDictation,
    stopDictation,
    cancelDictation
  };
}
