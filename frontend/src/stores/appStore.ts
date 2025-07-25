/**
 * Global application state management with error handling and notifications.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { normalizeError, createDebouncedErrorHandler, type AppError } from '@utils/errorUtils';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: {
    label: string;
    action: () => void;
  }[];
  timestamp: number;
}

interface AppState {
  // UI State
  isLoading: boolean;
  loadingMessage?: string;
  
  // Notifications
  notifications: Notification[];
  
  // Error State
  lastError: AppError | null;
  errorHistory: AppError[];
  retryAttempts: Record<string, number>;
  
  // Actions
  setLoading: (loading: boolean, message?: string) => void;
  
  // Notification Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Error Actions
  handleError: (error: unknown, context?: string) => void;
  clearError: () => void;
  incrementRetryAttempt: (context: string) => number;
  resetRetryAttempts: (context: string) => void;
  
  // Convenience Methods
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => {
    // Create debounced error handler to prevent spam
    const debouncedErrorHandler = createDebouncedErrorHandler((error: AppError) => {
      set(state => ({
        lastError: error,
        errorHistory: [error, ...state.errorHistory.slice(0, 49)], // Keep last 50 errors
      }));
      
      // Auto-show error notification
      get().addNotification({
        type: 'error',
        title: 'Fehler',
        message: error.message,
        duration: error.type === 'network' ? 10000 : 6000,
        persistent: error.type === 'server' && (error.status === 500 || error.status === 503),
      });
    });

    return {
      // Initial State
      isLoading: false,
      loadingMessage: undefined,
      notifications: [],
      lastError: null,
      errorHistory: [],
      retryAttempts: {},

      // Loading Actions
      setLoading: (loading: boolean, message?: string) => 
        set({ isLoading: loading, loadingMessage: loading ? message : undefined }),

      // Notification Actions
      addNotification: (notification) => {
        const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: Date.now(),
          duration: notification.duration ?? (notification.type === 'error' ? 6000 : 4000),
        };

        set(state => ({
          notifications: [newNotification, ...state.notifications.slice(0, 4)], // Keep max 5 notifications
        }));

        // Auto-remove notification after duration
        if (!newNotification.persistent && newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }

        return id;
      },

      removeNotification: (id: string) =>
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id),
        })),

      clearNotifications: () =>
        set({ notifications: [] }),

      // Error Actions
      handleError: (error: unknown, context?: string) => {
        const normalizedError = normalizeError(error);
        
        // Add context to error if provided
        if (context) {
          normalizedError.details = `Context: ${context}\n${normalizedError.details || ''}`.trim();
        }

        debouncedErrorHandler(normalizedError);
      },

      clearError: () =>
        set({ lastError: null }),

      incrementRetryAttempt: (context: string): number => {
        const currentAttempts = get().retryAttempts[context] || 0;
        const newAttempts = currentAttempts + 1;
        
        set(state => ({
          retryAttempts: {
            ...state.retryAttempts,
            [context]: newAttempts,
          },
        }));
        
        return newAttempts;
      },

      resetRetryAttempts: (context: string) =>
        set(state => ({
          retryAttempts: {
            ...state.retryAttempts,
            [context]: 0,
          },
        })),

      // Convenience Methods
      showSuccess: (message: string, title?: string) =>
        get().addNotification({ type: 'success', message, title }),

      showError: (message: string, title?: string) =>
        get().addNotification({ type: 'error', message, title }),

      showWarning: (message: string, title?: string) =>
        get().addNotification({ type: 'warning', message, title }),

      showInfo: (message: string, title?: string) =>
        get().addNotification({ type: 'info', message, title }),
    };
  })
);

// Export hooks and convenience functions
export const useAppState = () => useAppStore(state => ({
  isLoading: state.isLoading,
  loadingMessage: state.loadingMessage,
  lastError: state.lastError,
}));

export const useNotifications = () => useAppStore(state => state.notifications);

export const useLoadingState = () => useAppStore(state => ({
  isLoading: state.isLoading,
  loadingMessage: state.loadingMessage,
  setLoading: state.setLoading,
}));

export const useErrorState = () => useAppStore(state => ({
  lastError: state.lastError,
  errorHistory: state.errorHistory,
  handleError: state.handleError,
  clearError: state.clearError,
}));

// Convenience functions for notifications
export const showSuccessNotification = (message: string, title?: string) =>
  useAppStore.getState().showSuccess(message, title);

export const showErrorNotification = (message: string, title?: string) =>
  useAppStore.getState().showError(message, title);

export const showWarningNotification = (message: string, title?: string) =>
  useAppStore.getState().showWarning(message, title);

export const showInfoNotification = (message: string, title?: string) =>
  useAppStore.getState().showInfo(message, title);

// Error handling function
export const handleGlobalError = (error: unknown, context?: string) =>
  useAppStore.getState().handleError(error, context);

export default useAppStore;