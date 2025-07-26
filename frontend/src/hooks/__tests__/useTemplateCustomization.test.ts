/**
 * Tests for useTemplateCustomization hook.
 * Validates Template Processor class following SRP.
 */

import { renderHook, act } from '@testing-library/react';
import { expect, describe, it } from 'vitest';

import { useTemplateCustomization } from '../useTemplateCustomization';
import type { QueryTemplate } from '@/types/app';

const mockTemplate: QueryTemplate = {
  id: 'test-template',
  name: 'Test Template',
  description: 'A test template',
  template: 'Show {material_type} elements with {min_area} m² area{optional_filter ? in {location} : }',
  category: 'test',
  difficulty: 'beginner',
  variables: [
    {
      name: 'material_type',
      label: 'Material Type',
      type: 'select',
      options: ['Concrete', 'Steel'],
      defaultValue: 'Concrete',
      required: true,
    },
    {
      name: 'min_area',
      label: 'Minimum Area',
      type: 'number',
      defaultValue: '50',
      required: true,
    },
    {
      name: 'location',
      label: 'Location Filter',
      type: 'text',
      defaultValue: '',
      required: false,
    }
  ],
  examples: [],
  tags: [],
};

describe('useTemplateCustomization', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useTemplateCustomization());

    expect(result.current.customizationDialog.template).toBeNull();
    expect(result.current.customizationDialog.variables).toEqual({});
    expect(result.current.customizationDialog.preview).toBe('');
  });

  it('should open customization with default variables', () => {
    const { result } = renderHook(() => useTemplateCustomization());

    act(() => {
      result.current.openCustomization(mockTemplate);
    });

    expect(result.current.customizationDialog.template).toBe(mockTemplate);
    expect(result.current.customizationDialog.variables).toEqual({
      material_type: 'Concrete',
      min_area: '50',
      location: '',
    });
    expect(result.current.customizationDialog.preview).toBe(mockTemplate.template);
  });

  it('should close customization and reset state', () => {
    const { result } = renderHook(() => useTemplateCustomization());

    act(() => {
      result.current.openCustomization(mockTemplate);
    });

    expect(result.current.customizationDialog.template).toBe(mockTemplate);

    act(() => {
      result.current.closeCustomization();
    });

    expect(result.current.customizationDialog.template).toBeNull();
    expect(result.current.customizationDialog.variables).toEqual({});
    expect(result.current.customizationDialog.preview).toBe('');
  });

  it('should update variables and preview', () => {
    const { result } = renderHook(() => useTemplateCustomization());

    act(() => {
      result.current.openCustomization(mockTemplate);
    });

    const newVariables = {
      material_type: 'Steel',
      min_area: '100',
      location: 'ground floor',
    };

    act(() => {
      result.current.updateVariables(newVariables);
    });

    expect(result.current.customizationDialog.variables).toEqual(newVariables);
    expect(result.current.customizationDialog.preview).toBe(
      'Show Steel elements with 100 m² area in ground floor'
    );
  });

  it('should handle optional variables correctly', () => {
    const { result } = renderHook(() => useTemplateCustomization());

    act(() => {
      result.current.openCustomization(mockTemplate);
    });

    // Test with location (optional variable) empty
    const variablesWithoutLocation = {
      material_type: 'Concrete',
      min_area: '75',
      location: '',
    };

    act(() => {
      result.current.updateVariables(variablesWithoutLocation);
    });

    // Should remove optional parts when variable is empty
    expect(result.current.customizationDialog.preview).toBe(
      'Show Concrete elements with 75 m² area'
    );
  });

  it('should handle complex template replacement', () => {
    const complexTemplate: QueryTemplate = {
      ...mockTemplate,
      template: 'Find {material} in {building ? building {building} : all buildings} with size > {size}',
      variables: [
        {
          name: 'material',
          label: 'Material',
          type: 'text',
          defaultValue: 'concrete',
          required: true,
        },
        {
          name: 'building',
          label: 'Building',
          type: 'text',
          defaultValue: '',
          required: false,
        },
        {
          name: 'size',
          label: 'Size',
          type: 'number',
          defaultValue: '10',
          required: true,
        }
      ],
    };

    const { result } = renderHook(() => useTemplateCustomization());

    act(() => {
      result.current.openCustomization(complexTemplate);
    });

    const variables = {
      material: 'steel',
      building: 'A',
      size: '20',
    };

    act(() => {
      result.current.updateVariables(variables);
    });

    expect(result.current.customizationDialog.preview).toBe(
      'Find steel in building A with size > 20'
    );
  });

  it('should clean up extra spaces in generated query', () => {
    const spacedTemplate: QueryTemplate = {
      ...mockTemplate,
      template: 'Show   {material}    elements    with   {area}   area',
      variables: [
        {
          name: 'material',
          label: 'Material',
          type: 'text',
          defaultValue: 'concrete',
          required: true,
        },
        {
          name: 'area',
          label: 'Area',
          type: 'text',
          defaultValue: '50',
          required: true,
        }
      ],
    };

    const { result } = renderHook(() => useTemplateCustomization());

    act(() => {
      result.current.openCustomization(spacedTemplate);
    });

    const variables = { material: 'steel', area: '100' };

    act(() => {
      result.current.updateVariables(variables);
    });

    // Should clean up multiple spaces
    expect(result.current.customizationDialog.preview).toBe(
      'Show steel elements with 100 area'
    );
  });

  it('should not update variables when no template is open', () => {
    const { result } = renderHook(() => useTemplateCustomization());

    act(() => {
      result.current.updateVariables({ test: 'value' });
    });

    // Should remain in initial state
    expect(result.current.customizationDialog.template).toBeNull();
    expect(result.current.customizationDialog.variables).toEqual({});
  });
});