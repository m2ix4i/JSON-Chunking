/**
 * Application-specific types for frontend state management.
 */

import type { 
  FileUploadResponse, 
  QueryResultResponse, 
  QueryStatusResponse,
  QueryIntentHint 
} from './api';

// App state types
export interface AppState {
  // Current page/route
  currentPage: AppPage;
  
  // Global loading states
  isLoading: boolean;
  
  // Global error state
  error: string | null;
  
  // Theme and UI preferences
  darkMode: boolean;
  sidebarOpen: boolean;
}

export type AppPage = 
  | 'dashboard' 
  | 'upload' 
  | 'query' 
  | 'results' 
  | 'history' 
  | 'settings';

// File management state
export interface FileState {
  // Currently uploaded files
  files: UploadedFile[];
  
  // Currently selected file for querying
  selectedFileId: string | null;
  
  // Upload progress
  uploadProgress: Record<string, number>;
  
  // Upload errors
  uploadErrors: Record<string, string>;
}

export interface UploadedFile extends FileUploadResponse {
  // Additional frontend-specific properties
  uploadProgress?: number;
  uploadError?: string;
  previewData?: any;
}

// Query management state  
export interface QueryState {
  // Active queries
  activeQueries: Record<string, ActiveQuery>;
  
  // Query history
  queryHistory: QueryHistoryItem[];
  
  // Current query form state
  currentQuery: {
    text: string;
    fileId: string | null;
    intentHint: QueryIntentHint | null;
    maxConcurrent: number;
    timeoutSeconds: number;
    cacheResults: boolean;
  };
  
  // WebSocket connection status
  websocketConnected: boolean;
}

export interface ActiveQuery {
  queryId: string;
  status: QueryStatusResponse;
  result?: QueryResultResponse;
  websocketConnected: boolean;
  startTime: Date;
}

export interface QueryHistoryItem {
  queryId: string;
  query: string;
  fileName: string;
  timestamp: Date;
  status: 'completed' | 'failed' | 'cancelled';
  processingTime?: number;
  confidenceScore?: number;
}

// German language support
export interface GermanQuerySuggestion {
  text: string;
  category: QueryIntentHint;
  description: string;
  example: string;
}

// Notification system
export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  autoHide?: boolean;
  duration?: number;
}

// UI Component states
export interface FileUploadState {
  isDragActive: boolean;
  uploadQueue: File[];
  currentUpload: File | null;
  uploadProgress: number;
}

export interface QueryResultDisplayState {
  expandedSections: Set<string>;
  sortBy: 'relevance' | 'confidence' | 'timestamp';
  filterBy: {
    entityTypes: string[];
    minConfidence: number;
    hasQuantities: boolean;
  };
}

// Progress tracking
export interface ProgressState {
  current: number;
  total: number;
  percentage: number;
  stepName: string;
  estimatedTimeRemaining?: number;
}

// Settings and preferences
export interface UserSettings {
  language: 'de' | 'en';
  theme: 'light' | 'dark' | 'auto';
  defaultQuerySettings: {
    maxConcurrent: number;
    timeoutSeconds: number;
    cacheResults: boolean;
  };
  notifications: {
    queryComplete: boolean;
    errors: boolean;
    fileUpload: boolean;
  };
  advanced: {
    showDebugInfo: boolean;
    showTokenUsage: boolean;
    enableProfiling: boolean;
  };
}

// Error handling
export interface AppError {
  id: string;
  type: 'api' | 'network' | 'validation' | 'websocket' | 'file';
  message: string;
  details?: any;
  timestamp: Date;
  context?: {
    page: AppPage;
    action: string;
    data?: any;
  };
}

// Performance monitoring
export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTimes: Record<string, number>;
  websocketLatency: number;
  renderTimes: Record<string, number>;
}

// Form validation
export type ValidationError = {
  field: string;
  message: string;
};

export type FormState<T> = {
  data: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
};