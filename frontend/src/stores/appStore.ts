/**
 * Main application store using Zustand.
 * Manages global app state, navigation, and UI preferences.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AppState, AppPage, AppNotification, AppError } from '@/types/app';

interface AppStoreState extends AppState {
  // Actions
  setCurrentPage: (page: AppPage) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  
  // Notifications
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Error tracking
  errors: AppError[];
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  clearErrors: () => void;
  
  // App lifecycle
  initialize: () => void;
  reset: () => void;
}

const initialState: AppState = {
  currentPage: 'dashboard',
  isLoading: false,
  error: null,
  darkMode: false,
  sidebarOpen: true,
};

export const useAppStore = create<AppStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        notifications: [],
        errors: [],

        // Page navigation
        setCurrentPage: (page) => {
          set((state) => ({ ...state, currentPage: page }), false, 'setCurrentPage');
        },

        // Loading state
        setLoading: (loading) => {
          set((state) => ({ ...state, isLoading: loading }), false, 'setLoading');
        },

        // Error handling
        setError: (error) => {
          set((state) => ({ ...state, error }), false, 'setError');
        },

        // Theme
        toggleDarkMode: () => {
          set(
            (state) => ({ ...state, darkMode: !state.darkMode }),
            false,
            'toggleDarkMode'
          );
        },

        // UI
        toggleSidebar: () => {
          set(
            (state) => ({ ...state, sidebarOpen: !state.sidebarOpen }),
            false,
            'toggleSidebar'
          );
        },

        // Notifications
        addNotification: (notification) => {
          const newNotification: AppNotification = {
            ...notification,
            id: Math.random().toString(36).substring(2, 15),
            timestamp: new Date(),
          };

          set(
            (state) => ({
              ...state,
              notifications: [...state.notifications, newNotification],
            }),
            false,
            'addNotification'
          );

          // Auto-remove notification if specified
          if (notification.autoHide !== false) {
            const duration = notification.duration || 5000;
            setTimeout(() => {
              get().removeNotification(newNotification.id);
            }, duration);
          }
        },

        removeNotification: (id) => {
          set(
            (state) => ({
              ...state,
              notifications: state.notifications.filter((n) => n.id !== id),
            }),
            false,
            'removeNotification'
          );
        },

        clearNotifications: () => {
          set((state) => ({ ...state, notifications: [] }), false, 'clearNotifications');
        },

        // Error tracking
        addError: (error) => {
          const newError: AppError = {
            ...error,
            id: Math.random().toString(36).substring(2, 15),
            timestamp: new Date(),
          };

          set(
            (state) => ({
              ...state,
              errors: [...state.errors, newError],
            }),
            false,
            'addError'
          );

          // Also show as notification for user-facing errors
          if (error.type !== 'network') {
            get().addNotification({
              type: 'error',
              title: 'Fehler',
              message: error.message,
              autoHide: true,
              duration: 8000,
            });
          }
        },

        clearErrors: () => {
          set((state) => ({ ...state, errors: [] }), false, 'clearErrors');
        },

        // App lifecycle
        initialize: () => {
          // Initialize app state, check for saved preferences, etc.
          const savedTheme = localStorage.getItem('theme');
          if (savedTheme === 'dark') {
            set((state) => ({ ...state, darkMode: true }), false, 'initialize-theme');
          }

          // Check system preference if no saved theme
          if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            set((state) => ({ ...state, darkMode: true }), false, 'initialize-system-theme');
          }
        },

        reset: () => {
          set(
            {
              ...initialState,
              notifications: [],
              errors: [],
            },
            false,
            'reset'
          );
        },
      }),
      {
        name: 'ifc-app-store',
        partialize: (state) => ({
          darkMode: state.darkMode,
          sidebarOpen: state.sidebarOpen,
          currentPage: state.currentPage,
        }),
      }
    ),
    {
      name: 'app-store',
    }
  )
);

// Selectors for better performance
export const useCurrentPage = () => useAppStore((state) => state.currentPage);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error);
export const useDarkMode = () => useAppStore((state) => state.darkMode);
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useErrorState = () => useAppStore((state) => state.errors);

// Utility functions
export const showSuccessNotification = (message: string, title = 'Erfolg') => {
  useAppStore.getState().addNotification({
    type: 'success',
    title,
    message,
    autoHide: true,
    duration: 4000,
  });
};

export const showErrorNotification = (message: string, title = 'Fehler') => {
  useAppStore.getState().addNotification({
    type: 'error',
    title,
    message,
    autoHide: true,
    duration: 8000,
  });
};

export const showInfoNotification = (message: string, title = 'Information') => {
  useAppStore.getState().addNotification({
    type: 'info',
    title,
    message,
    autoHide: true,
    duration: 6000,
  });
};