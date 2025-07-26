/**
 * Drag-and-drop file upload component with validation and progress tracking.
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Refresh as RetryIcon,
} from '@mui/icons-material';

// Store hooks
import { useFileUpload, useFiles } from '@stores/fileStore';
import { showErrorNotification, showSuccessNotification } from '@stores/appStore';

// Types
import type { UploadedFile } from '@/types/app';

interface FileDropzoneProps {
  onFileUploaded?: (file: UploadedFile) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileUploaded,
  maxFiles = 10,
  maxSizeMB = 100,
}) => {
  const { uploadFile, uploadProgress, uploadErrors } = useFileUpload();
  const files = useFiles();
  const [isDragActive, setIsDragActive] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `Datei ist zu groß (${sizeMB.toFixed(1)} MB). Maximum: ${maxSizeMB} MB`;
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.json')) {
      return 'Nur JSON-Dateien sind erlaubt';
    }

    // Check file count
    if (files.length >= maxFiles) {
      return `Maximale Anzahl von ${maxFiles} Dateien erreicht`;
    }

    return null;
  }, [maxFiles, maxSizeMB, files.length]);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      setIsDragActive(false);

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((rejection) => {
          const errors = rejection.errors.map((e: any) => e.message).join(', ');
          showErrorNotification(`${rejection.file.name}: ${errors}`);
        });
      }

      // Process accepted files
      for (const file of acceptedFiles) {
        const validationError = validateFile(file);
        if (validationError) {
          showErrorNotification(`${file.name}: ${validationError}`);
          continue;
        }

        try {
          await uploadFile(file);
          
          if (onFileUploaded && files.length > 0) {
            // Get the uploaded file (last in the array)
            const uploadedFile = files[files.length - 1];
            onFileUploaded(uploadedFile);
          }
          
        } catch (error) {
          console.error('Upload failed:', error);
          // Error notification is handled by the store
        }
      }
    },
    [uploadFile, validateFile, onFileUploaded, files]
  );

  const { getRootProps, getInputProps, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    accept: {
      'application/json': ['.json'],
    },
    maxFiles,
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: true,
  });

  const getDropzoneStyle = () => {
    let borderColor = 'grey.300';
    let backgroundColor = 'background.default';

    if (isDragActive) {
      if (isDragAccept) {
        borderColor = 'success.main';
        backgroundColor = 'success.light';
      } else if (isDragReject) {
        borderColor = 'error.main';
        backgroundColor = 'error.light';
      }
    }

    return {
      borderColor,
      backgroundColor,
      transition: 'all 0.2s ease-in-out',
    };
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getUploadStatus = (file: UploadedFile) => {
    const progress = uploadProgress[file.file_id];
    const error = uploadErrors[file.file_id];

    if (error) {
      return { status: 'error', message: error, icon: <ErrorIcon color="error" /> };
    }

    if (progress !== undefined && progress < 100) {
      return { status: 'uploading', message: `${progress}%`, icon: <UploadIcon color="primary" /> };
    }

    if (file.status === 'uploaded') {
      return { status: 'success', message: 'Erfolgreich', icon: <SuccessIcon color="success" /> };
    }

    return { status: 'processing', message: 'Verarbeitung...', icon: <UploadIcon color="primary" /> };
  };

  return (
    <Box>
      {/* Dropzone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: 2,
          borderStyle: 'dashed',
          borderRadius: 2,
          textAlign: 'center',
          cursor: 'pointer',
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          ...getDropzoneStyle(),
        }}
      >
        <input {...getInputProps()} />
        
        <UploadIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary' }} />
        
        <Typography variant="h6" gutterBottom>
          {isDragActive
            ? isDragAccept
              ? 'Dateien hier ablegen...'
              : 'Ungültige Dateien!'
            : 'Dateien hierher ziehen oder klicken zum Auswählen'
          }
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          JSON-Dateien bis {maxSizeMB} MB, maximal {maxFiles} Dateien
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Chip label="JSON" size="small" variant="outlined" />
          <Chip label={`Max ${maxSizeMB} MB`} size="small" variant="outlined" />
          <Chip label="Mehrere Dateien" size="small" variant="outlined" />
        </Box>
      </Paper>

      {/* Upload Guidelines */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Unterstützte Dateien:</strong> IFC JSON-Dateien (.json) aus IFC-Konvertierungstools.
          Die Dateien sollten gültige IFC-Datenstrukturen enthalten für optimale Analyseergebnisse.
        </Typography>
      </Alert>

      {/* File List */}
      {files.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Hochgeladene Dateien ({files.length})
            </Typography>
            
            <List>
              {files.map((file) => {
                const status = getUploadStatus(file);
                const progress = uploadProgress[file.file_id];
                
                return (
                  <ListItem key={file.file_id} divider>
                    <ListItemIcon>
                      {status.icon}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={file.filename}
                      secondary={
                        <span>
                          <Typography component="span" variant="body2" color="text.secondary">
                            {formatFileSize(file.size)} • {status.message}
                          </Typography>
                          
                          {progress !== undefined && progress < 100 && (
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{ mt: 1, width: '100%', display: 'block' }}
                            />
                          )}
                          
                          {file.validation_result && (
                            <span style={{ display: 'block', marginTop: '8px' }}>
                              {file.validation_result.is_valid ? (
                                <Chip
                                  label={`${file.validation_result.estimated_chunks} Chunks geschätzt`}
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              ) : (
                                <Chip
                                  label="Validierung fehlgeschlagen"
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                />
                              )}
                            </span>
                          )}
                        </span>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {status.status === 'error' && (
                          <IconButton
                            size="small"
                            onClick={() => uploadFile(new File([], file.filename))}
                            title="Erneut versuchen"
                          >
                            <RetryIcon />
                          </IconButton>
                        )}
                        
                        <IconButton
                          size="small"
                          onClick={() => {
                            // TODO: Implement file deletion
                            showSuccessNotification('Löschen wird in zukünftiger Version implementiert');
                          }}
                          title="Datei löschen"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default FileDropzone;