/**
 * Custom hook for managing connection status and error notifications.
 * Extracted from ConnectionErrorHandler to follow Single Responsibility Principle.
 */

import { useState, useEffect } from 'react';

// Services
import { connectionManager, type ConnectionStatus } from '@/services/connectionManager';

export interface ErrorNotification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  dismissed: boolean;
}

export interface UseConnectionStatusResult {
  connectionStatus: ConnectionStatus | null;
  notifications: ErrorNotification[];
  activeNotification: ErrorNotification | null;
  isRetrying: boolean;
  addNotification: (type: ErrorNotification['type'], title: string, message: string) => void;
  dismissNotification: (id: string) => void;
  handleRetry: () => Promise<void>;
  handleForceFallback: () => Promise<void>;
}

export const useConnectionStatus = (
  queryId?: string,
  onRetry?: () => void,
  onFallback?: () => void
): UseConnectionStatusResult => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);
  const [activeNotification, setActiveNotification] = useState<ErrorNotification | null>(null);

  // Monitor connection status
  useEffect(() => {
    if (!queryId) return;

    const updateStatus = () => {
      const status = connectionManager.getConnectionStatus(queryId);
      setConnectionStatus(status);

      // Generate notifications based on status changes
      if (status.lastError && status.health === 'poor') {
        addNotification('error', 'Verbindungsfehler', status.lastError);
      } else if (status.mode === 'polling' && status.health === 'good') {
        addNotification('warning', 'Fallback aktiv', 'WebSocket nicht verfügbar, Polling wird verwendet');
      } else if (status.mode === 'websocket' && status.health === 'excellent') {
        addNotification('success', 'Verbindung wiederhergestellt', 'Live-Updates sind wieder verfügbar');
      }
    };

    // Initial status
    updateStatus();

    // Monitor status changes
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, [queryId]);

  // Show/hide notifications
  useEffect(() => {
    const unshownNotifications = notifications.filter(n => !n.dismissed);
    if (unshownNotifications.length > 0 && !activeNotification) {
      setActiveNotification(unshownNotifications[0]);
    }
  }, [notifications, activeNotification]);

  const addNotification = (type: ErrorNotification['type'], title: string, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const notification: ErrorNotification = {
      id,
      type,
      title,
      message,
      timestamp: Date.now(),
      dismissed: false,
    };

    setNotifications(prev => [...prev.slice(-4), notification]); // Keep only last 5
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, dismissed: true } : n)
    );
    setActiveNotification(null);
  };

  const handleRetry = async () => {
    if (!queryId) return;

    setIsRetrying(true);
    try {
      await connectionManager.attemptWebSocketReconnection(queryId);
      addNotification('info', 'Wiederverbindung', 'Versuche WebSocket-Verbindung wiederherzustellen...');
      onRetry?.();
    } catch (error) {
      addNotification('error', 'Wiederverbindung fehlgeschlagen', 'WebSocket-Verbindung konnte nicht wiederhergestellt werden');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleForceFallback = async () => {
    if (!queryId) return;

    try {
      await connectionManager.forceFallbackToPolling(queryId);
      addNotification('info', 'Fallback aktiviert', 'Polling-Modus wurde manuell aktiviert');
      onFallback?.();
    } catch (error) {
      addNotification('error', 'Fallback fehlgeschlagen', 'Polling-Modus konnte nicht aktiviert werden');
    }
  };

  return {
    connectionStatus,
    notifications,
    activeNotification,
    isRetrying,
    addNotification,
    dismissNotification,
    handleRetry,
    handleForceFallback,
  };
};