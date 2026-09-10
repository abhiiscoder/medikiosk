/**
 * MEDiKIOSK — Phase 04: SingleChoiceQuestion Component
 *
 * Renders accessible radio-style option pills where only one option can be selected.
 */

import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { QuestionDefinition, QuestionResponse } from '../../../../../../types/question.types';
import { OtherCustomInput } from './OtherCustomInput';

export interface SingleChoiceQuestionProps {
  question: QuestionDefinition;
  onSubmit: (response: QuestionResponse) => void;
  disabled?: boolean;
  initialValue?: string;
}

export const SingleChoiceQuestion: React.FC<SingleChoiceQuestionProps> = ({
  question,
  onSubmit,
  disabled = false,
  initialValue = ''
}) => {
  const [selected, setSelected] = useState<string>(initialValue);
  const [otherText, setOtherText] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const options = question.options || [];

  const handleSelect = (optVal: string) => {
    if (disabled) return;
    setSelected(optVal);
    setHasError(false);
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (!selected) {
      setHasError(true);
      setErrorMsg('Please select an option to continue.');
      return;
    }

    const isOtherSelected = selected.toLowerCase() === 'other';
    if (isOtherSelected && !otherText.trim()) {
      setHasError(true);
      setErrorMsg('Please specify your other answer.');
      return;
    }

    const displayValue = isOtherSelected ? `Other: ${otherText.trim()}` : selected;

    onSubmit({
      questionId: question.id,
      type: 'single-choice',
      value: isOtherSelected ? otherText.trim() : selected,
      displayValue,
      timestamp: new Date().toISOString(),
      otherText: isOtherSelected ? otherText.trim() : undefined
    });
  };

  return (
    <form className="mk-question-card" onSubmit={handleSubmit}>
      <div
        className="mk-question-options mk-question-options--single"
        role="radiogroup"
        aria-label={question.text}
      >
        {options.map((opt) => {
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          const optVal = typeof opt === 'string' ? opt : opt.value;
          const isSelected = selected === optVal;

          return (
            <button
              key={optVal}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`mk-question-pill ${isSelected ? 'mk-question-pill--selected' : ''}`}
              onClick={() => handleSelect(optVal)}
              disabled={disabled}
            >
              <span className="mk-question-pill__indicator" aria-hidden="true">
                {isSelected && <Check size={12} strokeWidth={2.5} />}
              </span>
              <span className="mk-question-pill__label">{optLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Conditionally reveal Other specification */}
      {selected.toLowerCase() === 'other' && (
        <OtherCustomInput
          value={otherText}
          onChange={(val) => {
            setOtherText(val);
            setHasError(false);
          }}
          placeholder={question.otherPlaceholder || 'Please describe...'}
          disabled={disabled}
          hasError={hasError && selected.toLowerCase() === 'other' && !otherText.trim()}
          errorMessage={errorMsg}
        />
      )}

      {hasError && selected.toLowerCase() !== 'other' && (
        <p className="mk-question-error-text" role="alert">
          {errorMsg}
        </p>
      )}

      <div className="mk-question-actions">
        <button
          type="submit"
          className="mk-question-submit-btn"
          disabled={disabled || !selected}
        >
          <span>Confirm Selection</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </form>
  );
};
