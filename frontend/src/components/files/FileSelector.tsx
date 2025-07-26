/**
 * File selector component for choosing uploaded files.
 * Provides radio-button selection interface with file details.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Radio,
  Chip,
  Alert,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Checkbox,
  Toolbar,
  Divider,
} from '@mui/material';
import {
  Description as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  SelectAll as SelectAllIcon,
  ClearAll as ClearAllIcon,
  DeleteSweep as BulkDeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Store hooks
import { useFileSelection, useFileStore } from '@stores/fileStore';

// Utils
import { formatFileSize, formatTimestamp } from '@utils/time';

// Types
import type { UploadedFile } from '@/types/app';

interface FileSelectorProps {
  title?: string;
  showUploadPrompt?: boolean;
  compact?: boolean;
  onFileSelected?: (file: UploadedFile | null) => void;
  enableBulkSelection?: boolean;
}

const FileSelector: React.FC<FileSelectorProps> = ({
  title = "Datei auswählen",
  showUploadPrompt = true,
  compact = false,
  onFileSelected,
}) => {
  const navigate = useNavigate();
  const { files, selectedFileId, selectFile } = useFileSelection();
  const deleteFile = useFileStore((state) => state.deleteFile);

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<UploadedFile | null>(null);

  // Memoize the selected file to avoid unnecessary lookups
  const selectedFile = useMemo(() => 
    selectedFileId ? files.find(f => f.file_id === selectedFileId) || null : null,
    [selectedFileId, files]
  );

  const handleFileSelect = (fileId: string | null) => {
    selectFile(fileId);
    
    // Call callback if provided
    if (onFileSelected) {
      const file = fileId ? files.find(f => f.file_id === fileId) || null : null;
      onFileSelected(file);
    }
  };

  const getFileStatus = (file: UploadedFile) => {
    if (file.status === 'uploaded') {
      return { icon: <SuccessIcon color="success" />, label: 'Bereit', color: 'success' as const };
    } else if (file.status === 'failed') {
      return { icon: <ErrorIcon color="error" />, label: 'Fehler', color: 'error' as const };
    } else {
      return { icon: <FileIcon color="primary" />, label: 'Verarbeitung', color: 'primary' as const };
    }
  };

  // Delete handlers
  const handleDeleteClick = (e: React.MouseEvent, file: UploadedFile) => {
    e.stopPropagation(); // Prevent file selection when clicking delete
    setFileToDelete(file);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (fileToDelete) {
      try {
        await deleteFile(fileToDelete.file_id);
        setDeleteConfirmOpen(false);
        setFileToDelete(null);
      } catch (error) {
        // Error handling is done in the store
        console.error('Delete failed:', error);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setFileToDelete(null);
  };

  // Show empty state if no files
  if (files.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          
          {showUploadPrompt ? (
            <Alert 
              severity="info" 
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  startIcon={<UploadIcon />}
                  onClick={() => navigate('/upload')}
                >
                  Hochladen
                </Button>
              }
            >
              <Typography variant="body2">
                Noch keine Dateien hochgeladen. Laden Sie zuerst eine IFC JSON-Datei hoch.
              </Typography>
            </Alert>
          ) : (
            <Typography color="text.secondary">
              Keine Dateien verfügbar
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Wählen Sie eine Datei für Ihre Abfrage aus:
        </Typography>

        <List dense={compact}>
          {/* Option to deselect */}
          <ListItem
            button
            onClick={() => handleFileSelect(null)}
            sx={{ 
              borderRadius: 1,
              mb: 1,
              bgcolor: selectedFileId === null ? 'action.selected' : 'transparent',
            }}
          >
            <ListItemIcon>
              <Radio
                checked={selectedFileId === null}
                onChange={() => handleFileSelect(null)}
                value=""
                name="file-selector"
              />
            </ListItemIcon>
            <ListItemText
              primary="Keine Datei ausgewählt"
              secondary="Dateiauswahl zurücksetzen"
            />
          </ListItem>

          {/* File options */}
          {files.map((file) => {
            const status = getFileStatus(file);
            const isSelected = selectedFileId === file.file_id;

            return (
              <ListItem
                key={file.file_id}
                button
                onClick={() => handleFileSelect(file.file_id)}
                sx={{ 
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: isSelected ? 'action.selected' : 'transparent',
                }}
              >
                <ListItemIcon>
                  <Radio
                    checked={isSelected}
                    onChange={() => handleFileSelect(file.file_id)}
                    value={file.file_id}
                    name="file-selector"
                  />
                </ListItemIcon>

                <ListItemIcon>
                  {status.icon}
                </ListItemIcon>

                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" component="span">
                        {file.filename}
                      </Typography>
                      <Chip
                        label={status.label}
                        size="small"
                        color={status.color}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {formatFileSize(file.size)} • Hochgeladen: {formatTimestamp(file.upload_timestamp)}
                      {file.validation_result && (
                        <span>
                          {' • '}
                          {file.validation_result.is_valid 
                            ? `${file.validation_result.estimated_chunks} Chunks geschätzt`
                            : 'Validierung fehlgeschlagen'
                          }
                        </span>
                      )}
                    </Typography>
                  }
                />

                {/* Delete button */}
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={(e) => handleDeleteClick(e, file)}
                  size="small"
                  sx={{ ml: 1 }}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItem>
            );
          })}
        </List>

        {/* Selected file summary */}
        {selectedFile && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Ausgewählt:</strong> {selectedFile.filename}
            </Typography>
          </Alert>
        )}

        {/* Upload more files option */}
        {showUploadPrompt && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => navigate('/upload')}
              size="small"
            >
              Weitere Dateien hochladen
            </Button>
          </Box>
        )}

        {/* Delete confirmation dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={handleDeleteCancel}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">
            Datei löschen
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              Möchten Sie die Datei "{fileToDelete?.filename}" wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} color="primary">
              Abbrechen
            </Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Löschen
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default FileSelector;