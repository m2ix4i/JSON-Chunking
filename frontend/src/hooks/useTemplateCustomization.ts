/**
 * Custom hook for template customization dialog state and logic.
 * Follows Single Responsibility Principle.
 */

import { useState } from 'react';
import type { QueryTemplate } from '@/types/app';

export interface TemplateCustomizationState {
  template: QueryTemplate | null;
  variables: Record<string, any>;
  preview: string;
}

export const useTemplateCustomization = () => {
  const [customizationDialog, setCustomizationDialog] = useState<TemplateCustomizationState>({
    template: null,
    variables: {},
    preview: '',
  });

  const openCustomization = (template: QueryTemplate) => {
    const initialVariables = extractDefaultVariables(template);
    setCustomizationDialog({
      template,
      variables: initialVariables,
      preview: template.template,
    });
  };

  const closeCustomization = () => {
    setCustomizationDialog({ template: null, variables: {}, preview: '' });
  };

  const updateVariables = (newVariables: Record<string, any>) => {
    if (!customizationDialog.template) return;

    const preview = generateCustomizedQuery(customizationDialog.template, newVariables);
    setCustomizationDialog(prev => ({
      ...prev,
      variables: newVariables,
      preview,
    }));
  };

  return {
    customizationDialog,
    openCustomization,
    closeCustomization, 
    updateVariables,
  };
};

// Helper functions following Tell Don't Ask principle
const extractDefaultVariables = (template: QueryTemplate): Record<string, any> => {
  return template.variables.reduce((acc, variable) => {
    acc[variable.name] = variable.defaultValue || '';
    return acc;
  }, {} as Record<string, any>);
};

const generateCustomizedQuery = (template: QueryTemplate, variables: Record<string, any>): string => {
  return new TemplateProcessor(template, variables).process();
};

// Template processor class following SRP
class TemplateProcessor {
  constructor(
    private template: QueryTemplate,
    private variables: Record<string, any>
  ) {}

  process(): string {
    let query = this.template.template;

    this.template.variables.forEach(variable => {
      query = this.replaceVariable(query, variable.name, this.variables[variable.name]);
    });

    return this.cleanupQuery(query);
  }

  private replaceVariable(query: string, variableName: string, value: any): string {
    if (value) {
      const regex = new RegExp(`\\{${variableName}(\\s*\\?[^}]*)?\\}`, 'g');
      return query.replace(regex, value);
    } else {
      // Handle optional variables (with ?)
      const optionalRegex = new RegExp(`\\{[^}]*\\s*\\?[^}]*${variableName}[^}]*\\}`, 'g');
      return query.replace(optionalRegex, '');
    }
  }

  private cleanupQuery(query: string): string {
    return query.replace(/\s+/g, ' ').trim();
  }
}