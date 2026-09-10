/**
 * MEDiKIOSK — Phase 04: TextQuestion Component
 *
 * Renders an inline text input area for open-ended clinical questions.
 */

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { QuestionDefinition, QuestionResponse } from '../../../../../../types/question.types';

export interface TextQuestionProps {
  question: QuestionDefinition;
  onSubmit: (response: QuestionResponse) => void;
  disabled?: boolean;
  initialValue?: string;
}

export const TextQuestion: React.FC<TextQuestionProps> = ({
  question,
  onSubmit,
  disabled = false,
  initialValue = ''
}) => {
  const [text, setText] = useState<string>(initialValue);
  const [hasError, setHasError] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (question.required && !text.trim()) {
      setHasError(true);
      return;
    }

    const trimmed = text.trim();
    onSubmit({
      questionId: question.id,
      type: 'text',
      value: trimmed,
      displayValue: trimmed,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <form className="mk-question-card mk-question-card--text" onSubmit={handleSubmit}>
      <div className="mk-question-text-field">
        <textarea
          className="mk-question-textarea"
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setHasError(false);
          }}
          placeholder={question.placeholder || 'Type your response here...'}
          disabled={disabled}
          aria-label={question.text}
          aria-invalid={hasError}
        />
      </div>

      {hasError && (
        <p className="mk-question-error-text" role="alert">
          Please provide a response to continue.
        </p>
      )}

      <div className="mk-question-actions">
        <button
          type="submit"
          className="mk-question-submit-btn"
          disabled={disabled || (question.required && !text.trim())}
        >
          <span>Send Response</span>
          <Send size={13} />
        </button>
      </div>
    </form>
  );
};
