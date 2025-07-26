/**
 * Connection error handler component - displays connection errors and retry options.
 * Refactored to follow Sandi Metz principles with extracted components and custom hook.
 */

import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Typography,
  Stack,
} from '@mui/material';
import {
  WifiOff as WifiOffIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

// Custom hooks
import { useConnectionStatus } from '@hooks/useConnectionStatus';

// Components
import RetryButton from './RetryButton';
import StatusChip from './StatusChip';
import ErrorDetails from './ErrorDetails';

interface ConnectionErrorHandlerProps {
  queryId: string;
  showDetails?: boolean;
  onRetry?: () => void;
  compact?: boolean;
}

const ConnectionErrorHandler: React.FC<ConnectionErrorHandlerProps> = ({
  queryId,
  showDetails = false,
  onRetry,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(showDetails);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRetryTime, setLastRetryTime] = useState<Date | null>(null);

  const { connectionStatus, isRetrying, handleRetry } = useConnectionStatus(
    queryId,
    onRetry
  );

  const handleLocalRetry = async () => {
    setRetryCount(prev => prev + 1);
    setLastRetryTime(new Date());
    await handleRetry();
  };

  const getStatusIcon = () => {
    if (!connectionStatus) return null;
    
    switch (connectionStatus.status) {
      case 'error':
        return <ErrorIcon />;
      case 'disconnected':
        return <WifiOffIcon />;
      default:
        return null;
    }
  };

  const shouldShowError = connectionStatus?.status === 'error' || connectionStatus?.status === 'disconnected';

  if (!shouldShowError) {
    return null;
  }

  const isDisabled = connectionStatus?.status === 'connecting' || connectionStatus?.status === 'connected';

  return (
    <Alert
      severity={connectionStatus?.status === 'error' ? 'error' : 'warning'}
      icon={getStatusIcon()}
      action={
        <Stack direction="row" spacing={1} alignItems="center">
          <StatusChip status={connectionStatus?.status || 'disconnected'} />
          <RetryButton
            isRetrying={isRetrying}
            onRetry={handleLocalRetry}
            disabled={isDisabled}
          />
          <ErrorDetails
            queryId={queryId}
            connectionStatus={connectionStatus?.status || 'disconnected'}
            errorMessage={connectionStatus?.lastError}
            retryCount={retryCount}
            lastRetryTime={lastRetryTime}
            expanded={expanded}
            onToggleExpanded={() => setExpanded(!expanded)}
            showToggle={showDetails}
          />
        </Stack>
      }
    >
      <AlertTitle>
        {connectionStatus?.status === 'error' ? 'Verbindungsfehler' : 'Verbindung unterbrochen'}
      </AlertTitle>
      
      {!compact && (
        <Typography variant="body2">
          {connectionStatus?.status === 'error'
            ? 'Die Verbindung zum Server konnte nicht hergestellt werden.'
            : 'Die Verbindung zum Server wurde unterbrochen. Versuchen Sie es erneut.'
          }
        </Typography>
      )}
    </Alert>
  );
};

export default ConnectionErrorHandler;