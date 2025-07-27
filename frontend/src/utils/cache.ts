/**
 * Enhanced caching utilities
 * Provides intelligent caching strategies and cache management
 */

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache size in bytes
  strategy: 'lru' | 'lfu' | 'fifo'; // Cache eviction strategy
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export interface CacheStats {
  entries: number;
  size: number;
  hitRate: number;
  missRate: number;
  evictions: number;
}

/**
 * Enhanced memory cache with configurable eviction strategies
 */
export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 30 * 60 * 1000, // 30 minutes default
      maxSize: 10 * 1024 * 1024, // 10MB default
      strategy: 'lru',
      ...config,
    };
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): boolean {
    const size = this.calculateSize(value);
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
    };

    // Check if we need to evict entries
    this.ensureCapacity(size);

    this.cache.set(key, entry);
    return true;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      entries: this.cache.size,
      size: this.getCurrentSize(),
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      evictions: this.stats.evictions,
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all entries (non-expired)
   */
  entries(): Array<[string, T]> {
    const now = Date.now();
    const validEntries: Array<[string, T]> = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp <= this.config.ttl) {
        validEntries.push([key, entry.value]);
      } else {
        this.cache.delete(key);
      }
    }

    return validEntries;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Calculate size of value (approximate)
   */
  private calculateSize(value: T): number {
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16 encoding
    }
    
    if (typeof value === 'number') {
      return 8; // 64-bit number
    }
    
    if (typeof value === 'boolean') {
      return 4;
    }
    
    if (value === null || value === undefined) {
      return 0;
    }
    
    // For objects, use JSON serialization size as approximation
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024; // Fallback estimate
    }
  }

  /**
   * Get current cache size
   */
  private getCurrentSize(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  /**
   * Ensure cache capacity before adding new entry
   */
  private ensureCapacity(newEntrySize: number): void {
    const currentSize = this.getCurrentSize();
    
    if (currentSize + newEntrySize <= this.config.maxSize) {
      return;
    }

    // Evict entries based on strategy
    switch (this.config.strategy) {
      case 'lru':
        this.evictLRU(newEntrySize);
        break;
      case 'lfu':
        this.evictLFU(newEntrySize);
        break;
      case 'fifo':
        this.evictFIFO(newEntrySize);
        break;
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      this.cache.delete(key);
      freedSpace += entry.size;
      this.stats.evictions++;
      
      if (freedSpace >= requiredSpace) {
        break;
      }
    }
  }

  /**
   * Evict least frequently used entries
   */
  private evictLFU(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].accessCount - b[1].accessCount);

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      this.cache.delete(key);
      freedSpace += entry.size;
      this.stats.evictions++;
      
      if (freedSpace >= requiredSpace) {
        break;
      }
    }
  }

  /**
   * Evict first in, first out entries
   */
  private evictFIFO(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      this.cache.delete(key);
      freedSpace += entry.size;
      this.stats.evictions++;
      
      if (freedSpace >= requiredSpace) {
        break;
      }
    }
  }
}

/**
 * Cache configuration presets
 */
export const CachePresets = {
  // Fast, small cache for UI state
  ui: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 1024 * 1024, // 1MB
    strategy: 'lru' as const,
  },
  
  // Medium cache for API responses
  api: {
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 5 * 1024 * 1024, // 5MB
    strategy: 'lru' as const,
  },
  
  // Large cache for file data
  files: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 20 * 1024 * 1024, // 20MB
    strategy: 'lfu' as const,
  },
  
  // Long-term cache for user preferences
  preferences: {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxSize: 512 * 1024, // 512KB
    strategy: 'fifo' as const,
  },
} as const;

/**
 * Global cache instances
 */
export const uiCache = new MemoryCache(CachePresets.ui);
export const apiCache = new MemoryCache(CachePresets.api);
export const fileCache = new MemoryCache(CachePresets.files);
export const preferencesCache = new MemoryCache(CachePresets.preferences);

/**
 * Cache decorator for functions
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  cache: MemoryCache = apiCache,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const generateKey = keyGenerator || ((...args) => JSON.stringify(args));

  return ((...args: Parameters<T>) => {
    const key = generateKey(...args);
    
    let result = cache.get(key);
    if (result === null) {
      result = fn(...args);
      cache.set(key, result);
    }
    
    return result;
  }) as T;
}

/**
 * Cache wrapper for async functions with error handling
 */
export function cacheAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  cache: MemoryCache = apiCache,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string;
    cacheErrors?: boolean;
    errorTtl?: number;
  } = {}
): T {
  const {
    keyGenerator = (...args) => JSON.stringify(args),
    cacheErrors = false,
    errorTtl = 5 * 60 * 1000, // 5 minutes for errors
  } = options;

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    
    // Check cache first
    let cached = cache.get(key);
    if (cached !== null) {
      if (cached instanceof Error) {
        throw cached;
      }
      return cached;
    }

    try {
      const result = await fn(...args);
      cache.set(key, result);
      return result;
    } catch (error) {
      if (cacheErrors) {
        // Create a temporary cache with shorter TTL for errors
        const errorCache = new MemoryCache({ 
          ...cache['config'], 
          ttl: errorTtl 
        });
        errorCache.set(key, error);
      }
      throw error;
    }
  }) as T;
}

/**
 * Utility to invalidate cache patterns
 */
export function invalidatePattern(
  cache: MemoryCache,
  pattern: string | RegExp
): number {
  const keys = cache.keys();
  const regex = typeof pattern === 'string' 
    ? new RegExp(pattern.replace(/\*/g, '.*')) 
    : pattern;
  
  let invalidated = 0;
  for (const key of keys) {
    if (regex.test(key)) {
      cache.delete(key);
      invalidated++;
    }
  }
  
  return invalidated;
}

/**
 * Batch cache operations
 */
export class BatchCache {
  private operations: Array<{
    type: 'set' | 'delete';
    cache: MemoryCache;
    key: string;
    value?: any;
  }> = [];

  set<T>(cache: MemoryCache<T>, key: string, value: T): this {
    this.operations.push({ type: 'set', cache, key, value });
    return this;
  }

  delete(cache: MemoryCache, key: string): this {
    this.operations.push({ type: 'delete', cache, key });
    return this;
  }

  execute(): void {
    for (const op of this.operations) {
      if (op.type === 'set') {
        op.cache.set(op.key, op.value);
      } else {
        op.cache.delete(op.key);
      }
    }
    this.operations = [];
  }

  clear(): void {
    this.operations = [];
  }
}

export default {
  MemoryCache,
  CachePresets,
  uiCache,
  apiCache,
  fileCache,
  preferencesCache,
  memoize,
  cacheAsync,
  invalidatePattern,
  BatchCache,
};