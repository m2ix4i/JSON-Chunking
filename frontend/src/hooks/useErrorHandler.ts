/**
 * Custom hook for consistent error handling across components.
 */

import React, { useCallback } from 'react';
import { handleGlobalError, useErrorState } from '@stores/appStore';
import { 
  normalizeError, 
  isRetryableError, 
  getRetryDelay,
  type AppError 
} from '@utils/errorUtils';

export interface UseErrorHandlerOptions {
  context?: string;
  maxRetries?: number;
  onError?: (error: AppError) => void;
  onRetry?: (attempt: number) => void;
  suppressGlobalError?: boolean;
}

export interface ErrorHandlerReturn {
  error: AppError | null;
  isRetrying: boolean;
  retryCount: number;
  handleError: (error: unknown) => void;
  retry: () => Promise<void>;
  clearError: () => void;
  isRetryable: boolean;
  canRetry: boolean;
}

export const useErrorHandler = (
  retryFunction?: () => Promise<void>,
  options: UseErrorHandlerOptions = {}
): ErrorHandlerReturn => {
  const {
    context,
    maxRetries = 3,
    onError,
    onRetry,
    suppressGlobalError = false,
  } = options;

  const { lastError, clearError: clearGlobalError } = useErrorState();
  const [localError, setLocalError] = React.useState<AppError | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  const currentError = localError || lastError;
  const isRetryable = currentError ? isRetryableError(currentError) : false;
  const canRetry = isRetryable && retryCount < maxRetries && !!retryFunction;

  const handleError = useCallback((error: unknown) => {
    const normalizedError = normalizeError(error);
    
    // Add context if provided
    if (context) {
      normalizedError.details = `Context: ${context}\n${normalizedError.details || ''}`.trim();
    }

    setLocalError(normalizedError);
    setRetryCount(0);
    setIsRetrying(false);

    // Call custom error handler
    if (onError) {
      onError(normalizedError);
    }

    // Send to global error handler unless suppressed
    if (!suppressGlobalError) {
      handleGlobalError(normalizedError, context);
    }
  }, [context, onError, suppressGlobalError]);

  const retry = useCallback(async () => {
    if (!canRetry || !retryFunction) {
      return;
    }

    const nextRetryCount = retryCount + 1;
    setRetryCount(nextRetryCount);
    setIsRetrying(true);

    // Call retry callback
    if (onRetry) {
      onRetry(nextRetryCount);
    }

    try {
      // Wait for retry delay
      const delay = getRetryDelay(nextRetryCount);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Execute retry function
      await retryFunction();

      // Clear error on successful retry
      setLocalError(null);
      setIsRetrying(false);

    } catch (retryError) {
      setIsRetrying(false);
      
      // If we've exceeded max retries, mark as final error
      if (nextRetryCount >= maxRetries) {
        const finalError = normalizeError(retryError);
        finalError.details = `${finalError.details}\n\nMax retries (${maxRetries}) exceeded.`.trim();
        setLocalError(finalError);
      } else {
        // Update error for next retry
        handleError(retryError);
      }
    }
  }, [canRetry, retryFunction, retryCount, maxRetries, onRetry]);

  const clearError = useCallback(() => {
    setLocalError(null);
    setRetryCount(0);
    setIsRetrying(false);
    clearGlobalError();
  }, [clearGlobalError]);

  return {
    error: currentError,
    isRetrying,
    retryCount,
    handleError,
    retry,
    clearError,
    isRetryable,
    canRetry,
  };
};

export default useErrorHandler;