/**
 * Network error handler component for API failures and connectivity issues.
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  WifiOff as OfflineIcon,
  Refresh as RetryIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

export interface NetworkErrorProps {
  error: {
    type: 'network' | 'timeout' | 'server' | 'auth' | 'unknown';
    message: string;
    status?: number;
    details?: string;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
  retryAttempts?: number;
  maxRetryAttempts?: number;
}

const NetworkErrorHandler: React.FC<NetworkErrorProps> = ({
  error,
  onRetry,
  onDismiss,
  retryAttempts = 0,
  maxRetryAttempts = 3,
}) => {
  const getErrorInfo = () => {
    switch (error.type) {
      case 'network':
        return {
          title: 'Netzwerkfehler',
          description: 'Verbindung zum Server konnte nicht hergestellt werden.',
          icon: <OfflineIcon sx={{ fontSize: 48, color: 'error.main' }} />,
          suggestions: [
            'Überprüfen Sie Ihre Internetverbindung',
            'Versuchen Sie es in wenigen Sekunden erneut',
            'Kontaktieren Sie den Support, falls das Problem anhält',
          ],
        };

      case 'timeout':
        return {
          title: 'Zeitüberschreitung',
          description: 'Die Anfrage hat zu lange gedauert und wurde abgebrochen.',
          icon: <OfflineIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
          suggestions: [
            'Versuchen Sie es mit einer kleineren Datei',
            'Überprüfen Sie Ihre Internetgeschwindigkeit',
            'Kontaktieren Sie den Support bei wiederholten Problemen',
          ],
        };

      case 'server':
        return {
          title: 'Serverfehler',
          description: `Server-Fehler (Status: ${error.status || 'Unbekannt'})`,
          icon: <OfflineIcon sx={{ fontSize: 48, color: 'error.main' }} />,
          suggestions: [
            'Der Server ist möglicherweise vorübergehend nicht verfügbar',
            'Versuchen Sie es in wenigen Minuten erneut',
            'Melden Sie diesen Fehler an unser Support-Team',
          ],
        };

      case 'auth':
        return {
          title: 'Authentifizierungsfehler',
          description: 'Ihre Sitzung ist abgelaufen oder ungültig.',
          icon: <OfflineIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
          suggestions: [
            'Melden Sie sich erneut an',
            'Löschen Sie Ihren Browser-Cache',
            'Kontaktieren Sie den Support bei anhaltenden Problemen',
          ],
        };

      default:
        return {
          title: 'Unbekannter Fehler',
          description: 'Ein unerwarteter Fehler ist aufgetreten.',
          icon: <OfflineIcon sx={{ fontSize: 48, color: 'error.main' }} />,
          suggestions: [
            'Laden Sie die Seite neu',
            'Versuchen Sie es später erneut',
            'Wenden Sie sich an den Support',
          ],
        };
    }
  };

  const errorInfo = getErrorInfo();
  const canRetry = onRetry && retryAttempts < maxRetryAttempts;

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Card>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            {errorInfo.icon}
            <Box sx={{ ml: 2 }}>
              <Typography variant="h5" component="h2" color="error">
                {errorInfo.title}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {errorInfo.description}
              </Typography>
            </Box>
          </Box>

          {/* Error Message */}
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Fehlermeldung</AlertTitle>
            {error.message}
            {error.details && (
              <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace' }}>
                {error.details}
              </Typography>
            )}
          </Alert>

          {/* Retry Information */}
          {retryAttempts > 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Wiederholung</AlertTitle>
              Versuch {retryAttempts} von {maxRetryAttempts}
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {canRetry && (
              <Button
                variant="contained"
                startIcon={<RetryIcon />}
                onClick={onRetry}
              >
                Erneut versuchen
              </Button>
            )}
            
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
            >
              Seite neu laden
            </Button>

            {onDismiss && (
              <Button
                variant="text"
                onClick={onDismiss}
              >
                Schließen
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Suggestions */}
          <Typography variant="h6" gutterBottom>
            Lösungsvorschläge
          </Typography>
          
          <List>
            {errorInfo.suggestions.map((suggestion, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary={suggestion} />
              </ListItem>
            ))}
          </List>

          {/* Additional Help */}
          <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Benötigen Sie weitere Hilfe?
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                startIcon={<HelpIcon />}
                onClick={() => window.open('/help', '_blank')}
              >
                Hilfe
              </Button>
              
              <Button
                size="small"
                startIcon={<SettingsIcon />}
                onClick={() => window.open('/settings', '_blank')}
              >
                Einstellungen
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NetworkErrorHandler;