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
import QueryInterface from '@components/query/QueryInterface';
import FileSelectionPrompt from '@components/query/FileSelectionPrompt';
import FileSelector from '@components/files/FileSelector';

// Hooks
import { useQueryPage } from '@/hooks/useQueryPage';

// Types
import type { GermanQuerySuggestion } from '@/types/app';

const QueryPage: React.FC = () => {
  const {
    selectedFile,
    isSubmitting,
    error,
    activeQuery,
    handleSuggestionSelect,
    handleQuerySubmit,
    navigateToUpload,
  } = useQueryPage();


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
            <QueryInterface
              activeQuery={activeQuery}
              isSubmitting={isSubmitting}
              error={error}
              onSubmit={handleQuerySubmit}
              onRetry={handleQuerySubmit}
            />

            {/* Query suggestions sidebar */}
            <Grid item xs={12} lg={4}>
              <QuerySuggestions
                onSuggestionSelect={handleSuggestionSelect}
                compact={true}
              />
            </Grid>
          </>
        ) : (
          <FileSelectionPrompt onNavigateToUpload={navigateToUpload} />
        )}
      </Grid>
    </Box>
  );
};

export default QueryPage;