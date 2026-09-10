/**
 * MEDiKIOSK — Phase 04: MultipleChoiceQuestion Component
 *
 * Renders accessible multi-selection checkbox tags with conditional "Other" custom input.
 */

import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { QuestionDefinition, QuestionResponse } from '../../../../../../types/question.types';
import { OtherCustomInput } from './OtherCustomInput';

export interface MultipleChoiceQuestionProps {
  question: QuestionDefinition;
  onSubmit: (response: QuestionResponse) => void;
  disabled?: boolean;
  initialValue?: string[];
}

export const MultipleChoiceQuestion: React.FC<MultipleChoiceQuestionProps> = ({
  question,
  onSubmit,
  disabled = false,
  initialValue = []
}) => {
  const [selected, setSelected] = useState<string[]>(initialValue);
  const [otherText, setOtherText] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const options = question.options || [];

  const toggleOption = (val: string) => {
    if (disabled) return;

    setHasError(false);
    setErrorMsg('');

    setSelected((prev) => {
      const exists = prev.includes(val);
      if (exists) {
        // If unchecking "Other", also clear other text
        if (val.toLowerCase() === 'other') {
          setOtherText('');
        }
        return prev.filter((item) => item !== val);
      } else {
        return [...prev, val];
      }
    });
  };

  const isOtherSelected = selected.some((v) => v.toLowerCase() === 'other');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (question.required && selected.length === 0) {
      setHasError(true);
      setErrorMsg('Please select at least one option.');
      return;
    }

    if (isOtherSelected && !otherText.trim()) {
      setHasError(true);
      setErrorMsg('Please specify your other response.');
      return;
    }

    // Format display value: e.g. "Cough, Headache, Other: Sore throat"
    const displayList = selected.map((v) => {
      if (v.toLowerCase() === 'other') {
        return `Other: ${otherText.trim()}`;
      }
      return v;
    });

    const displayValue = displayList.join(', ');

    onSubmit({
      questionId: question.id,
      type: 'multiple-choice',
      value: selected,
      displayValue,
      timestamp: new Date().toISOString(),
      otherText: isOtherSelected ? otherText.trim() : undefined
    });
  };

  return (
    <form className="mk-question-card" onSubmit={handleSubmit}>
      <div
        className="mk-question-options mk-question-options--multiple"
        role="group"
        aria-label={question.text}
      >
        {options.map((opt) => {
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          const optVal = typeof opt === 'string' ? opt : opt.value;
          const isSelected = selected.includes(optVal);

          return (
            <button
              key={optVal}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              className={`mk-question-tag ${isSelected ? 'mk-question-tag--selected' : ''}`}
              onClick={() => toggleOption(optVal)}
              disabled={disabled}
            >
              <span className="mk-question-tag__checkbox" aria-hidden="true">
                {isSelected && <Check size={12} strokeWidth={2.5} />}
              </span>
              <span className="mk-question-tag__label">{optLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Conditionally reveal Other specification */}
      {isOtherSelected && (
        <OtherCustomInput
          value={otherText}
          onChange={(val) => {
            setOtherText(val);
            setHasError(false);
          }}
          placeholder={question.otherPlaceholder || 'Specify other details...'}
          disabled={disabled}
          hasError={hasError && !otherText.trim()}
          errorMessage={errorMsg}
        />
      )}

      {hasError && !isOtherSelected && (
        <p className="mk-question-error-text" role="alert">
          {errorMsg}
        </p>
      )}

      <div className="mk-question-actions">
        <button
          type="submit"
          className="mk-question-submit-btn"
          disabled={disabled || (question.required && selected.length === 0)}
        >
          <span>
            {selected.length > 0 ? `Confirm (${selected.length})` : 'Confirm Selection'}
          </span>
          <ArrowRight size={14} />
        </button>
      </div>
    </form>
  );
};
