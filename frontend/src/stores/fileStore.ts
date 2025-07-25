/**
 * File management store using Zustand.
 * Handles file uploads, status tracking, and selection.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiService } from '@/services/api';
import { showSuccessNotification, showErrorNotification } from './appStore';
import type { FileState, UploadedFile } from '@/types/app';
import type { FileUploadProgress } from '@/types/api';

interface FileStoreState extends FileState {
  // Actions
  uploadFile: (file: File) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  selectFile: (fileId: string | null) => void;
  refreshFiles: () => Promise<void>;
  
  // Upload progress tracking
  setUploadProgress: (fileId: string, progress: number) => void;
  setUploadError: (fileId: string, error: string) => void;
  clearUploadError: (fileId: string) => void;
  
  // File status updates
  updateFileStatus: (fileId: string, updates: Partial<UploadedFile>) => void;
  
  // Utilities
  getSelectedFile: () => UploadedFile | null;
  getFileById: (fileId: string) => UploadedFile | null;
  clearAll: () => void;
}

const initialState: FileState = {
  files: [],
  selectedFileId: null,
  uploadProgress: {},
  uploadErrors: {},
};

export const useFileStore = create<FileStoreState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Upload a new file
      uploadFile: async (file: File) => {
        const tempId = `temp_${Date.now()}`;
        
        try {
          // Add temporary file entry
          const tempFile: UploadedFile = {
            file_id: tempId,
            filename: file.name,
            size: file.size,
            content_type: file.type,
            upload_timestamp: new Date().toISOString(),
            status: 'processing',
            uploadProgress: 0,
          };

          set(
            (state) => ({
              ...state,
              files: [...state.files, tempFile],
              uploadProgress: { ...state.uploadProgress, [tempId]: 0 },
            }),
            false,
            'uploadFile-start'
          );

          // Upload with progress tracking
          const result = await apiService.uploadFile(file, (progress: FileUploadProgress) => {
            get().setUploadProgress(tempId, progress.percentage);
          });

          // Replace temporary file with actual result
          set(
            (state) => ({
              ...state,
              files: state.files.map((f) =>
                f.file_id === tempId
                  ? { ...result, uploadProgress: 100 }
                  : f
              ),
              uploadProgress: { ...state.uploadProgress, [result.file_id]: 100 },
            }),
            false,
            'uploadFile-complete'
          );

          // Remove temporary progress entry and add real one
          setTimeout(() => {
            set(
              (state) => {
                const newProgress = { ...state.uploadProgress };
                delete newProgress[tempId];
                return { ...state, uploadProgress: newProgress };
              },
              false,
              'uploadFile-cleanup'
            );
          }, 2000);

          showSuccessNotification(`Datei "${file.name}" erfolgreich hochgeladen`);

        } catch (error) {
          // Remove temporary file and show error
          set(
            (state) => ({
              ...state,
              files: state.files.filter((f) => f.file_id !== tempId),
              uploadErrors: {
                ...state.uploadErrors,
                [tempId]: error instanceof Error ? error.message : 'Upload fehlgeschlagen',
              },
            }),
            false,
            'uploadFile-error'
          );

          showErrorNotification(
            `Upload von "${file.name}" fehlgeschlagen: ${
              error instanceof Error ? error.message : 'Unbekannter Fehler'
            }`
          );

          throw error;
        }
      },

      // Delete a file
      deleteFile: async (fileId: string) => {
        try {
          await apiService.deleteFile(fileId);

          set(
            (state) => ({
              ...state,
              files: state.files.filter((f) => f.file_id !== fileId),
              selectedFileId: state.selectedFileId === fileId ? null : state.selectedFileId,
            }),
            false,
            'deleteFile'
          );

          showSuccessNotification('Datei erfolgreich gelöscht');

        } catch (error) {
          showErrorNotification(
            `Löschen fehlgeschlagen: ${
              error instanceof Error ? error.message : 'Unbekannter Fehler'
            }`
          );
          throw error;
        }
      },

      // Select a file for querying
      selectFile: (fileId) => {
        set(
          (state) => ({ ...state, selectedFileId: fileId }),
          false,
          'selectFile'
        );
      },

      // Refresh file list from server
      refreshFiles: async () => {
        try {
          const files = await apiService.listFiles();
          set(
            (state) => ({ ...state, files }),
            false,
            'refreshFiles'
          );
        } catch (error) {
          showErrorNotification(
            `Dateien laden fehlgeschlagen: ${
              error instanceof Error ? error.message : 'Unbekannter Fehler'
            }`
          );
          throw error;
        }
      },

      // Upload progress tracking
      setUploadProgress: (fileId, progress) => {
        set(
          (state) => ({
            ...state,
            uploadProgress: { ...state.uploadProgress, [fileId]: progress },
            files: state.files.map((f) =>
              f.file_id === fileId ? { ...f, uploadProgress: progress } : f
            ),
          }),
          false,
          'setUploadProgress'
        );
      },

      setUploadError: (fileId, error) => {
        set(
          (state) => ({
            ...state,
            uploadErrors: { ...state.uploadErrors, [fileId]: error },
            files: state.files.map((f) =>
              f.file_id === fileId ? { ...f, uploadError: error } : f
            ),
          }),
          false,
          'setUploadError'
        );
      },

      clearUploadError: (fileId) => {
        set(
          (state) => {
            const newErrors = { ...state.uploadErrors };
            delete newErrors[fileId];
            return {
              ...state,
              uploadErrors: newErrors,
              files: state.files.map((f) =>
                f.file_id === fileId ? { ...f, uploadError: undefined } : f
              ),
            };
          },
          false,
          'clearUploadError'
        );
      },

      // File status updates
      updateFileStatus: (fileId, updates) => {
        set(
          (state) => ({
            ...state,
            files: state.files.map((f) =>
              f.file_id === fileId ? { ...f, ...updates } : f
            ),
          }),
          false,
          'updateFileStatus'
        );
      },

      // Utility functions
      getSelectedFile: () => {
        const state = get();
        return state.files.find((f) => f.file_id === state.selectedFileId) || null;
      },

      getFileById: (fileId) => {
        return get().files.find((f) => f.file_id === fileId) || null;
      },

      clearAll: () => {
        set(initialState, false, 'clearAll');
      },
    }),
    {
      name: 'file-store',
    }
  )
);

// Selectors
export const useFiles = () => useFileStore((state) => state.files);
export const useSelectedFileId = () => useFileStore((state) => state.selectedFileId);
export const useSelectedFile = () => useFileStore((state) => state.getSelectedFile());
export const useUploadProgress = () => useFileStore((state) => state.uploadProgress);
export const useUploadErrors = () => useFileStore((state) => state.uploadErrors);

// Utility hooks
export const useFileUpload = () => {
  const uploadFile = useFileStore((state) => state.uploadFile);
  const uploadProgress = useFileStore((state) => state.uploadProgress);
  const uploadErrors = useFileStore((state) => state.uploadErrors);

  return {
    uploadFile,
    uploadProgress,
    uploadErrors,
  };
};

export const useFileSelection = () => {
  const selectedFileId = useFileStore((state) => state.selectedFileId);
  const selectedFile = useFileStore((state) => state.getSelectedFile());
  const selectFile = useFileStore((state) => state.selectFile);
  const files = useFileStore((state) => state.files);

  return {
    selectedFileId,
    selectedFile,
    selectFile,
    files,
  };
};