/**
 * Custom hook for QueryPage logic - implements Tell, Don't Ask principle.
 * Handles query submission, navigation, and page state management.
 * Updated to work with enhanced store from main branch.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Store hooks
import { useSelectedFile, useFileStore } from '@stores/fileStore';
import { useQueryStore } from '@stores/queryStore';

// Types
import type { GermanQuerySuggestion } from '@/types/app';
import type { QueryResponse } from '@/types/api';

interface UseQueryPageResult {
  // State
  selectedFile: ReturnType<typeof useSelectedFile>;
  isSubmitting: boolean;
  error: string | null;
  activeQuery: QueryResponse | null;
  
  // Actions
  handleSuggestionSelect: (suggestion: GermanQuerySuggestion) => void;
  handleQuerySubmit: () => Promise<void>;
  navigateToUpload: () => void;
}

export const useQueryPage = (): UseQueryPageResult => {
  const navigate = useNavigate();
  const selectedFile = useSelectedFile();
  const { updateCurrentQuery, submitQuery, isSubmitting, error, activeQuery } = useQueryStore();
  const refreshFiles = useFileStore((state) => state.refreshFiles);

  // Load files on page mount
  useEffect(() => {
    refreshFiles().catch(console.error);
  }, [refreshFiles]);

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