/**
 * File selection prompt component - displays when no file is selected.
 * Focused component following Single Responsibility Principle.
 */

import React from 'react';
import {
  Grid,
  Alert,
  Typography,
} from '@mui/material';

interface FileSelectionPromptProps {
  onNavigateToUpload: () => void;
}

const FileSelectionPrompt: React.FC<FileSelectionPromptProps> = ({
  onNavigateToUpload,
}) => {
  return (
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
            onClick={onNavigateToUpload}
          >
            Upload-Seite
          </Typography>
          .
        </Typography>
      </Alert>
    </Grid>
  );
};

export default FileSelectionPrompt;