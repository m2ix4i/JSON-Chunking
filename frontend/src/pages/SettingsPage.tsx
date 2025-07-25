/**
 * Settings page - application settings and preferences.
 * Placeholder for user settings and configuration.
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

const SettingsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Einstellungen
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Konfigurieren Sie Ihre Präferenzen und Anwendungseinstellungen.
      </Typography>

      <Card sx={{ maxWidth: 600, mx: 'auto' }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <SettingsIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Benutzereinstellungen
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            Diese Funktionalität wird in einer zukünftigen Version implementiert.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SettingsPage;