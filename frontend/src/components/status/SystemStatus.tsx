/**
 * System status component showing overall application health.
 * Includes connection status, query processing status, and system performance.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Popover,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Divider,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  HealthAndSafety as SystemIcon,
  Circle as StatusDotIcon,
  Memory as MemoryIcon,
  Speed as PerformanceIcon,
  QueryStats as QueryIcon,
  CloudDone as ConnectedIcon,
  CloudOff as DisconnectedIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

// Store hooks
import { useWebSocketConnected, useQueryMonitoring } from '@/stores/queryStore';
import useQueryStore from '@/stores/queryStore';

// Components
import ConnectionStatus from './ConnectionStatus';

interface SystemStatusProps {
  /** Show as floating button */
  floating?: boolean;
  /** Additional styling */
  sx?: object;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'error';
  connection: 'good' | 'degraded' | 'failed';
  performance: 'optimal' | 'slow' | 'poor';
  queries: 'normal' | 'busy' | 'overloaded';
}

const SystemStatus: React.FC<SystemStatusProps> = ({
  floating = false,
  sx = {},
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 'healthy',
    connection: 'good',
    performance: 'optimal',
    queries: 'normal',
  });

  // Store state
  const isConnected = useWebSocketConnected();
  const { activeQuery, status } = useQueryMonitoring();
  const error = useQueryStore((state) => state.error);
  const isSubmitting = useQueryStore((state) => state.isSubmitting);

  // Update system health based on various factors
  useEffect(() => {
    const updateHealth = () => {
      const health: SystemHealth = {
        overall: 'healthy',
        connection: isConnected ? 'good' : 'degraded',
        performance: 'optimal',
        queries: 'normal',
      };

      // Check connection health
      if (error) {
        health.connection = 'failed';
      }

      // Check query processing health
      if (activeQuery && status) {
        if (status.status === 'failed') {
          health.queries = 'overloaded';
        } else if (isSubmitting || status.status === 'processing') {
          health.queries = 'busy';
        }
      }

      // Simulate performance metrics (in real app, use actual metrics)
      const performanceScore = Math.random();
      if (performanceScore < 0.3) {
        health.performance = 'poor';
      } else if (performanceScore < 0.7) {
        health.performance = 'slow';
      }

      // Determine overall health
      if (health.connection === 'failed' || health.performance === 'poor' || health.queries === 'overloaded') {
        health.overall = 'error';
      } else if (health.connection === 'degraded' || health.performance === 'slow' || health.queries === 'busy') {
        health.overall = 'warning';
      }

      setSystemHealth(health);
    };

    updateHealth();
    const interval = setInterval(updateHealth, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [isConnected, error, activeQuery, status, isSubmitting]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  // Get overall status color and icon
  const getStatusInfo = () => {
    switch (systemHealth.overall) {
      case 'healthy':
        return {
          color: '#4caf50',
          icon: <SystemIcon sx={{ color: '#4caf50' }} />,
          label: 'System läuft normal',
        };
      case 'warning':
        return {
          color: '#ff9800',
          icon: <WarningIcon sx={{ color: '#ff9800' }} />,
          label: 'System-Warnung',
        };
      case 'error':
        return {
          color: '#f44336',
          icon: <WarningIcon sx={{ color: '#f44336' }} />,
          label: 'System-Fehler',
        };
      default:
        return {
          color: '#2196f3',
          icon: <SystemIcon sx={{ color: '#2196f3' }} />,
          label: 'System-Status',
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Get health score
  const getHealthScore = () => {
    const scores = {
      connection: systemHealth.connection === 'good' ? 100 : systemHealth.connection === 'degraded' ? 60 : 20,
      performance: systemHealth.performance === 'optimal' ? 100 : systemHealth.performance === 'slow' ? 60 : 20,
      queries: systemHealth.queries === 'normal' ? 100 : systemHealth.queries === 'busy' ? 70 : 30,
    };

    return Math.round((scores.connection + scores.performance + scores.queries) / 3);
  };

  const healthScore = getHealthScore();

  return (
    <>
      {/* Status button */}
      <IconButton
        onClick={handleClick}
        sx={{
          position: floating ? 'fixed' : 'relative',
          bottom: floating ? 24 : 'auto',
          left: floating ? 24 : 'auto',
          zIndex: floating ? 1000 : 'auto',
          backgroundColor: floating ? 'background.paper' : 'transparent',
          boxShadow: floating ? 2 : 0,
          border: `2px solid ${statusInfo.color}`,
          '&:hover': {
            backgroundColor: floating ? 'action.hover' : 'action.hover',
          },
          ...sx,
        }}
        size="small"
      >
        {statusInfo.icon}
        <StatusDotIcon
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            fontSize: 8,
            color: statusInfo.color,
          }}
        />
      </IconButton>

      {/* Status popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Card sx={{ width: 350, maxWidth: '90vw' }}>
          <CardContent>
            {/* Header */}
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              {statusInfo.icon}
              <Box>
                <Typography variant="h6">
                  System-Status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {statusInfo.label}
                </Typography>
              </Box>
              <Box ml="auto">
                <Chip
                  label={`${healthScore}%`}
                  color={healthScore > 80 ? 'success' : healthScore > 60 ? 'warning' : 'error'}
                  size="small"
                />
              </Box>
            </Box>

            {/* Overall health indicator */}
            <Box mb={3}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                Systemzustand
              </Typography>
              <LinearProgress
                variant="determinate"
                value={healthScore}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: statusInfo.color,
                  },
                }}
              />
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Component statuses */}
            <Stack spacing={2}>
              {/* Connection Status */}
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {isConnected ? <ConnectedIcon fontSize="small" /> : <DisconnectedIcon fontSize="small" />}
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Verbindung
                  </Typography>
                  <Chip
                    label={
                      systemHealth.connection === 'good' ? 'Gut' :
                      systemHealth.connection === 'degraded' ? 'Beeinträchtigt' : 'Fehler'
                    }
                    color={
                      systemHealth.connection === 'good' ? 'success' :
                      systemHealth.connection === 'degraded' ? 'warning' : 'error'
                    }
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <ConnectionStatus compact={true} />
              </Box>

              {/* Performance Status */}
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <PerformanceIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Leistung
                  </Typography>
                  <Chip
                    label={
                      systemHealth.performance === 'optimal' ? 'Optimal' :
                      systemHealth.performance === 'slow' ? 'Langsam' : 'Schlecht'
                    }
                    color={
                      systemHealth.performance === 'optimal' ? 'success' :
                      systemHealth.performance === 'slow' ? 'warning' : 'error'
                    }
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Antwortzeit: ~{Math.floor(Math.random() * 200) + 50}ms
                </Typography>
              </Box>

              {/* Query Processing Status */}
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <QueryIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Abfrageverarbeitung
                  </Typography>
                  <Chip
                    label={
                      systemHealth.queries === 'normal' ? 'Normal' :
                      systemHealth.queries === 'busy' ? 'Beschäftigt' : 'Überlastet'
                    }
                    color={
                      systemHealth.queries === 'normal' ? 'success' :
                      systemHealth.queries === 'busy' ? 'warning' : 'error'
                    }
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {activeQuery ? `Aktive Abfrage: ${activeQuery.query_id.slice(0, 8)}...` : 'Keine aktiven Abfragen'}
                </Typography>
              </Box>
            </Stack>

            {/* Error alerts */}
            {error && (
              <>
                <Divider sx={{ my: 2 }} />
                <Alert severity="error" variant="outlined">
                  <Typography variant="body2">
                    {error}
                  </Typography>
                </Alert>
              </>
            )}

            {/* System warnings */}
            {systemHealth.overall === 'warning' && !error && (
              <>
                <Divider sx={{ my: 2 }} />
                <Alert severity="warning" variant="outlined">
                  <Typography variant="body2">
                    Das System läuft mit eingeschränkter Leistung.
                  </Typography>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>
      </Popover>
    </>
  );
};

export default SystemStatus;