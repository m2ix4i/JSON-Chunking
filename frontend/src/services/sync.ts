/**
 * Background sync service
 * Handles client-side background sync coordination and queue management
 */

export interface SyncOperation {
  id: string;
  type: 'query' | 'upload' | 'preference' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

export interface SyncStats {
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  lastSyncTime: number;
  isOnline: boolean;
}

export interface SyncEventCallback {
  onSyncStart?: (operation: SyncOperation) => void;
  onSyncComplete?: (operation: SyncOperation) => void;
  onSyncError?: (operation: SyncOperation, error: Error) => void;
  onConnectionChange?: (isOnline: boolean) => void;
}

class SyncService {
  private readonly SYNC_QUEUE_KEY = 'ifc-chunking-sync-queue';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private syncQueue: SyncOperation[] = [];
  private isProcessing = false;
  private eventCallbacks: SyncEventCallback = {};
  private connectionListeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    this.setupConnectionListeners();
    this.loadSyncQueue();
  }

  /**
   * Initialize sync service
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.isSupported()) {
        console.warn('Background sync not supported');
        return false;
      }

      // Load persisted sync queue
      await this.loadSyncQueue();
      
      // Start processing if online
      if (navigator.onLine) {
        this.startProcessing();
      }
      
      console.log('Sync service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
      return false;
    }
  }

  /**
   * Add operation to sync queue
   */
  async addToQueue(
    type: SyncOperation['type'], 
    data: any, 
    maxRetries: number = this.MAX_RETRIES
  ): Promise<string> {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
      status: 'pending'
    };

    this.syncQueue.push(operation);
    await this.persistSyncQueue();

    console.log('Operation added to sync queue:', operation.id);

    // Try to process immediately if online
    if (navigator.onLine && !this.isProcessing) {
      this.startProcessing();
    }

