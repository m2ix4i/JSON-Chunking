/**
 * Query state management store using Zustand.
 * Provides query submission, monitoring, and state management.
 */

import { create } from 'zustand';
import { QueryResponse, QueryStatus, QueryResultResponse } from '@/types/api';

export interface CurrentQuery {
  text: string;
  intentHint?: string;
  maxConcurrent: number;
  timeoutSeconds: number;
  cacheResults: boolean;
}

interface QueryStore {
  // Current query state
  currentQuery: CurrentQuery;
  
  // Active query state
  activeQuery: QueryResponse | null;
  queryStatus: QueryStatus | null;
  queryResult: QueryResultResponse | null;
  
  // UI state
  isSubmitting: boolean;
  isConnected: boolean;
  error: string | null;

  // Actions for current query
  updateCurrentQuery: (updates: Partial<CurrentQuery>) => void;
  resetCurrentQuery: () => void;
  
  // Actions for active query
  setActiveQuery: (query: QueryResponse | null) => void;
  setQueryStatus: (status: QueryStatus | null) => void;
  setQueryResult: (result: QueryResultResponse | null) => void;
  
  // Query submission action
  submitQuery: (fileId: string) => Promise<void>;
  
  // UI actions
  setIsSubmitting: (submitting: boolean) => void;
  setIsConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  
  // WebSocket cleanup action
  disconnectWebSocket: () => void;
}

const defaultCurrentQuery: CurrentQuery = {
  text: '',
  intentHint: undefined,
  maxConcurrent: 3,
  timeoutSeconds: 300,
  cacheResults: true,
};

export const useQueryStore = create<QueryStore>((set, get) => ({
  // Initial state
  currentQuery: defaultCurrentQuery,
  activeQuery: null,
  queryStatus: null,
  queryResult: null,
  isSubmitting: false,
  isConnected: false,
  error: null,

  // Current query actions
  updateCurrentQuery: (updates) => set((state) => ({
    currentQuery: { ...state.currentQuery, ...updates }
  })),
  
  resetCurrentQuery: () => set({
    currentQuery: defaultCurrentQuery,
    error: null,
  }),

  // Active query actions
  setActiveQuery: (query) => set({ activeQuery: query }),
  setQueryStatus: (status) => set({ queryStatus: status }),
  setQueryResult: (result) => set({ queryResult: result }),

  // Query submission
  submitQuery: async (fileId: string) => {
    const { currentQuery } = get();
    
    if (!currentQuery.text.trim()) {
      set({ error: 'Query text is required' });
      return;
    }

    set({ isSubmitting: true, error: null });

    try {
      // Import API service
      const { apiService } = await import('@/services/api');
      
      // Submit query
      const queryResponse = await apiService.submitQuery({
        file_id: fileId,
        query: currentQuery.text,
        intent_hint: currentQuery.intentHint as any,
        max_concurrent: currentQuery.maxConcurrent,
        timeout_seconds: currentQuery.timeoutSeconds,
        cache_results: currentQuery.cacheResults,
      });

      // Set active query
      set({ activeQuery: queryResponse });

      // Start monitoring the query status
      const monitorQuery = async () => {
        try {
          while (true) {
            const status = await apiService.getQueryStatus(queryResponse.query_id);
            set({ queryStatus: status });

            if (status.status === 'completed') {
              // Get final results
              const result = await apiService.getQueryResult(queryResponse.query_id);
              set({ queryResult: result });
              break;
            } else if (status.status === 'failed') {
              set({ error: status.error_message || 'Query processing failed' });
              break;
            }

            // Wait 2 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error('Error monitoring query:', error);
          set({ error: 'Failed to monitor query status' });
        }
      };

      // Start monitoring in background
      monitorQuery();

    } catch (error: any) {
      console.error('Error submitting query:', error);
      set({ error: error.message || 'Failed to submit query' });
    } finally {
      set({ isSubmitting: false });
    }
  },

  // UI actions
  setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setError: (error) => set({ error }),

  // WebSocket cleanup
  disconnectWebSocket: () => {
    // Import here to avoid circular dependency
    import('@/services/websocket').then(({ websocketService }) => {
      websocketService.disconnectAll();
    });
    set({ isConnected: false });
  },
}));

// Selectors for better performance
export const useActiveQueries = () => useQueryStore((state) => {
  if (!state.activeQuery) return {};
  return { [state.activeQuery.query_id]: state.activeQuery };
});

export const useQueryHistory = () => useQueryStore((state) => state.queryResult ? [state.queryResult] : []);

export const useCurrentQuery = () => useQueryStore((state) => state.currentQuery);

export const useGermanSuggestions = () => []; // Placeholder - implement as needed

export const useWebSocketConnected = () => useQueryStore((state) => state.isConnected);

export const useQuerySubmission = () => useQueryStore((state) => ({
  isSubmitting: state.isSubmitting,
  submitQuery: state.submitQuery,
  updateCurrentQuery: state.updateCurrentQuery,
  resetCurrentQuery: state.resetCurrentQuery,
  error: state.error,
}));

export const useQueryMonitoring = () => useQueryStore((state) => ({
  activeQuery: state.activeQuery,
  status: state.queryStatus,
  result: state.queryResult
}));

// Export store for direct access
export default useQueryStore;