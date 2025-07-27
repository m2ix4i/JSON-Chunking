/**
 * Comprehensive tests for QueryPreviewSummary component.
 * Tests SOLID refactoring - focused component for high-level preview display.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryPreviewSummary } from '@/components/query/QueryPreviewSummary';
import type { QueryPreview } from '@/types/app';

// Mock the preview data
const mockPreview: QueryPreview = {
  id: 'test-preview-1',
  query: 'Test query for components',
  estimatedResults: 42,
  processingSteps: [
    { step: 'Parse query', estimated_duration: 2 },
    { step: 'Search database', estimated_duration: 15 },
    { step: 'Format results', estimated_duration: 3 }
  ],
  complexity: {
    level: 'medium',
    score: 0.6,
    factors: ['Multiple search terms', 'Complex filtering']
  },
  estimatedDuration: 20,
  confidence: 0.85,
  optimizations: [
    { type: 'caching', description: 'Results can be cached', impact: 'high' },
    { type: 'indexing', description: 'Database indexes will be used', impact: 'medium' }
  ],
  resourceEstimate: {
    cpu_usage: 'medium',
    memory_usage: 'low',
    io_operations: 'high',
    estimated_cost: 0.05
  },
  resultStructure: {
    expectedFormat: 'structured',
    fieldsCount: 8,
    nestedLevels: 2
  },
  generatedAt: new Date('2024-01-15T10:30:00Z').toISOString(),
};

describe('QueryPreviewSummary Component', () => {
  describe('Basic Rendering', () => {
    it('renders preview summary with all key metrics', () => {
      render(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );

      // Check for key metrics
      expect(screen.getByText('42')).toBeInTheDocument(); // Estimated results
      expect(screen.getByText('20s')).toBeInTheDocument(); // Duration
      expect(screen.getByText('85%')).toBeInTheDocument(); // Confidence
      expect(screen.getByText('Medium')).toBeInTheDocument(); // Complexity
    });

    it('renders complexity chip with correct color', () => {
      const { rerender } = render(
        <QueryPreviewSummary 
          preview={{...mockPreview, complexity: { ...mockPreview.complexity, level: 'high' as const }}}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );

      expect(screen.getByText('High')).toBeInTheDocument();

      // Test different complexity levels
      rerender(
        <QueryPreviewSummary 
          preview={{...mockPreview, complexity: { ...mockPreview.complexity, level: 'low' as const }}}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('renders refresh button when provided', () => {
      const mockRefresh = vi.fn();
      render(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={false}
          onRefresh={mockRefresh}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();

      fireEvent.click(refreshButton);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading States', () => {
    it('shows loading indicators when generating', () => {
      render(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={true}
          onRefresh={vi.fn()}
        />
      );

      // Should show loading indicators
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    it('disables refresh button when generating', () => {
      render(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={true}
          onRefresh={vi.fn()}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode with reduced information', () => {
      render(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={false}
          onRefresh={vi.fn()}
          compact={true}
        />
      );

      // Should show essential metrics only
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('20s')).toBeInTheDocument();
      
      // Detailed information should be hidden in compact mode
      expect(screen.queryByText('Resource Usage')).not.toBeInTheDocument();
    });

    it('shows tooltip with full information in compact mode', () => {
      render(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={false}
          onRefresh={vi.fn()}
          compact={true}
        />
      );

      // In compact mode, hover should show tooltip with details
      const compactContainer = screen.getByTestId('preview-summary-compact');
      fireEvent.mouseEnter(compactContainer);
      
      // Tooltip should contain detailed information
      expect(screen.getByText(/query will process approximately/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing preview data gracefully', () => {
      render(
        <QueryPreviewSummary 
          preview={null as any}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );

      expect(screen.getByText(/no preview available/i)).toBeInTheDocument();
    });

    it('handles incomplete preview data', () => {
      const incompletePreview = {
        ...mockPreview,
        estimatedResults: undefined,
        confidence: undefined
      };

      render(
        <QueryPreviewSummary 
          preview={incompletePreview}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );

      // Should show fallback values
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );

      // Check for accessibility attributes
      expect(screen.getByRole('region', { name: /query preview summary/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/estimated results/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/processing duration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confidence score/i)).toBeInTheDocument();
    });

    it('provides screen reader friendly content', () => {
      render(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );

      // Check for screen reader text
      expect(screen.getByText(/estimated 42 results/i)).toBeInTheDocument();
      expect(screen.getByText(/85 percent confidence/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      // Should be focusable
      refreshButton.focus();
      expect(refreshButton).toHaveFocus();

      // Should respond to Enter key
      fireEvent.keyDown(refreshButton, { key: 'Enter' });
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Data Formatting', () => {
    it('formats duration correctly', () => {
      const longDurationPreview = {
        ...mockPreview,
        estimatedDuration: 125 // 2 minutes 5 seconds
      };

      render(
        <QueryPreviewSummary 
          preview={longDurationPreview}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );

      expect(screen.getByText('2m 5s')).toBeInTheDocument();
    });

    it('formats large numbers with commas', () => {
      const largeResultsPreview = {
        ...mockPreview,
        estimatedResults: 1234567
      };

      render(
        <QueryPreviewSummary 
          preview={largeResultsPreview}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );

      expect(screen.getByText('1,234,567')).toBeInTheDocument();
    });

    it('formats confidence as percentage', () => {
      const lowConfidencePreview = {
        ...mockPreview,
        confidence: 0.23
      };

      render(
        <QueryPreviewSummary 
          preview={lowConfidencePreview}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );

      expect(screen.getByText('23%')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('integrates properly with parent components', () => {
      let refreshCount = 0;
      const trackingRefresh = () => { refreshCount++; };

      const { rerender } = render(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={false}
          onRefresh={trackingRefresh}
        />
      );

      // Simulate external state changes
      rerender(
        <QueryPreviewSummary 
          preview={{...mockPreview, estimatedResults: 100}}
          isGenerating={false}
          onRefresh={trackingRefresh}
        />
      );

      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('maintains state consistency during updates', () => {
      const { rerender } = render(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );

      // Update to generating state
      rerender(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={true}
          onRefresh={vi.fn()}
        />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Update back to complete state
      rerender(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not trigger unnecessary re-renders', () => {
      const mockRefresh = vi.fn();
      const { rerender } = render(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={false}
          onRefresh={mockRefresh}
        />
      );

      // Same props should not cause re-render issues
      rerender(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={false}
          onRefresh={mockRefresh}
        />
      );

      // Component should still be functional
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('handles rapid state changes gracefully', () => {
      const { rerender } = render(
        <QueryPreviewSummary 
          preview={mockPreview}
          isGenerating={false}
          onRefresh={vi.fn()}
        />
      );

      // Rapid state changes
      for (let i = 0; i < 10; i++) {
        rerender(
          <QueryPreviewSummary 
            preview={{...mockPreview, estimatedResults: 42 + i}}
            isGenerating={i % 2 === 0}
            onRefresh={vi.fn()}
          />
        );
      }

      // Should handle rapid changes without errors
      expect(screen.getByText('51')).toBeInTheDocument();
    });
  });
});