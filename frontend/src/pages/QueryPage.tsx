/**
 * Query page - intelligent German query interface with suggestions.
 */

import React, { useEffect } from 'react';
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
import FileSelector from '@components/files/FileSelector';

// Store hooks
import { useSelectedFile, useFileStore } from '@stores/fileStore';
import { useQueryStore } from '@stores/queryStore';

// Types
import type { GermanQuerySuggestion } from '@/types/app';

const QueryPage: React.FC = () => {
  const navigate = useNavigate();
  const selectedFile = useSelectedFile();
  const { updateCurrentQuery, submitQuery, isSubmitting, error } = useQueryStore();
  const refreshFiles = useFileStore((state) => state.refreshFiles);

  // Load files on page mount
  useEffect(() => {
    refreshFiles().catch(console.error);
  }, [refreshFiles]);

  const handleSuggestionSelect = (suggestion: GermanQuerySuggestion) => {
    updateCurrentQuery({
      text: suggestion.text,
      intentHint: suggestion.category,
    });
  };

  const handleQuerySubmit = async () => {
    if (!selectedFile) {
      console.error('No file selected for query');
      return;
    }

    try {
      await submitQuery(selectedFile.file_id);
      
      // Navigate to results page after successful submission
      // If we have an active query with ID, navigate to specific result page
      const { activeQuery } = useQueryStore.getState();
      if (activeQuery?.query_id) {
        navigate(`/results/${activeQuery.query_id}`);
      } else {
        navigate('/results');
      }
    } catch (error) {
      console.error('Failed to submit query:', error);
      // Error handling is already managed by the queryStore and displayed via error state
    }
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

      <Grid container spacing={3}>
        {/* File selection */}
        <Grid item xs={12}>
          <FileSelector 
            title="Schritt 1: Datei für Abfrage auswählen"
            showUploadPrompt={true}
          />
        </Grid>

        {/* Main query interface - only show when file is selected */}
        {selectedFile ? (
          <>
            {/* Query form */}
            <Grid item xs={12} lg={8}>
              <QueryForm 
                onSubmit={handleQuerySubmit}
                isSubmitting={isSubmitting}
                disabled={!selectedFile}
              />
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Grid>

            {/* Query suggestions sidebar */}
            <Grid item xs={12} lg={4}>
              <QuerySuggestions
                onSuggestionSelect={handleSuggestionSelect}
                compact={true}
              />
            </Grid>
          </>
        ) : (
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Dateiauswahl erforderlich
              </Typography>
              <Typography variant="body2">
                Wählen Sie oben eine Datei aus, um mit der Abfrage-Erstellung zu beginnen. 
                Falls Sie noch keine Dateien hochgeladen haben, besuchen Sie die{' '}
                <Typography 
                  component="span" 
                  sx={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 500 }}
                  onClick={() => navigate('/upload')}
                >
                  Upload-Seite
                </Typography>
                .
              </Typography>
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default QueryPage;