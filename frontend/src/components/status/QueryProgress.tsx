/**
 * Query progress component - displays real-time query execution progress.
 * Enhanced with WebSocket integration for live updates.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Alert,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

// Services
import { connectionManager } from '@services/connectionManager';

// Store
import { useQueryStore } from '@stores/queryStore';

// Types
import type { ProgressMessage, ErrorMessage, CompletionMessage } from '@/types/api';

interface QueryProgressProps {
  compact?: boolean;
  queryId?: string;
}

interface ProgressStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  message?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

const QueryProgress: React.FC<QueryProgressProps> = ({
  compact = false,
  queryId,
}) => {
  const { activeQuery } = useQueryStore();
  const [expanded, setExpanded] = useState(!compact);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [overallProgress, setOverallProgress] = useState(0);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentQueryId = queryId || activeQuery?.query_id;

  useEffect(() => {
    if (!currentQueryId) return;

    const startMonitoring = async () => {
      try {
        await connectionManager.startMonitoring({
          queryId: currentQueryId,
          onProgress: handleProgress,
          onError: handleError,
          onCompletion: handleCompletion,
          onStatusChange: setConnectionStatus,
        });
      } catch (error) {
        console.error('Failed to start query monitoring:', error);
      }
    };

    startMonitoring();

    return () => {
      connectionManager.stopMonitoring(currentQueryId);
    };
  }, [currentQueryId]);

  const handleProgress = (progress: ProgressMessage) => {
    setOverallProgress(progress.progress_percent || 0);
    setStatusMessage(progress.message || '');

    // Update steps if provided
    if (progress.steps) {
      setSteps(progress.steps.map(step => ({
        name: step.name,
        status: step.status as ProgressStep['status'],
        progress: step.progress_percent,
        message: step.message,
        startTime: step.start_time ? new Date(step.start_time) : undefined,
        endTime: step.end_time ? new Date(step.end_time) : undefined,
      })));
    }
  };

  const handleError = (error: ErrorMessage) => {
    setErrorMessage(error.message);
    setConnectionStatus('error');
  };

  const handleCompletion = (completion: CompletionMessage) => {
    setOverallProgress(100);
    setStatusMessage('Abfrage erfolgreich abgeschlossen');
    
    // Mark all steps as completed
    setSteps(prev => prev.map(step => ({
      ...step,
      status: 'completed',
      progress: 100,
      endTime: new Date(),
    })));

    // Auto-collapse after completion if compact mode
    if (compact) {
      setTimeout(() => setExpanded(false), 3000);
    }
  };

  const getStatusIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return <CompleteIcon color="success" />;
      case 'running':
        return <PlayIcon color="primary" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const getStatusColor = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'primary';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getConnectionStatusColor = () => {
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

  if (!currentQueryId) {
    return null;
  }

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: compact ? 1 : 2 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant={compact ? "subtitle2" : "h6"}>
            Abfrage-Fortschritt
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={connectionStatus}
              color={getConnectionStatusColor()}
              size="small"
              variant="outlined"
            />
            {steps.length > 0 && (
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Stack>
        </Box>

        {/* Overall progress */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Gesamt-Fortschritt
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {Math.round(overallProgress)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={overallProgress} 
            sx={{ height: compact ? 4 : 8, borderRadius: 2 }}
          />
          {statusMessage && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {statusMessage}
            </Typography>
          )}
        </Box>

        {/* Error message */}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}

        {/* Detailed steps */}
        <Collapse in={expanded && steps.length > 0}>
          <List dense={compact}>
            {steps.map((step, index) => (
              <ListItem key={index} divider={index < steps.length - 1}>
                <ListItemIcon>
                  {getStatusIcon(step.status)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant={compact ? "body2" : "subtitle2"}>
                        {step.name}
                      </Typography>
                      <Chip
                        label={step.status}
                        color={getStatusColor(step.status)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      {step.message && (
                        <Typography variant="caption" display="block">
                          {step.message}
                        </Typography>
                      )}
                      {step.progress !== undefined && (
                        <Box mt={0.5}>
                          <LinearProgress 
                            variant="determinate" 
                            value={step.progress} 
                            size="small"
                            sx={{ height: 3 }}
                          />
                        </Box>
                      )}
                      {step.error && (
                        <Typography variant="caption" color="error" display="block">
                          {step.error}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default QueryProgress;