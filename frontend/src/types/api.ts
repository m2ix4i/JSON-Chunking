/**
 * TypeScript types for API requests and responses.
 */

// File Upload Types
export interface FileUploadRequest {
  file: File;
}

export interface FileUploadResponse {
  file_id: string;
  filename: string;
  size: number;
  upload_date: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
}

// Query Types
export interface QueryRequest {
  query: string;
  file_id: string;
  intent_hint?: string;
  max_concurrent?: number;
  timeout_seconds?: number;
  cache_results?: boolean;
}

export interface QueryResponse {
  query_id: string;
  status: 'pending' | 'started' | 'completed' | 'failed';
  message?: string;
}

export interface QueryStatus {
  query_id: string;
  status: 'pending' | 'started' | 'preprocessing' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  current_chunk?: number;
  total_chunks?: number;
  estimated_time_remaining?: number;
  error_message?: string;
  last_updated: string;
}

export interface QueryResultResponse {
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

// Error Types
export interface APIError {
  detail: string;
  code?: string;
  field?: string;
  errors?: Array<{
    field: string;
    message: string;
    code?: string;
    severity?: 'error' | 'warning' | 'info';
  }>;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'status_update' | 'result' | 'error';
  data: QueryStatus | QueryResultResponse | APIError;
}

// Common Response Types
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: APIError;
  message: string;
}

export type APIResponse<T = any> = SuccessResponse<T> | ErrorResponse;