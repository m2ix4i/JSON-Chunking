/**
 * Error details component for displaying detailed connection information.
 * Focused component following Single Responsibility Principle.
 */

import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

interface ErrorDetailsProps {
  queryId: string;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
  retryCount?: number;
  lastRetryTime?: Date;
  expanded: boolean;
  onToggleExpanded: () => void;
  showToggle?: boolean;
}

const ErrorDetails: React.FC<ErrorDetailsProps> = ({
  queryId,
  connectionStatus,
  errorMessage,
  retryCount = 0,
  lastRetryTime,
  expanded,
  onToggleExpanded,
  showToggle = true,
}) => {
  const renderToggleButton = () => {
    if (!showToggle) return null;

    return (
      <IconButton
        size="small"
        onClick={onToggleExpanded}
        aria-label={expanded ? 'Details ausblenden' : 'Details anzeigen'}
      >
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </IconButton>
    );
  };

  const renderDetailsContent = () => (
    <Box mt={2}>
      <Typography variant="subtitle2" gutterBottom>
        Verbindungsdetails:
      </Typography>
      
      <Stack spacing={1}>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Abfrage-ID:
          </Typography>
          <Typography variant="body2" fontFamily="monospace">
            {queryId}
          </Typography>
        </Box>
        
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Status:
          </Typography>
          <Typography variant="body2">
            {connectionStatus}
          </Typography>
        </Box>

        {retryCount > 0 && (
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Wiederholungsversuche:
            </Typography>
            <Typography variant="body2">
              {retryCount}
            </Typography>
          </Box>
        )}

        {lastRetryTime && (
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Letzter Versuch:
            </Typography>
            <Typography variant="body2">
              {lastRetryTime.toLocaleTimeString()}
            </Typography>
          </Box>
        )}

        {errorMessage && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Fehlermeldung:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'monospace', 
                bgcolor: 'grey.100', 
                p: 1, 
                borderRadius: 1,
                fontSize: '0.75rem'
              }}
            >
              {errorMessage}
            </Typography>
          </Box>
        )}
      </Stack>

      <Box mt={2}>
        <Typography variant="body2" color="text.secondary">
          <strong>Tipps zur Fehlerbehebung:</strong>
        </Typography>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>
            <Typography variant="body2" color="text.secondary">
              Überprüfen Sie Ihre Internetverbindung
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              Aktualisieren Sie die Seite (F5)
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              Kontaktieren Sie den Support bei anhaltenden Problemen
            </Typography>
          </li>
        </ul>
      </Box>
    </Box>
  );

  return (
    <>
      {renderToggleButton()}
      <Collapse in={expanded}>
        {renderDetailsContent()}
      </Collapse>
    </>
  );
};

export default ErrorDetails;