/**
 * Offline indicator component
 * Shows network status, sync status, and PWA installation prompts
 */

import React, { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  WifiOff,
  Wifi,
  Sync,
  SyncDisabled,
  Download,
  Update,
  SignalWifi4Bar,
  SignalWifi3Bar,
  SignalWifi2Bar,
  SignalWifi1Bar,
  InstallMobile,
  Close,
} from '@mui/icons-material';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

interface OfflineIndicatorProps {
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  showSyncStatus?: boolean;
  showInstallPrompt?: boolean;
  autoHide?: boolean;
  hideDelay?: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  position = 'bottom-right',
  showSyncStatus = true,
  showInstallPrompt = true,
  autoHide = true,
  hideDelay = 5000,
}) => {
  const {
    isOnline,
    connectionQuality,
    networkStatus,
    pwaStatus,
    syncStats,
    isSync,
    forcSync,
    installPWA,
    updatePWA,
    retryLastAction,
  } = useNetworkStatus();

  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [installLoading, setInstallLoading] = useState(false);

  React.useEffect(() => {
    if (!isOnline) {
      setShowOfflineAlert(true);
    } else if (autoHide) {
      const timer = setTimeout(() => {
        setShowOfflineAlert(false);
      }, hideDelay);
      return () => clearTimeout(timer);
    }
  }, [isOnline, autoHide, hideDelay]);

  const getPositionStyles = () => {
    const base = {
      position: 'fixed' as const,
      zIndex: 1300,
    };

    switch (position) {
      case 'bottom-left':
        return { ...base, bottom: 16, left: 16 };
      case 'bottom-right':
        return { ...base, bottom: 16, right: 16 };
      case 'top-left':
        return { ...base, top: 16, left: 16 };
      case 'top-right':
        return { ...base, top: 16, right: 16 };
      default:
        return { ...base, bottom: 16, right: 16 };
    }
  };

  const getConnectionIcon = () => {
    if (!isOnline) return <WifiOff />;
    
    switch (connectionQuality) {
      case 'fast':
        return <SignalWifi4Bar />;
      case 'medium':
        return <SignalWifi3Bar />;
      case 'slow':
        return <SignalWifi2Bar />;
      default:
        return <SignalWifi1Bar />;
    }
  };

  const getConnectionColor = () => {
    if (!isOnline) return 'error';
    
    switch (connectionQuality) {
      case 'fast':
        return 'success';
      case 'medium':
        return 'info';
      case 'slow':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getSyncIcon = () => {
    if (!isOnline) return <SyncDisabled />;
    if (isSync) return <Sync className="animate-spin" />;
    if (syncStats.failedCount > 0) return <SyncDisabled color="error" />;
    return <Sync />;
  };

  const handleSyncClick = () => {
    setShowSyncDialog(true);
  };

  const handleForceSync = async () => {
    setSyncLoading(true);
    try {
      await forcSync();
    } finally {
      setSyncLoading(false);
      setShowSyncDialog(false);
    }
  };

  const handleInstallClick = () => {
    setShowInstallDialog(true);
  };

  const handleInstallPWA = async () => {
    setInstallLoading(true);
    try {
      await installPWA();
    } finally {
      setInstallLoading(false);
      setShowInstallDialog(false);
    }
  };

  const handleUpdatePWA = async () => {
    try {
      await updatePWA();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  return (
    <>
      {/* Network Status Indicator */}
      <Box sx={getPositionStyles()}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Connection Status */}
          <Tooltip 
            title={`${isOnline ? 'Online' : 'Offline'} - ${connectionQuality} connection`}
          >
            <Chip
              icon={getConnectionIcon()}
              label={isOnline ? connectionQuality : 'offline'}
              size="small"
              color={getConnectionColor() as any}
              variant={isOnline ? 'outlined' : 'filled'}
            />
          </Tooltip>

          {/* Sync Status */}
          {showSyncStatus && (
            <Tooltip 
              title={`${syncStats.pendingCount} pending, ${syncStats.failedCount} failed`}
            >
              <IconButton
                size="small"
                onClick={handleSyncClick}
                color={syncStats.failedCount > 0 ? 'error' : 'default'}
              >
                {getSyncIcon()}
              </IconButton>
            </Tooltip>
          )}

          {/* PWA Install Prompt */}
          {showInstallPrompt && pwaStatus.isInstallable && (
            <Tooltip title="Install app">
              <IconButton
                size="small"
                onClick={handleInstallClick}
                color="primary"
              >
                <InstallMobile />
              </IconButton>
            </Tooltip>
          )}

          {/* PWA Update Available */}
          {pwaStatus.updateAvailable && (
            <Tooltip title="Update available">
              <IconButton
                size="small"
                onClick={handleUpdatePWA}
                color="warning"
              >
                <Update />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Offline Alert */}
      <Snackbar
        open={showOfflineAlert}
        autoHideDuration={autoHide ? hideDelay : null}
        onClose={() => setShowOfflineAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowOfflineAlert(false)}
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={retryLastAction}
              disabled={!isOnline}
            >
              Retry
            </Button>
          }
        >
          {isOnline ? 'Connection restored' : 'You are offline. Some features may not work.'}
        </Alert>
      </Snackbar>

      {/* Sync Status Dialog */}
      <Dialog
        open={showSyncDialog}
        onClose={() => setShowSyncDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Background Sync Status
          <IconButton
            onClick={() => setShowSyncDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemIcon>
                <Sync />
              </ListItemIcon>
              <ListItemText
                primary={`${syncStats.pendingCount} operations pending`}
                secondary="Waiting to sync when online"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Download />
              </ListItemIcon>
              <ListItemText
                primary={`${syncStats.completedCount} operations completed`}
                secondary="Successfully synchronized"
              />
            </ListItem>
            {syncStats.failedCount > 0 && (
              <ListItem>
                <ListItemIcon>
                  <SyncDisabled color="error" />
                </ListItemIcon>
                <ListItemText
                  primary={`${syncStats.failedCount} operations failed`}
                  secondary="Will retry automatically"
                />
              </ListItem>
            )}
          </List>
          
          {syncStats.lastSyncTime > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Last sync: {new Date(syncStats.lastSyncTime).toLocaleString()}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSyncDialog(false)}>
            Close
          </Button>
          <Button
            onClick={handleForceSync}
            disabled={!isOnline || syncLoading}
            startIcon={syncLoading ? <CircularProgress size={16} /> : <Sync />}
          >
            Force Sync
          </Button>
        </DialogActions>
      </Dialog>

      {/* Install PWA Dialog */}
      <Dialog
        open={showInstallDialog}
        onClose={() => setShowInstallDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Install IFC JSON Chunking App
          <IconButton
            onClick={() => setShowInstallDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Install this app on your device for:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <WifiOff />
              </ListItemIcon>
              <ListItemText primary="Offline access to cached data" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Sync />
              </ListItemIcon>
              <ListItemText primary="Background sync when online" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Download />
              </ListItemIcon>
              <ListItemText primary="Faster loading times" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InstallMobile />
              </ListItemIcon>
              <ListItemText primary="Native app experience" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInstallDialog(false)}>
            Not Now
          </Button>
          <Button
            onClick={handleInstallPWA}
            disabled={installLoading}
            startIcon={installLoading ? <CircularProgress size={16} /> : <InstallMobile />}
            variant="contained"
          >
            Install App
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OfflineIndicator;