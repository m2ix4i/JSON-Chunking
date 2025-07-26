/**
 * Custom hook for QueryPage logic - implements Tell, Don't Ask principle.
 * Handles query submission, navigation, and page state management.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Store hooks
import { useSelectedFile, useFileStore } from '@stores/fileStore';
import { useQuerySubmission, useQueryMonitoring } from '@stores/queryStore';

// Types
import type { GermanQuerySuggestion } from '@/types/app';

interface UseQueryPageResult {
  // State
  selectedFile: ReturnType<typeof useSelectedFile>;
  isSubmitting: boolean;
  error: string | null;
  activeQuery: ReturnType<typeof useQueryMonitoring>['activeQuery'];
  
  // Actions
  handleSuggestionSelect: (suggestion: GermanQuerySuggestion) => void;
  handleQuerySubmit: () => Promise<void>;
  navigateToUpload: () => void;
}

export const useQueryPage = (): UseQueryPageResult => {
  const navigate = useNavigate();
  const selectedFile = useSelectedFile();
  const { updateCurrentQuery, submitQuery, isSubmitting, error } = useQuerySubmission();
  const { activeQuery, status, result } = useQueryMonitoring();
  const refreshFiles = useFileStore((state) => state.refreshFiles);

  // Load files on page mount
  useEffect(() => {
    refreshFiles().catch(console.error);
  }, [refreshFiles]);

  // Auto-navigate to results when query completes
  useEffect(() => {
    if (isQueryCompleted(result, status, activeQuery)) {
      handleCompletedQuery(activeQuery!.query_id, navigate);
    }
  }, [result, status, activeQuery, navigate]);

  const handleSuggestionSelect = (suggestion: GermanQuerySuggestion) => {
    updateCurrentQuery({
      text: suggestion.text,
      intentHint: suggestion.category,
    });
  };

  const handleQuerySubmit = async () => {
    if (!selectedFile) {
      console.error('No file selected for query');
      return;
    }

    try {
      await submitQuery(selectedFile.file_id);
    } catch (error) {
      console.error('Failed to submit query:', error);
      // Error handling is managed by the queryStore
    }
  };

  const navigateToUpload = () => {
    navigate('/upload');
  };

  return {
    selectedFile,
    isSubmitting,
    error,
    activeQuery,
    handleSuggestionSelect,
    handleQuerySubmit,
    navigateToUpload,
  };
};

/**
 * Checks if query is completed - encapsulates complex state checking logic.
 */
const isQueryCompleted = (
  result: any,
  status: any,
  activeQuery: any
): boolean => {
  return !!(result && status?.status === 'completed' && activeQuery?.query_id);
};

/**
 * Handles completed query navigation - implements Tell, Don't Ask.
 */
const handleCompletedQuery = (queryId: string, navigate: ReturnType<typeof useNavigate>) => {
  // Small delay to show completion state
  setTimeout(() => {
    navigate(`/results/${queryId}`);
  }, 2000);
};