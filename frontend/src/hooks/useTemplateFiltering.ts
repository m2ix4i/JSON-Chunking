/**
 * Custom hook for template filtering logic.
 * Implements Tell Don't Ask principle.
 */

import { useMemo } from 'react';
import type { QueryTemplate } from '@/types/app';
import { searchTemplates } from '@/data/queryTemplates';

interface FilterCriteria {
  searchTerm: string;
  selectedCategory: string;
  selectedDifficulty: string;
}

export const useTemplateFiltering = (
  templates: QueryTemplate[],
  criteria: FilterCriteria
) => {
  return useMemo(() => {
    let filtered = templates;

    // Apply search filter
    if (criteria.searchTerm.trim()) {
      filtered = searchTemplates(criteria.searchTerm);
    }

    // Apply category filter
    if (criteria.selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === criteria.selectedCategory);
    }

    // Apply difficulty filter  
    if (criteria.selectedDifficulty !== 'all') {
      filtered = filtered.filter(template => template.difficulty === criteria.selectedDifficulty);
    }

    return filtered;
  }, [templates, criteria.searchTerm, criteria.selectedCategory, criteria.selectedDifficulty]);
};