/**
 * File upload page with comprehensive error handling and user feedback.
 */

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ArrowForward as NextIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Components
import FileDropzone from '@components/upload/FileDropzone';
import ErrorAlert from '@components/error/ErrorAlert';

// Store hooks
import { useFiles, useSelectedFile, useUploadState } from '@stores/fileStore';
import { useErrorHandler } from '@hooks/useErrorHandler';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const files = useFiles();
  const selectedFile = useSelectedFile();
  const { isUploading } = useUploadState();
  
  const {
    error,
    isRetrying,
    retryCount,
    handleError,
    retry,
    clearError,
    canRetry,
  } = useErrorHandler();

  const filesList = Object.values(files);
  const readyFiles = filesList.filter(f => f.status === 'ready');
  const processingFiles = filesList.filter(f => f.status === 'processing');
  const errorFiles = filesList.filter(f => f.status === 'error');

  const canProceedToQuery = readyFiles.length > 0;

  const handleProceedToQuery = () => {
    if (canProceedToQuery) {
      navigate('/query');
    }
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          IFC-Dateien hochladen
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Laden Sie IFC-JSON Dateien hoch, um sie für Abfragen zu analysieren.
        </Typography>
      </Box>

      {/* Error Display */}
      {error && (
        <ErrorAlert
          title="Upload-Fehler"
          message={error.message}
          details={error.details}
          onClose={clearError}
          onRetry={canRetry ? retry : undefined}
          retryLabel={isRetrying ? 'Wird wiederholt...' : 'Erneut versuchen'}
          collapsible
          sx={{ mb: 3 }}
        />
      )}

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Datei hochladen
              </Typography>
              
              <FileDropzone
                onError={handleError}
                maxFiles={5}
                maxSizeMB={100}
                acceptedTypes={['.json']}
              />

              {/* Upload Status */}
              {isUploading && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <AlertTitle>Upload läuft...</AlertTitle>
                  Ihre Dateien werden hochgeladen und verarbeitet.
                </Alert>
              )}

              {/* Processing Status */}
              {processingFiles.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <AlertTitle>Verarbeitung läuft...</AlertTitle>
                  {processingFiles.length} {processingFiles.length === 1 ? 'Datei wird' : 'Dateien werden'} verarbeitet.
                </Alert>
              )}

              {/* Error Files */}
              {errorFiles.length > 0 && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <AlertTitle>Fehler beim Upload</AlertTitle>
                  {errorFiles.length} {errorFiles.length === 1 ? 'Datei konnte' : 'Dateien konnten'} nicht verarbeitet werden.
                </Alert>
              )}

              {/* Success Status */}
              {readyFiles.length > 0 && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <AlertTitle>Upload erfolgreich</AlertTitle>
                  {readyFiles.length} {readyFiles.length === 1 ? 'Datei ist' : 'Dateien sind'} bereit für Abfragen.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} lg={4}>
          {/* Instructions */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Anweisungen
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Unterstützte Formate"
                    secondary="Nur JSON-Dateien im IFC-Format"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Maximale Größe"
                    secondary="100 MB pro Datei"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Verarbeitung"
                    secondary="Automatische Validierung und Indexierung"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* File Status */}
          {filesList.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Datei-Status
                </Typography>
                
                <List dense>
                  {filesList.map((file) => (
                    <ListItem key={file.file_id}>
                      <ListItemIcon>
                        {file.status === 'ready' && <CheckIcon color="success" />}
                        {file.status === 'error' && <ErrorIcon color="error" />}
                        {['uploading', 'processing'].includes(file.status) && <UploadIcon color="primary" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={file.filename}
                        secondary={
                          file.status === 'ready' ? 'Bereit' :
                          file.status === 'error' ? 'Fehler' :
                          file.status === 'processing' ? 'Wird verarbeitet...' :
                          'Wird hochgeladen...'
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Nächste Schritte
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {canProceedToQuery 
                  ? 'Ihre Dateien sind bereit. Sie können jetzt Abfragen erstellen.'
                  : 'Laden Sie mindestens eine Datei hoch, um fortzufahren.'
                }
              </Typography>

              <Button
                variant="contained"
                endIcon={<NextIcon />}
                onClick={handleProceedToQuery}
                disabled={!canProceedToQuery}
                fullWidth
              >
                Zu den Abfragen
              </Button>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary">
                <strong>Tipp:</strong> Sie können mehrere Dateien gleichzeitig hochladen und zwischen ihnen wechseln.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UploadPage;