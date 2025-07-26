/**
 * Query page with real-time progress tracking and WebSocket integration.
 * Refactored to follow SOLID principles with reduced coupling.
 */

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
} from '@mui/material';

// Components
import QuerySuggestions from '@components/query/QuerySuggestions';
<<<<<<< HEAD
import QueryInterface from '@components/query/QueryInterface';
import FileSelectionPrompt from '@components/query/FileSelectionPrompt';
import FileSelector from '@components/files/FileSelector';

// Hooks
import { useQueryPage } from '@/hooks/useQueryPage';
=======
import QueryProgress from '@components/query/QueryProgress';
import ConnectionErrorHandler from '@components/error/ConnectionErrorHandler';
import FileSelector from '@components/files/FileSelector';

// Store hooks
import { useSelectedFile, useFileStore } from '@stores/fileStore';
import { useQueryStore } from '@stores/queryStore';
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e

// Types
import type { GermanQuerySuggestion } from '@/types/app';

const QueryPage: React.FC = () => {
<<<<<<< HEAD
  const {
    selectedFile,
    isSubmitting,
    error,
    activeQuery,
    handleSuggestionSelect,
    handleQuerySubmit,
    navigateToUpload,
  } = useQueryPage();
=======
  const navigate = useNavigate();
  const selectedFile = useSelectedFile();
  const { updateCurrentQuery, submitQuery, isSubmitting, error } = useQueryStore();
  const { activeQuery } = useQueryStore();
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
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e

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
<<<<<<< HEAD
            <QueryInterface
              activeQuery={activeQuery}
              isSubmitting={isSubmitting}
              error={error}
              onSubmit={handleQuerySubmit}
              onRetry={handleQuerySubmit}
            />
=======
            {/* Query form */}
            <Grid item xs={12} lg={8}>
              <QueryForm 
                onSubmit={handleQuerySubmit}
                isSubmitting={isSubmitting}
                disabled={!selectedFile}
              />
              
              {/* Connection error handling */}
              {activeQuery && (
                <Box sx={{ mt: 3 }}>
                  <ConnectionErrorHandler 
                    queryId={activeQuery.query_id}
                    showDetails={true}
                    onRetry={() => {
                      // Refresh the page or restart the query
                      window.location.reload();
                    }}
                  />
                </Box>
              )}
              
              {/* Real-time query progress display */}
              {activeQuery && (
                <Box sx={{ mt: 2 }}>
                  <QueryProgress compact={false} />
                </Box>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Grid>
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e

            {/* Query suggestions sidebar */}
            <Grid item xs={12} lg={4}>
              <QuerySuggestions
                onSuggestionSelect={handleSuggestionSelect}
                compact={true}
              />
            </Grid>
          </>
        ) : (
<<<<<<< HEAD
          <FileSelectionPrompt onNavigateToUpload={navigateToUpload} />
=======
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
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e
        )}
      </Grid>
    </Box>
  );
};

export default QueryPage;