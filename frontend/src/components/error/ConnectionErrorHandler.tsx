/**
 * Connection error handler component with graceful fallback management.
 * Provides user-friendly error messages and recovery options.
 */

import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
  Card,
  CardContent,
  Snackbar,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Refresh as RetryIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  CloudOff as OfflineIcon,
  CloudDone as OnlineIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';

// Services
import { connectionManager, type ConnectionStatus } from '@/services/connectionManager';

interface ConnectionErrorHandlerProps {
  queryId?: string;
  showDetails?: boolean;
  onRetry?: () => void;
  onFallback?: () => void;
}

interface ErrorNotification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  dismissed: boolean;
}

const ConnectionErrorHandler: React.FC<ConnectionErrorHandlerProps> = ({
  queryId,
  showDetails = false,
  onRetry,
  onFallback,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [expanded, setExpanded] = useState(false);
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

  if (!connectionStatus || (!connectionStatus.lastError && connectionStatus.health !== 'poor')) {
    return null;
  }

  const getSeverity = () => {
    switch (connectionStatus.health) {
      case 'poor': return 'error';
      case 'degraded': return 'warning';
      case 'good': return connectionStatus.mode === 'polling' ? 'info' : 'success';
      default: return 'success';
    }
  };

  const getTitle = () => {
    switch (connectionStatus.health) {
      case 'poor': return 'Verbindungsprobleme';
      case 'degraded': return 'Eingeschränkte Verbindung';
      case 'good': return connectionStatus.mode === 'polling' ? 'Fallback-Modus aktiv' : 'Verbindung stabil';
      default: return 'Verbindung excellent';
    }
  };

  const getMessage = () => {
    if (connectionStatus.lastError) {
      return connectionStatus.lastError;
    }
    
    switch (connectionStatus.mode) {
      case 'polling':
        return 'WebSocket-Verbindung nicht verfügbar. Daten werden alle 2 Sekunden aktualisiert.';
      case 'websocket':
        return 'Live-Updates über WebSocket verfügbar.';
      default:
        return 'Verbindungsstatus unbekannt.';
    }
  };

  return (
    <>
      {/* Main error alert */}
      <Alert 
        severity={getSeverity()}
        sx={{ mb: 2 }}
        action={
          <Box display="flex" alignItems="center" gap={1}>
            {connectionStatus.mode === 'polling' && (
              <Button
                size="small"
                onClick={handleRetry}
                disabled={isRetrying}
                startIcon={isRetrying ? <LinearProgress sx={{ width: 20 }} /> : <RetryIcon />}
              >
                {isRetrying ? 'Verbinde...' : 'Erneut versuchen'}
              </Button>
            )}
            
            {showDetails && (
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <CollapseIcon /> : <ExpandIcon />}
              </IconButton>
            )}
          </Box>
        }
      >
        <AlertTitle>{getTitle()}</AlertTitle>
        {getMessage()}
        
        {/* Connection mode indicator */}
        <Box display="flex" alignItems="center" gap={1} mt={1}>
          <Chip
            icon={connectionStatus.mode === 'websocket' ? <OnlineIcon /> : <OfflineIcon />}
            label={connectionStatus.mode === 'websocket' ? 'Live-Updates' : 'Polling-Modus'}
            color={connectionStatus.mode === 'websocket' ? 'success' : 'warning'}
            size="small"
            variant="outlined"
          />
          
          <Chip
            icon={<SpeedIcon />}
            label={`${connectionStatus.metrics.averageLatency}ms`}
            size="small"
            variant="outlined"
          />
        </Box>
      </Alert>

      {/* Detailed error information */}
      {showDetails && (
        <Collapse in={expanded}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Verbindungsdetails
              </Typography>
              
              <Stack spacing={2}>
                {/* Connection metrics */}
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Leistungsmetriken
                  </Typography>
                  <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Nachrichten empfangen
                      </Typography>
                      <Typography variant="body2">
                        {connectionStatus.metrics.messageCount}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Fehlerrate
                      </Typography>
                      <Typography variant="body2">
                        {connectionStatus.metrics.messageCount > 0 
                          ? Math.round((connectionStatus.metrics.errorCount / connectionStatus.metrics.messageCount) * 100)
                          : 0}%
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Uptime
                      </Typography>
                      <Typography variant="body2">
                        {Math.round(connectionStatus.metrics.uptime / 1000)}s
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Wiederverbindungsversuche
                      </Typography>
                      <Typography variant="body2">
                        {connectionStatus.retryCount}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Manual controls */}
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Manuelle Kontrollen
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleRetry}
                      disabled={isRetrying}
                      startIcon={<RetryIcon />}
                    >
                      WebSocket neu verbinden
                    </Button>
                    
                    {connectionStatus.mode === 'websocket' && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleForceFallback}
                        startIcon={<OfflineIcon />}
                      >
                        Polling erzwingen
                      </Button>
                    )}
                  </Stack>
                </Box>

                {/* Recent notifications */}
                {notifications.length > 0 && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Letzte Ereignisse
                    </Typography>
                    <Stack spacing={1}>
                      {notifications.slice(-3).map((notification) => (
                        <Box
                          key={notification.id}
                          display="flex"
                          alignItems="center"
                          gap={1}
                          sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}
                        >
                          {notification.type === 'error' && <ErrorIcon fontSize="small" color="error" />}
                          {notification.type === 'warning' && <WarningIcon fontSize="small" color="warning" />}
                          {notification.type === 'success' && <SuccessIcon fontSize="small" color="success" />}
                          
                          <Box flexGrow={1}>
                            <Typography variant="caption" sx={{ fontWeight: 500 }}>
                              {notification.title}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {notification.message}
                            </Typography>
                          </Box>
                          
                          <Typography variant="caption" color="text.secondary">
                            {new Date(notification.timestamp).toLocaleTimeString('de-DE')}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Collapse>
      )}

      {/* Notification snackbar */}
      <Snackbar
        open={!!activeNotification}
        autoHideDuration={6000}
        onClose={() => activeNotification && dismissNotification(activeNotification.id)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {activeNotification && (
          <Alert
            severity={activeNotification.type}
            onClose={() => dismissNotification(activeNotification.id)}
            sx={{ width: '100%' }}
          >
            <AlertTitle>{activeNotification.title}</AlertTitle>
            {activeNotification.message}
          </Alert>
        )}
      </Snackbar>
    </>
  );
};

export default ConnectionErrorHandler;