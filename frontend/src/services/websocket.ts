/**
 * WebSocket service for real-time communication with the backend.
 * Handles progress updates, query status changes, and error notifications.
 */

import type {
  WebSocketMessage,
  ProgressMessage,
  ErrorMessage,
  CompletionMessage,
} from '@/types/api';

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

export interface WebSocketConnection {
  queryId: string;
  socket: WebSocket;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  handlers: Set<WebSocketEventHandler>;
}

class WebSocketService {
  private connections: Map<string, WebSocketConnection> = new Map();
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000; // 1 second

  /**
   * Connect to WebSocket for a specific query
   */
  connect(
    queryId: string,
    onMessage?: WebSocketEventHandler,
    onStatusChange?: (status: WebSocketConnection['status']) => void
  ): Promise<WebSocketConnection> {
    return new Promise((resolve, reject) => {
      // Close existing connection if any
      this.disconnect(queryId);

      const wsUrl = this.getWebSocketURL(queryId);
      const socket = new WebSocket(wsUrl);

      const connection: WebSocketConnection = {
        queryId,
        socket,
        status: 'connecting',
        reconnectAttempts: 0,
        maxReconnectAttempts: this.maxReconnectAttempts,
        reconnectDelay: this.baseReconnectDelay,
        handlers: new Set(),
      };

      // Add message handler if provided
      if (onMessage) {
        connection.handlers.add(onMessage);
      }

      // Setup socket event handlers
      socket.onopen = () => {
        connection.status = 'connected';
        connection.reconnectAttempts = 0;
        connection.reconnectDelay = this.baseReconnectDelay;
        
        console.log(`WebSocket connected for query ${queryId}`);
        onStatusChange?.(connection.status);
        resolve(connection);
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(connection, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socket.onclose = (event) => {
        console.log(`WebSocket closed for query ${queryId}`, event.code, event.reason);
        connection.status = 'disconnected';
        onStatusChange?.(connection.status);

        // Attempt reconnection if not a normal closure
        if (event.code !== 1000 && connection.reconnectAttempts < connection.maxReconnectAttempts) {
          this.scheduleReconnect(connection, onStatusChange);
        } else {
          this.connections.delete(queryId);
        }
      };

      socket.onerror = (error) => {
        console.error(`WebSocket error for query ${queryId}:`, error);
        connection.status = 'error';
        onStatusChange?.(connection.status);
        reject(new Error(`WebSocket connection failed for query ${queryId}`));
      };

      this.connections.set(queryId, connection);
    });
  }

  /**
   * Disconnect WebSocket for a specific query
   */
  disconnect(queryId: string): void {
    const connection = this.connections.get(queryId);
    if (connection) {
      connection.socket.close(1000, 'Client disconnect');
      this.connections.delete(queryId);
    }
  }

  /**
   * Disconnect all WebSocket connections
   */
  disconnectAll(): void {
    for (const [queryId] of this.connections) {
      this.disconnect(queryId);
    }
  }

  /**
   * Add message handler to existing connection
   */
  addHandler(queryId: string, handler: WebSocketEventHandler): void {
    const connection = this.connections.get(queryId);
    if (connection) {
      connection.handlers.add(handler);
    }
  }

  /**
   * Remove message handler from connection
   */
  removeHandler(queryId: string, handler: WebSocketEventHandler): void {
    const connection = this.connections.get(queryId);
    if (connection) {
      connection.handlers.delete(handler);
    }
  }

  /**
   * Send message to server
   */
  sendMessage(queryId: string, message: any): void {
    const connection = this.connections.get(queryId);
    if (connection && connection.status === 'connected') {
      connection.socket.send(JSON.stringify(message));
    } else {
      console.warn(`Cannot send message: WebSocket not connected for query ${queryId}`);
    }
  }

  /**
   * Send ping to keep connection alive
   */
  ping(queryId: string): void {
    this.sendMessage(queryId, { type: 'ping' });
  }

  /**
   * Cancel query via WebSocket
   */
  cancelQuery(queryId: string): void {
    this.sendMessage(queryId, { type: 'cancel' });
  }

  /**
   * Subscribe to specific update types
   */
  subscribeToUpdates(queryId: string, updateTypes: string[]): void {
    this.sendMessage(queryId, {
      type: 'subscribe_updates',
      update_types: updateTypes,
    });
  }

  /**
   * Get connection status
   */
  getConnectionStatus(queryId: string): WebSocketConnection['status'] | null {
    const connection = this.connections.get(queryId);
    return connection?.status || null;
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): string[] {
    return Array.from(this.connections.keys()).filter(
      (queryId) => this.connections.get(queryId)?.status === 'connected'
    );
  }

  private getWebSocketURL(queryId: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/ws/${queryId}`;
  }

  private handleMessage(connection: WebSocketConnection, message: WebSocketMessage): void {
    // Log message for debugging
    console.log(`WebSocket message for query ${connection.queryId}:`, message);

    // Handle specific message types
    switch (message.type) {
      case 'progress':
        this.handleProgressMessage(connection, message as ProgressMessage);
        break;
      case 'error':
        this.handleErrorMessage(connection, message as ErrorMessage);
        break;
      case 'completion':
        this.handleCompletionMessage(connection, message as CompletionMessage);
        break;
      case 'pong':
        // Handle pong response
        break;
      case 'cancel_requested':
      case 'query_cancelled':
        // Handle cancellation responses
        break;
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }

    // Notify all handlers
    connection.handlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('WebSocket handler error:', error);
      }
    });
  }

  private handleProgressMessage(connection: WebSocketConnection, message: ProgressMessage): void {
    // Progress messages are handled by the generic message handlers
    // This method can be extended for specific progress handling
  }

  private handleErrorMessage(connection: WebSocketConnection, message: ErrorMessage): void {
    console.error(`Query ${connection.queryId} error:`, message.message);
  }

  private handleCompletionMessage(connection: WebSocketConnection, message: CompletionMessage): void {
    console.log(`Query ${connection.queryId} completed:`, message.result);
    // Auto-disconnect after completion
    setTimeout(() => this.disconnect(connection.queryId), 5000);
  }

  private scheduleReconnect(
    connection: WebSocketConnection,
    onStatusChange?: (status: WebSocketConnection['status']) => void
  ): void {
    const delay = connection.reconnectDelay * Math.pow(2, connection.reconnectAttempts);
    
    console.log(
      `Reconnecting WebSocket for query ${connection.queryId} in ${delay}ms (attempt ${
        connection.reconnectAttempts + 1
      }/${connection.maxReconnectAttempts})`
    );

    setTimeout(() => {
      if (this.connections.has(connection.queryId)) {
        connection.reconnectAttempts++;
        this.connect(connection.queryId, undefined, onStatusChange).catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  // Utility methods for specific message types
  createProgressHandler(
    onProgress: (progress: ProgressMessage) => void
  ): WebSocketEventHandler {
    return (message: WebSocketMessage) => {
      if (message.type === 'progress') {
        onProgress(message as ProgressMessage);
      }
    };
  }

  createErrorHandler(onError: (error: ErrorMessage) => void): WebSocketEventHandler {
    return (message: WebSocketMessage) => {
      if (message.type === 'error') {
        onError(message as ErrorMessage);
      }
    };
  }

  createCompletionHandler(
    onCompletion: (completion: CompletionMessage) => void
  ): WebSocketEventHandler {
    return (message: WebSocketMessage) => {
      if (message.type === 'completion') {
        onCompletion(message as CompletionMessage);
      }
    };
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  websocketService.disconnectAll();
});