/**
 * Retry button component for connection error handling.
 * Focused component following Single Responsibility Principle.
 */

import React from 'react';
import { Button } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface RetryButtonProps {
  isRetrying: boolean;
  onRetry: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const RetryButton: React.FC<RetryButtonProps> = ({
  isRetrying,
  onRetry,
  disabled = false,
  size = 'small',
}) => {
  return (
    <Button
      size={size}
      startIcon={<RefreshIcon />}
      onClick={onRetry}
      disabled={disabled || isRetrying}
      variant="outlined"
    >
      {isRetrying ? 'Verbindung wird hergestellt...' : 'Wiederholen'}
    </Button>
  );
};

export default RetryButton;