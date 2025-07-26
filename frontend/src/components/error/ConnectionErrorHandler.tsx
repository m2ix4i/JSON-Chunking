/**
 * Connection error handler component - refactored following Sandi Metz SRP principles.
 * Uses extracted custom hook and focused sub-components for better maintainability.
 */

import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  IconButton,
  Snackbar,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';

// Custom hooks
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

// Components
import RetryButton from './RetryButton';
import StatusChip from './StatusChip';
import ErrorDetails from './ErrorDetails';

interface ConnectionErrorHandlerProps {
  queryId?: string;
  showDetails?: boolean;
  onRetry?: () => void;
  onFallback?: () => void;
}

const ConnectionErrorHandler: React.FC<ConnectionErrorHandlerProps> = ({
  queryId,
  showDetails = false,
  onRetry,
  onFallback,
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Use extracted custom hook for connection status management
  const {
    connectionStatus,
    notifications,
    activeNotification,
    isRetrying,
    dismissNotification,
    handleRetry,
    handleForceFallback,
  } = useConnectionStatus(queryId, onRetry, onFallback);

  // Don't render if no connection issues
  if (!connectionStatus || (!connectionStatus.lastError && connectionStatus.health !== 'poor')) {
    return null;
  }

  // Helper functions for display logic
  const getSeverity = () => {
    switch (connectionStatus.health) {
      case 'poor': return 'error';
      case 'degraded': return 'warning';
      case 'good': return connectionStatus.mode === 'polling' ? 'info' : 'success';
      default: return 'success';
    }
  };

  const getTitle = () => {
    switch (connectionStatus.health) {
      case 'poor': return 'Verbindungsprobleme';
      case 'degraded': return 'Eingeschränkte Verbindung';
      case 'good': return connectionStatus.mode === 'polling' ? 'Fallback-Modus aktiv' : 'Verbindung stabil';
      default: return 'Verbindung excellent';
    }
  };

  const getMessage = () => {
    if (connectionStatus.lastError) {
      return connectionStatus.lastError;
    }
    
    switch (connectionStatus.mode) {
      case 'polling':
        return 'WebSocket-Verbindung nicht verfügbar. Daten werden alle 2 Sekunden aktualisiert.';
      case 'websocket':
        return 'Live-Updates über WebSocket verfügbar.';
      default:
        return 'Verbindungsstatus unbekannt.';
    }
  };

  return (
    <>
      {/* Main error alert with extracted components */}
      <Alert 
        severity={getSeverity()}
        sx={{ mb: 2 }}
        action={
          <Box display="flex" alignItems="center" gap={1}>
            {connectionStatus.mode === 'polling' && (
              <RetryButton
                isRetrying={isRetrying}
                onRetry={handleRetry}
              />
            )}
            
            {showDetails && (
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <CollapseIcon /> : <ExpandIcon />}
              </IconButton>
            )}
          </Box>
        }
      >
        <AlertTitle>{getTitle()}</AlertTitle>
        {getMessage()}
        
        {/* Connection status chips */}
        <StatusChip connectionStatus={connectionStatus} />
      </Alert>

      {/* Detailed error information component */}
      {showDetails && (
        <ErrorDetails
          expanded={expanded}
          connectionStatus={connectionStatus}
          notifications={notifications}
          isRetrying={isRetrying}
          onRetry={handleRetry}
          onForceFallback={handleForceFallback}
        />
      )}

      {/* Notification snackbar */}
      <Snackbar
        open={!!activeNotification}
        autoHideDuration={6000}
        onClose={() => activeNotification && dismissNotification(activeNotification.id)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {activeNotification && (
          <Alert
            severity={activeNotification.type}
            onClose={() => dismissNotification(activeNotification.id)}
            sx={{ width: '100%' }}
          >
            <AlertTitle>{activeNotification.title}</AlertTitle>
            {activeNotification.message}
          </Alert>
        )}
      </Snackbar>
    </>
  );
};

export default ConnectionErrorHandler;