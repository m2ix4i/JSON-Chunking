/**
 * Results page - display query results.
 * Placeholder for structured results display.
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { Assessment as ResultsIcon } from '@mui/icons-material';

const ResultsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Ergebnisse
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Hier werden die Ergebnisse Ihrer Abfragen strukturiert angezeigt.
      </Typography>

      <Card sx={{ maxWidth: 600, mx: 'auto' }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <ResultsIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Strukturierte Ergebnisanzeige
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            Diese Funktionalität wird in einer zukünftigen Version implementiert.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResultsPage;