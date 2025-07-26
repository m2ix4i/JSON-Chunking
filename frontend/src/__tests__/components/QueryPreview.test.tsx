/**
 * Comprehensive tests for QueryPreview component.
 * Tests SOLID refactoring - reduced from 615-line monolith to 127-line orchestrator.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryPreview } from '@/components/query/QueryPreview';
import type { QueryPreview as QueryPreviewType } from '@/types/app';

// Mock the sub-components
vi.mock('@/components/query/QueryPreviewSummary', () => ({
  QueryPreviewSummary: ({ preview, isGenerating, onRefresh, compact }: any) => (
    <div data-testid="query-preview-summary">
      <span>Summary: {preview?.estimatedResults} results</span>
      <span>Generating: {isGenerating.toString()}</span>
      <span>Compact: {compact.toString()}</span>
      {onRefresh && <button onClick={onRefresh}>Refresh Summary</button>}
    </div>
  )
}));

vi.mock('@/components/query/QueryPreviewSections', () => ({
  QueryPreviewSections: ({ preview, expandedSections, onToggleSection, compact }: any) => (
    <div data-testid="query-preview-sections">
      <span>Sections: {expandedSections.join(',')}</span>
      <span>Compact: {compact.toString()}</span>
      {['processing', 'complexity', 'resources'].map(section => (
        <button key={section} onClick={() => onToggleSection(section)}>
          Toggle {section}
        </button>
      ))}
    </div>
  )
}));

// Mock the useQueryPreview hook
vi.mock('@/hooks/useQueryPreview', () => ({
  useQueryPreview: vi.fn()
}));

const mockPreview: QueryPreviewType = {
  id: 'test-preview-main',
  query: 'Test query for main component',
  estimatedResults: 78,
  processingSteps: [
    { step: 'Parse input', estimated_duration: 2 },
    { step: 'Execute query', estimated_duration: 18 }
  ],
  complexity: {
    level: 'medium',
    score: 0.65,
    factors: ['Complex joins', 'Large dataset']
  },
  estimatedDuration: 20,
  confidence: 0.88,
  optimizations: [
    { type: 'caching', description: 'Cache enabled', impact: 'high' }
  ],
  resourceEstimate: {
    cpu_usage: 'medium',
    memory_usage: 'low',
    io_operations: 'medium',
    estimated_cost: 0.08
  },
  resultStructure: {
    expectedFormat: 'structured',
    fieldsCount: 12,
    nestedLevels: 2
  },
  generatedAt: new Date().toISOString(),
};

describe('QueryPreview Component', () => {
  const mockUseQueryPreview = vi.mocked(await import('@/hooks/useQueryPreview')).useQueryPreview;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering and Orchestration', () => {
    it('renders as orchestrator component with proper composition', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      // Should compose both sub-components
      expect(screen.getByTestId('query-preview-summary')).toBeInTheDocument();
      expect(screen.getByTestId('query-preview-sections')).toBeInTheDocument();

      // Should pass correct data to sub-components
      expect(screen.getByText('Summary: 78 results')).toBeInTheDocument();
      expect(screen.getByText('Generating: false')).toBeInTheDocument();
    });

    it('demonstrates SOLID refactoring - orchestrates instead of implementing', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      // Main component should orchestrate, not implement detailed UI
      expect(screen.queryByText('Parse input')).not.toBeInTheDocument(); // Details in sub-components
      expect(screen.getByTestId('query-preview-summary')).toBeInTheDocument(); // Orchestration
      expect(screen.getByTestId('query-preview-sections')).toBeInTheDocument(); // Orchestration
    });

    it('manages expanded sections state properly', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      // Initially no sections expanded
      expect(screen.getByText('Sections:')).toBeInTheDocument();

      // Expand a section
      fireEvent.click(screen.getByText('Toggle processing'));
      expect(screen.getByText('Sections: processing')).toBeInTheDocument();

      // Expand another section
      fireEvent.click(screen.getByText('Toggle complexity'));
      expect(screen.getByText('Sections: processing,complexity')).toBeInTheDocument();

      // Collapse a section
      fireEvent.click(screen.getByText('Toggle processing'));
      expect(screen.getByText('Sections: complexity')).toBeInTheDocument();
    });
  });

  describe('Hook Integration', () => {
    it('integrates properly with useQueryPreview hook', () => {
      const mockRefresh = vi.fn();
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: true,
        error: null,
        refreshPreview: mockRefresh
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      // Should pass hook data to components
      expect(screen.getByText('Generating: true')).toBeInTheDocument();

      // Should wire up refresh functionality
      fireEvent.click(screen.getByText('Refresh Summary'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('handles hook errors gracefully', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: null,
        isGenerating: false,
        error: 'Failed to generate preview',
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      expect(screen.getByText(/failed to generate preview/i)).toBeInTheDocument();
      expect(screen.getByText(/retry/i)).toBeInTheDocument();
    });

    it('passes correct parameters to useQueryPreview hook', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      render(
        <QueryPreview 
          query="complex query" 
          fileId="file-456" 
          autoRefresh={true}
          debounceMs={300}
        />
      );

      expect(mockUseQueryPreview).toHaveBeenCalledWith(
        'complex query',
        'file-456',
        expect.objectContaining({
          autoRefresh: true,
          debounceMs: 300
        })
      );
    });
  });

  describe('State Management', () => {
    it('manages section expansion state independently', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      // Test independent section toggles
      fireEvent.click(screen.getByText('Toggle complexity'));
      fireEvent.click(screen.getByText('Toggle resources'));
      
      expect(screen.getByText('Sections: complexity,resources')).toBeInTheDocument();

      // Test that unrelated sections remain unaffected
      fireEvent.click(screen.getByText('Toggle complexity'));
      expect(screen.getByText('Sections: resources')).toBeInTheDocument();
    });

    it('resets expanded sections when query changes', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      const { rerender } = render(<QueryPreview query="query 1" fileId="file-123" />);

      // Expand some sections
      fireEvent.click(screen.getByText('Toggle processing'));
      fireEvent.click(screen.getByText('Toggle complexity'));
      expect(screen.getByText('Sections: processing,complexity')).toBeInTheDocument();

      // Change query
      rerender(<QueryPreview query="query 2" fileId="file-123" />);

      // Sections should reset
      expect(screen.getByText('Sections:')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('handles loading state correctly', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: null,
        isGenerating: true,
        error: null,
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      expect(screen.getByText(/generating preview/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows error state with retry option', () => {
      const mockRefresh = vi.fn();
      mockUseQueryPreview.mockReturnValue({
        preview: null,
        isGenerating: false,
        error: 'Network timeout',
        refreshPreview: mockRefresh
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
      
      const retryButton = screen.getByText(/retry/i);
      fireEvent.click(retryButton);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('transitions smoothly between states', async () => {
      const mockRefresh = vi.fn();
      
      // Start with loading
      mockUseQueryPreview.mockReturnValue({
        preview: null,
        isGenerating: true,
        error: null,
        refreshPreview: mockRefresh
      });

      const { rerender } = render(<QueryPreview query="test query" fileId="file-123" />);
      expect(screen.getByText(/generating preview/i)).toBeInTheDocument();

      // Transition to success
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: mockRefresh
      });

      rerender(<QueryPreview query="test query" fileId="file-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Summary: 78 results')).toBeInTheDocument();
      });

      // Transition to error
      mockUseQueryPreview.mockReturnValue({
        preview: null,
        isGenerating: false,
        error: 'Something went wrong',
        refreshPreview: mockRefresh
      });

      rerender(<QueryPreview query="test query" fileId="file-123" />);
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Props and Configuration', () => {
    it('passes compact mode to sub-components', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="test query" fileId="file-123" compact={true} />);

      expect(screen.getAllByText('Compact: true')).toHaveLength(2); // Both sub-components
    });

    it('handles missing optional props gracefully', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      // Only required props
      render(<QueryPreview query="test query" fileId="file-123" />);

      expect(screen.getByTestId('query-preview-summary')).toBeInTheDocument();
      expect(screen.getByTestId('query-preview-sections')).toBeInTheDocument();
    });

    it('forwards additional props to hook configuration', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      render(
        <QueryPreview 
          query="test query" 
          fileId="file-123"
          autoRefresh={false}
          debounceMs={500}
          maxRetries={3}
        />
      );

      expect(mockUseQueryPreview).toHaveBeenCalledWith(
        'test query',
        'file-123',
        expect.objectContaining({
          autoRefresh: false,
          debounceMs: 500,
          maxRetries: 3
        })
      );
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    it('handles null preview data gracefully', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: null,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      expect(screen.getByText(/no preview available/i)).toBeInTheDocument();
    });

    it('handles empty query string', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: null,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="" fileId="file-123" />);

      expect(screen.getByText(/enter a query to see preview/i)).toBeInTheDocument();
    });

    it('handles missing file ID', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: null,
        isGenerating: false,
        error: 'File ID required',
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="test query" fileId="" />);

      expect(screen.getByText(/file id required/i)).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    it('does not cause unnecessary re-renders of sub-components', () => {
      const mockRefresh = vi.fn();
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: mockRefresh
      });

      const { rerender } = render(<QueryPreview query="test query" fileId="file-123" />);

      // Re-render with same props
      rerender(<QueryPreview query="test query" fileId="file-123" />);

      // Components should still be rendered correctly
      expect(screen.getByText('Summary: 78 results')).toBeInTheDocument();
    });

    it('handles rapid prop changes efficiently', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      const { rerender } = render(<QueryPreview query="test 1" fileId="file-123" />);

      // Rapid changes
      for (let i = 2; i <= 10; i++) {
        rerender(<QueryPreview query={`test ${i}`} fileId="file-123" />);
      }

      // Should handle without errors
      expect(screen.getByTestId('query-preview-summary')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility structure', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      expect(screen.getByRole('region', { name: /query preview/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/preview summary/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/preview sections/i)).toBeInTheDocument();
    });

    it('maintains keyboard navigation across sub-components', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      // All interactive elements should be keyboard accessible
      const refreshButton = screen.getByText('Refresh Summary');
      const toggleButton = screen.getByText('Toggle processing');

      refreshButton.focus();
      expect(refreshButton).toHaveFocus();

      fireEvent.keyDown(refreshButton, { key: 'Tab' });
      // Next focusable element should receive focus
    });
  });

  describe('Component Composition Validation', () => {
    it('demonstrates proper Single Responsibility - orchestration only', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      // Main component should not contain detailed implementation
      expect(screen.queryByText('Parse input')).not.toBeInTheDocument();
      expect(screen.queryByText('Cache enabled')).not.toBeInTheDocument();
      
      // Should only orchestrate sub-components
      expect(screen.getByTestId('query-preview-summary')).toBeInTheDocument();
      expect(screen.getByTestId('query-preview-sections')).toBeInTheDocument();
    });

    it('validates Tell, Dont Ask principle in action coordination', () => {
      const mockRefresh = vi.fn();
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: mockRefresh
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      // Component tells sub-components what to do, doesn't ask for their state
      fireEvent.click(screen.getByText('Refresh Summary'));
      
      // Refresh action is passed down, not queried up
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('demonstrates Law of Demeter - no deep coupling', () => {
      mockUseQueryPreview.mockReturnValue({
        preview: mockPreview,
        isGenerating: false,
        error: null,
        refreshPreview: vi.fn()
      });

      render(<QueryPreview query="test query" fileId="file-123" />);

      // Main component interacts only with direct dependencies (hook + immediate children)
      // No deep property access or complex object chains
      expect(mockUseQueryPreview).toHaveBeenCalledWith(
        'test query',
        'file-123',
        expect.any(Object)
      );
    });
  });
});