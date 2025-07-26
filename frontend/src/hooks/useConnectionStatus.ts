/**
 * Custom hook for managing connection status and error notifications.
 * Extracted from ConnectionErrorHandler to follow Single Responsibility Principle.
 */

import { useState, useEffect } from 'react';

// Services
import { connectionManager } from '@services/connectionManager';

export interface ErrorNotification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  dismissed: boolean;
}

// Simplified ConnectionStatus interface for this hook
interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastError?: string;
  health: 'poor' | 'degraded' | 'good' | 'excellent';
  mode: 'polling' | 'websocket';
  metrics: {
    averageLatency: number;
    messageCount: number;
    errorCount: number;
    uptime: number;
  };
  retryCount: number;
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
      // Simulate connection status for now
      const mockStatus: ConnectionStatus = {
        status: 'disconnected',
        lastError: 'WebSocket connection failed',
        health: 'poor',
        mode: 'polling',
        metrics: {
          averageLatency: 150,
          messageCount: 0,
          errorCount: 1,
          uptime: 0,
        },
        retryCount: 0,
      };

      setConnectionStatus(mockStatus);

      // Generate notifications based on status changes
      if (mockStatus.lastError && mockStatus.health === 'poor') {
        addNotification('error', 'Verbindungsfehler', mockStatus.lastError);
      } else if (mockStatus.mode === 'polling' && mockStatus.health === 'good') {
        addNotification('warning', 'Fallback aktiv', 'WebSocket nicht verfügbar, Polling wird verwendet');
      } else if (mockStatus.mode === 'websocket' && mockStatus.health === 'excellent') {
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
      // Simulate retry logic
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
      // Simulate fallback logic
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