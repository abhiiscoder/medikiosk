/**
 * MEDiKIOSK — PHASE 00
 * Patient Conversation & Voice Interaction Types
 */

import { ID, ISO8601Date, ProvenanceSource } from './common.types';
import { QuestionDefinition, QuestionResponse } from './question.types';

export type MessageRole = 'user' | 'assistant' | 'system';

export type AIProcessingStage = 
  | 'idle'
  | 'processing'
  | 'analyzing'
  | 'extracting'
  | 'preparing'
  | 'waiting'
  | 'completed'
  | 'unable_to_process';

export interface AudioMetadata {
  durationSeconds: number;
  sampleRate: number;
  audioUrl?: string;
  waveformSample?: number[]; // normalized 0.0 - 1.0 heights for audio playback visualization
}

export interface ConversationAttachment {
  id: ID;
  name: string;
  sizeBytes: number;
  type: string;
  url?: string;
}

export interface ExtractedSnippet {
  id: ID;
  entityName: string;
  entityValue: string;
  category: 'symptom' | 'duration' | 'severity' | 'medication';
}

export interface ConversationMessage {
  id: ID;
  role: MessageRole;
  content: string;
  timestamp: ISO8601Date;
  provenance: ProvenanceSource;
  stage?: AIProcessingStage;
  audio?: AudioMetadata;
  attachments?: ConversationAttachment[];
  extractedFindings?: ExtractedSnippet[];
  hasError?: boolean;
  errorMessage?: string;
  canRetry?: boolean;
  question?: QuestionDefinition;
  response?: QuestionResponse;
}

export interface VoiceRecordingState {
  status: 'idle' | 'listening' | 'recording' | 'processing' | 'transcribed' | 'error';
  elapsedSeconds: number;
  audioLevel: number; // 0.0 - 1.0
  interimTranscript?: string;
  error?: string;
}
