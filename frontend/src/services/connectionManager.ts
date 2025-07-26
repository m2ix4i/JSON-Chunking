/**
 * Connection manager for graceful WebSocket error handling and polling fallback.
 * Provides a unified interface for real-time updates with automatic fallback.
 */

import { websocketService } from './websocket';
import type { WebSocketMessage, QueryStatusResponse, QueryResultResponse } from '@/types/api';

export type ConnectionMode = 'websocket' | 'polling' | 'hybrid';
export type ConnectionHealth = 'excellent' | 'good' | 'degraded' | 'poor';

export interface ConnectionManagerConfig {
  maxWebSocketRetries: number;
  pollingInterval: number;
  connectionTimeout: number;
  healthCheckInterval: number;
  fallbackThreshold: number; // Number of consecutive failures before fallback
}

export interface ConnectionStatus {
  mode: ConnectionMode;
  health: ConnectionHealth;
  isConnected: boolean;
  lastError: string | null;
  retryCount: number;
  metrics: {
    messageCount: number;
    errorCount: number;
    averageLatency: number;
    uptime: number;
  };
}

export interface QueryConnectionConfig {
  queryId: string;
  onProgress?: (progress: any) => void;
  onError?: (error: any) => void;
  onCompletion?: (completion: any) => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  autoReconnect?: boolean;
}

class ConnectionManager {
  private connections: Map<string, ConnectionStatus> = new Map();
  private config: ConnectionManagerConfig = {
    maxWebSocketRetries: 3,
    pollingInterval: 2000,
    connectionTimeout: 10000,
    healthCheckInterval: 30000,
    fallbackThreshold: 3,
  };
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Get connection status for a query
   */
  getConnectionStatus(queryId: string): ConnectionStatus {
    return this.connections.get(queryId) || {
      mode: 'websocket',
      health: 'good',
      isConnected: false,
      lastError: null,
      retryCount: 0,
      metrics: {
        messageCount: 0,
        errorCount: 0,
        averageLatency: 0,
        uptime: 0,
      },
    };
  }

  /**
   * Start monitoring a query with WebSocket connection
   */
  async startMonitoring(config: QueryConnectionConfig): Promise<void> {
    const { queryId, onProgress, onError, onCompletion, onStatusChange } = config;

    try {
      // Initialize connection status
      this.connections.set(queryId, {
        mode: 'websocket',
        health: 'good',
        isConnected: false,
        lastError: null,
        retryCount: 0,
        metrics: {
          messageCount: 0,
          errorCount: 0,
          averageLatency: 0,
          uptime: Date.now(),
        },
      });

      // Create composite message handler
      const messageHandler = (message: WebSocketMessage) => {
        const status = this.connections.get(queryId);
        if (status) {
          status.metrics.messageCount++;
          this.connections.set(queryId, status);
        }

        switch (message.type) {
          case 'progress':
            onProgress?.(message);
            break;
          case 'error':
            onError?.(message);
            this.handleError(queryId, message.message || 'Unknown error');
            break;
          case 'completion':
            onCompletion?.(message);
            this.updateConnectionStatus(queryId, 'disconnected');
            break;
        }
      };

      // Status change handler
      const statusHandler = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => {
        this.updateConnectionStatus(queryId, status);
        onStatusChange?.(status);
      };

      // Connect to WebSocket
      await websocketService.connect(queryId, messageHandler, statusHandler);

      console.log(`Started monitoring query ${queryId}`);
    } catch (error) {
      console.error(`Failed to start monitoring query ${queryId}:`, error);
      this.handleError(queryId, error instanceof Error ? error.message : 'Connection failed');
      
      // Fallback to polling
      await this.startPolling(queryId, onProgress, onError, onCompletion);
    }
  }

  /**
   * Stop monitoring a query
   */
  async stopMonitoring(queryId: string): Promise<void> {
    try {
      await websocketService.disconnect(queryId);
      this.connections.delete(queryId);
      
      // Clear polling if active
      const pollingInterval = this.pollingIntervals.get(queryId);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        this.pollingIntervals.delete(queryId);
      }
      
      console.log(`Stopped monitoring query ${queryId}`);
    } catch (error) {
      console.error(`Error stopping monitoring for query ${queryId}:`, error);
    }
  }

  /**
   * Attempt WebSocket reconnection
   */
  async attemptWebSocketReconnection(queryId: string): Promise<void> {
    const status = this.connections.get(queryId);
    if (!status) return;

    status.retryCount++;
    status.mode = 'websocket';
    this.connections.set(queryId, status);

    try {
      // Try to reconnect WebSocket
      console.log(`Attempting WebSocket reconnection for query ${queryId}`);
      // Implementation would go here
    } catch (error) {
      console.error(`WebSocket reconnection failed for query ${queryId}:`, error);
      throw error;
    }
  }

  /**
   * Force fallback to polling mode
   */
  async forceFallbackToPolling(queryId: string): Promise<void> {
    const status = this.connections.get(queryId);
    if (!status) return;

    status.mode = 'polling';
    status.health = 'degraded';
    this.connections.set(queryId, status);

    // Start polling
    await this.startPolling(queryId);
  }

  private updateConnectionStatus(queryId: string, connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    const status = this.connections.get(queryId);
    if (!status) return;

    status.isConnected = connectionStatus === 'connected';
    if (connectionStatus === 'error') {
      status.health = 'poor';
    } else if (connectionStatus === 'connected') {
      status.health = 'excellent';
      status.lastError = null;
    }

    this.connections.set(queryId, status);
  }

  private handleError(queryId: string, error: string): void {
    const status = this.connections.get(queryId);
    if (!status) return;

    status.lastError = error;
    status.health = 'poor';
    status.metrics.errorCount++;
    this.connections.set(queryId, status);
  }

  private async startPolling(queryId: string, onProgress?: any, onError?: any, onCompletion?: any): Promise<void> {
    const interval = setInterval(async () => {
      try {
        // Implement polling logic here
        // This would typically fetch query status from the API
        console.log(`Polling status for query ${queryId}`);
      } catch (error) {
        console.error(`Polling error for query ${queryId}:`, error);
        onError?.(error);
      }
    }, this.config.pollingInterval);

    this.pollingIntervals.set(queryId, interval);
  }
}

// Create singleton instance
export const connectionManager = new ConnectionManager();
export default connectionManager;