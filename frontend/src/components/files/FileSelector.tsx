/**
 * File selector component for choosing files for queries.
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Button,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Store hooks
import { useSelectedFile } from '@stores/fileStore';

interface FileSelectorProps {
  title?: string;
  showUploadPrompt?: boolean;
}

const FileSelector: React.FC<FileSelectorProps> = ({
  title = "Datei auswählen",
  showUploadPrompt = true,
}) => {
  const navigate = useNavigate();
  const selectedFile = useSelectedFile();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        
        {selectedFile ? (
          <Alert severity="success">
            <Typography variant="body2">
              <strong>Ausgewählte Datei:</strong> {selectedFile.filename}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Größe: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
          </Alert>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Keine Datei ausgewählt. Wählen Sie eine Datei aus oder laden Sie eine neue hoch.
              </Typography>
            </Alert>
            
            {showUploadPrompt && (
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => navigate('/upload')}
                fullWidth
              >
                Datei hochladen
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FileSelector;