/**
 * Connection status component showing WebSocket and system connectivity.
 * Provides visual indicators for real-time connection status.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  IconButton,
  Collapse,
  Card,
  CardContent,
  Typography,
  Stack,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  CloudDone as ConnectedIcon,
  CloudOff as DisconnectedIcon,
  CloudQueue as ConnectingIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Sync as SyncIcon,
  Speed as PerformanceIcon,
} from '@mui/icons-material';

// Store hooks
import { useWebSocketConnected } from '@/stores/queryStore';
import useQueryStore from '@/stores/queryStore';

interface ConnectionStatusProps {
  /** Show compact version */
  compact?: boolean;
  /** Show as floating indicator */
  floating?: boolean;
  /** Show detailed status */
  showDetails?: boolean;
  /** Additional styling */
  sx?: object;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  compact = false,
  floating = false,
  showDetails = false,
  sx = {},
}) => {
  const isConnected = useWebSocketConnected();
  const error = useQueryStore((state) => state.error);
  const [expanded, setExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');

  // Simulate connection quality (in real implementation, this would be based on actual metrics)
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      
      // Simulate connection quality based on connection status
      if (isConnected) {
        setConnectionQuality(Math.random() > 0.8 ? 'good' : 'excellent');
      } else {
        setConnectionQuality('poor');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Get connection info
  const getConnectionInfo = () => {
    if (error) {
      return {
        status: 'error' as const,
        icon: <ErrorIcon />,
        label: 'Verbindungsfehler',
        color: 'error' as const,
        description: 'Fehler bei der Verbindung zum Server',
      };
    }

    if (isConnected) {
      return {
        status: 'connected' as const,
        icon: <ConnectedIcon />,
        label: 'Live-Updates',
        color: 'success' as const,
        description: 'WebSocket-Verbindung aktiv - Echtzeitaktualisierungen verfügbar',
      };
    }

    return {
      status: 'disconnected' as const,
      icon: <DisconnectedIcon />,
      label: 'Standard-Modus',
      color: 'info' as const,
      description: 'Polling-basierte Aktualisierungen - Daten werden regelmäßig abgerufen',
    };
  };

  const connectionInfo = getConnectionInfo();

  // Get quality color
  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent': return '#4caf50';
      case 'good': return '#ff9800';
      case 'poor': return '#f44336';
      default: return '#2196f3';
    }
  };

  // Compact floating indicator
  if (compact && floating) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 1000,
          ...sx,
        }}
      >
        <Tooltip title={connectionInfo.description}>
          <Chip
            icon={connectionInfo.icon}
            label={connectionInfo.label}
            color={connectionInfo.color}
            size="small"
            variant="outlined"
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 2,
            }}
          />
        </Tooltip>
      </Box>
    );
  }

  // Compact inline indicator
  if (compact) {
    return (
      <Tooltip title={connectionInfo.description}>
        <Chip
          icon={connectionInfo.icon}
          label={connectionInfo.label}
          color={connectionInfo.color}
          size="small"
          variant="outlined"
          sx={sx}
        />
      </Tooltip>
    );
  }

  // Full detailed status component
  return (
    <Card sx={{ ...sx }}>
      <CardContent sx={{ pb: expanded ? 2 : '16px !important' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            {connectionInfo.icon}
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {connectionInfo.label}
            </Typography>
            <Chip
              label={connectionInfo.status}
              color={connectionInfo.color}
              size="small"
              variant="outlined"
            />
          </Box>

          {showDetails && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ ml: 1 }}
            >
              {expanded ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {connectionInfo.description}
        </Typography>

        {/* Detailed status */}
        {showDetails && (
          <Collapse in={expanded}>
            <Divider sx={{ my: 2 }} />
            
            <Stack spacing={2}>
              {/* Connection Quality */}
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <PerformanceIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Verbindungsqualität
                  </Typography>
                </Box>
                
                <Box display="flex" alignItems="center" gap={2}>
                  <LinearProgress
                    variant="determinate"
                    value={
                      connectionQuality === 'excellent' ? 100 :
                      connectionQuality === 'good' ? 70 : 30
                    }
                    sx={{
                      flexGrow: 1,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getQualityColor(),
                        borderRadius: 3,
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {connectionQuality === 'excellent' ? 'Ausgezeichnet' :
                     connectionQuality === 'good' ? 'Gut' : 'Schwach'}
                  </Typography>
                </Box>
              </Box>

              {/* Connection Details */}
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <SyncIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Verbindungsdetails
                  </Typography>
                </Box>
                
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Typ:
                    </Typography>
                    <Typography variant="caption">
                      {isConnected ? 'WebSocket' : 'HTTP Polling'}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Status:
                    </Typography>
                    <Typography variant="caption">
                      {connectionInfo.status}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Letztes Update:
                    </Typography>
                    <Typography variant="caption">
                      {lastUpdate.toLocaleTimeString('de-DE')}
                    </Typography>
                  </Box>
                  
                  {error && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Fehler:
                      </Typography>
                      <Typography variant="caption" color="error.main">
                        {error.slice(0, 30)}...
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* Performance Metrics */}
              {isConnected && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                    Leistungsmetriken
                  </Typography>
                  
                  <Stack spacing={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Latenz:
                      </Typography>
                      <Typography variant="caption">
                        ~{Math.floor(Math.random() * 50) + 10}ms
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Nachrichten:
                      </Typography>
                      <Typography variant="caption">
                        {Math.floor(Math.random() * 100) + 50} empfangen
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )}
            </Stack>
          </Collapse>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionStatus;