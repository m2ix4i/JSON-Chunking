/**
 * ResultsPage Component Unit Tests
 * Tests the results page functionality and different display states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import ResultsPage from '../ResultsPage';

// Mock the query store hook
const mockUseQueryStore = vi.fn();

vi.mock('@stores/queryStore', () => ({
  useQueryStore: () => mockUseQueryStore()
}));

// Mock the app store notifications
vi.mock('@stores/appStore', () => ({
  showErrorNotification: vi.fn(),
  showSuccessNotification: vi.fn()
}));

// Mock the export utilities
vi.mock('@utils/export', () => ({
  exportQueryResult: vi.fn(),
  shareQueryResult: vi.fn()
}));

// Mock components
vi.mock('@components/results/QueryResultDisplay', () => ({
  default: ({ result, onExport, onShare }: any) => (
    <div data-testid="query-result-display">
      <button onClick={() => onExport('json')}>Export JSON</button>
      <button onClick={() => onShare()}>Share</button>
      <div>Result: {result.data}</div>
    </div>
  )
}));

vi.mock('@components/query/QueryProgress', () => ({
  default: ({ compact }: { compact: boolean }) => (
    <div data-testid="query-progress" data-compact={compact}>
      Query Progress Component
    </div>
  )
}));

// Helper to render with router
const renderWithRouter = (component: React.ReactElement, initialEntries = ['/results']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {component}
    </MemoryRouter>
  );
};

// Mock data
const mockQueryResult = {
  query_id: 'test-query-123',
  data: 'Test result data',
  processing_time: 2.5,
  status: 'completed'
};

const mockActiveQuery = {
  query_id: 'test-query-123',
  query_text: 'Test query',
  status: 'processing'
};

const mockQueryStatus = {
  query_id: 'test-query-123',
  status: 'completed' as const,
  progress: 100,
  error_message: null
};

describe('ResultsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty state', () => {
    beforeEach(() => {
      mockUseQueryStore.mockReturnValue({
        error: null,
        isSubmitting: false,
        activeQuery: null,
        queryStatus: null,
        queryResult: null,
        isConnected: true
      });
    });

    it('renders empty state when no active query or result', () => {
      renderWithRouter(<ResultsPage />);
      
      expect(screen.getByText('Ergebnisse')).toBeInTheDocument();
      expect(screen.getByText('Keine Abfrage-Ergebnisse')).toBeInTheDocument();
      expect(screen.getByText('Starten Sie eine neue Abfrage, um Ergebnisse anzuzeigen.')).toBeInTheDocument();
    });

    it('has a button to start new query from empty state', () => {
      renderWithRouter(<ResultsPage />);
      
      const newQueryButton = screen.getByText('Neue Abfrage starten');
      expect(newQueryButton).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    beforeEach(() => {
      mockUseQueryStore.mockReturnValue({
        error: null,
        isSubmitting: false,
        activeQuery: mockActiveQuery,
        queryStatus: { ...mockQueryStatus, status: 'processing' },
        queryResult: null,
        isConnected: true
      });
    });

    it('renders loading state when query is processing', () => {
      renderWithRouter(<ResultsPage />);
      
      expect(screen.getByText('Verarbeitung läuft...')).toBeInTheDocument();
      expect(screen.getByTestId('query-progress')).toBeInTheDocument();
    });

    it('shows live updates status when connected', () => {
      renderWithRouter(<ResultsPage />);
      
      expect(screen.getByText('Live-Updates')).toBeInTheDocument();
    });

    it('shows standard polling when not connected', () => {
      mockUseQueryStore.mockReturnValue({
        error: null,
        isSubmitting: false,
        activeQuery: mockActiveQuery,
        queryStatus: { ...mockQueryStatus, status: 'processing' },
        queryResult: null,
        isConnected: false
      });

      renderWithRouter(<ResultsPage />);
      
      expect(screen.getByText('Standard-Polling')).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    beforeEach(() => {
      mockUseQueryStore.mockReturnValue({
        error: 'Test error message',
        isSubmitting: false,
        activeQuery: mockActiveQuery,
        queryStatus: { ...mockQueryStatus, status: 'failed', error_message: 'Processing failed' },
        queryResult: null,
        isConnected: true
      });
    });

    it('renders error state when query failed', () => {
      renderWithRouter(<ResultsPage />);
      
      expect(screen.getByText('Verarbeitung fehlgeschlagen')).toBeInTheDocument();
      expect(screen.getByText('Fehler bei der Abfrageverarbeitung')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('has buttons to retry or go to dashboard from error state', () => {
      renderWithRouter(<ResultsPage />);
      
      expect(screen.getByText('Neue Abfrage starten')).toBeInTheDocument();
      expect(screen.getByText('Zum Dashboard')).toBeInTheDocument();
    });
  });

  describe('Results display', () => {
    beforeEach(() => {
      mockUseQueryStore.mockReturnValue({
        error: null,
        isSubmitting: false,
        activeQuery: mockActiveQuery,
        queryStatus: mockQueryStatus,
        queryResult: mockQueryResult,
        isConnected: true
      });
    });

    it('renders results when query is completed', () => {
      renderWithRouter(<ResultsPage />);
      
      expect(screen.getByText('Abfrage-Ergebnisse')).toBeInTheDocument();
      expect(screen.getByTestId('query-result-display')).toBeInTheDocument();
      expect(screen.getByText('Result: Test result data')).toBeInTheDocument();
    });

    it('shows processing time when available', () => {
      renderWithRouter(<ResultsPage />);
      
      // Look for the processing time - it may be part of a larger text element
      expect(screen.getByText(/2\.5s/)).toBeInTheDocument();
    });

    it('shows completed status for finished queries', () => {
      renderWithRouter(<ResultsPage />);
      
      expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
    });

    it('handles export functionality', async () => {
      const { exportQueryResult } = await import('@utils/export');
      renderWithRouter(<ResultsPage />);
      
      const exportButton = screen.getByText('Export JSON');
      fireEvent.click(exportButton);
      
      expect(exportQueryResult).toHaveBeenCalledWith(mockQueryResult, 'json');
    });

    it('handles share functionality', async () => {
      const { shareQueryResult } = await import('@utils/export');
      renderWithRouter(<ResultsPage />);
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      expect(shareQueryResult).toHaveBeenCalledWith(mockQueryResult);
    });
  });

  describe('Still processing with partial results', () => {
    beforeEach(() => {
      mockUseQueryStore.mockReturnValue({
        error: null,
        isSubmitting: false,
        activeQuery: mockActiveQuery,
        queryStatus: { ...mockQueryStatus, status: 'processing' },
        queryResult: mockQueryResult,
        isConnected: true
      });
    });

    it('shows processing banner when still processing with results', () => {
      renderWithRouter(<ResultsPage />);
      
      expect(screen.getByText(/Die Abfrage wird noch verarbeitet/)).toBeInTheDocument();
      expect(screen.getByText(/Die Ergebnisse werden in Echtzeit aktualisiert/)).toBeInTheDocument();
    });

    it('shows compact progress indicator when results are displayed', () => {
      renderWithRouter(<ResultsPage />);
      
      const progressComponent = screen.getByTestId('query-progress');
      expect(progressComponent).toHaveAttribute('data-compact', 'true');
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      mockUseQueryStore.mockReturnValue({
        error: null,
        isSubmitting: false,
        activeQuery: mockActiveQuery,
        queryStatus: mockQueryStatus,
        queryResult: mockQueryResult,
        isConnected: true
      });
    });

    it('has back to query button', () => {
      renderWithRouter(<ResultsPage />);
      
      const backButton = screen.getByText('Zurück zur Abfrage');
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('Utility functions', () => {
    it('formats duration correctly for seconds', () => {
      renderWithRouter(<ResultsPage />);
      
      // Test short duration (under 1 minute) - it may be part of a larger text element
      expect(screen.getByText(/2\.5s/)).toBeInTheDocument();
    });

    it('formats duration correctly for minutes', () => {
      mockUseQueryStore.mockReturnValue({
        error: null,
        isSubmitting: false,
        activeQuery: mockActiveQuery,
        queryStatus: mockQueryStatus,
        queryResult: { ...mockQueryResult, processing_time: 125.0 },
        isConnected: true
      });

      renderWithRouter(<ResultsPage />);
      
      // Look for the formatted duration - it may be part of a larger text element
      expect(screen.getByText(/2m 5s/)).toBeInTheDocument();
    });
  });

  describe('URL parameter handling', () => {
    it('logs message when URL query ID does not match active query', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      renderWithRouter(<ResultsPage />, ['/results/different-query-id']);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Loading query by ID not yet implemented:', 
        'different-query-id'
      );
      
      consoleSpy.mockRestore();
    });
  });
});