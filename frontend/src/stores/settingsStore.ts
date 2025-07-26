/**
 * Settings store using Zustand.
 * Manages user preferences and application configuration.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { UserSettings } from '@/types/app';

interface SettingsStoreState extends UserSettings {
  // Actions
  updateTheme: (theme: 'light' | 'dark' | 'auto') => void;
  updateLanguage: (language: 'de' | 'en') => void;
  updateQueryDefaults: (settings: Partial<UserSettings['defaultQuerySettings']>) => void;
  updateNotifications: (settings: Partial<UserSettings['notifications']>) => void;
  updateAdvanced: (settings: Partial<UserSettings['advanced']>) => void;
  
  // Bulk operations
  updateSettings: (settings: Partial<UserSettings>) => void;
  
  // Advanced features
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
  resetToDefaults: () => void;
  
  // System detection
  detectSystemTheme: () => 'light' | 'dark';
  
  // Initialization
  initialize: () => void;
}

const defaultSettings: UserSettings = {
  language: 'de', // Default to German as per existing UI
  theme: 'auto', // Auto-detect system preference
  defaultQuerySettings: {
    maxConcurrent: 3,
    timeoutSeconds: 30,
    cacheResults: true,
  },
  notifications: {
    queryComplete: true,
    errors: true,
    fileUpload: true,
  },
  advanced: {
    showDebugInfo: false,
    showTokenUsage: false,
    enableProfiling: false,
  },
};

export const useSettingsStore = create<SettingsStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        ...defaultSettings,

        // Theme management
        updateTheme: (theme) => {
          set((state) => ({ ...state, theme }), false, 'updateTheme');
          
          // Apply theme immediately
          const actualTheme = theme === 'auto' ? get().detectSystemTheme() : theme;
          document.documentElement.setAttribute('data-theme', actualTheme);
          
          // Store in localStorage for immediate access
          localStorage.setItem('theme', actualTheme);
        },

        // Language management
        updateLanguage: (language) => {
          set((state) => ({ ...state, language }), false, 'updateLanguage');
          
          // Store in localStorage for immediate access
          localStorage.setItem('language', language);
          
          // Update document language
          document.documentElement.lang = language;
        },

        // Query defaults
        updateQueryDefaults: (settings) => {
          set(
            (state) => ({
              ...state,
              defaultQuerySettings: {
                ...state.defaultQuerySettings,
                ...settings,
              },
            }),
            false,
            'updateQueryDefaults'
          );
        },

        // Notification preferences
        updateNotifications: (settings) => {
          set(
            (state) => ({
              ...state,
              notifications: {
                ...state.notifications,
                ...settings,
              },
            }),
            false,
            'updateNotifications'
          );
        },

        // Advanced settings
        updateAdvanced: (settings) => {
          set(
            (state) => ({
              ...state,
              advanced: {
                ...state.advanced,
                ...settings,
              },
            }),
            false,
            'updateAdvanced'
          );
        },

        // Bulk update
        updateSettings: (settings) => {
          set(
            (state) => ({ ...state, ...settings }),
            false,
            'updateSettings'
          );
        },

        // Export settings as JSON
        exportSettings: () => {
          const state = get();
          const exportData = {
            language: state.language,
            theme: state.theme,
            defaultQuerySettings: state.defaultQuerySettings,
            notifications: state.notifications,
            advanced: state.advanced,
            exportedAt: new Date().toISOString(),
            version: '1.0',
          };
          return JSON.stringify(exportData, null, 2);
        },

        // Import settings from JSON
        importSettings: (settingsJson) => {
          try {
            const importedSettings = JSON.parse(settingsJson);
            
            // Validate structure
            if (!importedSettings || typeof importedSettings !== 'object') {
              return false;
            }

            // Extract valid settings
            const validSettings: Partial<UserSettings> = {};
            
            if (importedSettings.language && ['de', 'en'].includes(importedSettings.language)) {
              validSettings.language = importedSettings.language;
            }
            
            if (importedSettings.theme && ['light', 'dark', 'auto'].includes(importedSettings.theme)) {
              validSettings.theme = importedSettings.theme;
            }
            
            if (importedSettings.defaultQuerySettings) {
              validSettings.defaultQuerySettings = {
                ...defaultSettings.defaultQuerySettings,
                ...importedSettings.defaultQuerySettings,
              };
            }
            
            if (importedSettings.notifications) {
              validSettings.notifications = {
                ...defaultSettings.notifications,
                ...importedSettings.notifications,
              };
            }
            
            if (importedSettings.advanced) {
              validSettings.advanced = {
                ...defaultSettings.advanced,
                ...importedSettings.advanced,
              };
            }

            // Apply imported settings
            get().updateSettings(validSettings);
            return true;
          } catch (error) {
            console.error('Failed to import settings:', error);
            return false;
          }
        },

        // Reset to factory defaults
        resetToDefaults: () => {
          set({ ...defaultSettings }, false, 'resetToDefaults');
          
          // Clear localStorage
          localStorage.removeItem('theme');
          localStorage.removeItem('language');
          
          // Re-initialize
          get().initialize();
        },

        // Detect system theme preference
        detectSystemTheme: () => {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        },

        // Initialize settings
        initialize: () => {
          const state = get();
          
          // Apply theme
          const actualTheme = state.theme === 'auto' ? state.detectSystemTheme() : state.theme;
          document.documentElement.setAttribute('data-theme', actualTheme);
          localStorage.setItem('theme', actualTheme);
          
          // Apply language
          document.documentElement.lang = state.language;
          localStorage.setItem('language', state.language);
          
          // Listen for system theme changes
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleThemeChange = () => {
            if (state.theme === 'auto') {
              const newTheme = state.detectSystemTheme();
              document.documentElement.setAttribute('data-theme', newTheme);
              localStorage.setItem('theme', newTheme);
            }
          };
          
          mediaQuery.addEventListener('change', handleThemeChange);
          
          // Return cleanup function
          return () => {
            mediaQuery.removeEventListener('change', handleThemeChange);
          };
        },
      }),
      {
        name: 'ifc-settings-store',
        // Only persist the actual settings, not the action functions
        partialize: (state) => ({
          language: state.language,
          theme: state.theme,
          defaultQuerySettings: state.defaultQuerySettings,
          notifications: state.notifications,
          advanced: state.advanced,
        }),
      }
    ),
    {
      name: 'settings-store',
    }
  )
);

// Selectors for better performance
export const useTheme = () => useSettingsStore((state) => state.theme);
export const useLanguage = () => useSettingsStore((state) => state.language);
export const useQueryDefaults = () => useSettingsStore((state) => state.defaultQuerySettings);
export const useNotificationSettings = () => useSettingsStore((state) => state.notifications);
export const useAdvancedSettings = () => useSettingsStore((state) => state.advanced);

// Utility functions
export const getEffectiveTheme = (): 'light' | 'dark' => {
  const theme = useSettingsStore.getState().theme;
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

export const initializeSettings = () => {
  useSettingsStore.getState().initialize();
};