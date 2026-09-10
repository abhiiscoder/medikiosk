/**
 * MEDiKIOSK Backend — Phase 03: Answer Model
 * Persists individual patient responses linked to questions, conversations, and cases.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type AnswerSource = 'text' | 'voice' | 'selection' | 'system';
export type AnswerStatus =
  | 'answered'
  | 'partially_answered'
  | 'unclear'
  | 'not_applicable'
  | 'needs_clarification';

export interface IAnswer extends Document {
  answerId: string;
  questionId: string;
  conversationId: string;
  messageId?: string;
  caseId: string;
  sessionId: string;
  value: unknown;
  normalizedValue?: unknown;
  answerStatus?: AnswerStatus;
  clarificationCount?: number;
  source: AnswerSource;
  answeredAt: Date;
}

const AnswerSchema: Schema = new Schema<IAnswer>(
  {
    answerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    questionId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    conversationId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    messageId: {
      type: String,
      trim: true
    },
    caseId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    value: {
      type: Schema.Types.Mixed,
      required: true
    },
    normalizedValue: {
      type: Schema.Types.Mixed
    },
    answerStatus: {
      type: String,
      enum: ['answered', 'partially_answered', 'unclear', 'not_applicable', 'needs_clarification'],
      default: 'answered'
    },
    clarificationCount: {
      type: Number,
      default: 0
    },
    source: {
      type: String,
      enum: ['text', 'voice', 'selection', 'system'],
      default: 'text'
    },
    answeredAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      }
    }
  }
);

// Compound indices for efficient query patterns
AnswerSchema.index({ conversationId: 1, questionId: 1 });
AnswerSchema.index({ caseId: 1, sessionId: 1 });

export const Answer: Model<IAnswer> =
  mongoose.models.Answer || mongoose.model<IAnswer>('Answer', AnswerSchema);
