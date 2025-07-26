/**
 * Query state management store using Zustand.
 * Enhanced with WebSocket integration for real-time query status updates and history management.
 */

import { create } from 'zustand';
import type {
  QueryResponse,
  QueryStatusResponse,
  QueryResultResponse,
  QueryListResponse,
  ProgressMessage,
  ErrorMessage,
  CompletionMessage,
  WebSocketMessage,
} from '@/types/api';
import type { WebSocketConnection } from '@/services/websocket';

export interface CurrentQuery {
  text: string;
  intentHint?: string;
  maxConcurrent: number;
  timeoutSeconds: number;
  cacheResults: boolean;
}

export interface QueryHistoryState {
  queries: QueryStatusResponse[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  filters: {
    search: string;
    status: string | null;
    dateRange: { start: Date; end: Date } | null;
  };
}

interface QueryStore {
  // Current query state
  currentQuery: CurrentQuery;
  
  // Active query state
  activeQuery: QueryResponse | null;
  queryStatus: QueryStatusResponse | null;
  queryResult: QueryResultResponse | null;
  
  // WebSocket state
  websocketConnection: WebSocketConnection | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastProgressUpdate: ProgressMessage | null;
  useWebSocket: boolean;
  
  // Query history state
  history: QueryHistoryState;
  
  // UI state
  isSubmitting: boolean;
  isConnected: boolean;
  error: string | null;

  // Actions for current query
  updateCurrentQuery: (updates: Partial<CurrentQuery>) => void;
  resetCurrentQuery: () => void;
  
  // Actions for active query
  setActiveQuery: (query: QueryResponse | null) => void;
  setQueryStatus: (status: QueryStatusResponse | null) => void;
  setQueryResult: (result: QueryResultResponse | null) => void;
  
  // Query submission with WebSocket integration
  submitQuery: (fileId: string) => Promise<void>;
  
  // WebSocket actions
  connectWebSocket: (queryId: string) => Promise<void>;
  handleWebSocketMessage: (message: WebSocketMessage) => void;
  disconnectWebSocket: () => void;
  setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  startPolling: (queryId: string) => Promise<void>;
  
  // History actions
  loadQueryHistory: (params?: { page?: number; limit?: number; status?: string; search?: string }) => Promise<void>;
  updateHistoryFilters: (filters: Partial<QueryHistoryState['filters']>) => void;
  updateHistoryPagination: (pagination: Partial<QueryHistoryState['pagination']>) => void;
  deleteQuery: (queryId: string) => Promise<void>;
  rerunQuery: (queryId: string) => void;
  
