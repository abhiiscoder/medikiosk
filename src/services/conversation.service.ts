/**
 * MEDiKIOSK — Conversational History & Dialog Service Boundary
 * DEMO MODE: all conversation is local. No backend required.
 */

import { ApiResponse } from '../types/common.types';
import { ConversationMessage } from '../types/conversation.types';
import { QuestionResponse } from '../types/question.types';
import { getAuthHeaders } from './auth.service';
import { 
  DEMO_MODE, 
  getConversation, 
  addConversationMessage, 
  getDemoAIReply,
  CLINICAL_SUGGESTIONS_BY_TURN
} from '../demo/demoStore';

export interface IConversationService {
  getMessages(caseId?: string): Promise<ApiResponse<ConversationMessage[]>>;
  sendMessage(caseId?: string, content?: string, source?: 'text' | 'voice'): Promise<ApiResponse<ConversationMessage>>;
  submitQuestionResponse(caseId: string, response: QuestionResponse): Promise<ApiResponse<ConversationMessage>>;
  editQuestionResponse(caseId: string, questionId: string): void;
  retryLastMessage(caseId?: string): Promise<ApiResponse<ConversationMessage>>;
  resetConversation(caseId?: string): void;
  getSuggestionChips(): string[];
  getIsProcessing(): boolean;
  getError(): string | null;
  subscribe(listener: () => void): () => void;
}

const API_BASE_URL = typeof window !== 'undefined' && (window as any).__MEDIKIOSK_API_URL__ 
  ? (window as any).__MEDIKIOSK_API_URL__ 
  : 'http://localhost:5000/api/v1';

