/**
 * Centralized store exports for the IFC JSON Chunking frontend application.
 */

// App store
export {
  useAppStore,
  useCurrentPage,
  useIsLoading,
  useError,
  useDarkMode,
  useSidebarOpen,
  useNotifications,
  showSuccessNotification,
  showErrorNotification,
  showInfoNotification,
} from './appStore';

// File store
export {
  useFileStore,
  useFiles,
  useSelectedFileId,
  useSelectedFile,
  useUploadProgress,
  useUploadErrors,
  useFileUpload,
  useFileSelection,
} from './fileStore';

// Query store
export {
  useQueryStore,
  useActiveQueries,
  useQueryHistory,
  useCurrentQuery,
  useGermanSuggestions,
  useWebSocketConnected,
  useQuerySubmission,
  useQueryMonitoring,
} from './queryStore';

// Settings store
export {
  useSettingsStore,
  useTheme,
  useLanguage,
  useQueryDefaults,
  useNotificationSettings,
  useAdvancedSettings,
  getEffectiveTheme,
  initializeSettings,
} from './settingsStore';

// Offline query store
export {
  useOfflineQueryStore,
  useEnhancedQuerySubmission,
  useCachedQueries,
  useQueuedQueries,
  useOfflineQueryActions,
} from './offlineQueryStore';

// Offline file store
export {
  useOfflineFileStore,
  useEnhancedFileUpload,
  useCachedFiles,
  useQueuedUploads,
  useOfflineFileActions,
  useOfflineUploadManager,
} from './offlineFileStore';