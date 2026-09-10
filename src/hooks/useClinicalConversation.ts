/**
 * MEDiKIOSK — Phase 04: useClinicalConversation Hook
 *
 * Provides reactive access to conversation messages, AI processing state,
 * suggestion chips, message submission, structured question response submission,
 * question response editing, retry functionality, and auto-scroll behavior.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationMessage } from '../types/conversation.types';
import { QuestionResponse } from '../types/question.types';
import { conversationService } from '../services/conversation.service';

export interface UseClinicalConversationOptions {
  caseId?: string | null;
  autoScroll?: boolean;
}

export function useClinicalConversation({
  caseId,
  autoScroll = true
}: UseClinicalConversationOptions = {}) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [suggestionChips, setSuggestionChips] = useState<string[]>(() =>
    conversationService.getSuggestionChips()
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(() =>
    conversationService.getIsProcessing()
  );
  const [error, setError] = useState<string | null>(() =>
    conversationService.getError()
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    if (!autoScroll) return;
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [autoScroll]);

  // Sync state from conversationService
  const syncState = useCallback(async () => {
    try {
      const res = await conversationService.getMessages(caseId || undefined);
      if (res.success && res.data) {
        setMessages(res.data);
      }
      setSuggestionChips(conversationService.getSuggestionChips());
      setIsProcessing(conversationService.getIsProcessing());
      setError(conversationService.getError());
    } catch {
      setError('Unable to load clinical conversation.');
    }
  }, [caseId]);

  // Subscribe to reactive service changes
  useEffect(() => {
    syncState();
    const unsubscribe = conversationService.subscribe(() => {
      syncState();
    });
    return () => unsubscribe();
  }, [syncState]);

  // Trigger scroll on new message or processing state change
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length, isProcessing, scrollToBottom]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      if (!caseId || caseId === 'active-case') {
        setError('No active clinical case. Please start a new case first.');
        return;
      }
      try {
        await conversationService.sendMessage(caseId, content);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unable to send response.';
        setError(msg);
      }
    },
    [caseId]
  );

  const submitQuestionResponse = useCallback(
    async (response: QuestionResponse) => {
      if (!caseId || caseId === 'active-case') {
        setError('No active clinical case. Please start a new case first.');
        return;
      }
      try {
        await conversationService.submitQuestionResponse(caseId, response);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unable to submit question response.';
        setError(msg);
      }
    },
    [caseId]
  );

  const editQuestionResponse = useCallback(
    (questionId: string) => {
      if (!caseId || caseId === 'active-case') return;
      conversationService.editQuestionResponse(caseId, questionId);
    },
    [caseId]
  );

  const retry = useCallback(async () => {
    if (!caseId || caseId === 'active-case') {
      setError('No active clinical case. Please start a new case first.');
      return;
    }
    try {
      await conversationService.retryLastMessage(caseId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to retry.';
      setError(msg);
    }
  }, [caseId]);

  const reset = useCallback(() => {
    if (!caseId || caseId === 'active-case') return;
    conversationService.resetConversation(caseId);
  }, [caseId]);

  return {
    messages,
    suggestionChips,
    isProcessing,
    error,
    sendMessage,
    submitQuestionResponse,
    editQuestionResponse,
    retry,
    reset,
    messagesEndRef,
    scrollToBottom
  };
}
