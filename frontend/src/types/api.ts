/**
 * API types for IFC JSON Chunking application.
 * These types match the FastAPI backend response models.
 */

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    query_processor: boolean;
    chunking_engine: boolean;
    file_storage: boolean;
  };
}

export interface FileUploadResponse {
  file_id: string;
  filename: string;
  size: number;
  content_type: string;
  upload_timestamp: string;
  status: 'uploaded' | 'processing' | 'error' | 'completed';
  validation_result?: {
    is_valid: boolean;
    json_structure_valid: boolean;
    estimated_chunks: number;
    estimated_tokens?: number;
    processing_time?: number;
    issues?: string[];
  };
}

export interface FileStatusResponse {
  file_id: string;
  filename: string;
  size: number;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  upload_timestamp: string;
  processing_metadata?: {
    chunk_count?: number;
    processing_time?: number;
    estimated_tokens?: number;
  };
  error_message?: string;
}

export type QueryIntentHint = 
  | 'quantity' 
  | 'component' 
  | 'material' 
  | 'spatial' 
  | 'cost' 
  | 'general';

export type QueryStatus = 
  | 'started' 
  | 'preprocessing' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface QueryRequest {
  query: string;
  file_id: string;
  intent_hint?: QueryIntentHint;
  max_concurrent?: number;
  timeout_seconds?: number;
  cache_results?: boolean;
}

export interface QueryResponse {
  query_id: string;
  status: 'started' | 'processing' | 'completed' | 'failed';
  message: string;
  estimated_processing_time?: number;
}

export interface QueryStatusResponse {
  query_id: string;
  status: 'started' | 'preprocessing' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  current_step: number;
  total_steps: number;
  message: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
}

export interface QueryResultResponse {
  query_id: string;
  original_query: string;
  intent: string;
  answer: string;
  confidence_score: number;
  completeness_score: number;
  relevance_score: number;
  processing_time: number;
  total_chunks: number;
  successful_chunks: number;
  failed_chunks: number;
  total_tokens: number;
  total_cost: number;
  model_used: string;
  structured_data?: {
    entities: Array<{
      type: string;
      name: string;
      properties: Record<string, any>;
    }>;
    quantities: Record<string, number>;
    materials: string[];
    spatial_context: Record<string, any>;
  };
}

export interface QueryListResponse {
  queries: QueryStatusResponse[];
  total: number;
  offset: number;
  limit: number;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  timestamp: number;
  query_id: string;
  message?: string;
  [key: string]: any;
}

export interface ProgressMessage extends WebSocketMessage {
  type: 'progress';
  progress_percentage: number;
  current_step: number;
  total_steps: number;
  step_name: string;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  error_code?: string;
  error_details?: string;
}

export interface CompletionMessage extends WebSocketMessage {
  type: 'completion';
  result: QueryResultResponse;
}

// API Error types
export interface APIError {
  detail: string | Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

// Utility types
export type APIResponse<T> = T | APIError;

export interface PaginationParams {
  offset?: number;
  limit?: number;
}

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}