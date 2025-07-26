/**
 * Custom hook for QueryPage logic - implements Tell, Don't Ask principle.
 * Handles query submission, navigation, and page state management.
<<<<<<< HEAD
 * Updated to work with enhanced store from main branch.
=======
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Store hooks
import { useSelectedFile, useFileStore } from '@stores/fileStore';
<<<<<<< HEAD
import { useQueryStore } from '@stores/queryStore';

// Types
import type { GermanQuerySuggestion } from '@/types/app';
import type { QueryResponse } from '@/types/api';
=======
import { useQuerySubmission, useQueryMonitoring } from '@stores/queryStore';

// Types
import type { GermanQuerySuggestion } from '@/types/app';
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b

interface UseQueryPageResult {
  // State
  selectedFile: ReturnType<typeof useSelectedFile>;
  isSubmitting: boolean;
  error: string | null;
<<<<<<< HEAD
  activeQuery: QueryResponse | null;
=======
  activeQuery: ReturnType<typeof useQueryMonitoring>['activeQuery'];
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
  
  // Actions
  handleSuggestionSelect: (suggestion: GermanQuerySuggestion) => void;
  handleQuerySubmit: () => Promise<void>;
  navigateToUpload: () => void;
}

export const useQueryPage = (): UseQueryPageResult => {
  const navigate = useNavigate();
  const selectedFile = useSelectedFile();
<<<<<<< HEAD
  const { updateCurrentQuery, submitQuery, isSubmitting, error, activeQuery } = useQueryStore();
=======
  const { updateCurrentQuery, submitQuery, isSubmitting, error } = useQuerySubmission();
  const { activeQuery, status, result } = useQueryMonitoring();
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
  const refreshFiles = useFileStore((state) => state.refreshFiles);

  // Load files on page mount
  useEffect(() => {
    refreshFiles().catch(console.error);
  }, [refreshFiles]);

<<<<<<< HEAD
=======
  // Auto-navigate to results when query completes
  useEffect(() => {
    if (isQueryCompleted(result, status, activeQuery)) {
      handleCompletedQuery(activeQuery!.query_id, navigate);
    }
  }, [result, status, activeQuery, navigate]);

>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
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
<<<<<<< HEAD
      
      // Navigate to results page after successful submission
      // If we have an active query with ID, navigate to specific result page
      const { activeQuery } = useQueryStore.getState();
      if (activeQuery?.query_id) {
        navigate(`/results/${activeQuery.query_id}`);
      } else {
        navigate('/results');
      }
    } catch (error) {
      console.error('Failed to submit query:', error);
      // Error handling is already managed by the queryStore and displayed via error state
=======
    } catch (error) {
      console.error('Failed to submit query:', error);
      // Error handling is managed by the queryStore
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
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
<<<<<<< HEAD
=======
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
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
};