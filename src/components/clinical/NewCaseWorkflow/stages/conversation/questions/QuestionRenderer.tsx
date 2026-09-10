/**
 * MEDiKIOSK — Phase 04: QuestionRenderer Master Component
 *
 * Central question dispatcher:
 * - Selects and renders the appropriate question component based on question.type
 * - Displays answered summary state with editing capability
 * - Provides graceful fallback for unknown/unsupported question types
 */

import React from 'react';
import { CheckCircle2, Edit2, AlertTriangle } from 'lucide-react';
import { QuestionDefinition, QuestionResponse } from '../../../../../../types/question.types';
import { SingleChoiceQuestion } from './SingleChoiceQuestion';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import { YesNoQuestion } from './YesNoQuestion';
import { DurationQuestion } from './DurationQuestion';
import { TextQuestion } from './TextQuestion';
import { VoiceQuestionPlaceholder } from './VoiceQuestionPlaceholder';

export interface QuestionRendererProps {
  question: QuestionDefinition;
  response?: QuestionResponse;
  onSubmit: (response: QuestionResponse) => void;
  onEdit?: (questionId: string) => void;
  disabled?: boolean;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  response,
  onSubmit,
  onEdit,
  disabled = false
}) => {
  const isAnswered = Boolean(response);

  // If already answered, display compact answered state with Edit action
  if (isAnswered && response) {
    return (
      <div className="mk-question-answered-badge" role="status" aria-label={`Answered: ${response.displayValue}`}>
        <div className="mk-question-answered-badge__left">
          <CheckCircle2 size={14} className="mk-question-answered-badge__icon" />
          <span className="mk-question-answered-badge__label">Recorded Response:</span>
          <span className="mk-question-answered-badge__value">{response.displayValue}</span>
        </div>
        {onEdit && (
          <button
            type="button"
            className="mk-question-answered-badge__edit-btn"
            onClick={() => onEdit(question.id)}
            disabled={disabled}
            aria-label={`Edit answer for ${question.text}`}
          >
            <Edit2 size={12} />
            <span>Edit</span>
          </button>
        )}
      </div>
    );
  }

  // Active Interactive Question Component Rendering
  switch (question.type) {
    case 'single-choice':
      return (
        <SingleChoiceQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );

    case 'multiple-choice':
      return (
        <MultipleChoiceQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );

    case 'yes-no':
      return (
        <YesNoQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );

    case 'duration':
      return (
        <DurationQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );

    case 'text':
      return (
        <TextQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );

    case 'voice':
      return (
        <VoiceQuestionPlaceholder
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );

    default:
      // Unknown question type safe fallback
      console.warn(`[MEDiKIOSK] Unsupported question type encountered: ${(question as QuestionDefinition).type}`);
      return (
        <div className="mk-question-unsupported" role="alert">
          <AlertTriangle size={15} className="mk-question-unsupported__icon" />
          <span className="mk-question-unsupported__text">
            This question type is not currently supported.
          </span>
        </div>
      );
  }
};
