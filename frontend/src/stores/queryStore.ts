/**
 * Query management state with real-time progress tracking and error handling.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { handleGlobalError, showSuccessNotification, showErrorNotification } from './appStore';
import { normalizeError, getQueryErrorMessage, isRetryableError, getRetryDelay } from '@utils/errorUtils';

export interface QueryRequest {
  query: string;
  file_id: string;
  intent_hint?: string;
  max_concurrent?: number;
  timeout_seconds?: number;
  cache_results?: boolean;
}

export interface QueryStatus {
  status: 'pending' | 'started' | 'preprocessing' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  current_chunk?: number;
  total_chunks?: number;
  estimated_time_remaining?: number;
  error_message?: string;
  last_updated: string;
}

export interface QueryResult {
  query_id: string;
  original_query: string;
  answer: string;
  confidence_score: number;
  intent: string;
  model_used: string;
  processing_time: number;
  total_chunks: number;
  successful_chunks: number;
  structured_data?: {
    entities?: Array<{
      type: string;
      name: string;
      properties: Record<string, any>;
    }>;
    quantities?: Record<string, number | string>;
    materials?: string[];
    spatial_context?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

export interface ActiveQuery {
  queryId: string;
  request: QueryRequest;
  status: QueryStatus;
  result?: QueryResult;
  retryCount: number;
  websocket?: WebSocket;
}

interface QueryState {
  // Query Management
  activeQueries: Record<string, ActiveQuery>;
  queryHistory: QueryResult[];
  
  // Current Query Form State
  currentQuery: {
    text: string;
    intentHint?: string;
    maxConcurrent: number;
    timeoutSeconds: number;
    cacheResults: boolean;
  };
  
  // WebSocket Management
  websockets: Record<string, WebSocket>;
  reconnectAttempts: Record<string, number>;
  
  // Actions
  updateCurrentQuery: (updates: Partial<QueryState['currentQuery']>) => void;
  resetCurrentQuery: () => void;
  
  // Query Execution
  submitQuery: (request: QueryRequest) => Promise<string>;
  cancelQuery: (queryId: string) => void;
  retryQuery: (queryId: string) => Promise<void>;
  
  // Real-time Updates
  connectToQueryUpdates: (queryId: string) => void;
  disconnectFromQueryUpdates: (queryId: string) => void;
  updateQueryStatus: (queryId: string, status: QueryStatus) => void;
  setQueryResult: (queryId: string, result: QueryResult) => void;
  
  // History and Results
  addToHistory: (result: QueryResult) => void;
  clearHistory: () => void;
  getQueryResult: (queryId: string) => Promise<QueryResult | null>;
  
  // Utility
  getActiveQuery: (queryId: string) => ActiveQuery | null;
  getQueriesByStatus: (status: QueryStatus['status']) => ActiveQuery[];
}

// Mock WebSocket API (replace with actual implementation)
const connectToQueryWebSocket = (
  queryId: string,
  onStatusUpdate: (status: QueryStatus) => void,
  onResult: (result: QueryResult) => void,
  onError: (error: any) => void
): WebSocket => {
  // Simulate WebSocket connection
  const ws = {
    send: () => {},
    close: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as WebSocket;

  // Simulate status updates
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    
    if (progress >= 100) {
      clearInterval(interval);
      // Simulate completion
      onResult({
        query_id: queryId,
        original_query: 'Sample query',
        answer: 'Sample answer for the query',
        confidence_score: 0.85,
        intent: 'general',
        model_used: 'gpt-4',
        processing_time: 45.2,
        total_chunks: 10,
        successful_chunks: 10,
      });
    } else {
      onStatusUpdate({
        status: progress < 10 ? 'preprocessing' : 'processing',
        progress_percentage: Math.min(progress, 100),
        current_chunk: Math.floor(progress / 10),
        total_chunks: 10,
        estimated_time_remaining: (100 - progress) * 0.5,
        last_updated: new Date().toISOString(),
      });
    }
  }, 500);

  return ws;
};

// Mock API functions
const submitQueryToAPI = async (request: QueryRequest): Promise<{ query_id: string }> => {
  // Simulate API validation
  if (!request.query.trim()) {
    throw { code: 'QUERY_EMPTY', message: 'Query cannot be empty' };
  }

  if (request.query.length > 1000) {
    throw { code: 'QUERY_TOO_LONG', message: 'Query too long' };
  }

  if (!request.file_id) {
    throw { code: 'NO_FILE_SELECTED', message: 'No file selected' };
  }

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    query_id: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
};

const getQueryResultFromAPI = async (queryId: string): Promise<QueryResult | null> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock result or null if not found
  return Math.random() > 0.1 ? {
    query_id: queryId,
    original_query: 'Sample query',
    answer: 'Sample answer retrieved from API',
    confidence_score: 0.78,
    intent: 'general',
    model_used: 'gpt-4',
    processing_time: 32.1,
    total_chunks: 8,
    successful_chunks: 8,
  } : null;
};

const useQueryStore = create<QueryState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    activeQueries: {},
    queryHistory: [],
    currentQuery: {
      text: '',
      intentHint: undefined,
      maxConcurrent: 3,
      timeoutSeconds: 300,
      cacheResults: true,
    },
    websockets: {},
    reconnectAttempts: {},

    // Current Query Actions
    updateCurrentQuery: (updates) =>
      set(state => ({
        currentQuery: { ...state.currentQuery, ...updates },
      })),

    resetCurrentQuery: () =>
      set({
        currentQuery: {
          text: '',
          intentHint: undefined,
          maxConcurrent: 3,
          timeoutSeconds: 300,
          cacheResults: true,
        },
      }),

    // Query Execution
    submitQuery: async (request: QueryRequest): Promise<string> => {
      try {
        const response = await submitQueryToAPI(request);
        const queryId = response.query_id;

        // Create active query
        const activeQuery: ActiveQuery = {
          queryId,
          request,
          status: {
            status: 'pending',
            progress_percentage: 0,
            last_updated: new Date().toISOString(),
          },
          retryCount: 0,
        };

        set(state => ({
          activeQueries: { ...state.activeQueries, [queryId]: activeQuery },
        }));

        // Connect to real-time updates
        get().connectToQueryUpdates(queryId);

        showSuccessNotification('Abfrage gestartet');
        return queryId;

      } catch (error) {
        const normalizedError = normalizeError(error);
        const errorMessage = getQueryErrorMessage(normalizedError);
        
        handleGlobalError(error, 'Query submission');
        throw new Error(errorMessage);
      }
    },

    cancelQuery: (queryId: string) => {
      const query = get().activeQueries[queryId];
      if (!query) return;

      // Close WebSocket connection
      get().disconnectFromQueryUpdates(queryId);

      // Update query status
      get().updateQueryStatus(queryId, {
        status: 'cancelled',
        progress_percentage: query.status.progress_percentage,
        last_updated: new Date().toISOString(),
      });

      showInfoNotification('Abfrage abgebrochen');
    },

    retryQuery: async (queryId: string) => {
      const query = get().activeQueries[queryId];
      if (!query) return;

      const retryCount = query.retryCount + 1;
      const maxRetries = 3;

      if (retryCount > maxRetries) {
        showErrorNotification('Maximale Anzahl der Wiederholungsversuche erreicht');
        return;
      }

      // Wait for retry delay
      const delay = getRetryDelay(retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        // Update retry count
        set(state => ({
          activeQueries: {
            ...state.activeQueries,
            [queryId]: { ...query, retryCount },
          },
        }));

        // Resubmit query
        await get().submitQuery(query.request);

      } catch (error) {
        handleGlobalError(error, `Query retry: ${queryId}`);
      }
    },

    // Real-time Updates
    connectToQueryUpdates: (queryId: string) => {
      // Disconnect existing connection if any
      get().disconnectFromQueryUpdates(queryId);

      try {
        const ws = connectToQueryWebSocket(
          queryId,
          (status) => get().updateQueryStatus(queryId, status),
          (result) => get().setQueryResult(queryId, result),
          (error) => {
            handleGlobalError(error, `WebSocket: ${queryId}`);
            
            // Attempt to reconnect
            const attempts = get().reconnectAttempts[queryId] || 0;
            if (attempts < 3) {
              set(state => ({
                reconnectAttempts: { ...state.reconnectAttempts, [queryId]: attempts + 1 },
              }));
              
              setTimeout(() => get().connectToQueryUpdates(queryId), getRetryDelay(attempts + 1));
            }
          }
        );

        set(state => ({
          websockets: { ...state.websockets, [queryId]: ws },
          reconnectAttempts: { ...state.reconnectAttempts, [queryId]: 0 },
        }));

      } catch (error) {
        handleGlobalError(error, `WebSocket connection: ${queryId}`);
      }
    },

    disconnectFromQueryUpdates: (queryId: string) => {
      const { websockets } = get();
      const ws = websockets[queryId];
      
      if (ws) {
        ws.close();
        
        set(state => {
          const { [queryId]: removed, ...remainingWs } = state.websockets;
          return { websockets: remainingWs };
        });
      }
    },

    updateQueryStatus: (queryId: string, status: QueryStatus) => {
      set(state => {
        const query = state.activeQueries[queryId];
        if (!query) return state;

        return {
          activeQueries: {
            ...state.activeQueries,
            [queryId]: { ...query, status },
          },
        };
      });
    },

    setQueryResult: (queryId: string, result: QueryResult) => {
      set(state => {
        const query = state.activeQueries[queryId];
        if (!query) return state;

        // Add to history
        const updatedHistory = [result, ...state.queryHistory.slice(0, 49)]; // Keep last 50

        return {
          activeQueries: {
            ...state.activeQueries,
            [queryId]: { 
              ...query, 
              result,
              status: { ...query.status, status: 'completed', progress_percentage: 100 },
            },
          },
          queryHistory: updatedHistory,
        };
      });

      // Disconnect WebSocket
      get().disconnectFromQueryUpdates(queryId);
      
      showSuccessNotification('Abfrage abgeschlossen');
    },

    // History Management
    addToHistory: (result: QueryResult) =>
      set(state => ({
        queryHistory: [result, ...state.queryHistory.slice(0, 49)],
      })),

    clearHistory: () =>
      set({ queryHistory: [] }),

    getQueryResult: async (queryId: string): Promise<QueryResult | null> => {
      try {
        const result = await getQueryResultFromAPI(queryId);
        
        if (result) {
          // Update active query with result
          get().setQueryResult(queryId, result);
        }
        
        return result;
      } catch (error) {
        handleGlobalError(error, `Get query result: ${queryId}`);
        return null;
      }
    },

    // Utility Functions
    getActiveQuery: (queryId: string) => {
      return get().activeQueries[queryId] || null;
    },

    getQueriesByStatus: (status: QueryStatus['status']) => {
      const { activeQueries } = get();
      return Object.values(activeQueries).filter(query => query.status.status === status);
    },
  }))
);

// Export hooks
export const useActiveQueries = () => useQueryStore(state => state.activeQueries);

export const useCurrentQuery = () => useQueryStore(state => ({
  currentQuery: state.currentQuery,
  updateCurrentQuery: state.updateCurrentQuery,
  resetCurrentQuery: state.resetCurrentQuery,
}));

export const useQueryActions = () => useQueryStore(state => ({
  submitQuery: state.submitQuery,
  cancelQuery: state.cancelQuery,
  retryQuery: state.retryQuery,
}));

export const useQueryMonitoring = () => useQueryStore(state => ({
  connectToQueryUpdates: state.connectToQueryUpdates,
  disconnectFromQueryUpdates: state.disconnectFromQueryUpdates,
  getQueryResult: state.getQueryResult,
}));

export const useQueryHistory = () => useQueryStore(state => ({
  history: state.queryHistory,
  addToHistory: state.addToHistory,
  clearHistory: state.clearHistory,
}));

export default useQueryStore;