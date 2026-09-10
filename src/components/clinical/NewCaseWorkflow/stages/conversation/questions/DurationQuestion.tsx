/**
 * MEDiKIOSK — Phase 04: DurationQuestion Component
 *
 * Renders an accessible duration stepper/input paired with a duration unit dropdown.
 */

import React, { useState } from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import {
  QuestionDefinition,
  QuestionResponse,
  DurationUnit,
  DurationValue
} from '../../../../../../types/question.types';

export interface DurationQuestionProps {
  question: QuestionDefinition;
  onSubmit: (response: QuestionResponse) => void;
  disabled?: boolean;
  initialValue?: DurationValue;
}

const DURATION_UNITS: { label: string; value: DurationUnit }[] = [
  { label: 'Hours', value: 'hours' },
  { label: 'Days', value: 'days' },
  { label: 'Weeks', value: 'weeks' },
  { label: 'Months', value: 'months' },
  { label: 'Years', value: 'years' }
];

export const DurationQuestion: React.FC<DurationQuestionProps> = ({
  question,
  onSubmit,
  disabled = false,
  initialValue = { amount: 3, unit: 'days' }
}) => {
  const [amount, setAmount] = useState<number | ''>(initialValue.amount);
  const [unit, setUnit] = useState<DurationUnit>(initialValue.unit);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setAmount('');
      setHasError(false);
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= 365) {
      setAmount(num);
      setHasError(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (amount === '' || amount <= 0) {
      setHasError(true);
      setErrorMsg('Please enter a valid duration greater than 0.');
      return;
    }

    const unitLabel = DURATION_UNITS.find((u) => u.value === unit)?.label || unit;
    const displayUnit = amount === 1 ? unitLabel.replace(/s$/, '') : unitLabel;
    const displayValue = `${amount} ${displayUnit}`;

    onSubmit({
      questionId: question.id,
      type: 'duration',
      value: { amount, unit },
      displayValue,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <form className="mk-question-card" onSubmit={handleSubmit}>
      <div className="mk-question-duration-wrapper">
        <div className="mk-question-duration-field">
          <label htmlFor="mk-duration-amount" className="mk-question-duration-label">
            <Clock size={13} className="mk-question-duration-icon" />
            <span>Duration Length</span>
          </label>
          <div className="mk-question-duration-controls">
            <input
              id="mk-duration-amount"
              type="number"
              min="1"
              max="365"
              className="mk-question-duration-input"
              value={amount}
              onChange={handleAmountChange}
              disabled={disabled}
              placeholder="3"
              aria-label="Duration number"
            />
            <select
              className="mk-question-duration-select"
              value={unit}
              onChange={(e) => setUnit(e.target.value as DurationUnit)}
              disabled={disabled}
              aria-label="Duration time unit"
            >
              {DURATION_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {hasError && (
        <p className="mk-question-error-text" role="alert">
          {errorMsg}
        </p>
      )}

      <div className="mk-question-actions">
        <button
          type="submit"
          className="mk-question-submit-btn"
          disabled={disabled || amount === '' || amount <= 0}
        >
          <span>Confirm Duration</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </form>
  );
};
