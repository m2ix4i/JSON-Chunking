/**
 * Offline file store extension
 * Extends the main file store with offline capabilities
 */

import { create } from 'zustand';
import { offlineService, CachedFile } from '@/services/offline';
import { syncService } from '@/services/sync';
import { useFileStore } from './fileStore';

interface OfflineFileState {
  // Cached files metadata
  cachedFiles: CachedFile[];
  isLoadingCache: boolean;
  
  // Upload queue for offline uploads
  queuedUploads: Array<{
    id: string;
    file: File;
    timestamp: number;
    status: 'pending' | 'syncing' | 'completed' | 'failed';
    progress: number;
  }>;
  
  // Actions
  loadCachedFiles: () => Promise<void>;
  getCachedFile: (fileId: string) => Promise<CachedFile | null>;
  cacheFileMetadata: (file: CachedFile) => Promise<boolean>;
  
  // Offline upload
  uploadOfflineFile: (file: File) => Promise<string>;
  retryFailedUploads: () => Promise<void>;
  clearCachedFiles: () => Promise<void>;
  
  // Queue management
  removeFromQueue: (uploadId: string) => void;
  updateUploadStatus: (uploadId: string, status: 'pending' | 'syncing' | 'completed' | 'failed', progress?: number) => void;
}

export const useOfflineFileStore = create<OfflineFileState>((set, get) => ({
  cachedFiles: [],
  isLoadingCache: false,
  queuedUploads: [],

  loadCachedFiles: async () => {
    set({ isLoadingCache: true });
    
    try {
      const cachedFiles = await offlineService.getAllFiles();
      set({ cachedFiles, isLoadingCache: false });
    } catch (error) {
      console.error('Failed to load cached files:', error);
      set({ isLoadingCache: false });
    }
  },

  getCachedFile: async (fileId: string) => {
    try {
      return await offlineService.getCachedFile(fileId);
    } catch (error) {
      console.error('Failed to get cached file:', error);
      return null;
    }
  },

  cacheFileMetadata: async (file: CachedFile) => {
    try {
      const success = await offlineService.cacheFile(file);
      
      if (success) {
        // Refresh cached files list
        await get().loadCachedFiles();
      }
      
      return success;
    } catch (error) {
      console.error('Failed to cache file metadata:', error);
      return false;
    }
  },

  uploadOfflineFile: async (file: File) => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to local queue
    const queuedUpload = {
      id: uploadId,
      file,
      timestamp: Date.now(),
      status: 'pending' as const,
      progress: 0,
    };
    
    set((state) => ({
      queuedUploads: [...state.queuedUploads, queuedUpload],
    }));

    try {
      // Create file metadata for caching
      const fileMetadata: CachedFile = {
        id: uploadId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date().toISOString(),
        cached: true,
      };

      // Cache file metadata immediately
      await get().cacheFileMetadata(fileMetadata);

      // Store file data for upload when online
      const fileData = {
        uploadId,
        file: file,
        metadata: fileMetadata,
      };

      // Add to sync queue
      await syncService.addToQueue('upload', fileData);

      // Try to upload immediately if online
      if (navigator.onLine) {
        try {
          get().updateUploadStatus(uploadId, 'syncing', 0);
          
          const fileStore = useFileStore.getState();
          await fileStore.uploadFile(file);
          
          get().updateUploadStatus(uploadId, 'completed', 100);
          get().removeFromQueue(uploadId);
        } catch (error) {
          console.warn('Online upload failed, will retry when connection improves:', error);
          get().updateUploadStatus(uploadId, 'pending', 0);
        }
      }

      return uploadId;
    } catch (error) {
      console.error('Failed to queue offline upload:', error);
      get().updateUploadStatus(uploadId, 'failed', 0);
      throw error;
    }
  },

  retryFailedUploads: async () => {
    const { queuedUploads } = get();
    const failedUploads = queuedUploads.filter(u => u.status === 'failed');

    for (const upload of failedUploads) {
      try {
        get().updateUploadStatus(upload.id, 'syncing', 0);
        
        // Re-add to sync queue
        await syncService.addToQueue('upload', {
          uploadId: upload.id,
          file: upload.file,
          metadata: {
            id: upload.id,
            name: upload.file.name,
            size: upload.file.size,
            type: upload.file.type,
            uploadDate: new Date(upload.timestamp).toISOString(),
            cached: true,
          },
        });

        get().updateUploadStatus(upload.id, 'pending', 0);
      } catch (error) {
        console.error('Failed to retry upload:', upload.id, error);
        get().updateUploadStatus(upload.id, 'failed', 0);
      }
    }
  },

  clearCachedFiles: async () => {
    try {
      // Clear cached file metadata
      const { cachedFiles } = get();
      for (const file of cachedFiles) {
        // Remove from offline service cache
        // Note: This would need to be implemented in the offline service
      }
      
      set({ cachedFiles: [], queuedUploads: [] });
    } catch (error) {
      console.error('Failed to clear cached files:', error);
    }
  },

  removeFromQueue: (uploadId: string) => {
    set((state) => ({
      queuedUploads: state.queuedUploads.filter(u => u.id !== uploadId),
    }));
  },

  updateUploadStatus: (uploadId: string, status: 'pending' | 'syncing' | 'completed' | 'failed', progress = 0) => {
    set((state) => ({
      queuedUploads: state.queuedUploads.map((u) =>
        u.id === uploadId ? { ...u, status, progress } : u
      ),
    }));
  },
}));

