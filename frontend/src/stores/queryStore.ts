/**
 * Query state management store using Zustand.
 * Enhanced with WebSocket integration for real-time query status updates.
 */

import { create } from 'zustand';
<<<<<<< HEAD
import type {
  QueryResponse,
  QueryStatusResponse,
  QueryResultResponse,
  ProgressMessage,
  ErrorMessage,
  CompletionMessage,
  WebSocketMessage,
} from '@/types/api';
import type { WebSocketConnection } from '@/services/websocket';
=======
import { QueryResponse, QueryStatus, QueryResultResponse } from '@/types/api';
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e

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
  queryStatus: QueryStatusResponse | null;
  queryResult: QueryResultResponse | null;
  
  // WebSocket state
  websocketConnection: WebSocketConnection | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastProgressUpdate: ProgressMessage | null;
  useWebSocket: boolean;
  
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
  
<<<<<<< HEAD
  // Query submission with WebSocket integration
  submitQuery: (fileId: string) => Promise<void>;
  
  // WebSocket actions
  connectWebSocket: (queryId: string) => Promise<void>;
  handleWebSocketMessage: (message: WebSocketMessage) => void;
  disconnectWebSocket: () => void;
  setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  startPolling: (queryId: string) => Promise<void>;
  
=======
  // Query submission action
  submitQuery: (fileId: string) => Promise<void>;
  
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e
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

<<<<<<< HEAD
  // Query submission with WebSocket integration
  submitQuery: async (fileId: string) => {
    const { currentQuery, useWebSocket } = get();
=======
  // Query submission
  submitQuery: async (fileId: string) => {
    const { currentQuery } = get();
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e
    
    if (!currentQuery.text.trim()) {
      set({ error: 'Query text is required' });
      return;
    }

    set({ isSubmitting: true, error: null });

    try {
      // Import API service
      const { apiService } = await import('@/services/api');
      
<<<<<<< HEAD
      // Submit query to backend
=======
      // Submit query
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e
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

<<<<<<< HEAD
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
=======
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
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e

    } catch (error: any) {
      console.error('Error submitting query:', error);
      set({ error: error.message || 'Failed to submit query' });
    } finally {
      set({ isSubmitting: false });
    }
  },

<<<<<<< HEAD
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

=======
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e
  // UI actions
  setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setError: (error) => set({ error }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
}));

<<<<<<< HEAD
// Selectors for better performance and component integration
export const useActiveQueries = () => useQueryStore((state) => {
  if (!state.activeQuery) return {};
  return { [state.activeQuery.query_id]: state.activeQuery };
});

export const useQueryHistory = () => useQueryStore((state) => 
  state.queryResult ? [state.queryResult] : []
);

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
=======
  // WebSocket cleanup
  disconnectWebSocket: () => {
    // Import here to avoid circular dependency
    import('@/services/websocket').then(({ websocketService }) => {
      websocketService.disconnectAll();
    });
    set({ isConnected: false });
  },
>>>>>>> 057e15e5bbcfbdf9cfaaddab3cc19f3c9655126e
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
export const useQuerySubmission = () => useQueryStore((state) => state.isSubmitting);
export const useQueryMonitoring = () => useQueryStore((state) => ({
  activeQuery: state.activeQuery,
  status: state.queryStatus,
  result: state.queryResult
}));

// Export store for direct access
export default useQueryStore;