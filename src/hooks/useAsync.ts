/**
 * MEDiKIOSK — PHASE 00
 * Standardized Async State Hook
 */

import { useState, useCallback } from 'react';
import { AsyncState } from '../types/common.types';

export function useAsync<T>(initialData: T | null = null) {
  const [state, setState] = useState<AsyncState<T>>({
    status: initialData ? 'success' : 'idle',
    data: initialData,
    error: null,
    isRetrying: false
  });

  const execute = useCallback(async (asyncFn: () => Promise<T>, isRetry = false) => {
    setState((prev) => ({
      ...prev,
      status: 'loading',
      error: null,
      isRetrying: isRetry
    }));

    try {
      const result = await asyncFn();
      const isEmpty = Array.isArray(result) && result.length === 0;
      setState({
        status: isEmpty ? 'empty' : 'success',
        data: result,
        error: null,
        isRetrying: false
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected clinical service error occurred';
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: message,
        isRetrying: false
      }));
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      data: initialData,
      error: null,
      isRetrying: false
    });
  }, [initialData]);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    isEmpty: state.status === 'empty',
    isIdle: state.status === 'idle'
  };
}
