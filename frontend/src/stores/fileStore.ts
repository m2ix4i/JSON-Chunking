/**
 * File management store using Zustand.
 */

import { create } from 'zustand';
import { FileUploadResponse } from '@types/api';
import apiService from '@services/api';

interface FileStore {
  // State
  files: FileUploadResponse[];
  selectedFile: FileUploadResponse | null;
  uploadProgress: number;
  isUploading: boolean;
  error: string | null;

  // Actions
  setFiles: (files: FileUploadResponse[]) => void;
  setSelectedFile: (file: FileUploadResponse | null) => void;
  addFile: (file: FileUploadResponse) => void;
  updateFile: (fileId: string, updates: Partial<FileUploadResponse>) => void;
  removeFile: (fileId: string) => void;
  setUploadProgress: (progress: number) => void;
  setIsUploading: (uploading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions
  uploadFile: (file: File) => Promise<boolean>;
  loadFiles: () => Promise<void>;
  deleteFile: (fileId: string) => Promise<boolean>;
  refreshFileStatus: (fileId: string) => Promise<void>;
}

export const useFileStore = create<FileStore>((set, get) => ({
  // Initial state
  files: [],
  selectedFile: null,
  uploadProgress: 0,
  isUploading: false,
  error: null,

  // Synchronous actions
  setFiles: (files) => set({ files }),
  
  setSelectedFile: (file) => set({ selectedFile: file }),
  
  addFile: (file) => set((state) => ({ 
    files: [...state.files, file] 
  })),
  
  updateFile: (fileId, updates) => set((state) => ({
    files: state.files.map(file => 
      file.file_id === fileId ? { ...file, ...updates } : file
    ),
    selectedFile: state.selectedFile?.file_id === fileId 
      ? { ...state.selectedFile, ...updates }
      : state.selectedFile
  })),
  
  removeFile: (fileId) => set((state) => ({
    files: state.files.filter(file => file.file_id !== fileId),
    selectedFile: state.selectedFile?.file_id === fileId ? null : state.selectedFile
  })),
  
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setIsUploading: (uploading) => set({ isUploading: uploading }),
  setError: (error) => set({ error }),

  // Async actions
  uploadFile: async (file: File) => {
    const { setIsUploading, setUploadProgress, setError, addFile } = get();
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiService.uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        addFile(response.data);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
        return true;
      } else {
        setError(response.message);
        setIsUploading(false);
        setUploadProgress(0);
        return false;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
      setIsUploading(false);
      setUploadProgress(0);
      return false;
    }
  },

  loadFiles: async () => {
    const { setFiles, setError } = get();
    
    try {
      setError(null);
      const response = await apiService.listFiles();
      
      if (response.success) {
        setFiles(response.data);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load files');
    }
  },

  deleteFile: async (fileId: string) => {
    const { removeFile, setError } = get();
    
    try {
      setError(null);
      const response = await apiService.deleteFile(fileId);
      
      if (response.success) {
        removeFile(fileId);
        return true;
      } else {
        setError(response.message);
        return false;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete file');
      return false;
    }
  },

  refreshFileStatus: async (fileId: string) => {
    const { updateFile, setError } = get();
    
    try {
      const response = await apiService.getFileStatus(fileId);
      
      if (response.success) {
        updateFile(fileId, response.data);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to refresh file status');
    }
  },
}));

// Convenience hooks
export const useFiles = () => useFileStore((state) => state.files);
export const useSelectedFile = () => useFileStore((state) => state.selectedFile);
export const useFileUpload = () => useFileStore((state) => ({
  uploadProgress: state.uploadProgress,
  isUploading: state.isUploading,
  uploadFile: state.uploadFile,
}));
export const useFileError = () => useFileStore((state) => state.error);