/**
 * MEDiKIOSK — Phase 04: YesNoQuestion Component
 *
 * Renders an accessible, tactile Yes / No choice component.
 */

import React, { useState } from 'react';
import { Check, X, ArrowRight } from 'lucide-react';
import { QuestionDefinition, QuestionResponse } from '../../../../../../types/question.types';

export interface YesNoQuestionProps {
  question: QuestionDefinition;
  onSubmit: (response: QuestionResponse) => void;
  disabled?: boolean;
  initialValue?: boolean | null;
}

export const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  question,
  onSubmit,
  disabled = false,
  initialValue = null
}) => {
  const [selected, setSelected] = useState<boolean | null>(initialValue);
  const [hasError, setHasError] = useState<boolean>(false);

  const handleSelect = (val: boolean) => {
    if (disabled) return;
    setSelected(val);
    setHasError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (selected === null) {
      setHasError(true);
      return;
    }

    onSubmit({
      questionId: question.id,
      type: 'yes-no',
      value: selected,
      displayValue: selected ? 'Yes' : 'No',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <form className="mk-question-card" onSubmit={handleSubmit}>
      <div
        className="mk-question-yes-no-group"
        role="radiogroup"
        aria-label={question.text}
      >
        <button
          type="button"
          role="radio"
          aria-checked={selected === true}
          className={`mk-question-yes-no-btn mk-question-yes-no-btn--yes ${
            selected === true ? 'mk-question-yes-no-btn--selected' : ''
          }`}
          onClick={() => handleSelect(true)}
          disabled={disabled}
        >
          <span className="mk-question-yes-no-icon">
            <Check size={16} strokeWidth={2.5} />
          </span>
          <span className="mk-question-yes-no-label">Yes</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={selected === false}
          className={`mk-question-yes-no-btn mk-question-yes-no-btn--no ${
            selected === false ? 'mk-question-yes-no-btn--selected' : ''
          }`}
          onClick={() => handleSelect(false)}
          disabled={disabled}
        >
          <span className="mk-question-yes-no-icon">
            <X size={16} strokeWidth={2.5} />
          </span>
          <span className="mk-question-yes-no-label">No</span>
        </button>
      </div>

      {hasError && (
        <p className="mk-question-error-text" role="alert">
          Please select Yes or No to proceed.
        </p>
      )}

      <div className="mk-question-actions">
        <button
          type="submit"
          className="mk-question-submit-btn"
          disabled={disabled || selected === null}
        >
          <span>Confirm Response</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </form>
  );
};
