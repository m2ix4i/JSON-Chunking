/**
 * Error details component for displaying detailed connection information.
 * Focused component extracted from ConnectionErrorHandler.
 */

import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Card,
  CardContent,
  Collapse,
} from '@mui/material';
import {
  Refresh as RetryIcon,
  CloudOff as OfflineIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

// Services
import type { ConnectionStatus } from '@/services/connectionManager';

// Types
import type { ErrorNotification } from '@/hooks/useConnectionStatus';

interface ErrorDetailsProps {
  expanded: boolean;
  connectionStatus: ConnectionStatus;
  notifications: ErrorNotification[];
  isRetrying: boolean;
  onRetry: () => void;
  onForceFallback: () => void;
}

const ErrorDetails: React.FC<ErrorDetailsProps> = ({
  expanded,
  connectionStatus,
  notifications,
  isRetrying,
  onRetry,
  onForceFallback,
}) => {
  return (
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
                  onClick={onRetry}
                  disabled={isRetrying}
                  startIcon={<RetryIcon />}
                >
                  WebSocket neu verbinden
                </Button>
                
                {connectionStatus.mode === 'websocket' && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={onForceFallback}
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
  );
};

export default ErrorDetails;