/**
 * MEDiKIOSK — Phase 04: VoiceQuestionPlaceholder Component
 *
 * Architectural container establishing the Voice Question interface.
 * Prepares the system for Phase 05 dynamic conversational voice integration.
 * Strictly adheres to Phase 04 boundaries: ZERO premature microphone recording or voice AI.
 */

import React from 'react';
import { Mic, Info } from 'lucide-react';
import { QuestionDefinition, QuestionResponse } from '../../../../../../types/question.types';

export interface VoiceQuestionPlaceholderProps {
  question: QuestionDefinition;
  onSubmit: (response: QuestionResponse) => void;
  disabled?: boolean;
}

export const VoiceQuestionPlaceholder: React.FC<VoiceQuestionPlaceholderProps> = ({
  question,
  onSubmit,
  disabled = false
}) => {
  const handleSkipOrProceed = () => {
    onSubmit({
      questionId: question.id,
      type: 'voice',
      value: 'Voice note deferred (Phase 05 Bridge)',
      displayValue: 'Voice note requested (Deferred to Phase 05 Voice Engine)',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="mk-question-card mk-question-card--voice">
      <div className="mk-voice-bridge-banner">
        <div className="mk-voice-bridge-icon-wrapper">
          <Mic size={20} className="mk-voice-bridge-icon" />
        </div>
        <div className="mk-voice-bridge-info">
          <div className="mk-voice-bridge-title-row">
            <span className="mk-voice-bridge-badge">Phase 05 Architecture Bridge</span>
            <span className="mk-voice-bridge-status">Ready for Voice Engine</span>
          </div>
          <p className="mk-voice-bridge-desc">
            Full dynamic voice interaction, speech-to-text recording, and clinical waveform processing will activate in Phase 05.
          </p>
        </div>
      </div>

      <div className="mk-voice-bridge-hint">
        <Info size={13} className="mk-voice-bridge-hint-icon" />
        <span>For now, please use text input in the composer below or click proceed.</span>
      </div>

      <div className="mk-question-actions">
        <button
          type="button"
          className="mk-question-submit-btn mk-question-submit-btn--secondary"
          onClick={handleSkipOrProceed}
          disabled={disabled}
        >
          <span>Continue with Clinical Intake</span>
        </button>
      </div>
    </div>
  );
};
