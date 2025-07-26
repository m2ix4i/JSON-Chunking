/**
 * Connection manager for handling WebSocket connections and query monitoring.
 * Provides high-level interface for managing real-time query status updates.
 */

import { websocketService, type WebSocketEventHandler } from './websocket';
import type { WebSocketMessage, ProgressMessage, ErrorMessage, CompletionMessage } from '@/types/api';

export interface QueryConnectionConfig {
  queryId: string;
  onProgress?: (progress: ProgressMessage) => void;
  onError?: (error: ErrorMessage) => void;
  onCompletion?: (completion: CompletionMessage) => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  autoReconnect?: boolean;
}

export interface ConnectionStatus {
  queryId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastActivity: Date;
  reconnectAttempts: number;
  errorMessage?: string;
}

class ConnectionManager {
  private activeConnections: Map<string, ConnectionStatus> = new Map();
  private connectionHandlers: Map<string, WebSocketEventHandler> = new Map();

  /**
   * Start monitoring a query with WebSocket connection
   */
  async startMonitoring(config: QueryConnectionConfig): Promise<void> {
    const { queryId, onProgress, onError, onCompletion, onStatusChange } = config;

    try {
      // Create composite message handler
      const messageHandler: WebSocketEventHandler = (message: WebSocketMessage) => {
        this.updateLastActivity(queryId);

        switch (message.type) {
          case 'progress':
            onProgress?.(message as ProgressMessage);
            break;
          case 'error':
            const errorMsg = message as ErrorMessage;
            onError?.(errorMsg);
            this.updateConnectionStatus(queryId, 'error', errorMsg.message);
            break;
          case 'completion':
            onCompletion?.(message as CompletionMessage);
            this.updateConnectionStatus(queryId, 'disconnected');
            break;
        }
      };

      // Store handler for cleanup
      this.connectionHandlers.set(queryId, messageHandler);

      // Status change handler
      const statusHandler = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => {
        this.updateConnectionStatus(queryId, status);
        onStatusChange?.(status);
      };

      // Initialize connection status
      this.updateConnectionStatus(queryId, 'connecting');

      // Connect to WebSocket
      await websocketService.connect(queryId, messageHandler, statusHandler);

      console.log(`Started monitoring query ${queryId}`);
    } catch (error) {
      console.error(`Failed to start monitoring query ${queryId}:`, error);
      this.updateConnectionStatus(queryId, 'error', error instanceof Error ? error.message : 'Connection failed');
      throw error;
    }
  }

  /**
   * Stop monitoring a query
   */
  stopMonitoring(queryId: string): void {
    // Disconnect WebSocket
    websocketService.disconnect(queryId);

    // Clean up handlers
    this.connectionHandlers.delete(queryId);

    // Remove from active connections
    this.activeConnections.delete(queryId);

    console.log(`Stopped monitoring query ${queryId}`);
  }

  /**
   * Stop monitoring all queries
   */
  stopAllMonitoring(): void {
    for (const queryId of this.activeConnections.keys()) {
      this.stopMonitoring(queryId);
    }
  }

  /**
   * Get connection status for a query
   */
  getConnectionStatus(queryId: string): ConnectionStatus | null {
    return this.activeConnections.get(queryId) || null;
  }

  /**
   * Get all active connection statuses
   */
  getAllConnectionStatuses(): ConnectionStatus[] {
    return Array.from(this.activeConnections.values());
  }

  /**
   * Check if a query is being monitored
   */
  isMonitoring(queryId: string): boolean {
    return this.activeConnections.has(queryId);
  }

  /**
   * Send a message to a specific query connection
   */
  sendMessage(queryId: string, message: any): void {
    websocketService.sendMessage(queryId, message);
  }

  /**
   * Cancel a query via WebSocket
   */
  cancelQuery(queryId: string): void {
    websocketService.cancelQuery(queryId);
  }

  /**
   * Send ping to keep connection alive
   */
  ping(queryId: string): void {
    websocketService.ping(queryId);
  }

  /**
   * Subscribe to specific update types for a query
   */
  subscribeToUpdates(queryId: string, updateTypes: string[]): void {
    websocketService.subscribeToUpdates(queryId, updateTypes);
  }

  private updateConnectionStatus(
    queryId: string, 
    status: 'connecting' | 'connected' | 'disconnected' | 'error',
    errorMessage?: string
  ): void {
    const existing = this.activeConnections.get(queryId);
    
    const connectionStatus: ConnectionStatus = {
      queryId,
      status,
      lastActivity: new Date(),
      reconnectAttempts: existing?.reconnectAttempts || 0,
      errorMessage,
    };

    this.activeConnections.set(queryId, connectionStatus);
  }

  private updateLastActivity(queryId: string): void {
    const status = this.activeConnections.get(queryId);
    if (status) {
      status.lastActivity = new Date();
    }
  }

  /**
   * Get connection health summary
   */
  getHealthSummary(): {
    total: number;
    connected: number;
    disconnected: number;
    error: number;
    connecting: number;
  } {
    const statuses = this.getAllConnectionStatuses();
    
    return {
      total: statuses.length,
      connected: statuses.filter(s => s.status === 'connected').length,
      disconnected: statuses.filter(s => s.status === 'disconnected').length,
      error: statuses.filter(s => s.status === 'error').length,
      connecting: statuses.filter(s => s.status === 'connecting').length,
    };
  }

  /**
   * Cleanup stale connections (connections without activity for 30+ minutes)
   */
  cleanupStaleConnections(): void {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    for (const [queryId, status] of this.activeConnections) {
      if (status.lastActivity < thirtyMinutesAgo && status.status !== 'connected') {
        console.log(`Cleaning up stale connection for query ${queryId}`);
        this.stopMonitoring(queryId);
      }
    }
  }
}

// Create singleton instance
export const connectionManager = new ConnectionManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  connectionManager.stopAllMonitoring();
});

// Periodic cleanup of stale connections (every 10 minutes)
setInterval(() => {
  connectionManager.cleanupStaleConnections();
}, 10 * 60 * 1000);