class ConversationService implements IConversationService {
  private messages: ConversationMessage[] = [];
  private suggestionChips: string[] = [];
  private isProcessing: boolean = false;
  private error: string | null = null;
  private lastCaseId: string | null = null;
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Safe listener execution
      }
    });
  }

  public getSuggestionChips(): string[] {
    return [...this.suggestionChips];
  }

  public getIsProcessing(): boolean {
    return this.isProcessing;
  }

  public getError(): string | null {
    return this.error;
  }

  async getMessages(caseId?: string): Promise<ApiResponse<ConversationMessage[]>> {
    if (!caseId || caseId === 'active-case') {
      this.messages = [];
      this.notify();
      return { success: true, data: [], timestamp: new Date().toISOString() };
    }

    if (DEMO_MODE) {
      this.lastCaseId = caseId;
      const demoMsgs = getConversation(caseId);
      this.messages = demoMsgs;
      const userTurnCount = this.messages.filter(m => m.role === 'user').length;
      this.suggestionChips = CLINICAL_SUGGESTIONS_BY_TURN[userTurnCount] || [
        "Yes, that is accurate",
        "No additional symptoms",
        "Ready to proceed to records"
      ];
      this.error = null;
      this.notify();
      return { success: true, data: [...this.messages], timestamp: new Date().toISOString() };
    }

    this.lastCaseId = caseId;
    try {
      const response = await fetch(`${API_BASE_URL}/cases/${caseId}/conversation`, {
        headers: { ...getAuthHeaders() },
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data.messages)) {
          const mapped: ConversationMessage[] = result.data.messages.map((m: any) => ({
            id: m.id || m.messageId || `msg-${m.sequence}`,
            role: m.role,
            content: m.content,
            timestamp: typeof m.timestamp === 'string' ? m.timestamp : new Date(m.timestamp).toISOString(),
            provenance: m.provenance || 'ai',
            stage: m.stage || 'completed',
            question: m.question,
            response: m.response
          }));
          this.messages = mapped;
          this.error = null;
          this.notify();
          return {
            success: true,
            data: [...this.messages],
            timestamp: new Date().toISOString()
          };
        }
      } else if (response.status === 404) {
        // Conversation not yet initialized
        this.messages = [];
        this.notify();
        return {
          success: true,
          data: [],
          timestamp: new Date().toISOString()
        };
      } else {
        const errRes = await response.json().catch(() => ({}));
        throw new Error(errRes?.error?.message || `Failed to fetch conversation: HTTP ${response.status}`);
      }
    } catch (err: any) {
      this.error = err?.message || 'Unable to connect to clinical conversation service.';
      this.notify();
      throw err;
    }

    return {
      success: true,
      data: [...this.messages],
      timestamp: new Date().toISOString()
    };
  }

  async sendMessage(caseId?: string, content: string = '', source: 'text' | 'voice' = 'text'): Promise<ApiResponse<ConversationMessage>> {
    if (!caseId || caseId === 'active-case') {
      const err = new Error('No active clinical case found. Please start a new case first.');
      this.error = err.message;
      this.notify();
      throw err;
    }

    const trimmed = content.trim();
    if (!trimmed) throw new Error('Message content cannot be empty.');

    this.lastCaseId = caseId;

    // Append user message immediately
    const userMsg: ConversationMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
      provenance: 'user'
    };
    this.messages.push(userMsg);
    this.isProcessing = true;
    this.error = null;
    this.suggestionChips = this.suggestionChips.filter(c => c.toLowerCase() !== trimmed.toLowerCase());
    this.notify();

    if (DEMO_MODE) {
      addConversationMessage(caseId, 'user', trimmed);
      // Simulate a brief AI thinking delay
      await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 200));
      const aiText = getDemoAIReply(trimmed, caseId);
      const astMsg = addConversationMessage(caseId, 'assistant', aiText) as ConversationMessage;
      this.messages.push(astMsg);
      const userTurnCount = this.messages.filter(m => m.role === 'user').length;
      this.suggestionChips = CLINICAL_SUGGESTIONS_BY_TURN[userTurnCount] || [
        "Yes, that is accurate",
        "No additional symptoms",
        "Ready to proceed to records"
      ];
      this.isProcessing = false;
      this.error = null;
      this.notify();
      return { success: true, data: astMsg, timestamp: new Date().toISOString() };
    }
    try {
      const response = await fetch(`${API_BASE_URL}/cases/${caseId}/conversation/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ content: trimmed, source }),
        signal: AbortSignal.timeout(35000)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.assistantMessage) {
          const astMsg: ConversationMessage = {
            id: result.data.assistantMessage.id || result.data.message?.id || `msg-ai-${Date.now()}`,
            role: result.data.assistantMessage.role || 'assistant',
            content: result.data.assistantMessage.content,
            timestamp: typeof result.data.assistantMessage.timestamp === 'string'
              ? result.data.assistantMessage.timestamp
              : new Date(result.data.assistantMessage.timestamp).toISOString(),
            provenance: result.data.assistantMessage.provenance || 'ai',
            stage: 'completed',
            question: result.data.assistantMessage.question
          };

          this.messages.push(astMsg);
          this.isProcessing = false;
          this.error = null;
          this.notify();

          return {
            success: true,
            data: astMsg,
            timestamp: new Date().toISOString()
          };
        }
      }

      const errRes = await response.json().catch(() => ({}));
      const errMsg = errRes?.error?.message || `Conversation engine error: HTTP ${response.status}`;
      this.isProcessing = false;
      this.error = errMsg;
      this.notify();
      throw new Error(errMsg);
    } catch (err: any) {
      this.isProcessing = false;
      this.error = err?.message || 'Connection to clinical conversation engine failed.';
      this.notify();
      throw err;
    }
  }

  async submitQuestionResponse(caseId: string, response: QuestionResponse): Promise<ApiResponse<ConversationMessage>> {
    if (!caseId || caseId === 'active-case') {
      const err = new Error('No active clinical case found. Please start a new case first.');
      this.error = err.message;
      this.notify();
      throw err;
    }

    const targetMsg = this.messages.find(
      (m) => m.question && m.question.id === response.questionId
    );
    if (targetMsg) {
      targetMsg.response = response;
    }

    const answerPayload = response.displayValue || (typeof response.value === 'string' ? response.value : JSON.stringify(response.value));

    // Append patient structured response to conversation stream
    const userMsg: ConversationMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: answerPayload,
      timestamp: response.timestamp || new Date().toISOString(),
      provenance: 'user'
    };

    this.messages.push(userMsg);
    this.isProcessing = true;
    this.error = null;
    this.notify();

    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const aiText = getDemoAIReply(answerPayload);
      const astMsg = addConversationMessage(caseId, 'assistant', aiText) as ConversationMessage;
      this.messages.push(astMsg);
      this.isProcessing = false;
      this.error = null;
      this.notify();
      return { success: true, data: astMsg, timestamp: new Date().toISOString() };
    }

    try {
      const backendRes = await fetch(`${API_BASE_URL}/cases/${caseId}/conversation/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          content: answerPayload
        }),
        signal: AbortSignal.timeout(35000)
      });

      if (backendRes.ok) {
        const result = await backendRes.json();
        if (result.success && result.data && result.data.assistantMessage) {
          const astMsg: ConversationMessage = {
            id: result.data.assistantMessage.id || `msg-ai-${Date.now()}`,
            role: result.data.assistantMessage.role || 'assistant',
            content: result.data.assistantMessage.content,
            timestamp: typeof result.data.assistantMessage.timestamp === 'string'
              ? result.data.assistantMessage.timestamp
              : new Date(result.data.assistantMessage.timestamp).toISOString(),
            provenance: result.data.assistantMessage.provenance || 'ai',
            stage: 'completed',
            question: result.data.assistantMessage.question
          };

          this.messages.push(astMsg);
          this.isProcessing = false;
          this.error = null;
          this.notify();

          return {
            success: true,
            data: astMsg,
            timestamp: new Date().toISOString()
          };
        }
      }

      const errRes = await backendRes.json().catch(() => ({}));
      const errMsg = errRes?.error?.message || `Failed to submit response: HTTP ${backendRes.status}`;
      this.isProcessing = false;
      this.error = errMsg;
      this.notify();
      throw new Error(errMsg);
    } catch (err: any) {
      this.isProcessing = false;
      this.error = err?.message || 'Connection to clinical conversation engine failed.';
      this.notify();
      throw err;
    }
  }

  public editQuestionResponse(_caseId: string, questionId: string): void {
    const targetMsg = this.messages.find(
      (m) => m.question && m.question.id === questionId
    );
    if (targetMsg) {
      delete targetMsg.response;
      this.notify();
    }
  }

  async retryLastMessage(caseId?: string): Promise<ApiResponse<ConversationMessage>> {
    const targetCaseId = caseId || this.lastCaseId;
    if (!targetCaseId) {
      throw new Error('No active case ID available for retry.');
    }

    // Find the last user message to retry
    const lastUserMsg = [...this.messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) {
      throw new Error('No previous message available to retry.');
    }

    // Remove the last user message locally since sendMessage will re-append it
    const index = this.messages.lastIndexOf(lastUserMsg);
    if (index !== -1) {
      this.messages.splice(index, 1);
    }

    return this.sendMessage(targetCaseId, lastUserMsg.content);
  }

  public resetConversation(caseId?: string): void {
    const targetCaseId = caseId || this.lastCaseId;
    if (!DEMO_MODE && targetCaseId && targetCaseId !== 'active-case') {
      fetch(`${API_BASE_URL}/cases/${targetCaseId}/conversation/reset`, {
        method: 'POST',
        headers: { ...getAuthHeaders() }
      }).catch(() => {});
    }

    this.messages = [];
    this.suggestionChips = [];
    this.isProcessing = false;
    this.error = null;
    this.notify();
  }
}

export const conversationService = new ConversationService();
