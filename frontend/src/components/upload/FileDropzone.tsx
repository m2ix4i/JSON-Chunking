/**
 * Enhanced file dropzone component with error handling and validation.
 */

import React, { useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

// Store hooks
import { useFileActions } from '@stores/fileStore';
import { normalizeError, getFileUploadErrorMessage } from '@utils/errorUtils';

export interface FileDropzoneProps {
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  onError?: (error: unknown) => void;
  disabled?: boolean;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({
  maxFiles = 5,
  maxSizeMB = 100,
  acceptedTypes = ['.json'],
  onError,
  disabled = false,
}) => {
  const { startUpload, cancelUpload, retryUpload } = useFileActions();
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, {
    file: File;
    progress: number;
    error?: string;
    id: string;
  }>>({});

  const validateFile = useCallback((file: File): string | null => {
    const sizeMB = file.size / (1024 * 1024);
    
    if (sizeMB > maxSizeMB) {
      return `Datei ist zu groß (${sizeMB.toFixed(1)} MB). Maximum: ${maxSizeMB} MB`;
    }
    
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `Dateityp wird nicht unterstützt. Erlaubt: ${acceptedTypes.join(', ')}`;
    }
    
    if (file.size === 0) {
      return 'Datei ist leer';
    }

    return null;
  }, [maxSizeMB, acceptedTypes]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return;

    for (const file of acceptedFiles) {
      const validationError = validateFile(file);
      const fileId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (validationError) {
        setUploadingFiles(prev => ({
          ...prev,
          [fileId]: {
            file,
            progress: 0,
            error: validationError,
            id: fileId,
          },
        }));
        
        if (onError) {
          onError(new Error(validationError));
        }
        continue;
      }

      // Add to uploading state
      setUploadingFiles(prev => ({
        ...prev,
        [fileId]: {
          file,
          progress: 0,
          id: fileId,
        },
      }));

      try {
        await startUpload(file);
        
        // Remove from uploading state on success
        setUploadingFiles(prev => {
          const { [fileId]: removed, ...remaining } = prev;
          return remaining;
        });

      } catch (error) {
        const normalizedError = normalizeError(error);
        const errorMessage = getFileUploadErrorMessage(normalizedError, file.name);
        
        setUploadingFiles(prev => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            error: errorMessage,
          },
        }));

        if (onError) {
          onError(error);
        }
      }
    }
  }, [disabled, validateFile, startUpload, onError]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections,
  } = useDropzone({
    onDrop,
    maxFiles,
    accept: {
      'application/json': acceptedTypes,
    },
    disabled,
  });

  const handleRemoveFile = (fileId: string) => {
    setUploadingFiles(prev => {
      const { [fileId]: removed, ...remaining } = prev;
      return remaining;
    });
  };

  const handleRetryFile = async (fileId: string) => {
    const uploadingFile = uploadingFiles[fileId];
    if (!uploadingFile) return;

    setUploadingFiles(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        error: undefined,
        progress: 0,
      },
    }));

    try {
      await startUpload(uploadingFile.file);
      
      setUploadingFiles(prev => {
        const { [fileId]: removed, ...remaining } = prev;
        return remaining;
      });

    } catch (error) {
      const normalizedError = normalizeError(error);
      const errorMessage = getFileUploadErrorMessage(normalizedError, uploadingFile.file.name);
      
      setUploadingFiles(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          error: errorMessage,
        },
      }));
    }
  };

  const uploadingFilesList = Object.values(uploadingFiles);

  return (
    <Box>
      {/* File Drop Area */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: '2px dashed',
          borderColor: isDragActive 
            ? 'primary.main' 
            : isDragReject 
            ? 'error.main'
            : 'grey.300',
          backgroundColor: isDragActive 
            ? 'primary.50' 
            : isDragReject 
            ? 'error.50'
            : disabled
            ? 'grey.100'
            : 'background.default',
          transition: 'all 0.2s ease-in-out',
          '&:hover': !disabled ? {
            borderColor: 'primary.main',
            backgroundColor: 'primary.50',
          } : {},
        }}
      >
        <input {...getInputProps()} />
        
        <UploadIcon 
          sx={{ 
            fontSize: 64, 
            color: disabled ? 'grey.400' : 'primary.main',
            mb: 2,
          }} 
        />
        
        <Typography variant="h6" gutterBottom>
          {isDragActive 
            ? 'Dateien hier ablegen...'
            : 'Dateien hierher ziehen oder klicken zum Auswählen'
          }
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Unterstützte Formate: {acceptedTypes.join(', ')} • 
          Maximale Größe: {maxSizeMB} MB • 
          Maximal {maxFiles} Dateien
        </Typography>

        <Button
          variant="contained"
          disabled={disabled}
          sx={{ mt: 1 }}
        >
          Dateien auswählen
        </Button>
      </Paper>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Folgende Dateien wurden abgelehnt:
          </Typography>
          {fileRejections.map(({ file, errors }) => (
            <Typography key={file.name} variant="body2">
              • {file.name}: {errors.map(e => e.message).join(', ')}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Uploading Files */}
      {uploadingFilesList.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Upload-Status
          </Typography>
          
          <List>
            {uploadingFilesList.map((uploadFile) => (
              <ListItem key={uploadFile.id}>
                <ListItemIcon>
                  {uploadFile.error ? (
                    <ErrorIcon color="error" />
                  ) : uploadFile.progress === 100 ? (
                    <SuccessIcon color="success" />
                  ) : (
                    <FileIcon />
                  )}
                </ListItemIcon>
                
                <ListItemText
                  primary={uploadFile.file.name}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {(uploadFile.file.size / (1024 * 1024)).toFixed(1)} MB
                      </Typography>
                      
                      {uploadFile.error ? (
                        <Chip 
                          label={uploadFile.error} 
                          color="error" 
                          size="small" 
                          sx={{ mt: 0.5 }}
                        />
                      ) : (
                        <LinearProgress
                          variant="determinate"
                          value={uploadFile.progress}
                          sx={{ mt: 1, width: '100%' }}
                        />
                      )}
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  {uploadFile.error ? (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        onClick={() => handleRetryFile(uploadFile.id)}
                      >
                        Wiederholen
                      </Button>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveFile(uploadFile.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ) : (
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveFile(uploadFile.id)}
                    >
                      <CancelIcon />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default FileDropzone;