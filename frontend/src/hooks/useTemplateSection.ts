/**
 * Custom hook for template section expansion state.
 * Manages which sections are expanded/collapsed.
 */

import { useState } from 'react';

export const useTemplateSection = (initialSections: string[] = ['popular']) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(initialSections)
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const isExpanded = (section: string) => expandedSections.has(section);

  return {
    expandedSections,
    toggleSection,
    isExpanded,
  };
};