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
  enableBulkSelection = false,
}) => {
  const navigate = useNavigate();
  const { files, selectedFileId, selectFile } = useFileSelection();
  const deleteFile = useFileStore((state) => state.deleteFile);

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<UploadedFile | null>(null);
  
  // Bulk selection state
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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

  // Bulk selection handlers
  const handleBulkSelect = (fileId: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, fileId]);
    } else {
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  const handleSelectAll = () => {
    setSelectedFiles(files.map(f => f.file_id));
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
  };

  const handleBulkDelete = () => {
    setBulkDeleteOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      // Delete files one by one (could be optimized with bulk API later)
      for (const fileId of selectedFiles) {
        await deleteFile(fileId);
      }
      setSelectedFiles([]);
      setBulkDeleteOpen(false);
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  const handleBulkDeleteCancel = () => {
    setBulkDeleteOpen(false);
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

        {/* Bulk action toolbar */}
        {enableBulkSelection && files.length > 0 && (
          <>
            <Toolbar variant="dense" sx={{ pl: 0, pr: 0, minHeight: 48 }}>
              <Button
                size="small"
                startIcon={<SelectAllIcon />}
                onClick={handleSelectAll}
                disabled={selectedFiles.length === files.length}
              >
                Alle auswählen
              </Button>
              <Button
                size="small"
                startIcon={<ClearAllIcon />}
                onClick={handleClearSelection}
                disabled={selectedFiles.length === 0}
                sx={{ ml: 1 }}
              >
                Auswahl aufheben
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              {selectedFiles.length > 0 && (
                <Button
                  size="small"
                  color="error"
                  startIcon={<BulkDeleteIcon />}
                  onClick={handleBulkDelete}
                >
                  {selectedFiles.length} löschen
                </Button>
              )}
            </Toolbar>
            <Divider sx={{ mb: 1 }} />
          </>
        )}

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
            const isBulkSelected = selectedFiles.includes(file.file_id);

            return (
              <ListItem
                key={file.file_id}
                button
                onClick={() => enableBulkSelection ? undefined : handleFileSelect(file.file_id)}
                sx={{ 
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: isSelected ? 'action.selected' : 'transparent',
                }}
              >
                <ListItemIcon>
                  {enableBulkSelection ? (
                    <Checkbox
                      checked={isBulkSelected}
                      onChange={(e) => handleBulkSelect(file.file_id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <Radio
                      checked={isSelected}
                      onChange={() => handleFileSelect(file.file_id)}
                      value={file.file_id}
                      name="file-selector"
                    />
                  )}
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

                {/* Delete button - only show in single-selection mode */}
                {!enableBulkSelection && (
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={(e) => handleDeleteClick(e, file)}
                    size="small"
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
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

        {/* Bulk delete confirmation dialog */}
        <Dialog
          open={bulkDeleteOpen}
          onClose={handleBulkDeleteCancel}
          aria-labelledby="bulk-delete-dialog-title"
          aria-describedby="bulk-delete-dialog-description"
        >
          <DialogTitle id="bulk-delete-dialog-title">
            Mehrere Dateien löschen
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="bulk-delete-dialog-description">
              Möchten Sie {selectedFiles.length} ausgewählte Datei(en) wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleBulkDeleteCancel} color="primary">
              Abbrechen
            </Button>
            <Button onClick={handleBulkDeleteConfirm} color="error" variant="contained">
              {selectedFiles.length} Dateien löschen
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default FileSelector;