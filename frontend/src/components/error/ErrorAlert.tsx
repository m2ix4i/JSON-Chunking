/**
 * Reusable error alert component with different severity levels.
 */

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RetryIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';

export interface ErrorAlertProps {
  title?: string;
  message: string;
  severity?: 'error' | 'warning' | 'info';
  details?: string;
  onClose?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  dismissible?: boolean;
  collapsible?: boolean;
  expanded?: boolean;
  errorCode?: string;
  sx?: object;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title,
  message,
  severity = 'error',
  details,
  onClose,
  onRetry,
  retryLabel = 'Erneut versuchen',
  dismissible = true,
  collapsible = false,
  expanded = false,
  errorCode,
  sx,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(expanded);

  const handleToggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  const getDefaultTitle = () => {
    switch (severity) {
      case 'error':
        return 'Fehler';
      case 'warning':
        return 'Warnung';
      case 'info':
        return 'Information';
      default:
        return 'Hinweis';
    }
  };

  return (
    <Alert
      severity={severity}
      sx={sx}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {onRetry && (
            <Button
              color="inherit"
              size="small"
              startIcon={<RetryIcon />}
              onClick={onRetry}
            >
              {retryLabel}
            </Button>
          )}
          {collapsible && (details || errorCode) && (
            <IconButton
              color="inherit"
              size="small"
              onClick={handleToggleExpanded}
            >
              {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
          )}
          {dismissible && onClose && (
            <IconButton
              color="inherit"
              size="small"
              onClick={onClose}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      }
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      <Typography variant="body2">
        {message}
      </Typography>
      
      {errorCode && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.8 }}>
          Fehler-Code: {errorCode}
        </Typography>
      )}

      {collapsible && (details || errorCode) && (
        <Collapse in={isExpanded}>
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            {details && (
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: 'action.hover',
                  p: 1,
                  borderRadius: 1,
                  overflow: 'auto',
                  maxHeight: 200,
                }}
              >
                {details}
              </Typography>
            )}
          </Box>
        </Collapse>
      )}
    </Alert>
  );
};

export default ErrorAlert;