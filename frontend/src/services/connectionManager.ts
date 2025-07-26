/**
<<<<<<< HEAD
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
=======
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
  lastSuccessTime: number;
  metrics: {
    messageCount: number;
    errorCount: number;
    averageLatency: number;
    uptime: number;
  };
}

class ConnectionManager {
  private config: ConnectionManagerConfig = {
    maxWebSocketRetries: 3,
    pollingInterval: 2000,
    connectionTimeout: 10000,
    healthCheckInterval: 30000,
    fallbackThreshold: 3,
  };

  private queryConnections = new Map<string, {
    mode: ConnectionMode;
    isActive: boolean;
    pollingTimer?: NodeJS.Timeout;
    healthTimer?: NodeJS.Timeout;
    consecutiveFailures: number;
    onMessage?: (message: WebSocketMessage) => void;
    onStatusChange?: (status: ConnectionStatus) => void;
    lastPollTime: number;
    messageCount: number;
    errorCount: number;
    startTime: number;
  }>();

  private globalStatus: ConnectionStatus = {
    mode: 'websocket',
    health: 'excellent',
    isConnected: false,
    lastError: null,
    retryCount: 0,
    lastSuccessTime: Date.now(),
    metrics: {
      messageCount: 0,
      errorCount: 0,
      averageLatency: 0,
      uptime: 0,
    },
  };

  /**
   * Connect to query updates with automatic fallback
   */
  async connectToQuery(
    queryId: string,
    onMessage?: (message: WebSocketMessage) => void,
    onStatusChange?: (status: ConnectionStatus) => void
  ): Promise<ConnectionStatus> {
    console.log(`ConnectionManager: Connecting to query ${queryId}`);

    // Initialize connection info
    const connection = {
      mode: 'websocket' as ConnectionMode,
      isActive: true,
      consecutiveFailures: 0,
      onMessage,
      onStatusChange,
      lastPollTime: 0,
      messageCount: 0,
      errorCount: 0,
      startTime: Date.now(),
    };

    this.queryConnections.set(queryId, connection);

    // Try WebSocket first
    try {
      await this.connectWebSocket(queryId);
      this.updateGlobalStatus('websocket', true, null);
      return this.getConnectionStatus(queryId);
    } catch (error) {
      console.warn(`WebSocket connection failed for ${queryId}, falling back to polling:`, error);
      return this.fallbackToPolling(queryId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Disconnect from query updates
   */
  disconnectFromQuery(queryId: string): void {
    const connection = this.queryConnections.get(queryId);
    if (!connection) return;

    console.log(`ConnectionManager: Disconnecting from query ${queryId}`);

    // Clean up WebSocket
    websocketService.disconnect(queryId);

    // Clean up polling
    if (connection.pollingTimer) {
      clearInterval(connection.pollingTimer);
    }

    // Clean up health monitoring
    if (connection.healthTimer) {
      clearInterval(connection.healthTimer);
    }

    connection.isActive = false;
    this.queryConnections.delete(queryId);

    // Update global status if no active connections
    if (this.queryConnections.size === 0) {
      this.updateGlobalStatus(this.globalStatus.mode, false, null);
    }
  }

  /**
   * Get current connection status for a query
   */
  getConnectionStatus(queryId: string): ConnectionStatus {
    const connection = this.queryConnections.get(queryId);
    if (!connection) {
      return {
        ...this.globalStatus,
        isConnected: false,
      };
    }

    const uptime = Date.now() - connection.startTime;
    const health = this.calculateHealth(connection);

    return {
      mode: connection.mode,
      health,
      isConnected: connection.isActive,
      lastError: this.globalStatus.lastError,
      retryCount: connection.consecutiveFailures,
      lastSuccessTime: this.globalStatus.lastSuccessTime,
      metrics: {
        messageCount: connection.messageCount,
        errorCount: connection.errorCount,
        averageLatency: this.calculateAverageLatency(connection),
        uptime,
      },
    };
  }

  /**
   * Get global connection status
   */
  getGlobalStatus(): ConnectionStatus {
    return { ...this.globalStatus };
  }

  /**
   * Force fallback to polling mode
   */
  async forceFallbackToPolling(queryId: string): Promise<ConnectionStatus> {
    console.log(`ConnectionManager: Forcing fallback to polling for ${queryId}`);
    return this.fallbackToPolling(queryId, 'Manual fallback requested');
  }

  /**
   * Attempt to reconnect with WebSocket
   */
  async attemptWebSocketReconnection(queryId: string): Promise<boolean> {
    const connection = this.queryConnections.get(queryId);
    if (!connection || !connection.isActive) return false;

    console.log(`ConnectionManager: Attempting WebSocket reconnection for ${queryId}`);

    try {
      // Stop polling temporarily
      if (connection.pollingTimer) {
        clearInterval(connection.pollingTimer);
        connection.pollingTimer = undefined;
      }

      await this.connectWebSocket(queryId);
      connection.mode = 'websocket';
      connection.consecutiveFailures = 0;
      this.updateGlobalStatus('websocket', true, null);
      
      console.log(`ConnectionManager: WebSocket reconnection successful for ${queryId}`);
      return true;
    } catch (error) {
      console.warn(`ConnectionManager: WebSocket reconnection failed for ${queryId}:`, error);
      
      // Resume polling
      this.startPolling(queryId);
      return false;
    }
  }

  private async connectWebSocket(queryId: string): Promise<void> {
    const connection = this.queryConnections.get(queryId);
    if (!connection) throw new Error('Connection not found');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, this.config.connectionTimeout);

      websocketService.connect(
        queryId,
        (message) => this.handleWebSocketMessage(queryId, message),
        (status) => {
          if (status === 'connected') {
            clearTimeout(timeout);
            resolve();
          } else if (status === 'error') {
            clearTimeout(timeout);
            reject(new Error('WebSocket connection error'));
          }
        }
      ).then(() => {
        clearTimeout(timeout);
        this.startHealthMonitoring(queryId);
        resolve();
      }).catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async fallbackToPolling(queryId: string, reason: string): Promise<ConnectionStatus> {
    const connection = this.queryConnections.get(queryId);
    if (!connection) throw new Error('Connection not found');

    console.log(`ConnectionManager: Falling back to polling for ${queryId}: ${reason}`);

    connection.mode = 'polling';
    connection.consecutiveFailures++;
    this.updateGlobalStatus('polling', true, reason);

    // Start polling
    this.startPolling(queryId);

    // Schedule WebSocket retry
    this.scheduleWebSocketRetry(queryId);

    return this.getConnectionStatus(queryId);
  }

  private startPolling(queryId: string): void {
    const connection = this.queryConnections.get(queryId);
    if (!connection || !connection.isActive) return;

    console.log(`ConnectionManager: Starting polling for ${queryId}`);

    // Clear existing timer
    if (connection.pollingTimer) {
      clearInterval(connection.pollingTimer);
    }

    connection.pollingTimer = setInterval(async () => {
      try {
        await this.pollQueryStatus(queryId);
      } catch (error) {
        console.error(`Polling error for ${queryId}:`, error);
        this.handlePollingError(queryId, error);
      }
    }, this.config.pollingInterval);

    // Initial poll
    this.pollQueryStatus(queryId).catch((error) => {
      console.error(`Initial polling error for ${queryId}:`, error);
      this.handlePollingError(queryId, error);
    });
  }

  private async pollQueryStatus(queryId: string): Promise<void> {
    const connection = this.queryConnections.get(queryId);
    if (!connection || !connection.isActive) return;

    try {
      // Import API service dynamically to avoid circular dependencies
      const { apiService } = await import('./api');
      
      const status: QueryStatusResponse = await apiService.getQueryStatus(queryId);
      connection.lastPollTime = Date.now();
      connection.messageCount++;

      // Convert polling response to WebSocket message format
      const message: WebSocketMessage = {
        type: 'progress',
        query_id: queryId,
        progress_percentage: status.progress_percentage,
        current_step: status.current_step,
        total_steps: status.total_steps,
        step_name: status.message,
        timestamp: Date.now(),
      };

      this.handleMessage(queryId, message);

      // Check if query is completed
      if (status.status === 'completed') {
        const result: QueryResultResponse = await apiService.getQueryResult(queryId);
        const completionMessage: WebSocketMessage = {
          type: 'completion',
          query_id: queryId,
          result,
          timestamp: Date.now(),
        };
        this.handleMessage(queryId, completionMessage);
      } else if (status.status === 'failed') {
        const errorMessage: WebSocketMessage = {
          type: 'error',
          query_id: queryId,
          message: status.error_message || 'Query failed',
          error_details: status.error_message,
          timestamp: Date.now(),
        };
        this.handleMessage(queryId, errorMessage);
      }

      // Reset consecutive failures on success
      connection.consecutiveFailures = 0;
      this.updateGlobalStatus(connection.mode, true, null);

    } catch (error) {
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
      throw error;
    }
  }

<<<<<<< HEAD
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
=======
  private handleWebSocketMessage(queryId: string, message: WebSocketMessage): void {
    const connection = this.queryConnections.get(queryId);
    if (!connection) return;

    connection.messageCount++;
    this.updateGlobalStatus('websocket', true, null);
    this.handleMessage(queryId, message);
  }

  private handleMessage(queryId: string, message: WebSocketMessage): void {
    const connection = this.queryConnections.get(queryId);
    if (!connection || !connection.isActive) return;

    try {
      connection.onMessage?.(message);
    } catch (error) {
      console.error(`Error handling message for ${queryId}:`, error);
      connection.errorCount++;
    }
  }

  private handlePollingError(queryId: string, error: any): void {
    const connection = this.queryConnections.get(queryId);
    if (!connection) return;

    connection.errorCount++;
    connection.consecutiveFailures++;

    const errorMessage = error instanceof Error ? error.message : 'Polling error';
    this.updateGlobalStatus(connection.mode, false, errorMessage);

    // If too many consecutive failures, reduce polling frequency
    if (connection.consecutiveFailures >= this.config.fallbackThreshold) {
      console.warn(`Too many polling failures for ${queryId}, reducing frequency`);
      
      if (connection.pollingTimer) {
        clearInterval(connection.pollingTimer);
        connection.pollingTimer = setInterval(async () => {
          try {
            await this.pollQueryStatus(queryId);
          } catch (error) {
            console.error(`Reduced frequency polling error for ${queryId}:`, error);
          }
        }, this.config.pollingInterval * 2); // Double the interval
      }
    }
  }

  private scheduleWebSocketRetry(queryId: string): void {
    const connection = this.queryConnections.get(queryId);
    if (!connection || !connection.isActive) return;

    if (connection.consecutiveFailures < this.config.maxWebSocketRetries) {
      const retryDelay = Math.min(30000, 5000 * Math.pow(2, connection.consecutiveFailures));
      
      console.log(`Scheduling WebSocket retry for ${queryId} in ${retryDelay}ms`);
      
      setTimeout(() => {
        if (connection.isActive && connection.mode === 'polling') {
          this.attemptWebSocketReconnection(queryId);
        }
      }, retryDelay);
    }
  }

  private startHealthMonitoring(queryId: string): void {
    const connection = this.queryConnections.get(queryId);
    if (!connection || !connection.isActive) return;

    connection.healthTimer = setInterval(() => {
      // Send ping to check connection health
      websocketService.ping(queryId);
    }, this.config.healthCheckInterval);
  }

  private calculateHealth(connection: any): ConnectionHealth {
    const errorRate = connection.messageCount > 0 ? connection.errorCount / connection.messageCount : 0;
    const timeSinceLastMessage = Date.now() - connection.lastPollTime;

    if (connection.mode === 'websocket' && errorRate < 0.1) {
      return 'excellent';
    } else if (connection.mode === 'websocket' && errorRate < 0.2) {
      return 'good';
    } else if (connection.mode === 'polling' && errorRate < 0.1 && timeSinceLastMessage < 30000) {
      return 'good';
    } else if (errorRate < 0.3) {
      return 'degraded';
    } else {
      return 'poor';
    }
  }

  private calculateAverageLatency(connection: any): number {
    // Simplified latency calculation
    // In a real implementation, this would track actual request/response times
    return connection.mode === 'websocket' ? 50 : 500;
  }

  private updateGlobalStatus(mode: ConnectionMode, isConnected: boolean, error: string | null): void {
    this.globalStatus.mode = mode;
    this.globalStatus.isConnected = isConnected;
    this.globalStatus.lastError = error;
    
    if (isConnected) {
      this.globalStatus.lastSuccessTime = Date.now();
    }

    // Update health based on current state
    if (error) {
      this.globalStatus.health = 'poor';
      this.globalStatus.retryCount++;
    } else if (mode === 'websocket' && isConnected) {
      this.globalStatus.health = 'excellent';
      this.globalStatus.retryCount = 0;
    } else if (mode === 'polling' && isConnected) {
      this.globalStatus.health = 'good';
    } else {
      this.globalStatus.health = 'degraded';
    }

    // Update metrics
    const activeConnections = Array.from(this.queryConnections.values());
    this.globalStatus.metrics = {
      messageCount: activeConnections.reduce((sum, conn) => sum + conn.messageCount, 0),
      errorCount: activeConnections.reduce((sum, conn) => sum + conn.errorCount, 0),
      averageLatency: activeConnections.length > 0 
        ? activeConnections.reduce((sum, conn) => sum + this.calculateAverageLatency(conn), 0) / activeConnections.length
        : 0,
      uptime: activeConnections.length > 0 
        ? Math.min(...activeConnections.map(conn => Date.now() - conn.startTime))
        : 0,
    };
  }
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
}

// Create singleton instance
export const connectionManager = new ConnectionManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
<<<<<<< HEAD
  connectionManager.stopAllMonitoring();
});

// Periodic cleanup of stale connections (every 10 minutes)
setInterval(() => {
  connectionManager.cleanupStaleConnections();
}, 10 * 60 * 1000);
=======
  // Clean up all connections
  connectionManager.getGlobalStatus(); // This will trigger cleanup
});
>>>>>>> 2487d42c20845effc574409a994d5aaf6a8d412b
