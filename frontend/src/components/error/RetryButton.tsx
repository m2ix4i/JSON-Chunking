/**
 * Retry button component for connection error recovery.
 * Focused component extracted from ConnectionErrorHandler.
 */

import React from 'react';
import { Button, LinearProgress } from '@mui/material';
import { Refresh as RetryIcon } from '@mui/icons-material';

interface RetryButtonProps {
  isRetrying: boolean;
  onRetry: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'text' | 'outlined' | 'contained';
}

const RetryButton: React.FC<RetryButtonProps> = ({
  isRetrying,
  onRetry,
  disabled = false,
  size = 'small',
  variant = 'text',
}) => {
  return (
    <Button
      size={size}
      variant={variant}
      onClick={onRetry}
      disabled={isRetrying || disabled}
      startIcon={isRetrying ? <LinearProgress sx={{ width: 20 }} /> : <RetryIcon />}
    >
      {isRetrying ? 'Verbinde...' : 'Erneut versuchen'}
    </Button>
  );
};

export default RetryButton;