  // UI actions
  setIsSubmitting: (submitting: boolean) => void;
  setIsConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
}

const defaultCurrentQuery: CurrentQuery = {
  text: '',
  intentHint: undefined,
  maxConcurrent: 3,
  timeoutSeconds: 300,
  cacheResults: true,
};

const defaultHistoryState: QueryHistoryState = {
  queries: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
  filters: {
    search: '',
    status: null,
    dateRange: null,
  },
};

export const useQueryStore = create<QueryStore>((set, get) => ({
  // Initial state
  currentQuery: defaultCurrentQuery,
  activeQuery: null,
  queryStatus: null,
  queryResult: null,
  
  // WebSocket state
  websocketConnection: null,
  connectionStatus: 'disconnected',
  lastProgressUpdate: null,
  useWebSocket: true, // Enable WebSocket by default, fallback to polling on error
  
  // History state
  history: defaultHistoryState,
  
  // UI state
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

  // Query submission with WebSocket integration
  submitQuery: async (fileId: string) => {
    const { currentQuery, useWebSocket } = get();
    
    if (!currentQuery.text.trim()) {
      set({ error: 'Query text is required' });
      return;
    }

    set({ isSubmitting: true, error: null });

    try {
      // Import API service
      const { apiService } = await import('@/services/api');
      
      // Submit query to backend
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

      // Try WebSocket connection first
      if (useWebSocket) {
        try {
          await get().connectWebSocket(queryResponse.query_id);
        } catch (error) {
          console.warn('WebSocket connection failed, falling back to polling:', error);
          set({ useWebSocket: false });
          // Start polling fallback
          get().startPolling(queryResponse.query_id);
        }
      } else {
        // Use polling directly
        get().startPolling(queryResponse.query_id);
      }

    } catch (error: any) {
      console.error('Error submitting query:', error);
      set({ error: error.message || 'Failed to submit query' });
    } finally {
      set({ isSubmitting: false });
    }
  },

  // WebSocket connection management
  connectWebSocket: async (queryId: string) => {
    try {
      set({ connectionStatus: 'connecting' });
      
      // Import WebSocket service
      const { websocketService } = await import('@/services/websocket');
      
      // Create connection with message handler
      const connection = await websocketService.connect(
        queryId,
        get().handleWebSocketMessage,
        (status) => set({ connectionStatus: status })
      );

      set({ 
        websocketConnection: connection,
        connectionStatus: 'connected',
        isConnected: true 
      });

      console.log(`WebSocket connected for query ${queryId}`);
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      set({ 
        connectionStatus: 'error',
        isConnected: false,
        useWebSocket: false 
      });
      throw error;
    }
  },

  // WebSocket message handler
  handleWebSocketMessage: (message: WebSocketMessage) => {
    console.log('Received WebSocket message:', message);
    
    switch (message.type) {
      case 'progress':
        const progressMsg = message as ProgressMessage;
        set({ 
          lastProgressUpdate: progressMsg,
          queryStatus: {
            query_id: progressMsg.query_id,
            status: 'processing',
            progress_percentage: progressMsg.progress_percentage,
            current_step: progressMsg.current_step,
            total_steps: progressMsg.total_steps,
            message: progressMsg.step_name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        });
        break;

      case 'error':
        const errorMsg = message as ErrorMessage;
        set({ 
          error: errorMsg.message || 'Query processing error',
          queryStatus: {
            query_id: errorMsg.query_id,
            status: 'failed',
            progress_percentage: 0,
            current_step: 0,
            total_steps: 0,
            message: errorMsg.message || 'Error occurred',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            error_message: errorMsg.error_details,
          }
        });
        break;

      case 'completion':
        const completionMsg = message as CompletionMessage;
        set({ 
          queryResult: completionMsg.result,
          queryStatus: {
            query_id: completionMsg.query_id,
            status: 'completed',
            progress_percentage: 100,
            current_step: 1,
            total_steps: 1,
            message: 'Query completed successfully',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        });
        
        // Clean up WebSocket connection after completion
        setTimeout(() => get().disconnectWebSocket(), 2000);
        break;

      case 'connected':
        console.log('WebSocket connection confirmed');
        break;

      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  },

  // WebSocket disconnection
  disconnectWebSocket: () => {
    const { websocketConnection } = get();
    
    if (websocketConnection) {
      // Import here to avoid circular dependency
      import('@/services/websocket').then(({ websocketService }) => {
        websocketService.disconnect(websocketConnection.queryId);
      });
    }
    
    set({ 
      websocketConnection: null,
      connectionStatus: 'disconnected',
      isConnected: false 
    });
  },

  // Polling fallback when WebSocket fails
  startPolling: async (queryId: string) => {
    console.log('Starting polling fallback for query:', queryId);
    
    const poll = async () => {
      try {
        const { apiService } = await import('@/services/api');
        const status = await apiService.getQueryStatus(queryId);
        
        set({ queryStatus: status });

        if (status.status === 'completed') {
          // Get final results
          const result = await apiService.getQueryResult(queryId);
          set({ queryResult: result });
          return; // Stop polling
        } else if (status.status === 'failed') {
          set({ error: status.error_message || 'Query processing failed' });
          return; // Stop polling
        }

        // Continue polling if still processing
        if (status.status === 'processing' || status.status === 'started') {
          setTimeout(poll, 2000); // Poll every 2 seconds
        }
        
      } catch (error) {
        console.error('Error polling query status:', error);
        set({ error: 'Failed to get query status' });
      }
    };

    // Start polling
    poll();
  },

  // History actions
  loadQueryHistory: async (params = {}) => {
    const { history } = get();
    const { page = history.pagination.page, limit = history.pagination.limit, status, search } = params;
    
    set((state) => ({
      history: { ...state.history, loading: true, error: null }
    }));

    try {
      const { apiService } = await import('@/services/api');
      
      const response = await apiService.listQueries({
        page,
        limit,
        status,
        search,
      });

      set((state) => ({
        history: {
          ...state.history,
          queries: response.queries,
          loading: false,
          pagination: {
            page,
            limit,
            total: response.total,
          },
        }
      }));

    } catch (error: any) {
      console.error('Error loading query history:', error);
      set((state) => ({
        history: {
          ...state.history,
          loading: false,
          error: error.message || 'Failed to load query history',
        }
      }));
    }
  },

  updateHistoryFilters: (filters) => {
    set((state) => ({
      history: {
        ...state.history,
        filters: { ...state.history.filters, ...filters },
        pagination: { ...state.history.pagination, page: 1 }, // Reset to first page
      }
    }));
  },

  updateHistoryPagination: (pagination) => {
    set((state) => ({
      history: {
        ...state.history,
        pagination: { ...state.history.pagination, ...pagination },
      }
    }));
  },

  deleteQuery: async (queryId: string) => {
    try {
      const { apiService } = await import('@/services/api');
      await apiService.cancelQuery(queryId); // Using cancel as delete
      
      // Remove from local state
      set((state) => ({
        history: {
          ...state.history,
          queries: state.history.queries.filter(q => q.query_id !== queryId),
        }
      }));

    } catch (error: any) {
      console.error('Error deleting query:', error);
      set((state) => ({
        history: {
          ...state.history,
          error: error.message || 'Failed to delete query',
        }
      }));
    }
  },

  rerunQuery: (queryId: string) => {
    // Find the query in history
    const { history } = get();
    const query = history.queries.find(q => q.query_id === queryId);
    
    if (query && query.original_query) {
      // Update current query with the previous query text
      set((state) => ({
        currentQuery: {
          ...state.currentQuery,
          text: query.original_query || '',
        }
      }));
      
      // Navigate to query page - we'll handle this in the component
      // For now, just set the query text
      console.log('Rerunning query:', query.original_query);
    }
  },

  // UI actions
  setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setError: (error) => set({ error }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
}));

// Selectors for better performance and component integration
export const useActiveQueries = () => useQueryStore((state) => {
  if (!state.activeQuery) return {};
  return { [state.activeQuery.query_id]: state.activeQuery };
});

export const useQueryHistory = () => useQueryStore((state) => state.history);

export const useCurrentQuery = () => useQueryStore((state) => state.currentQuery);

export const useGermanSuggestions = () => []; // Placeholder - implement as needed

export const useWebSocketConnected = () => useQueryStore((state) => 
  state.connectionStatus === 'connected'
);

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
  result: state.queryResult,
  connectionStatus: state.connectionStatus,
  lastProgressUpdate: state.lastProgressUpdate,
  isConnected: state.isConnected,
}));

export const useWebSocketStatus = () => useQueryStore((state) => ({
  connectionStatus: state.connectionStatus,
  isConnected: state.isConnected,
  useWebSocket: state.useWebSocket,
  lastProgressUpdate: state.lastProgressUpdate,
}));

export const useQueryHistoryActions = () => useQueryStore((state) => ({
  loadQueryHistory: state.loadQueryHistory,
  updateHistoryFilters: state.updateHistoryFilters,
  updateHistoryPagination: state.updateHistoryPagination,
  deleteQuery: state.deleteQuery,
  rerunQuery: state.rerunQuery,
}));

// Export store for direct access
export default useQueryStore;