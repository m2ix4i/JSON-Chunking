"""
Redis-based distributed caching system for IFC JSON Chunking.

This module provides high-performance distributed caching using Redis
with connection pooling, compression, and intelligent cache management.
"""

import asyncio
import json
import pickle
import time
import zlib
from typing import Any, Dict, List, Optional, Set, Union
from dataclasses import dataclass, field
import hashlib

import structlog

from ..config import Config
from ..query.types import QueryResult, QueryIntent, ChunkResult

logger = structlog.get_logger(__name__)

try:
    import redis
    import redis.asyncio as redis_async
    REDIS_AVAILABLE = True
except ImportError:
    logger.warning("Redis not available, falling back to memory-only caching")
    REDIS_AVAILABLE = False


@dataclass
class CacheStats:
    """Cache performance statistics."""
    
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    errors: int = 0
    total_size_bytes: int = 0
    avg_response_time_ms: float = 0.0
    last_updated: float = field(default_factory=time.time)
    
    @property
    def hit_rate(self) -> float:
        """Calculate cache hit rate."""
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0
    
    @property
    def error_rate(self) -> float:
        """Calculate cache error rate."""
        total = self.hits + self.misses + self.sets + self.deletes
        return self.errors / total if total > 0 else 0.0


class RedisCache:
    """
    High-performance Redis cache with compression and connection pooling.
    
    Features:
    - Automatic compression for large values
    - Connection pooling for high concurrency
    - Multi-tiered TTL management
    - Cache statistics and monitoring
    - Graceful fallback to memory cache
    """
    
    def __init__(self, config: Config):
        """
        Initialize Redis cache.
        
        Args:
            config: System configuration
        """
        self.config = config
        self.stats = CacheStats()
        self._redis: Optional[redis_async.Redis] = None
        self._pool: Optional[redis_async.ConnectionPool] = None
        self._memory_cache: Dict[str, Any] = {}
        self._memory_cache_times: Dict[str, float] = {}
        self._is_connected = False
        
        # Cache configuration
        self._default_ttl = config.cache_default_ttl_seconds
        self._query_result_ttl = config.cache_query_result_ttl_seconds
        self._chunk_result_ttl = config.cache_chunk_result_ttl_seconds
        self._max_memory_mb = config.cache_max_memory_mb
        self._compression_enabled = config.cache_compression_enabled
        self._compression_threshold = 1024  # Compress values > 1KB
        
        if REDIS_AVAILABLE and config.enable_caching:
            self._initialize_redis()
        else:
            logger.warning("Redis caching disabled, using memory-only cache")
    
    def _initialize_redis(self) -> None:
        """Initialize Redis connection pool."""
        try:
            # Create connection pool
            if self.config.redis_url:
                self._pool = redis_async.ConnectionPool.from_url(
                    self.config.redis_url,
                    max_connections=self.config.redis_pool_max_connections,
                    retry_on_timeout=self.config.redis_pool_retry_on_timeout,
                    socket_connect_timeout=self.config.redis_socket_connect_timeout,
                    socket_timeout=self.config.redis_socket_timeout,
                    decode_responses=False  # We handle encoding ourselves
                )
            else:
                self._pool = redis_async.ConnectionPool(
                    host=self.config.redis_host,
                    port=self.config.redis_port,
                    db=self.config.redis_db,
                    password=self.config.redis_password or None,
                    max_connections=self.config.redis_pool_max_connections,
                    retry_on_timeout=self.config.redis_pool_retry_on_timeout,
                    socket_connect_timeout=self.config.redis_socket_connect_timeout,
                    socket_timeout=self.config.redis_socket_timeout,
                    decode_responses=False
                )
            
            self._redis = redis_async.Redis(connection_pool=self._pool)
            logger.info("Redis cache initialized", 
                       host=self.config.redis_host, 
                       port=self.config.redis_port, 
                       max_connections=self.config.redis_pool_max_connections)
        
        except Exception as e:
            logger.error("Failed to initialize Redis cache", error=str(e))
            self._redis = None
            self._pool = None
    
    async def connect(self) -> bool:
        """
        Test Redis connection.
        
        Returns:
            True if connected successfully
        """
        if not self._redis:
            return False
        
        try:
            await self._redis.ping()
            self._is_connected = True
            logger.info("Redis cache connected successfully")
            return True
        except Exception as e:
            logger.error("Redis connection failed", error=str(e))
            self._is_connected = False
            return False
    
    async def disconnect(self) -> None:
        """Close Redis connections."""
        if self._redis:
            try:
                await self._redis.close()
                if self._pool:
                    await self._pool.disconnect()
                logger.info("Redis cache disconnected")
            except Exception as e:
                logger.error("Error disconnecting Redis cache", error=str(e))
        
        self._is_connected = False
    
    def _get_cache_key(self, key: str, namespace: str = "default") -> str:
        """
        Generate cache key with namespace.
        
        Args:
            key: Base cache key
            namespace: Cache namespace
            
        Returns:
            Full cache key
        """
        service_name = self.config.apm_service_name
        environment = self.config.environment
        return f"{service_name}:{environment}:{namespace}:{key}"
    
    def _serialize_value(self, value: Any) -> bytes:
        """
        Serialize and optionally compress cache value.
        
        Args:
            value: Value to serialize
            
        Returns:
            Serialized bytes
        """
        # Serialize using pickle for Python objects
        serialized = pickle.dumps(value)
        
        # Compress if enabled and value is large enough
        if self._compression_enabled and len(serialized) > self._compression_threshold:
            compressed = zlib.compress(serialized)
            # Only use compression if it actually reduces size
            if len(compressed) < len(serialized):
                return b'compressed:' + compressed
        
        return b'raw:' + serialized
    
    def _deserialize_value(self, data: bytes) -> Any:
        """
        Deserialize and decompress cache value.
        
        Args:
            data: Serialized data
            
        Returns:
            Deserialized value
        """
        if data.startswith(b'compressed:'):
            # Decompress and deserialize
            compressed_data = data[11:]  # Remove 'compressed:' prefix
            serialized = zlib.decompress(compressed_data)
            return pickle.loads(serialized)
        elif data.startswith(b'raw:'):
            # Just deserialize
            serialized = data[4:]  # Remove 'raw:' prefix
            return pickle.loads(serialized)
        else:
            # Legacy format, assume raw pickle
            return pickle.loads(data)
    
    async def get(self, key: str, namespace: str = "default") -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            namespace: Cache namespace
            
        Returns:
            Cached value or None if not found
        """
        start_time = time.time()
        cache_key = self._get_cache_key(key, namespace)
        
        try:
            # Try Redis first if available
            if self._redis and self._is_connected:
                try:
                    data = await self._redis.get(cache_key)
                    if data is not None:
                        value = self._deserialize_value(data)
                        self.stats.hits += 1
                        logger.debug("Cache hit (Redis)", key=cache_key)
                        return value
                except Exception as e:
                    logger.error("Redis get error", key=cache_key, error=str(e))
                    self.stats.errors += 1
            
            # Fallback to memory cache
            if cache_key in self._memory_cache:
                # Check TTL
                if cache_key in self._memory_cache_times:
                    cache_time = self._memory_cache_times[cache_key]
                    if time.time() - cache_time > self._default_ttl:
                        # Expired
                        del self._memory_cache[cache_key]
                        del self._memory_cache_times[cache_key]
                        self.stats.misses += 1
                        return None
                
                value = self._memory_cache[cache_key]
                self.stats.hits += 1
                logger.debug("Cache hit (memory)", key=cache_key)
                return value
            
            self.stats.misses += 1
            logger.debug("Cache miss", key=cache_key)
            return None
        
        finally:
            # Update response time stats
            response_time = (time.time() - start_time) * 1000
            self.stats.avg_response_time_ms = (
                self.stats.avg_response_time_ms * 0.9 + response_time * 0.1
            )
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None, 
        namespace: str = "default"
    ) -> bool:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds
            namespace: Cache namespace
            
        Returns:
            True if set successfully
        """
        cache_key = self._get_cache_key(key, namespace)
        ttl = ttl or self._default_ttl
        
        try:
            serialized = self._serialize_value(value)
            
            # Try Redis first if available
            if self._redis and self._is_connected:
                try:
                    await self._redis.setex(cache_key, ttl, serialized)
                    self.stats.sets += 1
                    self.stats.total_size_bytes += len(serialized)
                    logger.debug("Cache set (Redis)", key=cache_key, size=len(serialized))
                    return True
                except Exception as e:
                    logger.error("Redis set error", key=cache_key, error=str(e))
                    self.stats.errors += 1
            
            # Fallback to memory cache
            self._memory_cache[cache_key] = value
            self._memory_cache_times[cache_key] = time.time()
            
            # Simple memory management - remove oldest entries if over limit
            if len(self._memory_cache) > 1000:  # Simple limit
                oldest_key = min(self._memory_cache_times.keys(), 
                               key=lambda k: self._memory_cache_times[k])
                del self._memory_cache[oldest_key]
                del self._memory_cache_times[oldest_key]
            
            self.stats.sets += 1
            logger.debug("Cache set (memory)", key=cache_key)
            return True
        
        except Exception as e:
            logger.error("Cache set error", key=cache_key, error=str(e))
            self.stats.errors += 1
            return False
    
    async def delete(self, key: str, namespace: str = "default") -> bool:
        """
        Delete value from cache.
        
        Args:
            key: Cache key
            namespace: Cache namespace
            
        Returns:
            True if deleted successfully
        """
        cache_key = self._get_cache_key(key, namespace)
        
        try:
            # Delete from Redis if available
            if self._redis and self._is_connected:
                try:
                    deleted = await self._redis.delete(cache_key)
                    if deleted:
                        self.stats.deletes += 1
                        logger.debug("Cache delete (Redis)", key=cache_key)
                except Exception as e:
                    logger.error("Redis delete error", key=cache_key, error=str(e))
                    self.stats.errors += 1
            
            # Delete from memory cache
            if cache_key in self._memory_cache:
                del self._memory_cache[cache_key]
                if cache_key in self._memory_cache_times:
                    del self._memory_cache_times[cache_key]
                self.stats.deletes += 1
                logger.debug("Cache delete (memory)", key=cache_key)
                return True
            
            return False
        
        except Exception as e:
            logger.error("Cache delete error", key=cache_key, error=str(e))
            self.stats.errors += 1
            return False
    
    async def clear_namespace(self, namespace: str = "default") -> int:
        """
        Clear all keys in a namespace.
        
        Args:
            namespace: Namespace to clear
            
        Returns:
            Number of keys deleted
        """
        pattern = self._get_cache_key("*", namespace)
        deleted_count = 0
        
        try:
            # Clear from Redis if available
            if self._redis and self._is_connected:
                try:
                    keys = await self._redis.keys(pattern)
                    if keys:
                        deleted_count += await self._redis.delete(*keys)
                        logger.info("Cleared Redis namespace", namespace=namespace, count=len(keys))
                except Exception as e:
                    logger.error("Redis clear namespace error", namespace=namespace, error=str(e))
                    self.stats.errors += 1
            
            # Clear from memory cache
            memory_keys_to_delete = []
            prefix = pattern.replace("*", "")
            for key in self._memory_cache.keys():
                if key.startswith(prefix):
                    memory_keys_to_delete.append(key)
            
            for key in memory_keys_to_delete:
                del self._memory_cache[key]
                if key in self._memory_cache_times:
                    del self._memory_cache_times[key]
                deleted_count += 1
            
            if memory_keys_to_delete:
                logger.info("Cleared memory namespace", namespace=namespace, count=len(memory_keys_to_delete))
            
            return deleted_count
        
        except Exception as e:
            logger.error("Cache clear namespace error", namespace=namespace, error=str(e))
            self.stats.errors += 1
            return 0
    
    async def get_stats(self) -> CacheStats:
        """
        Get cache statistics.
        
        Returns:
            Current cache statistics
        """
        self.stats.last_updated = time.time()
        
        # Add Redis-specific stats if available
        if self._redis and self._is_connected:
            try:
                info = await self._redis.info('memory')
                self.stats.total_size_bytes = info.get('used_memory', 0)
            except Exception as e:
                logger.error("Error getting Redis stats", error=str(e))
        
        return self.stats
    
    # Convenience methods for specific cache types
    
    async def cache_query_result(self, query_id: str, result: QueryResult) -> bool:
        """Cache query result with appropriate TTL."""
        return await self.set(
            key=f"query_result:{query_id}",
            value=result,
            ttl=self._query_result_ttl,
            namespace="queries"
        )
    
    async def get_cached_query_result(self, query_id: str) -> Optional[QueryResult]:
        """Get cached query result."""
        return await self.get(
            key=f"query_result:{query_id}",
            namespace="queries"
        )
    
    async def cache_chunk_result(self, chunk_id: str, result: ChunkResult) -> bool:
        """Cache chunk result with appropriate TTL."""
        return await self.set(
            key=f"chunk_result:{chunk_id}",
            value=result,
            ttl=self._chunk_result_ttl,
            namespace="chunks"
        )
    
    async def get_cached_chunk_result(self, chunk_id: str) -> Optional[ChunkResult]:
        """Get cached chunk result."""
        return await self.get(
            key=f"chunk_result:{chunk_id}",
            namespace="chunks"
        )
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform cache health check.
        
        Returns:
            Health check results
        """
        health_status = {
            "redis_available": REDIS_AVAILABLE,
            "redis_connected": self._is_connected,
            "memory_cache_size": len(self._memory_cache),
            "stats": self.stats.__dict__,
            "configuration": {
                "default_ttl": self._default_ttl,
                "compression_enabled": self._compression_enabled,
                "max_memory_mb": self._max_memory_mb,
            }
        }
        
        # Test Redis connection if available
        if self._redis:
            try:
                await self._redis.ping()
                health_status["redis_ping"] = True
                health_status["redis_connected"] = True
            except Exception as e:
                health_status["redis_ping"] = False
                health_status["redis_connected"] = False
                health_status["redis_error"] = str(e)
        
        return health_status