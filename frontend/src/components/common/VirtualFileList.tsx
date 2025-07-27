/**
 * Virtual scrolling file list component for efficient rendering of large file datasets.
 * Replaces the standard List in FileSelector for better performance with 1000+ files.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  ListItem,
  ListItemIcon,
  ListItemText,
  Radio,
  Chip,
  IconButton,
  Checkbox,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Description as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

// Components
import { VirtualList } from './VirtualList';

// Store hooks
import { useFileStore } from '@stores/fileStore';

// Utils
import { formatFileSize, formatTimestamp } from '@utils/time';

// Types
import type { UploadedFile } from '@/types/app';

interface VirtualFileListProps {
  files: UploadedFile[];
  selectedFileId: string | null;
  onFileSelect: (fileId: string | null) => void;
  compact?: boolean;
  enableBulkSelection?: boolean;
  selectedFiles?: string[];
  onBulkSelect?: (fileId: string, checked: boolean) => void;
  containerHeight?: number;
}

const VirtualFileList: React.FC<VirtualFileListProps> = ({
  files,
  selectedFileId,
  onFileSelect,
  compact = false,
  enableBulkSelection = false,
  selectedFiles = [],
  onBulkSelect,
  containerHeight = 400,
}) => {
  const deleteFile = useFileStore((state) => state.deleteFile);
  
  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<UploadedFile | null>(null);

  const getFileStatus = useCallback((file: UploadedFile) => {
    if (file.status === 'uploaded') {
      return { icon: <SuccessIcon color="success" />, label: 'Bereit', color: 'success' as const };
    } else if (file.status === 'failed') {
      return { icon: <ErrorIcon color="error" />, label: 'Fehler', color: 'error' as const };
    } else {
      return { icon: <FileIcon color="primary" />, label: 'Verarbeitung', color: 'primary' as const };
    }
  }, []);

  const handleDeleteClick = useCallback((file: UploadedFile, event: React.MouseEvent) => {
    event.stopPropagation();
    setFileToDelete(file);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (fileToDelete) {
      try {
        await deleteFile(fileToDelete.file_id);
        setDeleteConfirmOpen(false);
        setFileToDelete(null);
        
        // Deselect if this was the selected file
        if (selectedFileId === fileToDelete.file_id) {
          onFileSelect(null);
        }
      } catch (error) {
        console.error('File deletion failed:', error);
      }
    }
  }, [fileToDelete, deleteFile, selectedFileId, onFileSelect]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmOpen(false);
    setFileToDelete(null);
  }, []);

  // Render function for each file item
  const renderFileItem = useCallback((file: UploadedFile, index: number) => {
    const status = getFileStatus(file);
    const isSelected = selectedFileId === file.file_id;
    const isBulkSelected = selectedFiles.includes(file.file_id);

    return (
      <ListItem
        button
        onClick={() => enableBulkSelection ? undefined : onFileSelect(file.file_id)}
        sx={{ 
          borderRadius: 1,
          mb: 1,
          bgcolor: isSelected ? 'action.selected' : 'transparent',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <ListItemIcon>
          {enableBulkSelection ? (
            <Checkbox
              checked={isBulkSelected}
              onChange={(e) => onBulkSelect?.(file.file_id, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <Radio
              checked={isSelected}
              onChange={() => onFileSelect(file.file_id)}
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {formatFileSize(file.size)} • {formatTimestamp(file.uploaded_at)}
              </Typography>
              {file.error && (
                <Typography variant="body2" color="error">
                  Fehler: {file.error}
                </Typography>
              )}
            </Box>
          }
        />

        {/* Delete button */}
        <ListItemIcon>
          <IconButton
            edge="end"
            size="small"
            onClick={(e) => handleDeleteClick(file, e)}
            sx={{ ml: 1 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </ListItemIcon>
      </ListItem>
    );
  }, [
    getFileStatus,
    selectedFileId,
    selectedFiles,
    enableBulkSelection,
    onFileSelect,
    onBulkSelect,
    handleDeleteClick
  ]);

  // Calculate item height based on compact mode
  const itemHeight = compact ? 64 : 80;

  // Prepare files with deselect option at the top
  const itemsWithDeselect = useMemo(() => {
    const deselect = {
      file_id: '__deselect__',
      filename: 'Keine Datei ausgewählt',
      size: 0,
      uploaded_at: '',
      status: 'uploaded' as const,
    };
    return [deselect, ...files];
  }, [files]);

  // Render function that handles both deselect option and regular files
  const renderItem = useCallback((item: UploadedFile, index: number) => {
    if (item.file_id === '__deselect__') {
      return (
        <ListItem
          button
          onClick={() => onFileSelect(null)}
          sx={{ 
            borderRadius: 1,
            mb: 1,
            bgcolor: selectedFileId === null ? 'action.selected' : 'transparent',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <ListItemIcon>
            <Radio
              checked={selectedFileId === null}
              onChange={() => onFileSelect(null)}
              value=""
              name="file-selector"
            />
          </ListItemIcon>
          <ListItemText
            primary="Keine Datei ausgewählt"
            secondary="Dateiauswahl zurücksetzen"
          />
        </ListItem>
      );
    }

    return renderFileItem(item, index - 1); // Subtract 1 to account for deselect option
  }, [selectedFileId, onFileSelect, renderFileItem]);

  return (
    <>
      <VirtualList
        items={itemsWithDeselect}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderItem}
        overscan={5}
        sx={{
          '& .MuiListItem-root': {
            borderRadius: 1,
          }
        }}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Datei löschen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Möchten Sie die Datei "{fileToDelete?.filename}" wirklich löschen? 
            Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VirtualFileList;