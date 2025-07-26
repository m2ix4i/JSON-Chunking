/**
 * Comprehensive tests for QueryPreviewSections component.
 * Tests SOLID refactoring - focused component for detailed sections with accordions.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryPreviewSections } from '@/components/query/QueryPreviewSections';
import type { QueryPreview } from '@/types/app';

// Mock the preview data with comprehensive sections
const mockPreview: QueryPreview = {
  id: 'test-preview-sections',
  query: 'Test query for section display',
  estimatedResults: 156,
  processingSteps: [
    { step: 'Initialize query parser', estimated_duration: 1 },
    { step: 'Analyze search terms', estimated_duration: 5 },
    { step: 'Execute database query', estimated_duration: 12 },
    { step: 'Filter and sort results', estimated_duration: 8 },
    { step: 'Format output structure', estimated_duration: 4 }
  ],
  complexity: {
    level: 'high',
    score: 0.82,
    factors: [
      'Multiple join operations required',
      'Complex filtering criteria',
      'Large dataset processing',
      'Advanced sorting algorithms'
    ]
  },
  estimatedDuration: 30,
  confidence: 0.91,
  optimizations: [
    { 
      type: 'caching', 
      description: 'Query results will be cached for 1 hour', 
      impact: 'high' 
    },
    { 
      type: 'indexing', 
      description: 'Database indexes will optimize search performance', 
      impact: 'medium' 
    },
    { 
      type: 'parallel', 
      description: 'Some operations can run in parallel', 
      impact: 'medium' 
    }
  ],
  resourceEstimate: {
    cpu_usage: 'high',
    memory_usage: 'medium',
    io_operations: 'high',
    estimated_cost: 0.12
  },
  resultStructure: {
    expectedFormat: 'hierarchical',
    fieldsCount: 24,
    nestedLevels: 4
  },
  generatedAt: new Date('2024-01-15T14:22:30Z').toISOString(),
};

describe('QueryPreviewSections Component', () => {
  describe('Basic Rendering', () => {
    it('renders all section accordions', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={[]}
          onToggleSection={vi.fn()}
        />
      );

      // Check for all section headers
      expect(screen.getByText('Processing Steps')).toBeInTheDocument();
      expect(screen.getByText('Complexity Analysis')).toBeInTheDocument();
      expect(screen.getByText('Resource Estimate')).toBeInTheDocument();
      expect(screen.getByText('Result Structure')).toBeInTheDocument();
      expect(screen.getByText('Optimizations')).toBeInTheDocument();
    });

    it('renders accordions in collapsed state by default', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={[]}
          onToggleSection={vi.fn()}
        />
      );

      // Section content should not be visible when collapsed
      expect(screen.queryByText('Initialize query parser')).not.toBeInTheDocument();
      expect(screen.queryByText('Multiple join operations')).not.toBeInTheDocument();
    });

    it('expands sections when specified in expandedSections prop', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['processing', 'complexity']}
          onToggleSection={vi.fn()}
        />
      );

      // Expanded sections should show content
      expect(screen.getByText('Initialize query parser')).toBeInTheDocument();
      expect(screen.getByText('Multiple join operations required')).toBeInTheDocument();
      
      // Non-expanded sections should still be collapsed
      expect(screen.queryByText('CPU Usage')).not.toBeInTheDocument();
    });
  });

  describe('Section Interactions', () => {
    it('calls onToggleSection when accordion header is clicked', () => {
      const mockToggle = vi.fn();
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={[]}
          onToggleSection={mockToggle}
        />
      );

      const processingHeader = screen.getByRole('button', { name: /processing steps/i });
      fireEvent.click(processingHeader);

      expect(mockToggle).toHaveBeenCalledWith('processing');
    });

    it('handles rapid clicking without errors', () => {
      const mockToggle = vi.fn();
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={[]}
          onToggleSection={mockToggle}
        />
      );

      const complexityHeader = screen.getByRole('button', { name: /complexity analysis/i });
      
      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        fireEvent.click(complexityHeader);
      }

      expect(mockToggle).toHaveBeenCalledTimes(5);
    });

    it('supports keyboard navigation for accessibility', () => {
      const mockToggle = vi.fn();
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={[]}
          onToggleSection={mockToggle}
        />
      );

      const resourceHeader = screen.getByRole('button', { name: /resource estimate/i });
      
      // Focus and activate with keyboard
      resourceHeader.focus();
      fireEvent.keyDown(resourceHeader, { key: 'Enter' });

      expect(mockToggle).toHaveBeenCalledWith('resources');
    });
  });

  describe('Processing Steps Section', () => {
    it('displays all processing steps with durations', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['processing']}
          onToggleSection={vi.fn()}
        />
      );

      // Check all steps are displayed
      expect(screen.getByText('Initialize query parser')).toBeInTheDocument();
      expect(screen.getByText('Analyze search terms')).toBeInTheDocument();
      expect(screen.getByText('Execute database query')).toBeInTheDocument();
      expect(screen.getByText('Filter and sort results')).toBeInTheDocument();
      expect(screen.getByText('Format output structure')).toBeInTheDocument();

      // Check durations are shown
      expect(screen.getByText('1s')).toBeInTheDocument();
      expect(screen.getByText('5s')).toBeInTheDocument();
      expect(screen.getByText('12s')).toBeInTheDocument();
    });

    it('shows total duration summary', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['processing']}
          onToggleSection={vi.fn()}
        />
      );

      expect(screen.getByText(/total estimated: 30 seconds/i)).toBeInTheDocument();
    });

    it('handles empty processing steps gracefully', () => {
      const emptyStepsPreview = {
        ...mockPreview,
        processingSteps: []
      };

      render(
        <QueryPreviewSections
          preview={emptyStepsPreview}
          expandedSections={['processing']}
          onToggleSection={vi.fn()}
        />
      );

      expect(screen.getByText(/no processing steps available/i)).toBeInTheDocument();
    });
  });

  describe('Complexity Analysis Section', () => {
    it('displays complexity score and level', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['complexity']}
          onToggleSection={vi.fn()}
        />
      );

      expect(screen.getByText('Score: 0.82')).toBeInTheDocument();
      expect(screen.getByText('Level: High')).toBeInTheDocument();
    });

    it('lists all complexity factors', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['complexity']}
          onToggleSection={vi.fn()}
        />
      );

      mockPreview.complexity.factors.forEach(factor => {
        expect(screen.getByText(factor)).toBeInTheDocument();
      });
    });

    it('uses appropriate colors for different complexity levels', () => {
      const lowComplexityPreview = {
        ...mockPreview,
        complexity: { ...mockPreview.complexity, level: 'low' as const }
      };

      const { rerender } = render(
        <QueryPreviewSections
          preview={lowComplexityPreview}
          expandedSections={['complexity']}
          onToggleSection={vi.fn()}
        />
      );

      expect(screen.getByText('Level: Low')).toBeInTheDocument();

      // Test medium complexity
      rerender(
        <QueryPreviewSections
          preview={{...mockPreview, complexity: { ...mockPreview.complexity, level: 'medium' as const }}}
          expandedSections={['complexity']}
          onToggleSection={vi.fn()}
        />
      );

      expect(screen.getByText('Level: Medium')).toBeInTheDocument();
    });
  });

  describe('Resource Estimate Section', () => {
    it('displays all resource metrics', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['resources']}
          onToggleSection={vi.fn()}
        />
      );

      expect(screen.getByText('CPU Usage: High')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage: Medium')).toBeInTheDocument();
      expect(screen.getByText('I/O Operations: High')).toBeInTheDocument();
      expect(screen.getByText('Estimated Cost: $0.12')).toBeInTheDocument();
    });

    it('formats cost correctly', () => {
      const expensivePreview = {
        ...mockPreview,
        resourceEstimate: {
          ...mockPreview.resourceEstimate,
          estimated_cost: 2.567
        }
      };

      render(
        <QueryPreviewSections
          preview={expensivePreview}
          expandedSections={['resources']}
          onToggleSection={vi.fn()}
        />
      );

      expect(screen.getByText('Estimated Cost: $2.57')).toBeInTheDocument();
    });

    it('shows resource usage warnings for high consumption', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['resources']}
          onToggleSection={vi.fn()}
        />
      );

      // Should show warning for high CPU and I/O usage
      expect(screen.getByText(/high resource usage detected/i)).toBeInTheDocument();
    });
  });

  describe('Result Structure Section', () => {
    it('displays structure information', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['structure']}
          onToggleSection={vi.fn()}
        />
      );

      expect(screen.getByText('Format: Hierarchical')).toBeInTheDocument();
      expect(screen.getByText('Fields: 24')).toBeInTheDocument();
      expect(screen.getByText('Nesting Levels: 4')).toBeInTheDocument();
    });

    it('handles different structure formats', () => {
      const flatStructurePreview = {
        ...mockPreview,
        resultStructure: {
          expectedFormat: 'flat',
          fieldsCount: 6,
          nestedLevels: 1
        }
      };

      render(
        <QueryPreviewSections
          preview={flatStructurePreview}
          expandedSections={['structure']}
          onToggleSection={vi.fn()}
        />
      );

      expect(screen.getByText('Format: Flat')).toBeInTheDocument();
      expect(screen.getByText('Fields: 6')).toBeInTheDocument();
      expect(screen.getByText('Nesting Levels: 1')).toBeInTheDocument();
    });
  });

  describe('Optimizations Section', () => {
    it('displays all optimization strategies', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['optimizations']}
          onToggleSection={vi.fn()}
        />
      );

      // Check all optimization types are shown
      expect(screen.getByText('Caching')).toBeInTheDocument();
      expect(screen.getByText('Indexing')).toBeInTheDocument();
      expect(screen.getByText('Parallel')).toBeInTheDocument();

      // Check descriptions
      expect(screen.getByText(/query results will be cached for 1 hour/i)).toBeInTheDocument();
      expect(screen.getByText(/database indexes will optimize/i)).toBeInTheDocument();
      expect(screen.getByText(/some operations can run in parallel/i)).toBeInTheDocument();
    });

    it('shows impact levels with appropriate styling', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['optimizations']}
          onToggleSection={vi.fn()}
        />
      );

      // Check impact indicators
      expect(screen.getByText('High Impact')).toBeInTheDocument();
      expect(screen.getAllByText('Medium Impact')).toHaveLength(2);
    });

    it('handles empty optimizations array', () => {
      const noOptimizationsPreview = {
        ...mockPreview,
        optimizations: []
      };

      render(
        <QueryPreviewSections
          preview={noOptimizationsPreview}
          expandedSections={['optimizations']}
          onToggleSection={vi.fn()}
        />
      );

      expect(screen.getByText(/no optimizations available/i)).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode with condensed layout', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['processing']}
          onToggleSection={vi.fn()}
          compact={true}
        />
      );

      // In compact mode, sections should have reduced spacing
      const container = screen.getByTestId('preview-sections-compact');
      expect(container).toBeInTheDocument();
    });

    it('maintains functionality in compact mode', () => {
      const mockToggle = vi.fn();
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={[]}
          onToggleSection={mockToggle}
          compact={true}
        />
      );

      const header = screen.getByRole('button', { name: /processing steps/i });
      fireEvent.click(header);

      expect(mockToggle).toHaveBeenCalledWith('processing');
    });
  });

  describe('Error Handling', () => {
    it('handles missing preview data gracefully', () => {
      render(
        <QueryPreviewSections
          preview={null as any}
          expandedSections={[]}
          onToggleSection={vi.fn()}
        />
      );

      expect(screen.getByText(/no preview data available/i)).toBeInTheDocument();
    });

    it('handles partially missing section data', () => {
      const incompletePreview = {
        ...mockPreview,
        processingSteps: undefined,
        complexity: undefined
      };

      render(
        <QueryPreviewSections
          preview={incompletePreview}
          expandedSections={['processing', 'complexity']}
          onToggleSection={vi.fn()}
        />
      );

      // Should show fallback content for missing sections
      expect(screen.getByText(/processing steps not available/i)).toBeInTheDocument();
      expect(screen.getByText(/complexity analysis not available/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for accordions', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['processing']}
          onToggleSection={vi.fn()}
        />
      );

      const processingButton = screen.getByRole('button', { name: /processing steps/i });
      expect(processingButton).toHaveAttribute('aria-expanded', 'true');

      const complexityButton = screen.getByRole('button', { name: /complexity analysis/i });
      expect(complexityButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('provides proper labeling for screen readers', () => {
      render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['processing']}
          onToggleSection={vi.fn()}
        />
      );

      expect(screen.getByLabelText(/processing steps section/i)).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /query preview sections/i })).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const mockToggle = vi.fn();
      const { rerender } = render(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['processing']}
          onToggleSection={mockToggle}
        />
      );

      // Same props should not cause issues
      rerender(
        <QueryPreviewSections
          preview={mockPreview}
          expandedSections={['processing']}
          onToggleSection={mockToggle}
        />
      );

      expect(screen.getByText('Initialize query parser')).toBeInTheDocument();
    });

    it('handles large amounts of data efficiently', async () => {
      const largeDataPreview = {
        ...mockPreview,
        processingSteps: Array.from({ length: 100 }, (_, i) => ({
          step: `Processing step ${i + 1}`,
          estimated_duration: i + 1
        })),
        complexity: {
          ...mockPreview.complexity,
          factors: Array.from({ length: 50 }, (_, i) => `Complexity factor ${i + 1}`)
        }
      };

      render(
        <QueryPreviewSections
          preview={largeDataPreview}
          expandedSections={['processing', 'complexity']}
          onToggleSection={vi.fn()}
        />
      );

      // Should render without performance issues
      await waitFor(() => {
        expect(screen.getByText('Processing step 1')).toBeInTheDocument();
        expect(screen.getByText('Processing step 100')).toBeInTheDocument();
      });
    });
  });
});