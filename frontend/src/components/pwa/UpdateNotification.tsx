/**
 * Service Worker Update Notification Component
 * Notifies users when app updates are available and handles update process
 */

import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Button,
  Box,
  Typography,
  IconButton,
  Backdrop,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  SystemUpdate as UpdateIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

// Services
import { serviceWorkerManager } from '@services/serviceWorker';
import type { ServiceWorkerStatus } from '@services/serviceWorker';

interface UpdateNotificationProps {
  /** Position of the notification */
  position?: 'top' | 'bottom';
  /** Auto-hide duration in milliseconds */
  autoHideDuration?: number;
  /** Show detailed update dialog */
  showDialog?: boolean;
  /** Callback when update is applied */
  onUpdateApplied?: () => void;
  /** Callback when update is dismissed */
  onUpdateDismissed?: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  position = 'bottom',
  autoHideDuration,
  showDialog = false,
  onUpdateApplied,
  onUpdateDismissed,
}) => {
  // Component state
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'available' | 'installing' | 'success' | 'error'>('available');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pwaStatus, setPwaStatus] = useState<ServiceWorkerStatus>({
    isRegistered: false,
    isInstallable: false,
    updateAvailable: false,
    isControlling: false,
    hasError: false,
  });

  // Track PWA status changes
  useEffect(() => {
    const unsubscribe = serviceWorkerManager.onStatusChange((status) => {
      setPwaStatus(status);
      
      // Show notification when update is available
      if (status.updateAvailable && !isVisible) {
        setIsVisible(true);
        if (showDialog) {
          setDialogOpen(true);
        }
      }
    });

    // Initial status check
    setPwaStatus(serviceWorkerManager.getStatus());

    return unsubscribe;
  }, [isVisible, showDialog]);

  // Handle update button click
  const handleUpdate = async () => {
    setIsUpdating(true);
    setUpdateStatus('installing');
    
    try {
      await serviceWorkerManager.update();
      setUpdateStatus('success');
      onUpdateApplied?.();
      
      // Hide notification and reload page after short delay
      setTimeout(() => {
        setIsVisible(false);
        setDialogOpen(false);
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Update failed:', error);
      setUpdateStatus('error');
      
      // Reset status after error display
      setTimeout(() => {
        setUpdateStatus('available');
        setIsUpdating(false);
      }, 3000);
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    setDialogOpen(false);
    onUpdateDismissed?.();
  };

  // Don't render if no update available
  if (!pwaStatus.updateAvailable && updateStatus === 'available') {
    return null;
  }

  // Update dialog
  if (showDialog && dialogOpen) {
    return (
      <>
        <Dialog
          open={dialogOpen}
          onClose={!isUpdating ? handleDismiss : undefined}
          aria-labelledby="update-dialog-title"
          aria-describedby="update-dialog-description"
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle id="update-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UpdateIcon color="primary" />
            App-Update verfügbar
          </DialogTitle>
          
          <DialogContent>
            <DialogContentText id="update-dialog-description">
              Eine neue Version der IFC Chunking App ist verfügbar. Das Update enthält 
              Verbesserungen und neue Funktionen.
            </DialogContentText>
            
            {updateStatus === 'installing' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">
                  Update wird installiert...
                </Typography>
              </Box>
            )}
            
            {updateStatus === 'success' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <SuccessIcon color="success" />
                <Typography variant="body2" color="success.main">
                  Update erfolgreich! Die App wird neu geladen...
                </Typography>
              </Box>
            )}
            
            {updateStatus === 'error' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Update fehlgeschlagen. Versuchen Sie es später erneut oder laden Sie die Seite manuell neu.
              </Alert>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button 
              onClick={handleDismiss} 
              disabled={isUpdating}
              color="inherit"
            >
              Später
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isUpdating || updateStatus === 'success'}
              variant="contained"
              startIcon={updateStatus === 'installing' ? <CircularProgress size={16} /> : <DownloadIcon />}
            >
              {updateStatus === 'installing' ? 'Installiert...' : 'Jetzt updaten'}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Loading backdrop */}
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={isUpdating}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress color="inherit" />
            <Typography variant="body1">
              Update wird installiert...
            </Typography>
          </Box>
        </Backdrop>
      </>
    );
  }

  // Success notification
  if (updateStatus === 'success') {
    return (
      <Snackbar
        open={true}
        anchorOrigin={{ vertical: position, horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" icon={<SuccessIcon />}>
          ✅ Update erfolgreich installiert! Die App wird neu geladen...
        </Alert>
      </Snackbar>
    );
  }

  // Error notification
  if (updateStatus === 'error') {
    return (
      <Snackbar
        open={true}
        autoHideDuration={5000}
        onClose={() => setUpdateStatus('available')}
        anchorOrigin={{ vertical: position, horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          variant="filled"
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Neu laden
            </Button>
          }
        >
          ❌ Update fehlgeschlagen. Laden Sie die Seite manuell neu.
        </Alert>
      </Snackbar>
    );
  }

  // Standard update notification
  return (
    <Snackbar
      open={isVisible}
      autoHideDuration={autoHideDuration}
      onClose={handleDismiss}
      anchorOrigin={{ vertical: position, horizontal: 'center' }}
    >
      <Alert
        severity="info"
        variant="filled"
        icon={<UpdateIcon />}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              color="inherit"
              size="small"
              onClick={handleUpdate}
              disabled={isUpdating}
              startIcon={isUpdating ? <CircularProgress size={14} /> : <RefreshIcon />}
            >
              {isUpdating ? 'Updatet...' : 'Update'}
            </Button>
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleDismiss}
              disabled={isUpdating}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        sx={{ width: '100%' }}
      >
        <Typography variant="body2" fontWeight={600}>
          App-Update verfügbar
        </Typography>
        <Typography variant="caption">
          Neue Version mit Verbesserungen ist bereit
        </Typography>
      </Alert>
    </Snackbar>
  );
};

export default UpdateNotification;