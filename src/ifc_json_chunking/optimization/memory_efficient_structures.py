"""
Memory-efficient data structures and resource pooling for optimized performance.

This module provides specialized data structures and pooling mechanisms
designed for high-performance, low-memory footprint operations.
"""

import gc
import gzip
import logging
import mmap
import os
import pickle
import tempfile
import threading
import time
import weakref
from collections import deque
from collections.abc import Generator
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Dict, Generic, Optional, TypeVar, Union

logger = logging.getLogger(__name__)

T = TypeVar('T')


@dataclass
class PoolStats:
    """Resource pool statistics."""
    total_created: int = 0
    active_objects: int = 0
    pooled_objects: int = 0
    peak_usage: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    memory_saved_mb: float = 0.0


class ObjectPool(Generic[T]):
    """High-performance object pool with automatic lifecycle management."""

    def __init__(self,
                 factory: callable,
                 reset_func: Optional[callable] = None,
                 max_size: int = 100,
                 max_idle_time: float = 300.0):  # 5 minutes
        """Initialize object pool."""
        self.factory = factory
        self.reset_func = reset_func
        self.max_size = max_size
        self.max_idle_time = max_idle_time

        self._pool: deque = deque()
        self._active: weakref.WeakSet = weakref.WeakSet()
        self._created_times: Dict[int, float] = {}
        self._lock = threading.Lock()
        self._stats = PoolStats()

        # Background cleanup
        self._cleanup_interval = 60.0  # 1 minute
        self._last_cleanup = time.time()

        logger.debug("Object pool initialized", extra={
            "max_size": max_size,
            "max_idle_time": max_idle_time
        })

    @contextmanager
    def get_object(self) -> Generator[T, None, None]:
        """Get object from pool with automatic return."""
        obj = self._get_from_pool()
        try:
            yield obj
        finally:
            self._return_to_pool(obj)

    def _get_from_pool(self) -> T:
        """Get object from pool or create new one."""
        with self._lock:
            # Try to get from pool
            while self._pool:
                obj = self._pool.popleft()
                obj_id = id(obj)

                # Check if object is still valid
                if obj_id in self._created_times:
                    self._stats.cache_hits += 1
                    self._active.add(obj)
                    self._stats.active_objects = len(self._active)
                    self._stats.pooled_objects = len(self._pool)
                    return obj

            # Create new object
            obj = self.factory()
            self._stats.total_created += 1
            self._stats.cache_misses += 1
            self._created_times[id(obj)] = time.time()
            self._active.add(obj)
            self._stats.active_objects = len(self._active)
            self._stats.peak_usage = max(self._stats.peak_usage, self._stats.active_objects)

            return obj

    def _return_to_pool(self, obj: T) -> None:
        """Return object to pool."""
        with self._lock:
            if obj not in self._active:
                return

            self._active.discard(obj)

            # Reset object if reset function provided
            if self.reset_func:
                try:
                    self.reset_func(obj)
                except Exception as e:
                    logger.warning("Failed to reset pooled object", extra={"error": str(e)})
                    return

            # Add to pool if under max size
            if len(self._pool) < self.max_size:
                self._pool.append(obj)
                self._created_times[id(obj)] = time.time()
            else:
                # Remove from tracking
                self._created_times.pop(id(obj), None)

            self._stats.active_objects = len(self._active)
            self._stats.pooled_objects = len(self._pool)

            # Periodic cleanup
            current_time = time.time()
            if current_time - self._last_cleanup > self._cleanup_interval:
                self._cleanup_expired_objects()
                self._last_cleanup = current_time

    def _cleanup_expired_objects(self) -> None:
        """Remove expired objects from pool."""
        current_time = time.time()
        cleaned_objects = 0

        # Clean pool
        new_pool = deque()
        while self._pool:
            obj = self._pool.popleft()
            obj_id = id(obj)
            created_time = self._created_times.get(obj_id, current_time)

            if current_time - created_time < self.max_idle_time:
                new_pool.append(obj)
            else:
                self._created_times.pop(obj_id, None)
                cleaned_objects += 1

        self._pool = new_pool
        self._stats.pooled_objects = len(self._pool)

        if cleaned_objects > 0:
            logger.debug("Cleaned expired objects from pool", extra={
                "cleaned_count": cleaned_objects,
                "remaining_pooled": len(self._pool)
            })

    def get_stats(self) -> PoolStats:
        """Get pool statistics."""
        with self._lock:
            return PoolStats(
                total_created=self._stats.total_created,
                active_objects=len(self._active),
                pooled_objects=len(self._pool),
                peak_usage=self._stats.peak_usage,
                cache_hits=self._stats.cache_hits,
                cache_misses=self._stats.cache_misses,
                memory_saved_mb=self._calculate_memory_saved()
            )

    def _calculate_memory_saved(self) -> float:
        """Estimate memory saved by pooling."""
        # Rough estimate: cache hits * average object size
        # This is a simplified calculation
        return (self._stats.cache_hits * 0.1)  # Assume 0.1MB per object

    def clear(self) -> None:
        """Clear the pool."""
        with self._lock:
            self._pool.clear()
            self._created_times.clear()
            self._stats.pooled_objects = 0


