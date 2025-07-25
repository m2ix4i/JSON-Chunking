/**
 * Main App component with Material-UI theme and routing.
 */

import React from 'react';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Paper
} from '@mui/material';
import { 
  Architecture as ArchitectureIcon 
} from '@mui/icons-material';

// Components
import QueryForm from '@components/query/QueryForm';

// Stores
import { useQueryActions, useActiveQuery, useQueryError } from '@stores/queryStore';
import { useSelectedFile, useFileError } from '@stores/fileStore';

// Utils
import { APIErrorHandler } from '@utils/errorUtils';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 2,
      },
    },
  },
});

const App: React.FC = () => {
  const { submitQuery } = useQueryActions();
  const { isSubmitting } = useActiveQuery();
  const selectedFile = useSelectedFile();
  const queryError = useQueryError();
  const fileError = useFileError();

  const handleQuerySubmit = async () => {
    if (!selectedFile) {
      return;
    }

    const success = await submitQuery(selectedFile.file_id);
    if (success) {
      console.log('Query submitted successfully');
    }
  };

  // Get validation errors
  const errors = queryError ? APIErrorHandler.handleError({ message: queryError }) : [];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <ArchitectureIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            IFC JSON Chunking - Bauwesen Datenanalyse
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h2" component="h1" gutterBottom align="center">
            Willkommen zur IFC Datenanalyse
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Analysieren Sie Ihre IFC-Gebäudedaten mit fortschrittlicher KI-Technologie.
            Stellen Sie Fragen zu Mengen, Bauteilen, Materialien und räumlichen Beziehungen.
          </Typography>
        </Box>

        {/* File Upload Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            1. Datei hochladen
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Laden Sie Ihre IFC JSON-Datei hoch, um mit der Analyse zu beginnen.
          </Typography>
          {/* TODO: Add file upload component */}
          <Box sx={{ 
            p: 3, 
            border: '2px dashed #ccc', 
            borderRadius: 1, 
            textAlign: 'center',
            bgcolor: 'grey.50'
          }}>
            <Typography variant="body2" color="text.secondary">
              Datei-Upload-Komponente wird hier implementiert
            </Typography>
          </Box>
          {fileError && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {fileError}
            </Typography>
          )}
        </Paper>

        {/* Query Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            2. Abfrage stellen
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Beschreiben Sie, was Sie über Ihre IFC-Daten wissen möchten.
            Nutzen Sie natürliche Sprache für Ihre Fragen.
          </Typography>
          
          <QueryForm
            onSubmit={handleQuerySubmit}
            isSubmitting={isSubmitting}
            validationErrors={errors}
          />
        </Paper>

        {/* Results Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            3. Ergebnisse
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Die Analyse-Ergebnisse werden hier in Echtzeit angezeigt.
          </Typography>
          {/* TODO: Add results display component */}
          <Box sx={{ 
            p: 3, 
            border: '1px solid #e0e0e0', 
            borderRadius: 1,
            bgcolor: 'grey.50',
            minHeight: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography variant="body2" color="text.secondary">
              Ergebnisse werden nach der Abfrage hier angezeigt
            </Typography>
          </Box>
        </Paper>
      </Container>

      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: 'grey.100', py: 3, mt: 4 }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            IFC JSON Chunking System - Moderne Bauwesen Datenanalyse mit KI
          </Typography>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default App;