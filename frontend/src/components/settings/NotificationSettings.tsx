/**
 * Notification settings component for user settings.
 * Allows configuring notification preferences.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Upload as UploadIcon,
  VolumeUp as SoundIcon,
} from '@mui/icons-material';
import { useSettingsStore } from '@/stores';

interface NotificationOption {
  key: keyof typeof defaultNotifications;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'error' | 'info';
}

const defaultNotifications = {
  queryComplete: true,
  errors: true,
  fileUpload: true,
};

const NotificationSettings: React.FC = () => {
  const { notifications, updateNotifications } = useSettingsStore();

  const notificationOptions: NotificationOption[] = [
    {
      key: 'queryComplete',
      label: 'Abfrage abgeschlossen',
      description: 'Benachrichtigung, wenn eine Abfrage erfolgreich verarbeitet wurde',
      icon: <SuccessIcon />,
      color: 'success',
    },
    {
      key: 'errors',
      label: 'Fehler und Warnungen',
      description: 'Benachrichtigung bei Fehlern oder Problemen während der Verarbeitung',
      icon: <ErrorIcon />,
      color: 'error',
    },
    {
      key: 'fileUpload',
      label: 'Datei-Upload',
      description: 'Benachrichtigung über Upload-Status und Verarbeitungsfortschritt',
      icon: <UploadIcon />,
      color: 'info',
    },
  ];

  const handleNotificationChange = (key: keyof typeof notifications) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateNotifications({ [key]: event.target.checked });
  };

  const enabledCount = Object.values(notifications).filter(Boolean).length;
  const totalCount = Object.keys(notifications).length;

  return (
    <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h3">
            Benachrichtigungen
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Konfigurieren Sie, welche Ereignisse Sie benachrichtigen sollen.
        </Typography>
      </Box>

      {/* Summary */}
      <Box sx={{ mb: 3, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Status:
          </Typography>
          <Chip
            size="small"
            label={`${enabledCount} von ${totalCount} aktiviert`}
            color={enabledCount === 0 ? 'error' : enabledCount === totalCount ? 'success' : 'warning'}
            variant="outlined"
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Benachrichtigungen werden als Toast-Nachrichten in der oberen rechten Ecke angezeigt.
        </Typography>
      </Box>

      {/* No notifications warning */}
      {enabledCount === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Alle Benachrichtigungen sind deaktiviert. Sie werden keine Updates über Abfrage-Status oder Fehler erhalten.
          </Typography>
        </Alert>
      )}

      {/* Notification Options */}
      <FormControl component="fieldset" variant="standard" fullWidth>
        <FormGroup>
          <List disablePadding>
            {notificationOptions.map((option) => (
              <ListItem key={option.key} sx={{ px: 0, py: 1 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box sx={{ color: `${option.color}.main` }}>
                    {option.icon}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notifications[option.key]}
                          onChange={handleNotificationChange(option.key)}
                          color={option.color}
                        />
                      }
                      label={
                        <Typography variant="body1" fontWeight="medium">
                          {option.label}
                        </Typography>
                      }
                      sx={{ m: 0 }}
                    />
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {option.description}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </FormGroup>
      </FormControl>

      {/* Future Features Preview */}
      <Box sx={{ mt: 4, p: 2, backgroundColor: 'action.hover', borderRadius: 1, opacity: 0.7 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          <SoundIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
          Kommende Features
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              • Akustische Benachrichtigungen
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              • E-Mail-Benachrichtigungen
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              • Browser-Push-Nachrichten
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              • Benutzerdefinierte Sounds
            </Typography>
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Diese Features werden in zukünftigen Versionen verfügbar sein.
        </Typography>
      </Box>
    </Paper>
  );
};

export default NotificationSettings;