class CompressedBuffer:
    """Memory-efficient buffer with automatic compression."""

    def __init__(self,
                 compression_threshold: int = 1024,  # 1KB
                 compression_level: int = 6):
        """Initialize compressed buffer."""
        self.compression_threshold = compression_threshold
        self.compression_level = compression_level
        self._data: Optional[bytes] = None
        self._is_compressed = False
        self._original_size = 0
        self._lock = threading.Lock()

        logger.debug("Compressed buffer initialized", extra={
            "compression_threshold": compression_threshold,
            "compression_level": compression_level
        })

    def write(self, data: Union[str, bytes, Any]) -> None:
        """Write data to buffer with automatic compression."""
        with self._lock:
            # Convert to bytes if necessary
            if isinstance(data, str):
                data_bytes = data.encode('utf-8')
            elif isinstance(data, bytes):
                data_bytes = data
            else:
                # Pickle other objects
                data_bytes = pickle.dumps(data)

            self._original_size = len(data_bytes)

            # Compress if above threshold
            if len(data_bytes) >= self.compression_threshold:
                self._data = gzip.compress(data_bytes, compresslevel=self.compression_level)
                self._is_compressed = True
                logger.debug("Data compressed", extra={
                    "original_size": len(data_bytes),
                    "compressed_size": len(self._data),
                    "compression_ratio": len(self._data) / len(data_bytes)
                })
            else:
                self._data = data_bytes
                self._is_compressed = False

    def read(self) -> bytes:
        """Read data from buffer with automatic decompression."""
        with self._lock:
            if self._data is None:
                return b""

            if self._is_compressed:
                return gzip.decompress(self._data)
            else:
                return self._data

    def size(self) -> int:
        """Get current buffer size in memory."""
        with self._lock:
            return len(self._data) if self._data else 0

    def original_size(self) -> int:
        """Get original data size before compression."""
        return self._original_size

    def compression_ratio(self) -> float:
        """Get compression ratio (0-1, lower is better compression)."""
        if not self._is_compressed or self._original_size == 0:
            return 1.0
        return self.size() / self._original_size

    def clear(self) -> None:
        """Clear buffer data."""
        with self._lock:
            self._data = None
            self._is_compressed = False
            self._original_size = 0


