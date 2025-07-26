/**
 * Query page with real-time progress tracking and WebSocket integration.
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
import QueryProgressTracker from '@components/progress/QueryProgressTracker';
import ConnectionErrorHandler from '@components/error/ConnectionErrorHandler';
import FileSelector from '@components/files/FileSelector';

// Store hooks
import { useSelectedFile, useFileStore } from '@stores/fileStore';
import { useQuerySubmission, useQueryMonitoring } from '@stores/queryStore';

// Types
import type { GermanQuerySuggestion } from '@/types/app';

const QueryPage: React.FC = () => {
  const navigate = useNavigate();
  const selectedFile = useSelectedFile();
  const { updateCurrentQuery, submitQuery, isSubmitting, error } = useQuerySubmission();
  const { activeQuery, status, result } = useQueryMonitoring();
  const refreshFiles = useFileStore((state) => state.refreshFiles);

  // Load files on page mount
  useEffect(() => {
    refreshFiles().catch(console.error);
  }, [refreshFiles]);

  // Auto-navigate to results when query completes
  useEffect(() => {
    if (result && status?.status === 'completed' && activeQuery?.query_id) {
      // Small delay to show completion state
      setTimeout(() => {
        navigate(`/results/${activeQuery.query_id}`);
      }, 2000);
    }
  }, [result, status, activeQuery, navigate]);

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
    } catch (error) {
      console.error('Failed to submit query:', error);
      // Error handling is managed by the queryStore
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
              
              {/* Real-time query progress display */}
              {activeQuery && (
                <Box sx={{ mt: 3 }}>
                  <QueryProgressTracker 
                    queryId={activeQuery.query_id}
                    compact={false}
                  />
                </Box>
              )}
              
              {/* Connection error handling */}
              {activeQuery && (
                <Box sx={{ mt: 2 }}>
                  <ConnectionErrorHandler 
                    queryId={activeQuery.query_id}
                    showDetails={true}
                    onRetry={() => {
                      // Retry by resubmitting the query
                      handleQuerySubmit();
                    }}
                  />
                </Box>
              )}
              
              {/* General error display */}
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