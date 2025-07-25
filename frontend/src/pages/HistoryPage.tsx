/**
 * History page - query history display.
 * Placeholder for query history and management.
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';

const HistoryPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Verlauf
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Überblick über alle Ihre bisherigen Abfragen und Ergebnisse.
      </Typography>

      <Card sx={{ maxWidth: 600, mx: 'auto' }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <HistoryIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Abfrageverlauf
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            Diese Funktionalität wird in einer zukünftigen Version implementiert.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default HistoryPage;