// Enhanced file upload hook that includes offline support
export const useEnhancedFileUpload = () => {
  const fileStore = useFileStore();
  const offlineStore = useOfflineFileStore();
  
  const uploadFile = async (file: File) => {
    try {
      if (navigator.onLine) {
        // Try online upload first
        try {
          await fileStore.uploadFile(file);
          
          // Cache file metadata after successful upload
          const uploadedFile = fileStore.files.find(f => f.filename === file.name);
          if (uploadedFile) {
            const cachedFile: CachedFile = {
              id: uploadedFile.file_id,
              name: uploadedFile.filename,
              size: uploadedFile.size,
              type: uploadedFile.content_type,
              uploadDate: uploadedFile.upload_timestamp,
              cached: true,
            };
            
            await offlineStore.cacheFileMetadata(cachedFile);
          }
        } catch (error) {
          console.warn('Online upload failed, falling back to offline mode:', error);
          await offlineStore.uploadOfflineFile(file);
        }
      } else {
        // Upload to offline queue
        await offlineStore.uploadOfflineFile(file);
      }
    } catch (error: any) {
      console.error('Enhanced file upload failed:', error);
      throw error;
    }
  };

  return {
    ...fileStore,
    ...offlineStore,
    uploadFile,
  };
};

// Selectors for offline file functionality
export const useCachedFiles = () => useOfflineFileStore((state) => state.cachedFiles);
export const useQueuedUploads = () => useOfflineFileStore((state) => state.queuedUploads);
export const useOfflineFileActions = () => useOfflineFileStore((state) => ({
  loadCachedFiles: state.loadCachedFiles,
  getCachedFile: state.getCachedFile,
  cacheFileMetadata: state.cacheFileMetadata,
  uploadOfflineFile: state.uploadOfflineFile,
  retryFailedUploads: state.retryFailedUploads,
  clearCachedFiles: state.clearCachedFiles,
}));

// Hook for managing offline uploads with progress
export const useOfflineUploadManager = () => {
  const queuedUploads = useQueuedUploads();
  const { retryFailedUploads, removeFromQueue } = useOfflineFileActions();

  const pendingUploads = queuedUploads.filter(u => u.status === 'pending');
  const syncingUploads = queuedUploads.filter(u => u.status === 'syncing');
  const failedUploads = queuedUploads.filter(u => u.status === 'failed');
  const completedUploads = queuedUploads.filter(u => u.status === 'completed');

  const totalProgress = queuedUploads.length > 0 
    ? queuedUploads.reduce((sum, upload) => sum + upload.progress, 0) / queuedUploads.length
    : 0;

  return {
    queuedUploads,
    pendingUploads,
    syncingUploads,
    failedUploads,
    completedUploads,
    totalProgress,
    retryFailedUploads,
    removeFromQueue,
    hasQueuedUploads: queuedUploads.length > 0,
    hasFailedUploads: failedUploads.length > 0,
  };
};

export default useOfflineFileStore;