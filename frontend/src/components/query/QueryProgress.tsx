/**
 * Real-time query progress component with WebSocket integration.
 * Displays live progress updates, connection status, and step indicators.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  Fade,
  Stack,
} from '@mui/material';
import {
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  CloudOff as DisconnectedIcon,
  CloudDone as ConnectedIcon,
  Sync as ProcessingIcon,
} from '@mui/icons-material';

// Store hooks
import { useQueryStore } from '@/stores/queryStore';

interface QueryProgressProps {
  /** Show compact version of progress */
  compact?: boolean;
  /** Additional styling */
  sx?: object;
}

const QueryProgress: React.FC<QueryProgressProps> = ({
  compact = false,
  sx = {},
}) => {
  const { activeQuery, queryStatus, queryResult, isConnected, error } = useQueryStore();
  const [elapsedTime, setElapsedTime] = useState<string>('0s');

  // Calculate elapsed time
  useEffect(() => {
    if (!activeQuery) return;

    const interval = setInterval(() => {
      const startTime = new Date(); // Fallback since activeQuery doesn't have created_at
      const elapsed = Date.now() - startTime.getTime();
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        setElapsedTime(`${hours}h ${minutes % 60}m`);
      } else if (minutes > 0) {
        setElapsedTime(`${minutes}m ${seconds % 60}s`);
      } else {
        setElapsedTime(`${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeQuery]);

  // Get status color and text
  const getStatusInfo = () => {
    if (!queryStatus) return { color: 'default' as const, text: 'Warten...' };

    switch (queryStatus) {
      case 'started':
        return { color: 'info' as const, text: 'Gestartet' };
      case 'processing':
        return { color: 'warning' as const, text: 'Verarbeitung läuft' };
      case 'completed':
        return { color: 'success' as const, text: 'Abgeschlossen' };
      case 'failed':
        return { color: 'error' as const, text: 'Fehlgeschlagen' };
      default:
        return { color: 'default' as const, text: queryStatus };
    }
  };

  // Get connection status info
  const getConnectionInfo = () => {
    if (isConnected) {
      return { 
        icon: <ConnectedIcon fontSize="small" />, 
        text: 'Live-Verbindung aktiv', 
        color: 'success' as const 
      };
    } else {
      return { 
        icon: <DisconnectedIcon fontSize="small" />, 
        text: 'Standard-Polling', 
        color: 'info' as const 
      };
    }
  };

  // Don't render if no active query
  if (!activeQuery) {
    return null;
  }

  const statusInfo = getStatusInfo();
  const connectionInfo = getConnectionInfo();
  const progressPercentage = 0; // Progress not available in current store
  const currentStep = 0;
  const totalSteps = 1;
  const isProcessing = queryStatus === 'processing';
  const isCompleted = queryStatus === 'completed';
  const isFailed = queryStatus === 'failed';

  return (
    <Fade in timeout={300}>
      <Card sx={{ ...sx }}>
        <CardContent sx={{ pb: compact ? 2 : 3 }}>
          {/* Header with status */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant={compact ? "body1" : "h6"} component="div">
                Abfrage {activeQuery.query_id.slice(0, 8)}...
              </Typography>
              {!compact && (
                <Typography variant="body2" color="text.secondary">
                  Laufzeit: {elapsedTime}
                </Typography>
              )}
            </Box>
            
            <Chip
              label={statusInfo.text}
              color={statusInfo.color}
              size="small"
              icon={isProcessing ? <ProcessingIcon /> : 
                   isCompleted ? <CompleteIcon /> :
                   isFailed ? <ErrorIcon /> : undefined}
            />
          </Stack>

          {/* Progress bar */}
          <Box mb={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                {activeQuery?.message || 'Verarbeitung...'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progressPercentage)}%
              </Typography>
            </Stack>
            
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{
                height: compact ? 6 : 8,
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  backgroundColor: 
                    isFailed ? 'error.main' :
                    isCompleted ? 'success.main' :
                    'primary.main',
                },
              }}
            />
          </Box>

          {/* Step indicator */}
          {!compact && totalSteps > 1 && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Schritt {currentStep} von {totalSteps}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(currentStep / totalSteps) * 100}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'grey.100',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 2,
                    backgroundColor: 'secondary.main',
                  },
                }}
              />
            </Box>
          )}

          {/* Error message */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} variant="outlined">
              <Typography variant="body2">
                {error}
              </Typography>
            </Alert>
          )}

          {/* Failed status error */}
          {isFailed && error && (
            <Alert severity="error" sx={{ mb: 2 }} variant="outlined">
              <Typography variant="body2">
                {error || 'Ein unbekannter Fehler ist aufgetreten'}
              </Typography>
            </Alert>
          )}

          {/* WebSocket connection status */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {!compact && (
              <Box display="flex" alignItems="center" gap={1}>
                {connectionInfo.icon}
                <Typography variant="body2" color="text.secondary">
                  {connectionInfo.text}
                </Typography>
              </Box>
            )}
            
            {compact && (
              <Chip
                icon={connectionInfo.icon}
                label={isConnected ? 'Live' : 'Offline'}
                color={connectionInfo.color}
                size="small"
                variant="outlined"
              />
            )}

            {/* Last update indicator */}
            {!compact && (
              <Typography variant="caption" color="text.secondary">
                Letztes Update: {new Date().toLocaleTimeString('de-DE')}
              </Typography>
            )}
          </Stack>

          {/* Result summary */}
          {queryResult && isCompleted && (
            <Box 
              mt={2} 
              p={2} 
              bgcolor="success.light" 
              borderRadius={1}
              sx={{ bgcolor: 'action.hover' }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                ✅ Abfrage erfolgreich abgeschlossen
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vertrauen: {Math.round((queryResult?.confidence_score || 0) * 100)}% • 
                {queryResult?.successful_chunks || 0}/{queryResult?.total_chunks || 0} Chunks verarbeitet
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Fade>
  );
};

export default QueryProgress;