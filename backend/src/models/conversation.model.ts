/**
 * MEDiKIOSK Backend — Phase 03: Conversation & Clinical Dialog Model
 * Authoritative schema persisting conversation history with explicit sequence ordering,
 * source provenance, and start/end timestamps.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageSource = 'text' | 'voice' | 'selection' | 'system';

export interface IConversationMessage {
  messageId: string;
  role: MessageRole;
  content: string;
  sequence: number;
  source: MessageSource;
  timestamp: Date;
}

export interface IConversation extends Document {
  conversationId: string;
  caseId: string;
  sessionId: string;
  ownerId: string;
  status: 'active' | 'completed' | 'cancelled';
  startedAt: Date;
  endedAt?: Date;
  messages: IConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationMessageSchema = new Schema<IConversationMessage>(
  {
    messageId: { type: String, required: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    sequence: { type: Number, required: true },
    source: { type: String, enum: ['text', 'voice', 'selection', 'system'], default: 'text' },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const ConversationSchema: Schema = new Schema<IConversation>(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    caseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    ownerId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date
    },
    messages: [ConversationMessageSchema]
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

ConversationSchema.index({ ownerId: 1, caseId: 1 });

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
