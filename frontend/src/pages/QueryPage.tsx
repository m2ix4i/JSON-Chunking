/**
 * Query page - intelligent German query interface with suggestions.
 */

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Components
import QueryForm from '@components/query/QueryForm';
import QuerySuggestions from '@components/query/QuerySuggestions';

// Store hooks
import { useSelectedFile } from '@stores/fileStore';
import { useQuerySubmission } from '@stores/queryStore';

// Types
import type { GermanQuerySuggestion } from '@types/app';

const QueryPage: React.FC = () => {
  const navigate = useNavigate();
  const selectedFile = useSelectedFile();
  const { updateCurrentQuery } = useQuerySubmission();

  const handleSuggestionSelect = (suggestion: GermanQuerySuggestion) => {
    updateCurrentQuery({
      text: suggestion.text,
      intentHint: suggestion.category,
    });
  };

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Abfrage erstellen
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Erstellen Sie intelligente Abfragen in deutscher Sprache für Ihre IFC-Gebäudedaten. 
          Das System erkennt automatisch die Absicht Ihrer Abfrage und optimiert die Verarbeitung entsprechend.
        </Typography>
      </Box>

      {/* File selection alert */}
      {!selectedFile && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Wählen Sie zuerst eine Datei aus, bevor Sie eine Abfrage erstellen. 
          Sie können Dateien auf der{' '}
          <Typography 
            component="span" 
            sx={{ textDecoration: 'underline', cursor: 'pointer' }}
            onClick={() => navigate('/upload')}
          >
            Upload-Seite
          </Typography>
          {' '}hochladen.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Main query form */}
        <Grid item xs={12} lg={8}>
          <QueryForm />
        </Grid>

        {/* Query suggestions sidebar */}
        <Grid item xs={12} lg={4}>
          <QuerySuggestions
            onSuggestionSelect={handleSuggestionSelect}
            compact={true}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default QueryPage;