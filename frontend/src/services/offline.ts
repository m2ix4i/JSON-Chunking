/**
 * Offline functionality service
 * Handles data caching, offline storage, and cache management
 */

export interface CachedQuery {
  id: string;
  query: string;
  results: any;
  timestamp: number;
  fileId?: string;
  cached: boolean;
}

export interface CachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  metadata?: any;
  thumbnail?: string;
  cached: boolean;
}

export interface CacheStats {
  totalSize: number;
  queryCount: number;
  fileCount: number;
  lastCleanup: number;
}

export interface OfflineData {
  queries: CachedQuery[];
  files: CachedFile[];
  userPreferences: any;
  syncQueue: any[];
}

class OfflineService {
  private readonly CACHE_NAME = 'ifc-chunking-offline-data';
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_QUERY_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_FILE_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * Initialize offline service
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.isSupported()) {
        console.warn('Offline functionality not supported');
        return false;
      }

      // Initialize cache
      await this.initializeCache();
      
      // Schedule periodic cleanup
      this.scheduleCleanup();
      
      console.log('Offline service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize offline service:', error);
      return false;
    }
  }

  /**
   * Cache a query result
   */
  async cacheQuery(query: string, results: any, fileId?: string): Promise<boolean> {
    try {
      const cachedQuery: CachedQuery = {
        id: this.generateQueryId(query, fileId),
        query,
        results,
        timestamp: Date.now(),
        fileId,
        cached: true
      };

      await this.storeData('queries', cachedQuery.id, cachedQuery);
      console.log('Query cached:', cachedQuery.id);
      return true;
    } catch (error) {
      console.error('Failed to cache query:', error);
      return false;
    }
  }

  /**
   * Get cached query result
   */
  async getCachedQuery(query: string, fileId?: string): Promise<CachedQuery | null> {
    try {
      const queryId = this.generateQueryId(query, fileId);
      const cachedQuery = await this.getData('queries', queryId);
      
      if (cachedQuery && this.isValidCache(cachedQuery.timestamp, this.MAX_QUERY_AGE)) {
        return cachedQuery;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get cached query:', error);
      return null;
    }
  }

  /**
   * Cache file metadata
   */
  async cacheFile(file: CachedFile): Promise<boolean> {
    try {
      await this.storeData('files', file.id, file);
      console.log('File cached:', file.id);
      return true;
    } catch (error) {
      console.error('Failed to cache file:', error);
      return false;
    }
  }

  /**
   * Get cached file metadata
   */
  async getCachedFile(fileId: string): Promise<CachedFile | null> {
    try {
      const cachedFile = await this.getData('files', fileId);
      
      if (cachedFile && this.isValidCache(new Date(cachedFile.uploadDate).getTime(), this.MAX_FILE_AGE)) {
        return cachedFile;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get cached file:', error);
      return null;
    }
  }

  /**
   * Get all cached queries
   */
  async getAllQueries(): Promise<CachedQuery[]> {
    try {
      const allData = await this.getAllData('queries');
      return allData.filter(query => 
        this.isValidCache(query.timestamp, this.MAX_QUERY_AGE)
      );
    } catch (error) {
      console.error('Failed to get all queries:', error);
      return [];
    }
  }

  /**
   * Get all cached files
   */
  async getAllFiles(): Promise<CachedFile[]> {
    try {
      const allData = await this.getAllData('files');
      return allData.filter(file => 
        this.isValidCache(new Date(file.uploadDate).getTime(), this.MAX_FILE_AGE)
      );
    } catch (error) {
      console.error('Failed to get all files:', error);
      return [];
    }
  }

  /**
   * Store user preferences offline
   */
  async storeUserPreferences(preferences: any): Promise<boolean> {
    try {
      await this.storeData('preferences', 'user', preferences);
      return true;
    } catch (error) {
      console.error('Failed to store user preferences:', error);
      return false;
    }
  }

  /**
   * Get stored user preferences
   */
  async getUserPreferences(): Promise<any | null> {
    try {
      return await this.getData('preferences', 'user');
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return null;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const queries = await this.getAllQueries();
      const files = await this.getAllFiles();
      
      // Calculate total cache size (approximate)
      const totalSize = await this.calculateCacheSize();
      
      return {
        totalSize,
        queryCount: queries.length,
        fileCount: files.length,
        lastCleanup: await this.getLastCleanupTime()
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalSize: 0,
        queryCount: 0,
        fileCount: 0,
        lastCleanup: 0
      };
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupCache(): Promise<boolean> {
    try {
      console.log('Starting cache cleanup...');
      
      // Clean expired queries
      const allQueries = await this.getAllData('queries');
      for (const query of allQueries) {
        if (!this.isValidCache(query.timestamp, this.MAX_QUERY_AGE)) {
          await this.removeData('queries', query.id);
        }
      }
      
      // Clean expired files
      const allFiles = await this.getAllData('files');
      for (const file of allFiles) {
        if (!this.isValidCache(new Date(file.uploadDate).getTime(), this.MAX_FILE_AGE)) {
          await this.removeData('files', file.id);
        }
      }
      
      // Check cache size and remove oldest entries if needed
      await this.enforceCacheSizeLimit();
      
      // Update last cleanup time
      await this.storeData('meta', 'lastCleanup', Date.now());
      
      console.log('Cache cleanup completed');
      return true;
    } catch (error) {
      console.error('Cache cleanup failed:', error);
      return false;
    }
  }

  /**
   * Clear all cached data
   */
  async clearAllCache(): Promise<boolean> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const keys = await cache.keys();
      
      await Promise.all(keys.map(key => cache.delete(key)));
      
      console.log('All cache cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Check if offline functionality is supported
   */
  private isSupported(): boolean {
    return 'caches' in window && 'indexedDB' in window;
  }

  /**
   * Initialize cache storage
   */
  private async initializeCache(): Promise<void> {
    await caches.open(this.CACHE_NAME);
  }

  /**
   * Store data in cache
   */
  private async storeData(type: string, key: string, data: any): Promise<void> {
    const cache = await caches.open(this.CACHE_NAME);
    const url = `offline://${type}/${key}`;
    
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cached-At': new Date().toISOString()
      }
    });
    
    await cache.put(url, response);
  }

  /**
   * Get data from cache
   */
  private async getData(type: string, key: string): Promise<any | null> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const url = `offline://${type}/${key}`;
      const response = await cache.match(url);
      
      if (response) {
        return await response.json();
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get data from cache:', error);
      return null;
    }
  }

  /**
   * Get all data of a specific type
   */
  private async getAllData(type: string): Promise<any[]> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const keys = await cache.keys();
      const typeKeys = keys.filter(key => key.url.includes(`offline://${type}/`));
      
      const data = await Promise.all(
        typeKeys.map(async (key) => {
          const response = await cache.match(key);
          return response ? await response.json() : null;
        })
      );
      
      return data.filter(item => item !== null);
    } catch (error) {
      console.error('Failed to get all data from cache:', error);
      return [];
    }
  }

  /**
   * Remove data from cache
   */
  private async removeData(type: string, key: string): Promise<boolean> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const url = `offline://${type}/${key}`;
      return await cache.delete(url);
    } catch (error) {
      console.error('Failed to remove data from cache:', error);
      return false;
    }
  }

  /**
   * Generate unique query ID
   */
  private generateQueryId(query: string, fileId?: string): string {
    const queryHash = btoa(query).replace(/[^a-zA-Z0-9]/g, '');
    return fileId ? `${fileId}_${queryHash}` : `global_${queryHash}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValidCache(timestamp: number, maxAge: number): boolean {
    return Date.now() - timestamp < maxAge;
  }

  /**
   * Calculate total cache size (approximate)
   */
  private async calculateCacheSize(): Promise<number> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const keys = await cache.keys();
      let totalSize = 0;
      
      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
      return 0;
    }
  }

  /**
   * Enforce cache size limits
   */
  private async enforceCacheSizeLimit(): Promise<void> {
    const currentSize = await this.calculateCacheSize();
    
    if (currentSize > this.MAX_CACHE_SIZE) {
      console.warn('Cache size limit exceeded, removing oldest entries');
      
      // Get all queries sorted by timestamp (oldest first)
      const allQueries = await this.getAllData('queries');
      const sortedQueries = allQueries.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest queries until under limit
      for (const query of sortedQueries) {
        await this.removeData('queries', query.id);
        
        const newSize = await this.calculateCacheSize();
        if (newSize <= this.MAX_CACHE_SIZE * 0.8) { // Leave 20% buffer
          break;
        }
      }
    }
  }

  /**
   * Get last cleanup time
   */
  private async getLastCleanupTime(): Promise<number> {
    const lastCleanup = await this.getData('meta', 'lastCleanup');
    return lastCleanup || 0;
  }

  /**
   * Schedule periodic cleanup
   */
  private scheduleCleanup(): void {
    // Clean up every 6 hours
    setInterval(() => {
      this.cleanupCache();
    }, 6 * 60 * 60 * 1000);
  }
}

// Create singleton instance
export const offlineService = new OfflineService();

export default offlineService;