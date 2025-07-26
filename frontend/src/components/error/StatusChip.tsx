/**
 * Status chip component for displaying connection status.
 * Focused component following Single Responsibility Principle.
 */

import React from 'react';
import { Chip } from '@mui/material';

interface StatusChipProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}

const StatusChip: React.FC<StatusChipProps> = ({
  status,
  size = 'small',
  variant = 'outlined',
}) => {
  const getStatusColor = (): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (): string => {
    switch (status) {
      case 'connected':
        return 'Verbunden';
      case 'connecting':
        return 'Verbindet...';
      case 'disconnected':
        return 'Getrennt';
      case 'error':
        return 'Fehler';
      default:
        return status;
    }
  };

  return (
    <Chip
      label={getStatusLabel()}
      color={getStatusColor()}
      size={size}
      variant={variant}
    />
  );
};

export default StatusChip;