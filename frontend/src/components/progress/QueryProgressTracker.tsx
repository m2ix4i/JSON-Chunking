/**
 * Real-time query progress tracking component with WebSocket integration.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Button,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Autorenew as ProcessingIcon,
  Assessment as AnalysisIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Timeline as ProgressIcon,
} from '@mui/icons-material';

// Store hooks
import { useActiveQueries, useQueryMonitoring } from '@stores/queryStore';
import { showErrorNotification, showSuccessNotification } from '@stores/appStore';

// Types
import type { ActiveQuery } from '@/types/app';
import type { ProgressMessage, WebSocketMessage } from '@/types/api';

interface QueryProgressTrackerProps {
  queryId?: string;
  compact?: boolean;
  showAllQueries?: boolean;
}

const QueryProgressTracker: React.FC<QueryProgressTrackerProps> = ({
  queryId,
  compact = false,
  showAllQueries = false,
}) => {
  const activeQueries = useActiveQueries();
  const { cancelQuery, getQueryResult } = useQueryMonitoring();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Get queries to display
  const queriesToShow = queryId
    ? activeQueries[queryId]
      ? [activeQueries[queryId]]
      : []
    : showAllQueries
    ? Object.values(activeQueries)
    : Object.values(activeQueries).slice(0, 3); // Show max 3 queries in compact mode

  const getStepLabel = (stepIndex: number): string => {
    const stepLabels = [
      'Vorverarbeitung',
      'Chunk-Erstellung',
      'LLM-Verarbeitung',
      'Ergebnis-Aggregation',
    ];
    return stepLabels[stepIndex] || `Schritt ${stepIndex + 1}`;
  };

  const getStepIcon = (stepIndex: number, isActive: boolean, isCompleted: boolean) => {
    if (isCompleted) {
      return <CompleteIcon color="success" />;
    }
    if (isActive) {
      return <CircularProgress size={24} />;
    }

    const icons = [StartIcon, ProcessingIcon, AnalysisIcon, CompleteIcon];
    const IconComponent = icons[stepIndex] || ProcessingIcon;
    return <IconComponent color="disabled" />;
  };

  const getStatusChip = (query: ActiveQuery) => {
    const status = query.status.status;
    
    switch (status) {
      case 'started':
        return <Chip label="Gestartet" color="info" size="small" />;
      case 'preprocessing':
        return <Chip label="Vorverarbeitung" color="primary" size="small" />;
      case 'processing':
        return <Chip label="Verarbeitung" color="warning" size="small" />;
      case 'completed':
        return <Chip label="Abgeschlossen" color="success" size="small" />;
      case 'failed':
        return <Chip label="Fehlgeschlagen" color="error" size="small" />;
      case 'cancelled':
        return <Chip label="Abgebrochen" color="default" size="small" />;
      default:
        return <Chip label={status} color="default" size="small" />;
    }
  };

  const handleCancelQuery = async (queryId: string) => {
    try {
      await cancelQuery(queryId);
      showSuccessNotification('Abfrage wurde abgebrochen');
    } catch (error) {
      showErrorNotification('Abbruch fehlgeschlagen');
    }
  };

  const handleRefreshResult = async (queryId: string) => {
    try {
      await getQueryResult(queryId);
      showSuccessNotification('Ergebnis wurde aktualisiert');
    } catch (error) {
      showErrorNotification('Aktualisierung fehlgeschlagen');
    }
  };

  const formatElapsedTime = (startTime: Date): string => {
    const elapsed = Date.now() - startTime.getTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Update timer
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (queriesToShow.length === 0) {
    return compact ? null : (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <ProgressIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Keine aktiven Abfragen
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Starten Sie eine neue Abfrage, um den Fortschritt hier zu verfolgen.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const renderQueryProgress = (query: ActiveQuery) => {
    const isCompleted = ['completed', 'failed', 'cancelled'].includes(query.status.status);
    const canCancel = ['started', 'preprocessing', 'processing'].includes(query.status.status);

    return (
      <Card key={query.queryId} sx={{ mb: compact ? 1 : 2 }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" component="div">
                Abfrage {query.queryId.slice(0, 8)}...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Laufzeit: {formatElapsedTime(query.startTime)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getStatusChip(query)}
              
              {canCancel && (
                <Tooltip title="Abfrage abbrechen">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleCancelQuery(query.queryId)}
                  >
                    <CancelIcon />
                  </IconButton>
                </Tooltip>
              )}
              
              {query.status.status === 'completed' && (
                <Tooltip title="Ergebnis aktualisieren">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleRefreshResult(query.queryId)}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Progress bar */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {query.status.message}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(query.status.progress_percentage)}%
              </Typography>
            </Box>
            
            <LinearProgress
              variant="determinate"
              value={query.status.progress_percentage}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  backgroundColor: 
                    query.status.status === 'failed' ? 'error.main' :
                    query.status.status === 'completed' ? 'success.main' :
                    'primary.main',
                },
              }}
            />
          </Box>

          {/* Error message */}
          {query.status.status === 'failed' && query.status.error_message && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {query.status.error_message}
              </Typography>
            </Alert>
          )}

          {/* WebSocket connection status */}
          {!compact && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                WebSocket:
              </Typography>
              <Chip
                label={query.websocketConnected ? 'Verbunden' : 'Getrennt'}
                color={query.websocketConnected ? 'success' : 'warning'}
                size="small"
                variant="outlined"
              />
            </Box>
          )}

          {/* Detailed steps (non-compact mode) */}
          {!compact && (
            <Stepper activeStep={query.status.current_step} orientation="vertical">
              {Array.from({ length: query.status.total_steps }).map((_, index) => {
                const isActive = index === query.status.current_step;
                const isCompleted = index < query.status.current_step;
                
                return (
                  <Step key={index} completed={isCompleted}>
                    <StepLabel
                      icon={getStepIcon(index, isActive, isCompleted)}
                      sx={{
                        '& .MuiStepLabel-label': {
                          fontSize: '0.875rem',
                          fontWeight: isActive ? 600 : 400,
                        },
                      }}
                    >
                      {getStepLabel(index)}
                    </StepLabel>
                    
                    {isActive && (
                      <StepContent>
                        <Typography variant="body2" color="text.secondary">
                          {query.status.message}
                        </Typography>
                      </StepContent>
                    )}
                  </Step>
                );
              })}
            </Stepper>
          )}

          {/* Result preview */}
          {query.result && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Ergebnis verfügbar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vertrauen: {Math.round(query.result.confidence_score * 100)}% • 
                {query.result.successful_chunks}/{query.result.total_chunks} Chunks verarbeitet
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {!compact && (
        <Typography variant="h6" gutterBottom>
          Aktive Abfragen ({queriesToShow.length})
        </Typography>
      )}
      
      {queriesToShow.map(renderQueryProgress)}
    </Box>
  );
};

export default QueryProgressTracker;