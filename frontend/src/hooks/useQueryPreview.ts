/**
<<<<<<< HEAD
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
=======
 * Custom hook for query preview generation and management.
 * Handles preview state, debouncing, and error management.
 */

import { useState, useEffect } from 'react';
import type { QueryPreview } from '@/types/app';
import { generateQueryPreview } from '@/utils/queryPreviewGenerator';

interface MockQueryPreview extends QueryPreview {
  generatedAt: Date;
  confidence: number;
}

interface UseQueryPreviewOptions {
  autoRefresh?: boolean;
  debounceMs?: number;
  onPreviewChange?: (preview: QueryPreview | null) => void;
}

export const useQueryPreview = (
  query: string,
  fileId?: string,
  options: UseQueryPreviewOptions = {}
) => {
  const {
    autoRefresh = true,
    debounceMs = 500,
    onPreviewChange,
  } = options;

  const [preview, setPreview] = useState<MockQueryPreview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced preview generation
  useEffect(() => {
    if (!query.trim() || query.length < 5) {
      setPreview(null);
      setError(null);
      return;
    }

    if (!autoRefresh) return;

    setIsGenerating(true);
    setError(null);

    const timeoutId = setTimeout(() => {
      generatePreview(query, fileId);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, fileId, autoRefresh, debounceMs]);

  const generatePreview = async (queryText: string, fileId?: string) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      const previewData = generateQueryPreview(queryText, fileId);
      
      const mockPreview: MockQueryPreview = {
        ...previewData,
        generatedAt: new Date(),
        confidence: Math.max(0.6, Math.min(0.95, 1 - (previewData.complexity.score * 0.05))),
      };
      
      setPreview(mockPreview);
      onPreviewChange?.(mockPreview);
    } catch (error: any) {
      console.error('Preview generation failed:', error);
      setError(error.message || 'Vorschau-Generierung fehlgeschlagen');
    } finally {
      setIsGenerating(false);
    }
  };

  // Manual refresh
  const refreshPreview = () => {
    if (query.trim() && query.length >= 5) {
      generatePreview(query, fileId);
    }
  };
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b

  return {
    preview,
    isGenerating,
    error,
<<<<<<< HEAD
    generatePreview,
    clearPreview,
=======
    refreshPreview,
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
  };
};