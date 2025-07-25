/**
 * API service for communicating with the FastAPI backend.
 */

import { 
  FileUploadRequest, 
  FileUploadResponse, 
  QueryRequest, 
  QueryResponse, 
  QueryStatus,
  QueryResultResponse,
  APIResponse 
} from '@types/api';

const API_BASE_URL = '/api';

class APIService {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data,
          message: data.detail || 'API request failed'
        };
      }
      
      return {
        success: true,
        data: data,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: {
          detail: error instanceof Error ? error.message : 'Network error'
        },
        message: 'Network error occurred'
      };
    }
  }

  // Health check
  async healthCheck(): Promise<APIResponse<{ status: string }>> {
    return this.request('/health');
  }

  // File operations
  async uploadFile(file: File): Promise<APIResponse<FileUploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/files/upload', {
      method: 'POST',
      headers: {}, // Remove Content-Type to let browser set it for FormData
      body: formData,
    });
  }

  async getFileStatus(fileId: string): Promise<APIResponse<FileUploadResponse>> {
    return this.request(`/files/${fileId}/status`);
  }

  async listFiles(): Promise<APIResponse<FileUploadResponse[]>> {
    return this.request('/files');
  }

  async deleteFile(fileId: string): Promise<APIResponse<{ message: string }>> {
    return this.request(`/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  // Query operations
  async submitQuery(query: QueryRequest): Promise<APIResponse<QueryResponse>> {
    return this.request('/queries', {
      method: 'POST',
      body: JSON.stringify(query),
    });
  }

  async getQueryStatus(queryId: string): Promise<APIResponse<QueryStatus>> {
    return this.request(`/queries/${queryId}/status`);
  }

  async getQueryResult(queryId: string): Promise<APIResponse<QueryResultResponse>> {
    return this.request(`/queries/${queryId}/result`);
  }

  async cancelQuery(queryId: string): Promise<APIResponse<{ message: string }>> {
    return this.request(`/queries/${queryId}/cancel`, {
      method: 'POST',
    });
  }

  // WebSocket connection for real-time updates
  createWebSocket(queryId: string): WebSocket {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws/${queryId}`;
    return new WebSocket(wsUrl);
  }
}

export const apiService = new APIService();
export default apiService;