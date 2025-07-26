/**
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

  return {
    preview,
    isGenerating,
    error,
    refreshPreview,
  };
};