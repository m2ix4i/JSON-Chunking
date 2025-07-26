/**
 * Status chip component for displaying connection status.
 * Focused component extracted from ConnectionErrorHandler.
 */

import React from 'react';
import { Box, Chip } from '@mui/material';
import {
  CloudOff as OfflineIcon,
  CloudDone as OnlineIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';

// Services
import type { ConnectionStatus } from '@/services/connectionManager';

interface StatusChipProps {
  connectionStatus: ConnectionStatus;
}

const StatusChip: React.FC<StatusChipProps> = ({ connectionStatus }) => {
  return (
    <Box display="flex" alignItems="center" gap={1} mt={1}>
      <Chip
        icon={connectionStatus.mode === 'websocket' ? <OnlineIcon /> : <OfflineIcon />}
        label={connectionStatus.mode === 'websocket' ? 'Live-Updates' : 'Polling-Modus'}
        color={connectionStatus.mode === 'websocket' ? 'success' : 'warning'}
        size="small"
        variant="outlined"
      />
      
      <Chip
        icon={<SpeedIcon />}
        label={`${connectionStatus.metrics.averageLatency}ms`}
        size="small"
        variant="outlined"
      />
    </Box>
  );
};

export default StatusChip;