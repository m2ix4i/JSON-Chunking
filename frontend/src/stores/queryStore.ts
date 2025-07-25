/**
 * Query management store using Zustand.
 */

import { create } from 'zustand';
import { QueryRequest, QueryResponse, QueryStatus, QueryResultResponse, WebSocketMessage } from '@types/api';
import apiService from '@services/api';

interface CurrentQuery {
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
  
  // WebSocket connection
  webSocket: WebSocket | null;
  
  // UI state
  isSubmitting: boolean;
  error: string | null;

  // Actions for current query
  updateCurrentQuery: (updates: Partial<CurrentQuery>) => void;
  resetCurrentQuery: () => void;
  
  // Actions for active query
  setActiveQuery: (query: QueryResponse | null) => void;
  setQueryStatus: (status: QueryStatus | null) => void;
  setQueryResult: (result: QueryResultResponse | null) => void;
  
  // WebSocket actions
  connectWebSocket: (queryId: string) => void;
  disconnectWebSocket: () => void;
  
  // UI actions
  setIsSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions
  submitQuery: (fileId: string) => Promise<boolean>;
  cancelQuery: () => Promise<boolean>;
  refreshQueryStatus: () => Promise<void>;
  fetchQueryResult: () => Promise<void>;
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
  webSocket: null,
  isSubmitting: false,
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

  // WebSocket actions
  connectWebSocket: (queryId: string) => {
    const { disconnectWebSocket, setQueryStatus, setQueryResult, setError } = get();
    
    // Disconnect existing connection
    disconnectWebSocket();
    
    try {
      const ws = apiService.createWebSocket(queryId);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'status_update':
              setQueryStatus(message.data as QueryStatus);
              break;
            case 'result':
              setQueryResult(message.data as QueryResultResponse);
              break;
            case 'error':
              setError((message.data as any).detail || 'WebSocket error');
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      };
      
      ws.onclose = () => {
        console.log('WebSocket closed');
      };
      
      set({ webSocket: ws });
    } catch (error) {
      setError('Failed to create WebSocket connection');
    }
  },
  
  disconnectWebSocket: () => {
    const { webSocket } = get();
    if (webSocket) {
      webSocket.close();
      set({ webSocket: null });
    }
  },

  // UI actions
  setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),
  setError: (error) => set({ error }),

  // Async actions
  submitQuery: async (fileId: string) => {
    const { 
      currentQuery, 
      setIsSubmitting, 
      setError, 
      setActiveQuery, 
      setQueryStatus, 
      setQueryResult,
      connectWebSocket 
    } = get();
    
    try {
      setIsSubmitting(true);
      setError(null);
      setActiveQuery(null);
      setQueryStatus(null);
      setQueryResult(null);

      const queryRequest: QueryRequest = {
        query: currentQuery.text,
        file_id: fileId,
        intent_hint: currentQuery.intentHint,
        max_concurrent: currentQuery.maxConcurrent,
        timeout_seconds: currentQuery.timeoutSeconds,
        cache_results: currentQuery.cacheResults,
      };

      const response = await apiService.submitQuery(queryRequest);

      if (response.success) {
        setActiveQuery(response.data);
        connectWebSocket(response.data.query_id);
        return true;
      } else {
        setError(response.message);
        return false;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit query');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  },

  cancelQuery: async () => {
    const { activeQuery, setError, disconnectWebSocket } = get();
    
    if (!activeQuery) {
      setError('No active query to cancel');
      return false;
    }
    
    try {
      setError(null);
      const response = await apiService.cancelQuery(activeQuery.query_id);
      
      if (response.success) {
        disconnectWebSocket();
        return true;
      } else {
        setError(response.message);
        return false;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to cancel query');
      return false;
    }
  },

  refreshQueryStatus: async () => {
    const { activeQuery, setQueryStatus, setError } = get();
    
    if (!activeQuery) return;
    
    try {
      const response = await apiService.getQueryStatus(activeQuery.query_id);
      
      if (response.success) {
        setQueryStatus(response.data);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to refresh query status');
    }
  },

  fetchQueryResult: async () => {
    const { activeQuery, setQueryResult, setError } = get();
    
    if (!activeQuery) return;
    
    try {
      const response = await apiService.getQueryResult(activeQuery.query_id);
      
      if (response.success) {
        setQueryResult(response.data);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch query result');
    }
  },
}));

// Convenience hooks
export const useCurrentQuery = () => useQueryStore((state) => ({
  currentQuery: state.currentQuery,
  updateCurrentQuery: state.updateCurrentQuery,
  resetCurrentQuery: state.resetCurrentQuery,
}));

export const useActiveQuery = () => useQueryStore((state) => ({
  activeQuery: state.activeQuery,
  queryStatus: state.queryStatus,
  queryResult: state.queryResult,
  isSubmitting: state.isSubmitting,
}));

export const useQueryActions = () => useQueryStore((state) => ({
  submitQuery: state.submitQuery,
  cancelQuery: state.cancelQuery,
  refreshQueryStatus: state.refreshQueryStatus,
  fetchQueryResult: state.fetchQueryResult,
}));

export const useQueryError = () => useQueryStore((state) => state.error);