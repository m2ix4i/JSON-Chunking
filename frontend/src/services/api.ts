/**
 * API service for communicating with the FastAPI backend.
 * Handles all HTTP requests and error handling.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  HealthStatus,
  FileUploadResponse,
  FileStatusResponse,
  QueryRequest,
  QueryResponse,
  QueryStatusResponse,
  QueryResultResponse,
  QueryListResponse,
  PaginationParams,
  APIError,
  FileUploadProgress
} from '@/types/api';

class APIService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add request timestamp for performance monitoring
        (config as any).metadata = { startTime: performance.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Calculate response time
        const endTime = performance.now();
        const startTime = (response.config as any).metadata?.startTime || endTime;
        (response as any).responseTime = endTime - startTime;
        
        return response;
      },
      (error: AxiosError) => {
        return Promise.reject(this.handleAPIError(error));
      }
    );
  }

  private handleAPIError(error: AxiosError): APIError {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data as APIError;
      return {
        detail: data.detail || `Server error: ${error.response.status}`,
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        detail: 'Network error: Unable to connect to server',
      };
    } else {
      // Something else happened
      return {
        detail: `Request error: ${error.message}`,
      };
    }
  }

  // Health check
  async getHealth(): Promise<HealthStatus> {
    const response = await this.client.get<HealthStatus>('/health');
    return response.data;
  }

  // File upload methods
  async uploadFile(
    file: File,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<FileUploadResponse>(
      '/files/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress: FileUploadProgress = {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded / progressEvent.total) * 100),
            };
            onProgress(progress);
          }
        },
      }
    );

    return response.data;
  }

  async getFileStatus(fileId: string): Promise<FileStatusResponse> {
    const response = await this.client.get<FileStatusResponse>(`/files/${fileId}/status`);
    return response.data;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.client.delete(`/files/${fileId}`);
  }

  async listFiles(params?: PaginationParams): Promise<FileStatusResponse[]> {
    const response = await this.client.get<{files: FileStatusResponse[]}>('/files', {
      params,
    });
    return response.data.files;
  }

  // Query methods
  async submitQuery(request: QueryRequest): Promise<QueryResponse> {
    const response = await this.client.post<QueryResponse>('/queries', request);
    return response.data;
  }

  async getQueryStatus(queryId: string): Promise<QueryStatusResponse> {
    const response = await this.client.get<QueryStatusResponse>(`/queries/${queryId}/status`);
    return response.data;
  }

  async getQueryResult(queryId: string): Promise<QueryResultResponse> {
    const response = await this.client.get<QueryResultResponse>(`/queries/${queryId}/results`);
    return response.data;
  }

  async cancelQuery(queryId: string): Promise<void> {
    await this.client.post(`/queries/${queryId}/cancel`);
  }

  async listQueries(params?: PaginationParams & { status?: string }): Promise<QueryListResponse> {
    const response = await this.client.get<QueryListResponse>('/queries', {
      params,
    });
    return response.data;
  }

  // Utility methods
  getWebSocketURL(queryId: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/ws/${queryId}`;
  }

  // Error handling helper
  isAPIError(error: any): error is APIError {
    return error && typeof error.detail !== 'undefined';
  }

  // Response time tracking
  getLastResponseTime(): number | null {
    return (this.client.defaults as any).metadata?.lastResponseTime || null;
  }

  // Network status
  async checkConnectivity(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch {
      return false;
    }
  }
}

// Create singleton instance
export const apiService = new APIService();

// Export types and utilities
export type { FileUploadProgress };
export { APIService };