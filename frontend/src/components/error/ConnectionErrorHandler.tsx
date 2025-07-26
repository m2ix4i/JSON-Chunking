/**
 * Connection error handler component - displays connection errors and retry options.
 * Provides user-friendly error handling for WebSocket connection issues.
 */

import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Box,
  Typography,
  Chip,
  Stack,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  WifiOff as WifiOffIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

// Services
import { connectionManager } from '@services/connectionManager';

interface ConnectionErrorHandlerProps {
  queryId: string;
  showDetails?: boolean;
  onRetry?: () => void;
  compact?: boolean;
}

const ConnectionErrorHandler: React.FC<ConnectionErrorHandlerProps> = ({
  queryId,
  showDetails = false,
  onRetry,
  compact = false,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(showDetails);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRetryTime, setLastRetryTime] = useState<Date | null>(null);

  useEffect(() => {
    const checkConnection = () => {
      const status = connectionManager.getConnectionStatus(queryId);
      if (status) {
        setConnectionStatus(status.status);
        setErrorMessage(status.errorMessage || null);
      }
    };

    // Check immediately
    checkConnection();

    // Set up periodic checks
    const interval = setInterval(checkConnection, 2000);

    return () => clearInterval(interval);
  }, [queryId]);

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    setLastRetryTime(new Date());
    
    try {
      onRetry?.();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'error':
        return <ErrorIcon />;
      case 'disconnected':
        return <WifiOffIcon />;
      default:
        return null;
    }
  };

  const shouldShowError = connectionStatus === 'error' || connectionStatus === 'disconnected';

  if (!shouldShowError) {
    return null;
  }

  return (
    <Alert
      severity={connectionStatus === 'error' ? 'error' : 'warning'}
      icon={getStatusIcon()}
      action={
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={connectionStatus}
            color={getStatusColor()}
            size="small"
            variant="outlined"
          />
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRetry}
            disabled={connectionStatus === 'connecting'}
          >
            Wiederholen
          </Button>
          {showDetails && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Stack>
      }
    >
      <AlertTitle>
        {connectionStatus === 'error' ? 'Verbindungsfehler' : 'Verbindung unterbrochen'}
      </AlertTitle>
      
      {!compact && (
        <Typography variant="body2">
          {connectionStatus === 'error'
            ? 'Die Verbindung zum Server konnte nicht hergestellt werden.'
            : 'Die Verbindung zum Server wurde unterbrochen. Versuchen Sie es erneut.'
          }
        </Typography>
      )}

      <Collapse in={expanded}>
        <Box mt={2}>
          <Typography variant="subtitle2" gutterBottom>
            Verbindungsdetails:
          </Typography>
          
          <Stack spacing={1}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Abfrage-ID:
              </Typography>
              <Typography variant="body2" fontFamily="monospace">
                {queryId}
              </Typography>
            </Box>
            
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Status:
              </Typography>
              <Typography variant="body2">
                {connectionStatus}
              </Typography>
            </Box>

            {retryCount > 0 && (
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Wiederholungsversuche:
                </Typography>
                <Typography variant="body2">
                  {retryCount}
                </Typography>
              </Box>
            )}

            {lastRetryTime && (
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Letzter Versuch:
                </Typography>
                <Typography variant="body2">
                  {lastRetryTime.toLocaleTimeString()}
                </Typography>
              </Box>
            )}

            {errorMessage && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Fehlermeldung:
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    bgcolor: 'grey.100', 
                    p: 1, 
                    borderRadius: 1,
                    fontSize: '0.75rem'
                  }}
                >
                  {errorMessage}
                </Typography>
              </Box>
            )}
          </Stack>

          <Box mt={2}>
            <Typography variant="body2" color="text.secondary">
              <strong>Tipps zur Fehlerbehebung:</strong>
            </Typography>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Überprüfen Sie Ihre Internetverbindung
                </Typography>
              </li>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Aktualisieren Sie die Seite (F5)
                </Typography>
              </li>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Kontaktieren Sie den Support bei anhaltenden Problemen
                </Typography>
              </li>
            </ul>
          </Box>
        </Box>
      </Collapse>
    </Alert>
  );
};

export default ConnectionErrorHandler;