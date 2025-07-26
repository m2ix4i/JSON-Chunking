/**
 * Comprehensive tests for ConnectionErrorHandler component.
 * Tests WebSocket connection error handling with graceful fallback.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConnectionErrorHandler } from '@/components/error/ConnectionErrorHandler';

// Mock the connection manager
vi.mock('@/services/connectionManager', () => ({
  connectionManager: {
    getConnectionStatus: vi.fn(),
    connectToQuery: vi.fn(),
    disconnectFromQuery: vi.fn(),
    getConnectionMetrics: vi.fn(),
    getHealthStatus: vi.fn()
  }
}));

// Mock the notification system
vi.mock('@/hooks/useNotification', () => ({
  useNotification: () => ({
    showNotification: vi.fn(),
    clearNotifications: vi.fn()
  })
}));

const mockConnectionStatus = {
  status: 'error' as const,
  queryId: 'test-query-123',
  websocketConnected: false,
  pollingActive: true,
  lastHeartbeat: new Date().toISOString(),
  reconnectAttempts: 3,
  fallbackMode: true
};

const mockConnectionMetrics = {
  totalConnections: 1,
  successfulConnections: 0,
  failedConnections: 1,
  averageLatency: 0,
  uptime: 95.5,
  lastConnectionTime: new Date().toISOString(),
  websocketSupported: true,
  networkQuality: 'poor' as const
};

const mockHealthStatus = {
  websocketService: false,
  apiService: true,
  pollingService: true,
  overallHealth: 'degraded' as const
};

describe('ConnectionErrorHandler Component', () => {
  const mockConnectionManager = vi.mocked(await import('@/services/connectionManager')).connectionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectionManager.getConnectionStatus.mockResolvedValue(mockConnectionStatus);
    mockConnectionManager.getConnectionMetrics.mockResolvedValue(mockConnectionMetrics);
    mockConnectionManager.getHealthStatus.mockResolvedValue(mockHealthStatus);
  });

  describe('Basic Rendering', () => {
    it('renders error indicator when connection fails', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/connection issue detected/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/trying automatic fallback/i)).toBeInTheDocument();
    });

    it('shows connection status with appropriate severity', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Should indicate error severity
      expect(screen.getByText(/websocket connection failed/i)).toBeInTheDocument();
    });

    it('displays fallback mode indicator when active', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/fallback mode active/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/using polling for updates/i)).toBeInTheDocument();
    });
  });

  describe('Connection Status Display', () => {
    it('shows detailed connection information when requested', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
          showDetails={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/connection details/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/websocket: disconnected/i)).toBeInTheDocument();
      expect(screen.getByText(/polling: active/i)).toBeInTheDocument();
      expect(screen.getByText(/reconnect attempts: 3/i)).toBeInTheDocument();
    });

    it('toggles detail visibility when show details is clicked', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/show details/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/show details/i));

      await waitFor(() => {
        expect(screen.getByText(/connection details/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/hide details/i));

      await waitFor(() => {
        expect(screen.queryByText(/connection details/i)).not.toBeInTheDocument();
      });
    });

    it('displays connection metrics when available', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
          showDetails={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/connection metrics/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/uptime: 95.5%/i)).toBeInTheDocument();
      expect(screen.getByText(/network quality: poor/i)).toBeInTheDocument();
      expect(screen.getByText(/failed connections: 1/i)).toBeInTheDocument();
    });
  });

  describe('Health Monitoring', () => {
    it('displays service health status', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
          showDetails={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/service health/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/websocket service: offline/i)).toBeInTheDocument();
      expect(screen.getByText(/api service: online/i)).toBeInTheDocument();
      expect(screen.getByText(/polling service: online/i)).toBeInTheDocument();
      expect(screen.getByText(/overall health: degraded/i)).toBeInTheDocument();
    });

    it('shows health indicators with appropriate colors', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
          showDetails={true}
        />
      );

      await waitFor(() => {
        const healthSection = screen.getByTestId('health-status');
        expect(healthSection).toBeInTheDocument();
      });

      // Should show red indicator for failed services
      expect(screen.getByTestId('websocket-status-error')).toBeInTheDocument();
      // Should show green indicator for healthy services
      expect(screen.getByTestId('api-status-success')).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('provides manual retry option', async () => {
      const mockRetry = vi.fn();
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={mockRetry}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/retry connection/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/retry connection/i));
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('disables retry button during connection attempt', async () => {
      mockConnectionManager.connectToQuery.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      await waitFor(() => {
        const retryButton = screen.getByText(/retry connection/i);
        fireEvent.click(retryButton);
      });

      // Button should be disabled during retry
      expect(screen.getByText(/retrying/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retrying/i })).toBeDisabled();
    });

    it('shows retry success feedback', async () => {
      mockConnectionManager.connectToQuery.mockResolvedValue({
        status: 'connected',
        websocketConnected: true,
        pollingActive: false
      });

      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByText(/retry connection/i));
      });

      await waitFor(() => {
        expect(screen.getByText(/connection restored/i)).toBeInTheDocument();
      });
    });

    it('shows retry failure with specific error message', async () => {
      mockConnectionManager.connectToQuery.mockRejectedValue(new Error('Network timeout'));

      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByText(/retry connection/i));
      });

      await waitFor(() => {
        expect(screen.getByText(/retry failed: network timeout/i)).toBeInTheDocument();
      });
    });
  });

  describe('Automatic Reconnection', () => {
    it('shows automatic reconnection attempts', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
          autoReconnect={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/automatic reconnection active/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/next attempt in/i)).toBeInTheDocument();
    });

    it('allows disabling automatic reconnection', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
          autoReconnect={true}
        />
      );

      await waitFor(() => {
        const disableButton = screen.getByText(/disable auto-reconnect/i);
        fireEvent.click(disableButton);
      });

      expect(screen.getByText(/automatic reconnection disabled/i)).toBeInTheDocument();
    });

    it('shows countdown timer for next reconnection attempt', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
          autoReconnect={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/next attempt in \d+s/i)).toBeInTheDocument();
      });
    });
  });

  describe('Troubleshooting Guidance', () => {
    it('provides troubleshooting steps for common issues', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
          showDetails={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/troubleshooting/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
      expect(screen.getByText(/refresh the page/i)).toBeInTheDocument();
      expect(screen.getByText(/disable browser extensions/i)).toBeInTheDocument();
    });

    it('shows specific guidance based on error type', async () => {
      mockConnectionManager.getConnectionStatus.mockResolvedValue({
        ...mockConnectionStatus,
        errorType: 'websocket_blocked'
      });

      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
          showDetails={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/websocket connections may be blocked/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/check firewall settings/i)).toBeInTheDocument();
    });

    it('provides network diagnostic information', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
          showDetails={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/network diagnostics/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/network quality: poor/i)).toBeInTheDocument();
      expect(screen.getByText(/websocket support: available/i)).toBeInTheDocument();
    });
  });

  describe('Notification Integration', () => {
    it('shows notifications for connection events', async () => {
      const mockNotification = vi.fn();
      vi.mocked(await import('@/hooks/useNotification')).useNotification.mockReturnValue({
        showNotification: mockNotification,
        clearNotifications: vi.fn()
      });

      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
          enableNotifications={true}
        />
      );

      await waitFor(() => {
        expect(mockNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            message: expect.stringContaining('connection issue')
          })
        );
      });
    });

    it('suppresses notifications when disabled', async () => {
      const mockNotification = vi.fn();
      vi.mocked(await import('@/hooks/useNotification')).useNotification.mockReturnValue({
        showNotification: mockNotification,
        clearNotifications: vi.fn()
      });

      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
          enableNotifications={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/connection issue detected/i)).toBeInTheDocument();
      });

      expect(mockNotification).not.toHaveBeenCalled();
    });
  });

  describe('Graceful Degradation', () => {
    it('handles missing connection manager gracefully', async () => {
      mockConnectionManager.getConnectionStatus.mockRejectedValue(new Error('Service unavailable'));

      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/unable to check connection status/i)).toBeInTheDocument();
      });
    });

    it('works with minimal props', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/connection issue detected/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/retry connection/i)).toBeInTheDocument();
    });

    it('handles service degradation gracefully', async () => {
      mockConnectionManager.getHealthStatus.mockResolvedValue({
        ...mockHealthStatus,
        websocketService: false,
        apiService: false,
        pollingService: false,
        overallHealth: 'critical'
      });

      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
          showDetails={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical service issues detected/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/multiple services are offline/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/connection status/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry connection/i });
        retryButton.focus();
        expect(retryButton).toHaveFocus();
      });
    });

    it('provides screen reader friendly status updates', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/connection status: error/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/fallback mode: active/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('efficiently polls connection status', async () => {
      render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(mockConnectionManager.getConnectionStatus).toHaveBeenCalledTimes(1);
      });

      // Should not make excessive API calls
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockConnectionManager.getConnectionStatus).toHaveBeenCalledTimes(1);
    });

    it('cleans up resources on unmount', async () => {
      const { unmount } = render(
        <ConnectionErrorHandler
          queryId="test-query-123"
          onRetry={vi.fn()}
        />
      );

      unmount();

      // Should not continue polling after unmount
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockConnectionManager.getConnectionStatus).toHaveBeenCalledTimes(1);
    });
  });
});