/**
 * File management state with error handling and upload progress tracking.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { handleGlobalError, showSuccessNotification, showErrorNotification } from './appStore';
import { normalizeError, getFileUploadErrorMessage, isRetryableError, getRetryDelay } from '@utils/errorUtils';

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number; // bytes per second
  timeRemaining?: number; // seconds
}

export interface UploadedFile {
  file_id: string;
  filename: string;
  size: number;
  upload_date: string;
  status: 'uploading' | 'processing' | 'ready' | 'error' | 'cancelled';
  progress?: FileUploadProgress;
  error_message?: string;
  retry_count?: number;
}

interface FileState {
  // File Management
  files: Record<string, UploadedFile>;
  selectedFileId: string | null;
  
  // Upload State
  isUploading: boolean;
  uploadQueue: File[];
  activeUploads: Record<string, AbortController>;
  
  // Actions
  addFile: (file: UploadedFile) => void;
  updateFile: (fileId: string, updates: Partial<UploadedFile>) => void;
  removeFile: (fileId: string) => void;
  selectFile: (fileId: string | null) => void;
  
  // Upload Actions
  startUpload: (file: File) => Promise<string>;
  updateUploadProgress: (fileId: string, progress: FileUploadProgress) => void;
  cancelUpload: (fileId: string) => void;
  retryUpload: (fileId: string) => Promise<void>;
  
  // Queue Management
  addToQueue: (file: File) => void;
  removeFromQueue: (fileIndex: number) => void;
  clearQueue: () => void;
  processQueue: () => Promise<void>;
  
  // Utility
  getSelectedFile: () => UploadedFile | null;
  getFilesByStatus: (status: UploadedFile['status']) => UploadedFile[];
  clearErrors: () => void;
}

// Mock API functions (replace with actual API calls)
const uploadFileToAPI = async (
  file: File,
  onProgress: (progress: FileUploadProgress) => void,
  abortSignal: AbortSignal
): Promise<{ file_id: string; filename: string }> => {
  return new Promise((resolve, reject) => {
    if (abortSignal.aborted) {
      reject(new Error('Upload cancelled'));
      return;
    }

    // Simulate file validation
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      reject({ code: 'FILE_TOO_LARGE', message: 'File too large' });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      reject({ code: 'FILE_TYPE_NOT_SUPPORTED', message: 'Only JSON files are supported' });
      return;
    }

    // Simulate upload progress
    let loaded = 0;
    const total = file.size;
    const startTime = Date.now();
    
    const uploadInterval = setInterval(() => {
      if (abortSignal.aborted) {
        clearInterval(uploadInterval);
        reject(new Error('Upload cancelled'));
        return;
      }

      loaded = Math.min(loaded + Math.random() * total * 0.1, total);
      const percentage = Math.round((loaded / total) * 100);
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = loaded / elapsed;
      const timeRemaining = elapsed > 0 ? (total - loaded) / speed : 0;

      onProgress({
        loaded,
        total,
        percentage,
        speed,
        timeRemaining,
      });

      if (loaded >= total) {
        clearInterval(uploadInterval);
        // Simulate processing time
        setTimeout(() => {
          resolve({
            file_id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            filename: file.name,
          });
        }, 1000);
      }
    }, 100);
  });
};

const useFileStore = create<FileState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    files: {},
    selectedFileId: null,
    isUploading: false,
    uploadQueue: [],
    activeUploads: {},

    // File Management Actions
    addFile: (file) =>
      set(state => ({
        files: { ...state.files, [file.file_id]: file },
      })),

    updateFile: (fileId, updates) =>
      set(state => ({
        files: {
          ...state.files,
          [fileId]: { ...state.files[fileId], ...updates },
        },
      })),

    removeFile: (fileId) =>
      set(state => {
        const { [fileId]: removed, ...remainingFiles } = state.files;
        return {
          files: remainingFiles,
          selectedFileId: state.selectedFileId === fileId ? null : state.selectedFileId,
        };
      }),

    selectFile: (fileId) =>
      set({ selectedFileId: fileId }),

    // Upload Actions
    startUpload: async (file: File): Promise<string> => {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const abortController = new AbortController();

      // Add file to state immediately
      const uploadFile: UploadedFile = {
        file_id: tempId,
        filename: file.name,
        size: file.size,
        upload_date: new Date().toISOString(),
        status: 'uploading',
        progress: { loaded: 0, total: file.size, percentage: 0 },
        retry_count: 0,
      };

      get().addFile(uploadFile);
      
      set(state => ({
        isUploading: true,
        activeUploads: { ...state.activeUploads, [tempId]: abortController },
      }));

      try {
        const result = await uploadFileToAPI(
          file,
          (progress) => get().updateUploadProgress(tempId, progress),
          abortController.signal
        );

        // Update with real file ID from server
        get().updateFile(tempId, {
          file_id: result.file_id,
          status: 'processing',
          progress: { loaded: file.size, total: file.size, percentage: 100 },
        });

        // Simulate processing completion
        setTimeout(() => {
          get().updateFile(result.file_id, { status: 'ready' });
          showSuccessNotification(`Datei "${file.name}" erfolgreich hochgeladen`);
        }, 2000);

        return result.file_id;

      } catch (error) {
        const normalizedError = normalizeError(error);
        const errorMessage = getFileUploadErrorMessage(normalizedError, file.name);

        get().updateFile(tempId, {
          status: 'error',
          error_message: errorMessage,
        });

        handleGlobalError(error, `File upload: ${file.name}`);
        throw error;

      } finally {
        set(state => {
          const { [tempId]: removed, ...remainingUploads } = state.activeUploads;
          return {
            activeUploads: remainingUploads,
            isUploading: Object.keys(remainingUploads).length > 0,
          };
        });
      }
    },

    updateUploadProgress: (fileId, progress) =>
      get().updateFile(fileId, { progress }),

    cancelUpload: (fileId) => {
      const { activeUploads } = get();
      const abortController = activeUploads[fileId];
      
      if (abortController) {
        abortController.abort();
        get().updateFile(fileId, { status: 'cancelled' });
        
        set(state => {
          const { [fileId]: removed, ...remainingUploads } = state.activeUploads;
          return {
            activeUploads: remainingUploads,
            isUploading: Object.keys(remainingUploads).length > 0,
          };
        });

        showInfoNotification(`Upload von "${get().files[fileId]?.filename}" abgebrochen`);
      }
    },

    retryUpload: async (fileId) => {
      const file = get().files[fileId];
      if (!file) return;

      const retryCount = (file.retry_count || 0) + 1;
      const maxRetries = 3;

      if (retryCount > maxRetries) {
        showErrorNotification('Maximale Anzahl der Wiederholungsversuche erreicht');
        return;
      }

      get().updateFile(fileId, {
        status: 'uploading',
        retry_count: retryCount,
        error_message: undefined,
        progress: { loaded: 0, total: file.size, percentage: 0 },
      });

      // Wait for retry delay
      const delay = getRetryDelay(retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        // Create a new File object for retry (simplified)
        const fileObj = new File([''], file.filename, { type: 'application/json' });
        await get().startUpload(fileObj);
      } catch (error) {
        handleGlobalError(error, `File retry: ${file.filename}`);
      }
    },

    // Queue Management
    addToQueue: (file) =>
      set(state => ({
        uploadQueue: [...state.uploadQueue, file],
      })),

    removeFromQueue: (fileIndex) =>
      set(state => ({
        uploadQueue: state.uploadQueue.filter((_, index) => index !== fileIndex),
      })),

    clearQueue: () =>
      set({ uploadQueue: [] }),

    processQueue: async () => {
      const { uploadQueue } = get();
      
      for (const file of uploadQueue) {
        try {
          await get().startUpload(file);
          get().removeFromQueue(0); // Remove first item
        } catch (error) {
          // Error handling is done in startUpload
          break; // Stop processing queue on error
        }
      }
    },

    // Utility Functions
    getSelectedFile: () => {
      const { files, selectedFileId } = get();
      return selectedFileId ? files[selectedFileId] || null : null;
    },

    getFilesByStatus: (status) => {
      const { files } = get();
      return Object.values(files).filter(file => file.status === status);
    },

    clearErrors: () =>
      set(state => ({
        files: Object.fromEntries(
          Object.entries(state.files).map(([id, file]) => [
            id,
            file.status === 'error' 
              ? { ...file, status: 'ready', error_message: undefined }
              : file
          ])
        ),
      })),
  }))
);

// Export hooks
export const useFiles = () => useFileStore(state => state.files);
export const useSelectedFile = () => useFileStore(state => state.getSelectedFile());
export const useUploadState = () => useFileStore(state => ({
  isUploading: state.isUploading,
  uploadQueue: state.uploadQueue,
}));

export const useFileActions = () => useFileStore(state => ({
  addFile: state.addFile,
  updateFile: state.updateFile,
  removeFile: state.removeFile,
  selectFile: state.selectFile,
  startUpload: state.startUpload,
  cancelUpload: state.cancelUpload,
  retryUpload: state.retryUpload,
  clearErrors: state.clearErrors,
}));

export default useFileStore;