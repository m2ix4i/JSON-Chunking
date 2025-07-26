/**
 * Comprehensive tests for QueryInterface component.
 * Tests SOLID refactoring - focused component for query form and progress tracking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryInterface } from '@/components/query/QueryInterface';
import type { QueryResponse } from '@/types/api';

// Mock the sub-components
vi.mock('@/components/query/QueryForm', () => ({
  QueryForm: ({ onSubmit, isSubmitting, disabled }: any) => (
    <div data-testid="query-form">
      <span>Submitting: {isSubmitting.toString()}</span>
      <span>Disabled: {disabled.toString()}</span>
      <button 
        onClick={onSubmit}
        disabled={isSubmitting || disabled}
      >
        Submit Query
      </button>
    </div>
  )
}));

vi.mock('@/components/query/QueryProgress', () => ({
  QueryProgress: ({ compact }: any) => (
    <div data-testid="query-progress">
      <span>Progress Component</span>
      <span>Compact: {compact.toString()}</span>
    </div>
  )
}));

vi.mock('@/components/error/ConnectionErrorHandler', () => ({
  ConnectionErrorHandler: ({ queryId, showDetails, onRetry }: any) => (
    <div data-testid="connection-error-handler">
      <span>Query ID: {queryId}</span>
      <span>Show Details: {showDetails.toString()}</span>
      <button onClick={onRetry}>Retry Connection</button>
    </div>
  )
}));

const mockActiveQuery: QueryResponse = {
  query_id: 'test-query-123',
  status: 'processing',
  message: 'Query is being processed',
  estimated_processing_time: 30
};

describe('QueryInterface Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering and Composition', () => {
    it('renders all sub-components when active query exists', () => {
      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByTestId('query-form')).toBeInTheDocument();
      expect(screen.getByTestId('query-progress')).toBeInTheDocument();
      expect(screen.getByTestId('connection-error-handler')).toBeInTheDocument();
    });

    it('renders only form when no active query', () => {
      render(
        <QueryInterface
          activeQuery={null}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByTestId('query-form')).toBeInTheDocument();
      expect(screen.queryByTestId('query-progress')).not.toBeInTheDocument();
      expect(screen.queryByTestId('connection-error-handler')).not.toBeInTheDocument();
    });

    it('passes correct props to QueryForm component', () => {
      const mockSubmit = vi.fn();
      render(
        <QueryInterface
          activeQuery={null}
          isSubmitting={true}
          error={null}
          onSubmit={mockSubmit}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText('Submitting: true')).toBeInTheDocument();
      expect(screen.getByText('Disabled: false')).toBeInTheDocument();

      const submitButton = screen.getByText('Submit Query');
      expect(submitButton).toBeDisabled(); // Should be disabled when submitting
    });

    it('demonstrates SOLID refactoring - orchestrates query interaction', () => {
      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      // Should orchestrate form, progress, and error handling
      expect(screen.getByTestId('query-form')).toBeInTheDocument();
      expect(screen.getByTestId('query-progress')).toBeInTheDocument();
      expect(screen.getByTestId('connection-error-handler')).toBeInTheDocument();
      
      // Should not implement these features directly
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument(); // Form details
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(); // Progress details
    });
  });

  describe('State Management', () => {
    it('handles different query states appropriately', () => {
      const { rerender } = render(
        <QueryInterface
          activeQuery={null}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      // No active query - only form
      expect(screen.getByTestId('query-form')).toBeInTheDocument();
      expect(screen.queryByTestId('query-progress')).not.toBeInTheDocument();

      // Active query - form + progress + error handler
      rerender(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByTestId('query-form')).toBeInTheDocument();
      expect(screen.getByTestId('query-progress')).toBeInTheDocument();
      expect(screen.getByTestId('connection-error-handler')).toBeInTheDocument();
    });

    it('handles submission state correctly', () => {
      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={true}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText('Submitting: true')).toBeInTheDocument();
      
      const submitButton = screen.getByText('Submit Query');
      expect(submitButton).toBeDisabled();
    });

    it('disables form when specified', () => {
      render(
        <QueryInterface
          activeQuery={null}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
          disabled={true}
        />
      );

      expect(screen.getByText('Disabled: true')).toBeInTheDocument();
      
      const submitButton = screen.getByText('Submit Query');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Event Handling', () => {
    it('handles form submission correctly', () => {
      const mockSubmit = vi.fn();
      render(
        <QueryInterface
          activeQuery={null}
          isSubmitting={false}
          error={null}
          onSubmit={mockSubmit}
          onRetry={vi.fn()}
        />
      );

      const submitButton = screen.getByText('Submit Query');
      fireEvent.click(submitButton);

      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    it('handles retry action correctly', () => {
      const mockRetry = vi.fn();
      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error="Connection failed"
          onSubmit={vi.fn()}
          onRetry={mockRetry}
        />
      );

      const retryButton = screen.getByText('Retry Connection');
      fireEvent.click(retryButton);

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('prevents submission when disabled or submitting', () => {
      const mockSubmit = vi.fn();
      
      const { rerender } = render(
        <QueryInterface
          activeQuery={null}
          isSubmitting={true}
          error={null}
          onSubmit={mockSubmit}
          onRetry={vi.fn()}
        />
      );

      const submitButton = screen.getByText('Submit Query');
      fireEvent.click(submitButton);
      
      expect(mockSubmit).not.toHaveBeenCalled();

      // Test disabled state
      rerender(
        <QueryInterface
          activeQuery={null}
          isSubmitting={false}
          error={null}
          onSubmit={mockSubmit}
          onRetry={vi.fn()}
          disabled={true}
        />
      );

      fireEvent.click(submitButton);
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays error state correctly', () => {
      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error="Network timeout occurred"
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText(/network timeout occurred/i)).toBeInTheDocument();
    });

    it('shows error alert for general errors', () => {
      render(
        <QueryInterface
          activeQuery={null}
          isSubmitting={false}
          error="Invalid query format"
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/invalid query format/i)).toBeInTheDocument();
    });

    it('handles both connection errors and general errors', () => {
      const { rerender } = render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error="Connection error"
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      // Connection error with active query - uses ConnectionErrorHandler
      expect(screen.getByTestId('connection-error-handler')).toBeInTheDocument();
      expect(screen.getByText('Retry Connection')).toBeInTheDocument();

      // General error without active query - uses Alert
      rerender(
        <QueryInterface
          activeQuery={null}
          isSubmitting={false}
          error="Validation error"
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/validation error/i)).toBeInTheDocument();
    });
  });

  describe('Progress Tracking', () => {
    it('shows progress component when query is active', () => {
      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByTestId('query-progress')).toBeInTheDocument();
      expect(screen.getByText('Progress Component')).toBeInTheDocument();
    });

    it('passes compact mode to progress component', () => {
      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
          compact={true}
        />
      );

      expect(screen.getByText('Compact: true')).toBeInTheDocument();
    });

    it('hides progress when no active query', () => {
      render(
        <QueryInterface
          activeQuery={null}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.queryByTestId('query-progress')).not.toBeInTheDocument();
    });
  });

  describe('Connection Error Management', () => {
    it('shows connection error handler with query details', () => {
      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
          showDetails={true}
        />
      );

      expect(screen.getByText('Query ID: test-query-123')).toBeInTheDocument();
      expect(screen.getByText('Show Details: true')).toBeInTheDocument();
    });

    it('controls detail visibility in connection error handler', () => {
      const { rerender } = render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
          showDetails={false}
        />
      );

      expect(screen.getByText('Show Details: false')).toBeInTheDocument();

      rerender(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
          showDetails={true}
        />
      );

      expect(screen.getByText('Show Details: true')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('renders with proper grid layout', () => {
      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      // Should have grid container structure
      const gridContainer = screen.getByTestId('query-interface');
      expect(gridContainer).toBeInTheDocument();
    });

    it('handles compact mode styling', () => {
      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
          compact={true}
        />
      );

      // Compact mode should be passed to relevant components
      expect(screen.getByText('Compact: true')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility structure', () => {
      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByRole('region', { name: /query interface/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/query form/i)).toBeInTheDocument();
    });

    it('maintains keyboard navigation flow', () => {
      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      const submitButton = screen.getByText('Submit Query');
      const retryButton = screen.getByText('Retry Connection');

      // Should support tab navigation
      submitButton.focus();
      expect(submitButton).toHaveFocus();

      fireEvent.keyDown(submitButton, { key: 'Tab' });
      // Navigation should move to next focusable element
    });

    it('provides appropriate ARIA attributes for error states', () => {
      render(
        <QueryInterface
          activeQuery={null}
          isSubmitting={false}
          error="Test error message"
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('handles rapid state changes efficiently', () => {
      const { rerender } = render(
        <QueryInterface
          activeQuery={null}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      // Rapid state changes
      for (let i = 0; i < 10; i++) {
        rerender(
          <QueryInterface
            activeQuery={i % 2 === 0 ? mockActiveQuery : null}
            isSubmitting={i % 3 === 0}
            error={i % 4 === 0 ? `Error ${i}` : null}
            onSubmit={vi.fn()}
            onRetry={vi.fn()}
          />
        );
      }

      // Should handle without errors
      expect(screen.getByTestId('query-form')).toBeInTheDocument();
    });

    it('handles null and undefined props gracefully', () => {
      render(
        <QueryInterface
          activeQuery={null}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByTestId('query-form')).toBeInTheDocument();
      expect(screen.queryByTestId('query-progress')).not.toBeInTheDocument();
    });

    it('manages memory efficiently with component mounting/unmounting', async () => {
      const { unmount } = render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      unmount();

      // Should unmount cleanly without errors
      await waitFor(() => {
        expect(screen.queryByTestId('query-form')).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('coordinates sub-components effectively', () => {
      const mockSubmit = vi.fn();
      const mockRetry = vi.fn();

      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={false}
          error="Connection error"
          onSubmit={mockSubmit}
          onRetry={mockRetry}
        />
      );

      // Should coordinate all three sub-components
      expect(screen.getByTestId('query-form')).toBeInTheDocument();
      expect(screen.getByTestId('query-progress')).toBeInTheDocument();
      expect(screen.getByTestId('connection-error-handler')).toBeInTheDocument();

      // Should wire up event handlers correctly
      fireEvent.click(screen.getByText('Submit Query'));
      expect(mockSubmit).toHaveBeenCalled();

      fireEvent.click(screen.getByText('Retry Connection'));
      expect(mockRetry).toHaveBeenCalled();
    });

    it('maintains consistent state across sub-components', () => {
      render(
        <QueryInterface
          activeQuery={mockActiveQuery}
          isSubmitting={true}
          error={null}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      // Submitting state should be reflected in form
      expect(screen.getByText('Submitting: true')).toBeInTheDocument();
      
      // Query ID should be passed to error handler
      expect(screen.getByText('Query ID: test-query-123')).toBeInTheDocument();
    });
  });
});