class MemoryMappedCache:
    """Memory-mapped file cache for large data with efficient access."""

    def __init__(self,
                 cache_dir: Optional[str] = None,
                 max_file_size: int = 100 * 1024 * 1024,  # 100MB
                 cleanup_interval: float = 3600.0):  # 1 hour
        """Initialize memory-mapped cache."""
        self.cache_dir = cache_dir or tempfile.gettempdir()
        self.max_file_size = max_file_size
        self.cleanup_interval = cleanup_interval

        self._cache_files: Dict[str, str] = {}
        self._mapped_files: Dict[str, mmap.mmap] = {}
        self._file_handles: Dict[str, Any] = {}
        self._access_times: Dict[str, float] = {}
        self._lock = threading.Lock()
        self._last_cleanup = time.time()

        # Ensure cache directory exists
        os.makedirs(self.cache_dir, exist_ok=True)

        logger.info("Memory-mapped cache initialized", extra={
            "cache_dir": self.cache_dir,
            "max_file_size": max_file_size
        })

    def put(self, key: str, data: bytes) -> bool:
        """Store data in memory-mapped cache."""
        if len(data) > self.max_file_size:
            logger.warning("Data too large for cache", extra={
                "key": key,
                "size": len(data),
                "max_size": self.max_file_size
            })
            return False

        with self._lock:
            try:
                # Create temporary file
                cache_file = os.path.join(self.cache_dir, f"cache_{hash(key) % 10000}.dat")

                # Write data to file
                with open(cache_file, 'wb') as f:
                    f.write(data)

                # Memory map the file
                file_handle = open(cache_file, 'r+b')
                mapped_file = mmap.mmap(file_handle.fileno(), 0)

                # Clean up old mapping if exists
                self._cleanup_key(key)

                # Store new mapping
                self._cache_files[key] = cache_file
                self._mapped_files[key] = mapped_file
                self._file_handles[key] = file_handle
                self._access_times[key] = time.time()

                logger.debug("Data cached", extra={
                    "key": key,
                    "size": len(data),
                    "file": cache_file
                })

                return True

            except Exception as e:
                logger.error("Failed to cache data", extra={
                    "key": key,
                    "error": str(e)
                })
                return False

    def get(self, key: str) -> Optional[bytes]:
        """Retrieve data from memory-mapped cache."""
        with self._lock:
            mapped_file = self._mapped_files.get(key)
            if not mapped_file:
                return None

            try:
                # Update access time
                self._access_times[key] = time.time()

                # Read data from memory-mapped file
                mapped_file.seek(0)
                data = mapped_file.read()

                logger.debug("Data retrieved from cache", extra={
                    "key": key,
                    "size": len(data)
                })

                return data

            except Exception as e:
                logger.error("Failed to retrieve cached data", extra={
                    "key": key,
                    "error": str(e)
                })
                self._cleanup_key(key)
                return None

    def _cleanup_key(self, key: str) -> None:
        """Clean up resources for a specific key."""
        # Close memory mapping
        mapped_file = self._mapped_files.pop(key, None)
        if mapped_file:
            try:
                mapped_file.close()
            except:
                pass

        # Close file handle
        file_handle = self._file_handles.pop(key, None)
        if file_handle:
            try:
                file_handle.close()
            except:
                pass

        # Remove file
        cache_file = self._cache_files.pop(key, None)
        if cache_file and os.path.exists(cache_file):
            try:
                os.remove(cache_file)
            except:
                pass

        # Remove access time
        self._access_times.pop(key, None)

    def remove(self, key: str) -> bool:
        """Remove data from cache."""
        with self._lock:
            if key not in self._cache_files:
                return False

            self._cleanup_key(key)
            logger.debug("Data removed from cache", extra={"key": key})
            return True

    def cleanup_expired(self, max_age: float = 3600.0) -> int:
        """Clean up expired cache entries."""
        current_time = time.time()
        expired_keys = []

        with self._lock:
            for key, access_time in self._access_times.items():
                if current_time - access_time > max_age:
                    expired_keys.append(key)

            for key in expired_keys:
                self._cleanup_key(key)

        if expired_keys:
            logger.info("Cleaned up expired cache entries", extra={
                "count": len(expired_keys)
            })

        return len(expired_keys)

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            total_size = 0
            for cache_file in self._cache_files.values():
                try:
                    total_size += os.path.getsize(cache_file)
                except:
                    pass

            return {
                "total_entries": len(self._cache_files),
                "total_size_mb": total_size / (1024 * 1024),
                "cache_dir": self.cache_dir,
                "oldest_access": min(self._access_times.values()) if self._access_times else None,
                "newest_access": max(self._access_times.values()) if self._access_times else None
            }

    def clear(self) -> None:
        """Clear all cached data."""
        with self._lock:
            keys_to_remove = list(self._cache_files.keys())
            for key in keys_to_remove:
                self._cleanup_key(key)

            logger.info("Cache cleared", extra={
                "entries_removed": len(keys_to_remove)
            })


