/**
 * Application-specific types for frontend state management.
 */

import type { 
  FileUploadResponse, 
  QueryResultResponse, 
  QueryStatusResponse,
  QueryIntentHint 
} from './api';

// Re-export for external use
export type { QueryIntentHint };

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
  error_message?: string;
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

// Enhanced Query Interface Types (Issue #47)

// Query Templates
export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  variables: QueryVariable[];
  examples: string[];
  expectedResult: string;
  tags: string[];
  createdAt: Date;
  usageCount: number;
  popularity?: number;
}

export interface QueryVariable {
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  label: string;
  description: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  placeholder?: string;
}

// Query Bookmarks
export interface QueryBookmark {
  id: string;
  name: string;
  query: string;
  intentHint?: QueryIntentHint;
  parameters: QueryParameters;
  category: string;
  tags: string[];
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  notes?: string;
  favorite: boolean;
}

export interface QueryParameters {
  maxConcurrent: number;
  timeoutSeconds: number;
  cacheResults: boolean;
  resultFormat?: 'detailed' | 'summary' | 'raw';
  includeMetadata?: boolean;
  confidenceThreshold?: number;
}

// Enhanced Query History
export interface EnhancedQueryHistoryEntry extends QueryHistoryItem {
  parameters: QueryParameters;
  fileId: string;
  fileName: string;
  duration: number;
  complexity: number;
  tokens?: number;
  resultSummary?: string;
  errorMessage?: string;
  intentConfidence?: number;
}

// Query Validation
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  confidence: number;
  estimatedComplexity: number;
  estimatedDuration: number;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// Query Preview
export interface QueryPreview {
  estimatedResults: number;
  resultStructure: ResultStructurePreview;
  processingSteps: ProcessingStep[];
  resourceEstimate: ResourceEstimate;
  complexity: ComplexityEstimate;
}

export interface ResultStructurePreview {
  entityTypes: string[];
  dataCategories: string[];
  expectedFields: string[];
  sampleOutput: any;
}

export interface ProcessingStep {
  name: string;
  description: string;
  estimatedDuration: number;
  dependencies: string[];
}

export interface ResourceEstimate {
  estimatedTokens: number;
  estimatedMemory: number;
  estimatedDuration: number;
  concurrencyImpact: number;
}

export interface ComplexityEstimate {
  score: number; // 0-10 scale
  factors: ComplexityFactor[];
  recommendation: string;
  optimization: string[];
}

export interface ComplexityFactor {
  name: string;
  impact: number;
  description: string;
}

// Query Macros
export interface QueryMacro {
  id: string;
  name: string;
  description: string;
  shortcut: string;
  template: string;
  variables: QueryVariable[];
  category: string;
  scope: 'global' | 'category' | 'file';
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
}

// Auto-completion
export interface QueryAutoCompleteItem {
  text: string;
  type: 'history' | 'template' | 'suggestion' | 'macro';
  category?: QueryIntentHint;
  confidence: number;
  usage: number;
  lastUsed: Date;
  description?: string;
}

// Contextual Help
export interface QueryHelpItem {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  examples: string[];
  relatedTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
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
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
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