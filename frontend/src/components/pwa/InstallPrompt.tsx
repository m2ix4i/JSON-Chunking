/**
 * PWA Install Prompt Component
 * Provides a user-friendly interface for installing the PWA
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Snackbar,
  Alert,
  Slide,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  GetApp as InstallIcon,
  Close as CloseIcon,
  Smartphone as MobileIcon,
  Computer as DesktopIcon,
  CloudDownload as DownloadIcon,
} from '@mui/icons-material';

// Services
import { serviceWorkerManager } from '@services/serviceWorker';
import type { ServiceWorkerStatus } from '@services/serviceWorker';

interface InstallPromptProps {
  /** Whether to show as a banner at the top of the page */
  variant?: 'banner' | 'card' | 'snackbar';
  /** Auto-hide after specified milliseconds */
  autoHideDuration?: number;
  /** Custom positioning */
  position?: 'top' | 'bottom';
  /** Callback when install is completed */
  onInstalled?: () => void;
  /** Callback when prompt is dismissed */
  onDismissed?: () => void;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({
  variant = 'snackbar',
  autoHideDuration,
  position = 'bottom',
  onInstalled,
  onDismissed,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Component state
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'success' | 'error'>('idle');
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
      
      // Show prompt when installable
      if (status.isInstallable && !isVisible) {
        setIsVisible(true);
      }
    });

    // Initial status check
    setPwaStatus(serviceWorkerManager.getStatus());

    return unsubscribe;
  }, [isVisible]);

  // Handle install button click
  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const success = await serviceWorkerManager.installPWA();
      
      if (success) {
        setInstallStatus('success');
        setIsVisible(false);
        onInstalled?.();
        
        // Show success message briefly
        setTimeout(() => setInstallStatus('idle'), 3000);
      } else {
        setInstallStatus('error');
        setTimeout(() => setInstallStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('PWA installation failed:', error);
      setInstallStatus('error');
      setTimeout(() => setInstallStatus('idle'), 3000);
    } finally {
      setIsInstalling(false);
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    onDismissed?.();
  };

  // Don't render if not installable or already dismissed
  if (!pwaStatus.isInstallable || (!isVisible && installStatus === 'idle')) {
    return null;
  }

  // Success notification
  if (installStatus === 'success') {
    return (
      <Snackbar
        open={true}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: position, horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          🎉 App erfolgreich installiert! Sie finden sie auf Ihrem Startbildschirm.
        </Alert>
      </Snackbar>
    );
  }

  // Error notification
  if (installStatus === 'error') {
    return (
      <Snackbar
        open={true}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: position, horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled">
          ❌ Installation fehlgeschlagen. Versuchen Sie es später erneut.
        </Alert>
      </Snackbar>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <Slide direction="down" in={isVisible} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.snackbar,
            background: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: theme.shadows[4],
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isMobile ? <MobileIcon /> : <DesktopIcon />}
            <Box>
              <Typography variant="body1" fontWeight={600}>
                IFC Chunking als App installieren
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Schnellerer Zugriff und Offline-Funktionen
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<InstallIcon />}
              onClick={handleInstall}
              disabled={isInstalling}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              {isInstalling ? 'Installiert...' : 'Installieren'}
            </Button>
            <IconButton
              size="small"
              onClick={handleDismiss}
              sx={{ color: 'inherit' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </Slide>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <Card
        sx={{
          m: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          color: theme.palette.primary.contrastText,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DownloadIcon />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  App installieren
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Installieren Sie IFC Chunking für bessere Performance und Offline-Zugriff
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<InstallIcon />}
                onClick={handleInstall}
                disabled={isInstalling}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                {isInstalling ? 'Installiert...' : 'Installieren'}
              </Button>
              <IconButton
                onClick={handleDismiss}
                sx={{ color: 'inherit' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Snackbar variant (default)
  return (
    <Snackbar
      open={isVisible}
      autoHideDuration={autoHideDuration}
      onClose={handleDismiss}
      anchorOrigin={{ vertical: position, horizontal: 'center' }}
      sx={{ maxWidth: isMobile ? '90%' : '500px' }}
    >
      <Alert
        severity="info"
        variant="filled"
        icon={<InstallIcon />}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              color="inherit"
              size="small"
              onClick={handleInstall}
              disabled={isInstalling}
              startIcon={<InstallIcon />}
            >
              {isInstalling ? 'Installiert...' : 'Installieren'}
            </Button>
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleDismiss}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        sx={{ width: '100%' }}
      >
        <Typography variant="body2" fontWeight={600}>
          IFC Chunking als App installieren
        </Typography>
        <Typography variant="caption">
          Schnellerer Zugriff und Offline-Funktionen
        </Typography>
      </Alert>
    </Snackbar>
  );
};

export default InstallPrompt;