class ChunkBuffer:
    """Specialized buffer for IFC chunk data with memory optimization."""

    def __init__(self, max_memory_mb: int = 100):
        """Initialize chunk buffer."""
        self.max_memory_mb = max_memory_mb
        self.max_memory_bytes = max_memory_mb * 1024 * 1024

        self._chunks: Dict[str, CompressedBuffer] = {}
        self._access_order: deque = deque()
        self._current_memory = 0
        self._lock = threading.Lock()

        # Statistics
        self._stats = {
            "chunks_stored": 0,
            "chunks_evicted": 0,
            "memory_saved_by_compression": 0,
            "cache_hits": 0,
            "cache_misses": 0
        }

        logger.info("Chunk buffer initialized", extra={
            "max_memory_mb": max_memory_mb
        })

    def store_chunk(self, chunk_id: str, chunk_data: Any) -> bool:
        """Store chunk data with automatic memory management."""
        with self._lock:
            # Create compressed buffer
            buffer = CompressedBuffer()
            buffer.write(chunk_data)

            # Check if we need to evict chunks
            while (self._current_memory + buffer.size() > self.max_memory_bytes and
                   self._access_order):
                self._evict_lru_chunk()

            # Store chunk
            if chunk_id in self._chunks:
                old_buffer = self._chunks[chunk_id]
                self._current_memory -= old_buffer.size()
            else:
                self._stats["chunks_stored"] += 1

            self._chunks[chunk_id] = buffer
            self._current_memory += buffer.size()

            # Update access order
            if chunk_id in self._access_order:
                self._access_order.remove(chunk_id)
            self._access_order.append(chunk_id)

            # Update compression statistics
            compression_saved = buffer.original_size() - buffer.size()
            if compression_saved > 0:
                self._stats["memory_saved_by_compression"] += compression_saved

            logger.debug("Chunk stored", extra={
                "chunk_id": chunk_id,
                "original_size": buffer.original_size(),
                "stored_size": buffer.size(),
                "compression_ratio": buffer.compression_ratio(),
                "total_memory_mb": self._current_memory / (1024 * 1024)
            })

            return True

    def get_chunk(self, chunk_id: str) -> Optional[Any]:
        """Retrieve chunk data."""
        with self._lock:
            buffer = self._chunks.get(chunk_id)
            if not buffer:
                self._stats["cache_misses"] += 1
                return None

            self._stats["cache_hits"] += 1

            # Update access order
            self._access_order.remove(chunk_id)
            self._access_order.append(chunk_id)

            # Read and deserialize data
            try:
                data_bytes = buffer.read()
                chunk_data = pickle.loads(data_bytes)

                logger.debug("Chunk retrieved", extra={
                    "chunk_id": chunk_id,
                    "size": len(data_bytes)
                })

                return chunk_data

            except Exception as e:
                logger.error("Failed to deserialize chunk", extra={
                    "chunk_id": chunk_id,
                    "error": str(e)
                })
                # Remove corrupted chunk
                self._remove_chunk_internal(chunk_id)
                return None

    def _evict_lru_chunk(self) -> None:
        """Evict least recently used chunk."""
        if not self._access_order:
            return

        chunk_id = self._access_order.popleft()
        self._remove_chunk_internal(chunk_id)
        self._stats["chunks_evicted"] += 1

        logger.debug("Chunk evicted", extra={
            "chunk_id": chunk_id,
            "reason": "LRU"
        })

    def _remove_chunk_internal(self, chunk_id: str) -> None:
        """Remove chunk without lock (internal use)."""
        buffer = self._chunks.pop(chunk_id, None)
        if buffer:
            self._current_memory -= buffer.size()

        if chunk_id in self._access_order:
            self._access_order.remove(chunk_id)

    def remove_chunk(self, chunk_id: str) -> bool:
        """Remove specific chunk."""
        with self._lock:
            if chunk_id not in self._chunks:
                return False

            self._remove_chunk_internal(chunk_id)
            logger.debug("Chunk removed", extra={"chunk_id": chunk_id})
            return True

    def get_memory_usage(self) -> Dict[str, Any]:
        """Get detailed memory usage information."""
        with self._lock:
            return {
                "current_memory_mb": self._current_memory / (1024 * 1024),
                "max_memory_mb": self.max_memory_mb,
                "memory_utilization": self._current_memory / self.max_memory_bytes,
                "total_chunks": len(self._chunks),
                "average_chunk_size_kb": (self._current_memory / len(self._chunks) / 1024) if self._chunks else 0,
                "stats": self._stats.copy()
            }

    def clear(self) -> None:
        """Clear all chunks."""
        with self._lock:
            self._chunks.clear()
            self._access_order.clear()
            self._current_memory = 0

            logger.info("Chunk buffer cleared")