    return operation.id;
  }

  /**
   * Remove operation from queue
   */
  async removeFromQueue(operationId: string): Promise<boolean> {
    const index = this.syncQueue.findIndex(op => op.id === operationId);
    
    if (index !== -1) {
      this.syncQueue.splice(index, 1);
      await this.persistSyncQueue();
      console.log('Operation removed from sync queue:', operationId);
      return true;
    }
    
    return false;
  }

  /**
   * Get sync queue status
   */
  getSyncStats(): SyncStats {
    const pendingOps = this.syncQueue.filter(op => op.status === 'pending');
    const completedOps = this.syncQueue.filter(op => op.status === 'completed');
    const failedOps = this.syncQueue.filter(op => op.status === 'failed');
    
    return {
      pendingCount: pendingOps.length,
      completedCount: completedOps.length,
      failedCount: failedOps.length,
      lastSyncTime: this.getLastSyncTime(),
      isOnline: navigator.onLine
    };
  }

  /**
   * Get all pending operations
   */
  getPendingOperations(): SyncOperation[] {
    return this.syncQueue.filter(op => op.status === 'pending');
  }

  /**
   * Manually trigger sync process
   */
  async forcSync(): Promise<boolean> {
    if (!navigator.onLine) {
      console.warn('Cannot sync while offline');
      return false;
    }

    console.log('Forcing sync process...');
    return await this.processSyncQueue();
  }

  /**
   * Clear completed operations from queue
   */
  async clearCompletedOperations(): Promise<void> {
    this.syncQueue = this.syncQueue.filter(op => op.status !== 'completed');
    await this.persistSyncQueue();
    console.log('Cleared completed operations from sync queue');
  }

  /**
   * Clear all operations from queue
   */
  async clearAllOperations(): Promise<void> {
    this.syncQueue = [];
    await this.persistSyncQueue();
    console.log('Cleared all operations from sync queue');
  }

  /**
   * Set event callbacks
   */
  setEventCallbacks(callbacks: SyncEventCallback): void {
    this.eventCallbacks = { ...this.eventCallbacks, ...callbacks };
  }

  /**
   * Add connection change listener
   */
  onConnectionChange(listener: (isOnline: boolean) => void): () => void {
    this.connectionListeners.add(listener);
    
    // Call immediately with current status
    listener(navigator.onLine);
    
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Check if background sync is supported
   */
  private isSupported(): boolean {
    return 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
  }

  /**
   * Setup connection event listeners
   */
  private setupConnectionListeners(): void {
    window.addEventListener('online', () => {
      console.log('Connection restored, starting sync process');
      this.notifyConnectionChange(true);
      this.startProcessing();
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost, sync process paused');
      this.notifyConnectionChange(false);
      this.isProcessing = false;
    });
  }

  /**
   * Start processing sync queue
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    await this.processSyncQueue();
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue(): Promise<boolean> {
    if (!navigator.onLine) {
      this.isProcessing = false;
      return false;
    }

    const pendingOperations = this.getPendingOperations();
    
    if (pendingOperations.length === 0) {
      this.isProcessing = false;
      return true;
    }

    console.log(`Processing ${pendingOperations.length} sync operations`);

    for (const operation of pendingOperations) {
      try {
        await this.processOperation(operation);
      } catch (error) {
        console.error('Failed to process sync operation:', operation.id, error);
      }
    }

    this.isProcessing = false;
    await this.persistSyncQueue();
    
    return true;
  }

  /**
   * Process individual sync operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    operation.status = 'syncing';
    this.eventCallbacks.onSyncStart?.(operation);

    try {
      let success = false;

      switch (operation.type) {
        case 'query':
          success = await this.syncQuery(operation.data);
          break;
        case 'upload':
          success = await this.syncUpload(operation.data);
          break;
        case 'preference':
          success = await this.syncPreference(operation.data);
          break;
        case 'delete':
          success = await this.syncDelete(operation.data);
          break;
      }

      if (success) {
        operation.status = 'completed';
        this.eventCallbacks.onSyncComplete?.(operation);
        console.log('Sync operation completed:', operation.id);
      } else {
        throw new Error('Sync operation failed');
      }
    } catch (error) {
      operation.retryCount++;
      
      if (operation.retryCount >= operation.maxRetries) {
        operation.status = 'failed';
        this.eventCallbacks.onSyncError?.(operation, error as Error);
        console.error('Sync operation failed permanently:', operation.id, error);
      } else {
        operation.status = 'pending';
        console.warn(`Sync operation failed, retry ${operation.retryCount}/${operation.maxRetries}:`, operation.id, error);
        
        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * operation.retryCount));
      }
    }
  }

  /**
   * Sync query operation
   */
  private async syncQuery(data: any): Promise<boolean> {
    try {
      const response = await fetch('/api/queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return response.ok;
    } catch (error) {
      console.error('Query sync failed:', error);
      return false;
    }
  }

  /**
   * Sync upload operation
   */
  private async syncUpload(data: any): Promise<boolean> {
    try {
      const formData = new FormData();
      
      // Reconstruct file from stored data
      if (data.file) {
        formData.append('file', data.file);
      }
      
      // Add metadata
      if (data.metadata) {
        formData.append('metadata', JSON.stringify(data.metadata));
      }

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      return response.ok;
    } catch (error) {
      console.error('Upload sync failed:', error);
      return false;
    }
  }

  /**
   * Sync preference operation
   */
  private async syncPreference(data: any): Promise<boolean> {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return response.ok;
    } catch (error) {
      console.error('Preference sync failed:', error);
      return false;
    }
  }

  /**
   * Sync delete operation
   */
  private async syncDelete(data: any): Promise<boolean> {
    try {
      const response = await fetch(`/api/${data.type}/${data.id}`, {
        method: 'DELETE',
      });

      return response.ok;
    } catch (error) {
      console.error('Delete sync failed:', error);
      return false;
    }
  }

  /**
   * Load sync queue from localStorage
   */
  private async loadSyncQueue(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.SYNC_QUEUE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        console.log(`Loaded ${this.syncQueue.length} operations from sync queue`);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Persist sync queue to localStorage
   */
  private async persistSyncQueue(): Promise<void> {
    try {
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to persist sync queue:', error);
    }
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get last sync time
   */
  private getLastSyncTime(): number {
    const completedOps = this.syncQueue.filter(op => op.status === 'completed');
    if (completedOps.length === 0) {
      return 0;
    }
    
    return Math.max(...completedOps.map(op => op.timestamp));
  }

  /**
   * Notify connection change listeners
   */
  private notifyConnectionChange(isOnline: boolean): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });

    this.eventCallbacks.onConnectionChange?.(isOnline);
  }
}

// Create singleton instance
export const syncService = new SyncService();

export default syncService;