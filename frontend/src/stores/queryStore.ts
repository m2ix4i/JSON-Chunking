/**
 * Query state management store using Zustand.
 */

import { create } from 'zustand';
import { QueryResponse, QueryStatus, QueryResultResponse } from '@types/api';

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

  // UI actions
  setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setError: (error) => set({ error }),

  // WebSocket cleanup
  disconnectWebSocket: () => {
    // Import here to avoid circular dependency
    import('@services/websocketService').then(({ webSocketService }) => {
      webSocketService.disconnect();
    });
    set({ isConnected: false });
  },
}));

// Export store for direct access
export default useQueryStore;