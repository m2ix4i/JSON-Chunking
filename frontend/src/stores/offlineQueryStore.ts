/**
 * Offline query store extension
 * Extends the main query store with offline capabilities
 */

import { create } from 'zustand';
import { offlineService, CachedQuery } from '@/services/offline';
import { syncService } from '@/services/sync';
import { useQueryStore } from './queryStore';

interface OfflineQueryState {
  // Cached queries
  cachedQueries: CachedQuery[];
  isLoadingCache: boolean;
  
  // Offline queue
  queuedQueries: Array<{
    id: string;
    query: string;
    fileId: string;
    timestamp: number;
    status: 'pending' | 'syncing' | 'completed' | 'failed';
  }>;
  
  // Actions
  loadCachedQueries: () => Promise<void>;
  getCachedQuery: (query: string, fileId?: string) => Promise<CachedQuery | null>;
  cacheQueryResult: (query: string, results: any, fileId?: string) => Promise<boolean>;
  
  // Offline query submission
  submitOfflineQuery: (query: string, fileId: string) => Promise<string>;
  retryFailedQueries: () => Promise<void>;
  clearCachedQueries: () => Promise<void>;
  
  // Sync status
  updateSyncStatus: (queryId: string, status: 'pending' | 'syncing' | 'completed' | 'failed') => void;
}

export const useOfflineQueryStore = create<OfflineQueryState>((set, get) => ({
  cachedQueries: [],
  isLoadingCache: false,
  queuedQueries: [],

  loadCachedQueries: async () => {
    set({ isLoadingCache: true });
    
    try {
      const cachedQueries = await offlineService.getAllQueries();
      set({ cachedQueries, isLoadingCache: false });
    } catch (error) {
      console.error('Failed to load cached queries:', error);
      set({ isLoadingCache: false });
    }
  },

  getCachedQuery: async (query: string, fileId?: string) => {
    try {
      return await offlineService.getCachedQuery(query, fileId);
    } catch (error) {
      console.error('Failed to get cached query:', error);
      return null;
    }
  },

  cacheQueryResult: async (query: string, results: any, fileId?: string) => {
    try {
      const success = await offlineService.cacheQuery(query, results, fileId);
      
      if (success) {
        // Refresh cached queries list
        await get().loadCachedQueries();
      }
      
      return success;
    } catch (error) {
      console.error('Failed to cache query result:', error);
      return false;
    }
  },

  submitOfflineQuery: async (query: string, fileId: string) => {
    const queryId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to local queue
    const queuedQuery = {
      id: queryId,
      query,
      fileId,
      timestamp: Date.now(),
      status: 'pending' as const,
    };
    
    set((state) => ({
      queuedQueries: [...state.queuedQueries, queuedQuery],
    }));

    try {
      // Check if we have a cached result first
      const cachedResult = await offlineService.getCachedQuery(query, fileId);
      
      if (cachedResult) {
        // Use cached result
        const queryStore = useQueryStore.getState();
        queryStore.setQueryResult({
          query_id: queryId,
          results: cachedResult.results,
          status: 'completed',
          created_at: new Date(cachedResult.timestamp).toISOString(),
          completed_at: new Date().toISOString(),
        } as any);
        
        get().updateSyncStatus(queryId, 'completed');
        return queryId;
      }

      // Add to sync queue for when online
      await syncService.addToQueue('query', {
        queryId,
        query,
        fileId,
        queryConfig: useQueryStore.getState().currentQuery,
      });

      // Try to submit immediately if online
      if (navigator.onLine) {
        try {
          const queryStore = useQueryStore.getState();
          await queryStore.submitQuery(fileId);
          get().updateSyncStatus(queryId, 'completed');
        } catch (error) {
          console.warn('Online submission failed, will retry when connection improves:', error);
          get().updateSyncStatus(queryId, 'pending');
        }
      }

      return queryId;
    } catch (error) {
      console.error('Failed to submit offline query:', error);
      get().updateSyncStatus(queryId, 'failed');
      throw error;
    }
  },

  retryFailedQueries: async () => {
    const { queuedQueries } = get();
    const failedQueries = queuedQueries.filter(q => q.status === 'failed');

    for (const query of failedQueries) {
      try {
        get().updateSyncStatus(query.id, 'syncing');
        
        // Re-submit to sync queue
        await syncService.addToQueue('query', {
          queryId: query.id,
          query: query.query,
          fileId: query.fileId,
          queryConfig: useQueryStore.getState().currentQuery,
        });

        get().updateSyncStatus(query.id, 'pending');
      } catch (error) {
        console.error('Failed to retry query:', query.id, error);
        get().updateSyncStatus(query.id, 'failed');
      }
    }
  },

  clearCachedQueries: async () => {
    try {
      await offlineService.clearAllCache();
      set({ cachedQueries: [], queuedQueries: [] });
    } catch (error) {
      console.error('Failed to clear cached queries:', error);
    }
  },

  updateSyncStatus: (queryId: string, status: 'pending' | 'syncing' | 'completed' | 'failed') => {
    set((state) => ({
      queuedQueries: state.queuedQueries.map((q) =>
        q.id === queryId ? { ...q, status } : q
      ),
    }));
  },
}));

// Enhanced query submission hook that includes offline support
export const useEnhancedQuerySubmission = () => {
  const queryStore = useQueryStore();
  const offlineStore = useOfflineQueryStore();
  
  const submitQuery = async (fileId: string) => {
    const { currentQuery } = queryStore;
    
    if (!currentQuery.text.trim()) {
      queryStore.setError('Query text is required');
      return;
    }

    queryStore.setIsSubmitting(true);
    queryStore.setError(null);

    try {
      if (navigator.onLine) {
        // Try online submission first
        try {
          await queryStore.submitQuery(fileId);
          
          // Cache the result when it completes
          const monitorForCaching = () => {
            const interval = setInterval(() => {
              const { queryResult } = useQueryStore.getState();
              if (queryResult && queryResult.status === 'completed') {
                offlineStore.cacheQueryResult(
                  currentQuery.text,
                  queryResult.results,
                  fileId
                );
                clearInterval(interval);
              }
            }, 1000);
            
            // Clear interval after 5 minutes to avoid memory leaks
            setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
          };
          
          monitorForCaching();
        } catch (error) {
          console.warn('Online submission failed, falling back to offline mode:', error);
          await offlineStore.submitOfflineQuery(currentQuery.text, fileId);
        }
      } else {
        // Submit to offline queue
        await offlineStore.submitOfflineQuery(currentQuery.text, fileId);
      }
    } catch (error: any) {
      console.error('Enhanced query submission failed:', error);
      queryStore.setError(error.message || 'Failed to submit query');
    } finally {
      queryStore.setIsSubmitting(false);
    }
  };

  return {
    ...queryStore,
    ...offlineStore,
    submitQuery,
  };
};

// Selectors for offline query functionality
export const useCachedQueries = () => useOfflineQueryStore((state) => state.cachedQueries);
export const useQueuedQueries = () => useOfflineQueryStore((state) => state.queuedQueries);
export const useOfflineQueryActions = () => useOfflineQueryStore((state) => ({
  loadCachedQueries: state.loadCachedQueries,
  getCachedQuery: state.getCachedQuery,
  cacheQueryResult: state.cacheQueryResult,
  submitOfflineQuery: state.submitOfflineQuery,
  retryFailedQueries: state.retryFailedQueries,
  clearCachedQueries: state.clearCachedQueries,
}));

export default useOfflineQueryStore;