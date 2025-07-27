/**
 * Enhanced Offline Indicator Component
 * Integrates PWA features with network status and offline capabilities
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
  Badge,
  Alert,
  Button,
} from '@mui/material';
import {
  CloudDone as OnlineIcon,
  CloudOff as OfflineIcon,
  CloudQueue as ReconnectingIcon,
  Storage as CacheIcon,
  Sync as SyncIcon,
  SyncDisabled as SyncPausedIcon,
  WifiOff as NoConnectionIcon,
  Speed as PerformanceIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

// Hooks and services
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { serviceWorkerManager } from '@services/serviceWorker';
import type { ServiceWorkerStatus } from '@services/serviceWorker';

interface OfflineIndicatorProps {
  /** Show compact version */
  compact?: boolean;
  /** Show as floating indicator */
  floating?: boolean;
  /** Show detailed offline capabilities */
  showDetails?: boolean;
  /** Show sync status */
  showSyncStatus?: boolean;
  /** Additional styling */
  sx?: object;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  compact = false,
  floating = false,
  showDetails = false,
  showSyncStatus = true,
  sx = {},
}) => {
  const networkStatus = useNetworkStatus();
  const [expanded, setExpanded] = useState(false);
  const [pwaStatus, setPwaStatus] = useState<ServiceWorkerStatus>({
    isRegistered: false,
    isInstallable: false,
    updateAvailable: false,
    isControlling: false,
    hasError: false,
  });
  const [cacheStatus, setCacheStatus] = useState({
    isAvailable: false,
    size: 0,
    entriesCount: 0,
    lastUpdate: new Date(),
  });
  const [syncQueue, setSyncQueue] = useState({
    pending: 0,
    failed: 0,
    isActive: false,
  });

  // Track PWA status
  useEffect(() => {
    const unsubscribe = serviceWorkerManager.onStatusChange((status) => {
      setPwaStatus(status);
    });

    // Initial status
    setPwaStatus(serviceWorkerManager.getStatus());

    return unsubscribe;
  }, []);

  // Simulate cache and sync status (in real implementation, these would come from actual services)
  useEffect(() => {
    const updateCacheStatus = async () => {
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          const ifcCaches = cacheNames.filter(name => name.startsWith('ifc-chunking-'));
          
          if (ifcCaches.length > 0) {
            // Estimate cache size (simplified)
            const cache = await caches.open(ifcCaches[0]);
            const keys = await cache.keys();
            
            setCacheStatus({
              isAvailable: true,
              size: keys.length * 1024, // Rough estimate
              entriesCount: keys.length,
              lastUpdate: new Date(),
            });
          }
        } catch (error) {
          console.error('Failed to check cache status:', error);
        }
      }
    };

    // Simulate sync queue status
    const updateSyncStatus = () => {
      setSyncQueue({
        pending: networkStatus.isOnline ? 0 : Math.floor(Math.random() * 3),
        failed: 0,
        isActive: networkStatus.isOnline && Math.random() > 0.7,
      });
    };

    updateCacheStatus();
    updateSyncStatus();

    const interval = setInterval(() => {
      updateCacheStatus();
      updateSyncStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [networkStatus.isOnline]);

  // Get comprehensive status info
  const getStatusInfo = () => {
    const isOnline = networkStatus.isOnline;
    const hasCache = cacheStatus.isAvailable;
    const hasPendingSync = syncQueue.pending > 0;

    if (!isOnline && hasCache) {
      return {
        status: 'offline-cached' as const,
        icon: <CacheIcon />,
        label: 'Offline (Cache verfügbar)',
        color: 'warning' as const,
        description: `Offline-Modus mit ${cacheStatus.entriesCount} gespeicherten Einträgen`,
        severity: 'warning' as const,
      };
    }

    if (!isOnline && !hasCache) {
      return {
        status: 'offline-no-cache' as const,
        icon: <NoConnectionIcon />,
        label: 'Offline',
        color: 'error' as const,
        description: 'Keine Internetverbindung und keine gespeicherten Daten verfügbar',
        severity: 'error' as const,
      };
    }

    if (isOnline && hasPendingSync) {
      return {
        status: 'online-syncing' as const,
        icon: <SyncIcon />,
        label: 'Online (Synchronisiert)',
        color: 'info' as const,
        description: `${syncQueue.pending} ausstehende Synchronisierungen`,
        severity: 'info' as const,
      };
    }

    return {
      status: 'online' as const,
      icon: <OnlineIcon />,
      label: 'Online',
      color: 'success' as const,
      description: 'Vollständige Internetverbindung verfügbar',
      severity: 'success' as const,
    };
  };

  const statusInfo = getStatusInfo();

  // Handle manual sync
  const handleManualSync = async () => {
    try {
      // Trigger background sync if available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        await navigator.serviceWorker.ready;
        if ('sync' in window.ServiceWorkerRegistration.prototype) {
          // @ts-ignore - sync API might not be available in all browsers
          await navigator.serviceWorker.ready.then(reg => reg.sync.register('manual-sync'));
        }
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  // Handle cache refresh
  const handleCacheRefresh = async () => {
    try {
      await serviceWorkerManager.checkForUpdates();
    } catch (error) {
      console.error('Cache refresh failed:', error);
    }
  };

  // Format cache size
  const formatCacheSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Compact floating indicator
  if (compact && floating) {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          ...sx,
        }}
      >
        <Tooltip title={statusInfo.description}>
          <Badge
            badgeContent={syncQueue.pending > 0 ? syncQueue.pending : undefined}
            color="error"
            max={99}
          >
            <Chip
              icon={statusInfo.icon}
              label={statusInfo.label}
              color={statusInfo.color}
              size="small"
              variant="filled"
              sx={{
                backgroundColor: statusInfo.color === 'warning' ? 'warning.main' : undefined,
                color: statusInfo.color === 'warning' ? 'warning.contrastText' : undefined,
                boxShadow: 3,
              }}
            />
          </Badge>
        </Tooltip>
      </Box>
    );
  }

  // Compact inline indicator
  if (compact) {
    return (
      <Tooltip title={statusInfo.description}>
        <Badge
          badgeContent={syncQueue.pending > 0 ? syncQueue.pending : undefined}
          color="error"
          max={99}
        >
          <Chip
            icon={statusInfo.icon}
            label={statusInfo.label}
            color={statusInfo.color}
            size="small"
            variant="outlined"
            sx={sx}
          />
        </Badge>
      </Tooltip>
    );
  }

  // Full detailed status component
  return (
    <Card sx={{ ...sx }}>
      <CardContent sx={{ pb: expanded ? 2 : '16px !important' }}>
        {/* Status Alert */}
        {(!networkStatus.isOnline || syncQueue.pending > 0) && (
          <Alert 
            severity={statusInfo.severity} 
            variant="outlined" 
            sx={{ mb: 2 }}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                {!networkStatus.isOnline && cacheStatus.isAvailable && (
                  <Button size="small" startIcon={<RefreshIcon />} onClick={handleCacheRefresh}>
                    Aktualisieren
                  </Button>
                )}
                {syncQueue.pending > 0 && (
                  <Button size="small" startIcon={<SyncIcon />} onClick={handleManualSync}>
                    Sync
                  </Button>
                )}
              </Box>
            }
          >
            <Typography variant="body2">
              {statusInfo.description}
            </Typography>
          </Alert>
        )}

        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Badge
              badgeContent={syncQueue.pending > 0 ? syncQueue.pending : undefined}
              color="error"
              max={99}
            >
              {statusInfo.icon}
            </Badge>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {statusInfo.label}
            </Typography>
            <Chip
              label={networkStatus.connectionType || 'unknown'}
              size="small"
              variant="outlined"
              sx={{ textTransform: 'uppercase' }}
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

        {/* Connection Quality */}
        {networkStatus.isOnline && (
          <Box sx={{ mt: 2 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <PerformanceIcon fontSize="small" color="action" />
              <LinearProgress
                variant="determinate"
                value={networkStatus.effectiveType === '4g' ? 100 : 
                       networkStatus.effectiveType === '3g' ? 70 : 30}
                sx={{
                  flexGrow: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'grey.200',
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {networkStatus.effectiveType?.toUpperCase() || 'N/A'}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Detailed status */}
        {showDetails && (
          <Collapse in={expanded}>
            <Divider sx={{ my: 2 }} />
            
            <Stack spacing={2}>
              {/* Network Details */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  Netzwerk
                </Typography>
                
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Status:
                    </Typography>
                    <Typography variant="caption">
                      {networkStatus.isOnline ? 'Online' : 'Offline'}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Verbindungstyp:
                    </Typography>
                    <Typography variant="caption">
                      {networkStatus.connectionType || 'Unbekannt'}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Effektiver Typ:
                    </Typography>
                    <Typography variant="caption">
                      {networkStatus.effectiveType || 'N/A'}
                    </Typography>
                  </Box>
                  
                  {networkStatus.downlink && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Downlink:
                      </Typography>
                      <Typography variant="caption">
                        {networkStatus.downlink.toFixed(1)} Mbps
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* PWA Status */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  PWA-Status
                </Typography>
                
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Service Worker:
                    </Typography>
                    <Typography variant="caption">
                      {pwaStatus.isRegistered ? 'Aktiv' : 'Nicht registriert'}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Installierbar:
                    </Typography>
                    <Typography variant="caption">
                      {pwaStatus.isInstallable ? 'Ja' : 'Nein'}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Update verfügbar:
                    </Typography>
                    <Typography variant="caption">
                      {pwaStatus.updateAvailable ? 'Ja' : 'Nein'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Cache Status */}
              {cacheStatus.isAvailable && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                    Cache-Status
                  </Typography>
                  
                  <Stack spacing={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Einträge:
                      </Typography>
                      <Typography variant="caption">
                        {cacheStatus.entriesCount}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Geschätzte Größe:
                      </Typography>
                      <Typography variant="caption">
                        {formatCacheSize(cacheStatus.size)}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Letztes Update:
                      </Typography>
                      <Typography variant="caption">
                        {cacheStatus.lastUpdate.toLocaleTimeString('de-DE')}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )}

              {/* Sync Status */}
              {showSyncStatus && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                    Synchronisation
                  </Typography>
                  
                  <Stack spacing={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Status:
                      </Typography>
                      <Typography variant="caption">
                        {syncQueue.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Ausstehend:
                      </Typography>
                      <Typography variant="caption">
                        {syncQueue.pending}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Fehlgeschlagen:
                      </Typography>
                      <Typography variant="caption">
                        {syncQueue.failed}
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

export default OfflineIndicator;