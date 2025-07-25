/**
 * Query management store using Zustand.
 * Handles query submission, status tracking, and results.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiService } from '@services/api';
import { websocketService } from '@services/websocket';
import { showSuccessNotification, showErrorNotification } from './appStore';
import type { QueryState, ActiveQuery, QueryHistoryItem, GermanQuerySuggestion } from '@types/app';
import type { QueryRequest, QueryIntentHint, WebSocketMessage, ProgressMessage, CompletionMessage } from '@types/api';

interface QueryStoreState extends QueryState {
  // Query management
  submitQuery: (query: QueryRequest) => Promise<string>;
  cancelQuery: (queryId: string) => Promise<void>;
  getQueryResult: (queryId: string) => Promise<void>;
  clearQuery: (queryId: string) => void;
  
  // Current query form
  updateCurrentQuery: (updates: Partial<QueryState['currentQuery']>) => void;
  resetCurrentQuery: () => void;
  
  // WebSocket management
  connectToQuery: (queryId: string) => Promise<void>;
  disconnectFromQuery: (queryId: string) => void;
  handleWebSocketMessage: (queryId: string, message: WebSocketMessage) => void;
  
  // History management
  addToHistory: (item: QueryHistoryItem) => void;
  clearHistory: () => void;
  
  // Suggestions
  germanSuggestions: GermanQuerySuggestion[];
  
  // Utilities
  getActiveQuery: (queryId: string) => ActiveQuery | null;
  getAllActiveQueries: () => ActiveQuery[];
  isQueryActive: (queryId: string) => boolean;
}

const defaultCurrentQuery: QueryState['currentQuery'] = {
  text: '',
  fileId: null,
  intentHint: null,
  maxConcurrent: 10,
  timeoutSeconds: 300,
  cacheResults: true,
};

const germanQuerySuggestions: GermanQuerySuggestion[] = [
  {
    text: "Wie viel Kubikmeter Beton sind verbaut?",
    category: "quantity",
    description: "Betonmengen berechnen",
    example: "Berechnet die Gesamtmenge des verbauten Betons"
  },
  {
    text: "Welche Materialien werden in den Wänden verwendet?",
    category: "material",
    description: "Wandmaterialien identifizieren",
    example: "Listet alle in Wandelementen verwendeten Materialien auf"
  },
  {
    text: "Wie viele Fenster sind im Gebäude?",
    category: "component",
    description: "Bauteile zählen",
    example: "Zählt alle Fensterelemente im Gebäude"
  },
  {
    text: "In welchen Räumen befinden sich Türen?",
    category: "spatial",
    description: "Räumliche Zuordnung",
    example: "Zeigt die räumliche Verteilung von Türelementen"
  },
  {
    text: "Was kostet die Fassade ungefähr?",
    category: "cost",
    description: "Kostenschätzung",
    example: "Schätzt die Kosten für Fassadenelemente"
  },
  {
    text: "Welche Stockwerke hat das Gebäude?",
    category: "spatial",
    description: "Gebäudestruktur",
    example: "Identifiziert alle Geschosse und Ebenen"
  }
];

const initialState: QueryState = {
  activeQueries: {},
  queryHistory: [],
  currentQuery: defaultCurrentQuery,
  websocketConnected: false,
};

export const useQueryStore = create<QueryStoreState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      germanSuggestions: germanQuerySuggestions,

      // Submit a new query
      submitQuery: async (queryRequest: QueryRequest) => {
        try {
          const response = await apiService.submitQuery(queryRequest);
          const queryId = response.query_id;

          // Create active query entry
          const activeQuery: ActiveQuery = {
            queryId,
            status: {
              query_id: queryId,
              status: 'started',
              progress_percentage: 0,
              current_step: 0,
              total_steps: 4,
              message: response.message,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            websocketConnected: false,
            startTime: new Date(),
          };

          set(
            (state) => ({
              ...state,
              activeQueries: {
                ...state.activeQueries,
                [queryId]: activeQuery,
              },
            }),
            false,
            'submitQuery'
          );

          // Connect to WebSocket for real-time updates
          await get().connectToQuery(queryId);

          showSuccessNotification('Abfrage wurde gestartet');
          return queryId;

        } catch (error) {
          showErrorNotification(
            `Abfrage fehlgeschlagen: ${
              error instanceof Error ? error.message : 'Unbekannter Fehler'
            }`
          );
          throw error;
        }
      },

      // Cancel an active query
      cancelQuery: async (queryId: string) => {
        try {
          await apiService.cancelQuery(queryId);
          
          // Also send cancel via WebSocket
          websocketService.cancelQuery(queryId);

          set(
            (state) => {
              const activeQuery = state.activeQueries[queryId];
              if (activeQuery) {
                return {
                  ...state,
                  activeQueries: {
                    ...state.activeQueries,
                    [queryId]: {
                      ...activeQuery,
                      status: {
                        ...activeQuery.status,
                        status: 'cancelled',
                        message: 'Abfrage wurde abgebrochen',
                        updated_at: new Date().toISOString(),
                      },
                    },
                  },
                };
              }
              return state;
            },
            false,
            'cancelQuery'
          );

          showSuccessNotification('Abfrage wurde abgebrochen');

        } catch (error) {
          showErrorNotification(
            `Abbruch fehlgeschlagen: ${
              error instanceof Error ? error.message : 'Unbekannter Fehler'
            }`
          );
          throw error;
        }
      },

      // Get query result
      getQueryResult: async (queryId: string) => {
        try {
          const result = await apiService.getQueryResult(queryId);

          set(
            (state) => {
              const activeQuery = state.activeQueries[queryId];
              if (activeQuery) {
                return {
                  ...state,
                  activeQueries: {
                    ...state.activeQueries,
                    [queryId]: {
                      ...activeQuery,
                      result,
                    },
                  },
                };
              }
              return state;
            },
            false,
            'getQueryResult'
          );

        } catch (error) {
          showErrorNotification(
            `Ergebnis laden fehlgeschlagen: ${
              error instanceof Error ? error.message : 'Unbekannter Fehler'
            }`
          );
          throw error;
        }
      },

      // Clear a query from active queries
      clearQuery: (queryId: string) => {
        get().disconnectFromQuery(queryId);
        
        set(
          (state) => {
            const newActiveQueries = { ...state.activeQueries };
            delete newActiveQueries[queryId];
            return { ...state, activeQueries: newActiveQueries };
          },
          false,
          'clearQuery'
        );
      },

      // Update current query form
      updateCurrentQuery: (updates) => {
        set(
          (state) => ({
            ...state,
            currentQuery: { ...state.currentQuery, ...updates },
          }),
          false,
          'updateCurrentQuery'
        );
      },

      resetCurrentQuery: () => {
        set(
          (state) => ({ ...state, currentQuery: defaultCurrentQuery }),
          false,
          'resetCurrentQuery'
        );
      },

      // WebSocket management
      connectToQuery: async (queryId: string) => {
        try {
          await websocketService.connect(
            queryId,
            (message) => get().handleWebSocketMessage(queryId, message),
            (status) => {
              set(
                (state) => ({
                  ...state,
                  websocketConnected: status === 'connected',
                  activeQueries: {
                    ...state.activeQueries,
                    [queryId]: state.activeQueries[queryId] ? {
                      ...state.activeQueries[queryId],
                      websocketConnected: status === 'connected',
                    } : state.activeQueries[queryId],
                  },
                }),
                false,
                'websocketStatusChange'
              );
            }
          );
        } catch (error) {
          console.error('WebSocket connection failed:', error);
        }
      },

      disconnectFromQuery: (queryId: string) => {
        websocketService.disconnect(queryId);
      },

      handleWebSocketMessage: (queryId: string, message: WebSocketMessage) => {
        const state = get();
        const activeQuery = state.activeQueries[queryId];
        
        if (!activeQuery) return;

        switch (message.type) {
          case 'progress': {
            const progressMsg = message as ProgressMessage;
            set(
              (state) => ({
                ...state,
                activeQueries: {
                  ...state.activeQueries,
                  [queryId]: {
                    ...activeQuery,
                    status: {
                      ...activeQuery.status,
                      progress_percentage: progressMsg.progress_percentage,
                      current_step: progressMsg.current_step,
                      total_steps: progressMsg.total_steps,
                      message: progressMsg.message,
                      updated_at: new Date().toISOString(),
                    },
                  },
                },
              }),
              false,
              'websocketProgress'
            );
            break;
          }

          case 'completion': {
            const completionMsg = message as CompletionMessage;
            const processingTime = Date.now() - activeQuery.startTime.getTime();
            
            set(
              (state) => ({
                ...state,
                activeQueries: {
                  ...state.activeQueries,
                  [queryId]: {
                    ...activeQuery,
                    status: {
                      ...activeQuery.status,
                      status: 'completed',
                      progress_percentage: 100,
                      message: 'Abfrage abgeschlossen',
                      updated_at: new Date().toISOString(),
                    },
                    result: completionMsg.result,
                  },
                },
              }),
              false,
              'websocketCompletion'
            );

            // Add to history
            get().addToHistory({
              queryId,
              query: activeQuery.status.query_id,
              fileName: 'Unknown', // Could be enhanced with file info
              timestamp: new Date(),
              status: 'completed',
              processingTime: processingTime / 1000,
              confidenceScore: completionMsg.result.confidence_score,
            });

            showSuccessNotification('Abfrage erfolgreich abgeschlossen');
            break;
          }

          case 'error': {
            set(
              (state) => ({
                ...state,
                activeQueries: {
                  ...state.activeQueries,
                  [queryId]: {
                    ...activeQuery,
                    status: {
                      ...activeQuery.status,
                      status: 'failed',
                      message: message.message || 'Abfrage fehlgeschlagen',
                      updated_at: new Date().toISOString(),
                      error_message: message.message,
                    },
                  },
                },
              }),
              false,
              'websocketError'
            );

            showErrorNotification(`Abfrage fehlgeschlagen: ${message.message}`);
            break;
          }
        }
      },

      // History management
      addToHistory: (item) => {
        set(
          (state) => ({
            ...state,
            queryHistory: [item, ...state.queryHistory.slice(0, 99)], // Keep last 100
          }),
          false,
          'addToHistory'
        );
      },

      clearHistory: () => {
        set(
          (state) => ({ ...state, queryHistory: [] }),
          false,
          'clearHistory'
        );
      },

      // Utility functions
      getActiveQuery: (queryId: string) => {
        return get().activeQueries[queryId] || null;
      },

      getAllActiveQueries: () => {
        return Object.values(get().activeQueries);
      },

      isQueryActive: (queryId: string) => {
        const query = get().activeQueries[queryId];
        return query && ['started', 'preprocessing', 'processing'].includes(query.status.status);
      },
    }),
    {
      name: 'query-store',
    }
  )
);

// Selectors
export const useActiveQueries = () => useQueryStore((state) => state.activeQueries);
export const useQueryHistory = () => useQueryStore((state) => state.queryHistory);
export const useCurrentQuery = () => useQueryStore((state) => state.currentQuery);
export const useGermanSuggestions = () => useQueryStore((state) => state.germanSuggestions);
export const useWebSocketConnected = () => useQueryStore((state) => state.websocketConnected);

// Utility hooks
export const useQuerySubmission = () => {
  const submitQuery = useQueryStore((state) => state.submitQuery);
  const currentQuery = useQueryStore((state) => state.currentQuery);
  const updateCurrentQuery = useQueryStore((state) => state.updateCurrentQuery);
  const resetCurrentQuery = useQueryStore((state) => state.resetCurrentQuery);

  return {
    submitQuery,
    currentQuery,
    updateCurrentQuery,
    resetCurrentQuery,
  };
};

export const useQueryMonitoring = () => {
  const activeQueries = useQueryStore((state) => state.activeQueries);
  const cancelQuery = useQueryStore((state) => state.cancelQuery);
  const clearQuery = useQueryStore((state) => state.clearQuery);
  const getQueryResult = useQueryStore((state) => state.getQueryResult);

  return {
    activeQueries,
    cancelQuery,
    clearQuery,
    getQueryResult,
  };
};