class ResourceManager:
    """Centralized resource manager with pooling and optimization."""

    def __init__(self):
        """Initialize resource manager."""
        self._pools: Dict[str, ObjectPool] = {}
        self._caches: Dict[str, Union[MemoryMappedCache, ChunkBuffer]] = {}
        self._lock = threading.Lock()

        # Default pools
        self._initialize_default_pools()

        logger.info("Resource manager initialized")

    def _initialize_default_pools(self) -> None:
        """Initialize default object pools."""
        # Dictionary pool for reusable dictionaries
        self._pools["dict"] = ObjectPool(
            factory=dict,
            reset_func=lambda d: d.clear(),
            max_size=50
        )

        # List pool for reusable lists
        self._pools["list"] = ObjectPool(
            factory=list,
            reset_func=lambda l: l.clear(),
            max_size=50
        )

        # Set pool for reusable sets
        self._pools["set"] = ObjectPool(
            factory=set,
            reset_func=lambda s: s.clear(),
            max_size=30
        )

    def get_pool(self, pool_name: str) -> Optional[ObjectPool]:
        """Get object pool by name."""
        with self._lock:
            return self._pools.get(pool_name)

    def create_pool(self,
                   pool_name: str,
                   factory: callable,
                   reset_func: Optional[callable] = None,
                   max_size: int = 100) -> ObjectPool:
        """Create new object pool."""
        with self._lock:
            pool = ObjectPool(factory, reset_func, max_size)
            self._pools[pool_name] = pool

            logger.info("Object pool created", extra={
                "pool_name": pool_name,
                "max_size": max_size
            })

            return pool

    def get_cache(self, cache_name: str) -> Optional[Union[MemoryMappedCache, ChunkBuffer]]:
        """Get cache by name."""
        with self._lock:
            return self._caches.get(cache_name)

    def create_chunk_cache(self,
                          cache_name: str,
                          max_memory_mb: int = 100) -> ChunkBuffer:
        """Create chunk buffer cache."""
        with self._lock:
            cache = ChunkBuffer(max_memory_mb)
            self._caches[cache_name] = cache

            logger.info("Chunk cache created", extra={
                "cache_name": cache_name,
                "max_memory_mb": max_memory_mb
            })

            return cache

    def create_mmap_cache(self,
                         cache_name: str,
                         cache_dir: Optional[str] = None,
                         max_file_size: int = 100 * 1024 * 1024) -> MemoryMappedCache:
        """Create memory-mapped cache."""
        with self._lock:
            cache = MemoryMappedCache(cache_dir, max_file_size)
            self._caches[cache_name] = cache

            logger.info("Memory-mapped cache created", extra={
                "cache_name": cache_name,
                "cache_dir": cache_dir,
                "max_file_size_mb": max_file_size / (1024 * 1024)
            })

            return cache

    def get_resource_stats(self) -> Dict[str, Any]:
        """Get comprehensive resource statistics."""
        with self._lock:
            pool_stats = {}
            for name, pool in self._pools.items():
                pool_stats[name] = pool.get_stats()

            cache_stats = {}
            for name, cache in self._caches.items():
                if hasattr(cache, 'get_memory_usage'):
                    cache_stats[name] = cache.get_memory_usage()
                elif hasattr(cache, 'get_stats'):
                    cache_stats[name] = cache.get_stats()

            return {
                "pools": pool_stats,
                "caches": cache_stats,
                "total_pools": len(self._pools),
                "total_caches": len(self._caches)
            }

    def cleanup_all(self) -> None:
        """Clean up all resources."""
        with self._lock:
            # Clear all pools
            for pool in self._pools.values():
                pool.clear()

            # Clear all caches
            for cache in self._caches.values():
                if hasattr(cache, 'clear'):
                    cache.clear()

            # Force garbage collection
            gc.collect()

            logger.info("All resources cleaned up")


# Global resource manager instance
_resource_manager: Optional[ResourceManager] = None


def get_resource_manager() -> ResourceManager:
    """Get global resource manager instance."""
    global _resource_manager
    if _resource_manager is None:
        _resource_manager = ResourceManager()
    return _resource_manager
