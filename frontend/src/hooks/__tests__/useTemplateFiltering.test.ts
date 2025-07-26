/**
 * Tests for useTemplateFiltering hook.
 * Validates Tell Don't Ask principle implementation.
 */

import { renderHook } from '@testing-library/react';
import { expect, describe, it, vi } from 'vitest';

import { useTemplateFiltering } from '../useTemplateFiltering';
import type { QueryTemplate } from '@/types/app';

// Mock the search function
vi.mock('@/data/queryTemplates', () => ({
  searchTemplates: vi.fn((term: string) => {
    const mockTemplates = [
      { id: '1', name: 'Concrete Analysis', category: 'material', difficulty: 'beginner' },
      { id: '2', name: 'Steel Components', category: 'material', difficulty: 'intermediate' },
    ];
    return mockTemplates.filter(t => t.name.toLowerCase().includes(term.toLowerCase()));
  }),
}));

const mockTemplates: QueryTemplate[] = [
  {
    id: '1',
    name: 'Concrete Analysis',
    description: 'Analyze concrete elements',
    template: 'Show concrete',
    category: 'material',
    difficulty: 'beginner',
    variables: [],
    examples: [],
    tags: [],
  },
  {
    id: '2',
    name: 'Steel Components',
    description: 'List steel components',
    template: 'Show steel',
    category: 'material',
    difficulty: 'intermediate',
    variables: [],
    examples: [],
    tags: [],
  },
  {
    id: '3',
    name: 'Room Areas',
    description: 'Calculate room areas',
    template: 'Show room areas',
    category: 'spatial',
    difficulty: 'beginner',
    variables: [],
    examples: [],
    tags: [],
  },
];

describe('useTemplateFiltering', () => {
  it('should return all templates when no filters applied', () => {
    const { result } = renderHook(() =>
      useTemplateFiltering(mockTemplates, {
        searchTerm: '',
        selectedCategory: 'all',
        selectedDifficulty: 'all',
      })
    );

    expect(result.current).toHaveLength(3);
    expect(result.current).toEqual(mockTemplates);
  });

  it('should filter by category', () => {
    const { result } = renderHook(() =>
      useTemplateFiltering(mockTemplates, {
        searchTerm: '',
        selectedCategory: 'material',
        selectedDifficulty: 'all',
      })
    );

    expect(result.current).toHaveLength(2);
    expect(result.current.every(t => t.category === 'material')).toBe(true);
  });

  it('should filter by difficulty', () => {
    const { result } = renderHook(() =>
      useTemplateFiltering(mockTemplates, {
        searchTerm: '',
        selectedCategory: 'all',
        selectedDifficulty: 'beginner',
      })
    );

    expect(result.current).toHaveLength(2);
    expect(result.current.every(t => t.difficulty === 'beginner')).toBe(true);
  });

  it('should apply search filter when search term provided', () => {
    const { result } = renderHook(() =>
      useTemplateFiltering(mockTemplates, {
        searchTerm: 'Concrete',
        selectedCategory: 'all',
        selectedDifficulty: 'all',
      })
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].name).toBe('Concrete Analysis');
  });

  it('should combine multiple filters', () => {
    const { result } = renderHook(() =>
      useTemplateFiltering(mockTemplates, {
        searchTerm: '',
        selectedCategory: 'material',
        selectedDifficulty: 'beginner',
      })
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].name).toBe('Concrete Analysis');
  });

  it('should memoize results for same inputs', () => {
    const criteria = {
      searchTerm: '',
      selectedCategory: 'material',
      selectedDifficulty: 'all',
    };

    const { result, rerender } = renderHook(
      ({ templates, criteria }) => useTemplateFiltering(templates, criteria),
      { initialProps: { templates: mockTemplates, criteria } }
    );

    const firstResult = result.current;

    // Rerender with same props
    rerender({ templates: mockTemplates, criteria });

    // Should return same reference (memoized)
    expect(result.current).toBe(firstResult);
  });

  it('should update when criteria changes', () => {
    const initialCriteria = {
      searchTerm: '',
      selectedCategory: 'all',
      selectedDifficulty: 'all',
    };

    const { result, rerender } = renderHook(
      ({ templates, criteria }) => useTemplateFiltering(templates, criteria),
      { initialProps: { templates: mockTemplates, criteria: initialCriteria } }
    );

    expect(result.current).toHaveLength(3);

    // Change criteria
    const newCriteria = {
      searchTerm: '',
      selectedCategory: 'material',
      selectedDifficulty: 'all',
    };

    rerender({ templates: mockTemplates, criteria: newCriteria });

    expect(result.current).toHaveLength(2);
  });
});