/**
 * Custom hook for QueryPreview component - manages preview state and logic.
 * Implements Tell, Don't Ask principle with focused responsibility.
 */

import { useState, useEffect, useMemo } from 'react';
import { generateQueryPreview } from '@utils/queryPreviewGenerator';
import type { QueryPreview } from '@/types/app';

interface UseQueryPreviewResult {
  preview: QueryPreview | null;
  isGenerating: boolean;
  error: string | null;
  generatePreview: (queryText: string, fileId?: string) => void;
  clearPreview: () => void;
}

export const useQueryPreview = (
  initialQueryText?: string,
  fileId?: string
): UseQueryPreviewResult => {
  const [preview, setPreview] = useState<QueryPreview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePreview = useMemo(
    () => (queryText: string, fileId?: string) => {
      if (!queryText.trim()) {
        setPreview(null);
        setError(null);
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        // Simulate async generation (in real app this might be an API call)
        setTimeout(() => {
          try {
            const newPreview = generateQueryPreview(queryText, fileId);
            setPreview(newPreview);
            setError(null);
          } catch (err) {
            setError('Failed to generate query preview');
            setPreview(null);
          } finally {
            setIsGenerating(false);
          }
        }, 100);
      } catch (err) {
        setError('Failed to generate query preview');
        setPreview(null);
        setIsGenerating(false);
      }
    },
    []
  );

  const clearPreview = useMemo(
    () => () => {
      setPreview(null);
      setError(null);
      setIsGenerating(false);
    },
    []
  );

  // Auto-generate preview when initial query text changes
  useEffect(() => {
    if (initialQueryText) {
      generatePreview(initialQueryText, fileId);
    }
  }, [initialQueryText, fileId, generatePreview]);

  return {
    preview,
    isGenerating,
    error,
    generatePreview,
    clearPreview,
  };
};