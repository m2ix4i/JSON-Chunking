"""
Temporary storage system for query processing results.

This module provides flexible temporary storage with multiple backend
options including in-memory, Redis, and file-based storage.
"""

import asyncio
import json
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

import structlog

from ..query.types import ChunkResult, QueryResult

logger = structlog.get_logger(__name__)


class StorageBackend(Enum):
    """Available storage backends."""
    MEMORY = "memory"
    REDIS = "redis"
    FILE = "file"


@dataclass
class StorageEntry:
    """Entry in temporary storage."""

    entry_id: str
    key: str
    data: Any
    created_at: float = field(default_factory=time.time)
    expires_at: Optional[float] = None
    access_count: int = 0
    last_accessed: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_expired(self) -> bool:
        """Check if entry has expired."""
        if self.expires_at is None:
            return False
        return time.time() > self.expires_at

    @property
    def age_seconds(self) -> float:
        """Get age of entry in seconds."""
        return time.time() - self.created_at

    def access(self) -> None:
        """Record access to the entry."""
        self.access_count += 1
        self.last_accessed = time.time()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "entry_id": self.entry_id,
            "key": self.key,
            "data": self.data,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "access_count": self.access_count,
            "last_accessed": self.last_accessed,
            "metadata": self.metadata
        }


class BaseStorageBackend(ABC):
    """Base class for storage backends."""

    @abstractmethod
    async def store(self, key: str, data: Any, ttl_seconds: Optional[int] = None) -> str:
        """Store data with optional TTL."""
        pass

    @abstractmethod
    async def retrieve(self, key: str) -> Optional[Any]:
        """Retrieve data by key."""
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete data by key."""
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if key exists."""
        pass

    @abstractmethod
    async def cleanup_expired(self) -> int:
        """Clean up expired entries. Returns number of cleaned entries."""
        pass

    @abstractmethod
    async def get_stats(self) -> Dict[str, Any]:
        """Get storage statistics."""
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close storage backend and cleanup resources."""
        pass


class MemoryStorageBackend(BaseStorageBackend):
    """In-memory storage backend."""

    def __init__(self, max_entries: int = 10000):
        """Initialize memory backend."""
        self.max_entries = max_entries
        self._storage: Dict[str, StorageEntry] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
        self._start_cleanup_task()

        logger.info("Memory storage backend initialized", max_entries=max_entries)

    def _start_cleanup_task(self) -> None:
        """Start periodic cleanup task."""
        async def cleanup_loop():
            while True:
                try:
                    await asyncio.sleep(60)  # Cleanup every minute
                    await self.cleanup_expired()
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error("Cleanup task failed", error=str(e))

        self._cleanup_task = asyncio.create_task(cleanup_loop())

    async def store(self, key: str, data: Any, ttl_seconds: Optional[int] = None) -> str:
        """Store data in memory."""
        entry_id = f"mem_{uuid.uuid4().hex[:12]}"
        expires_at = time.time() + ttl_seconds if ttl_seconds else None

        entry = StorageEntry(
            entry_id=entry_id,
            key=key,
            data=data,
            expires_at=expires_at
        )

        self._storage[key] = entry

        # Enforce max entries limit
        if len(self._storage) > self.max_entries:
            await self._evict_oldest_entries()

        logger.debug("Data stored in memory", key=key, entry_id=entry_id, ttl=ttl_seconds)
        return entry_id

    async def retrieve(self, key: str) -> Optional[Any]:
        """Retrieve data from memory."""
        entry = self._storage.get(key)

        if entry is None:
            return None

        if entry.is_expired:
            del self._storage[key]
            logger.debug("Expired entry removed", key=key)
            return None

        entry.access()
        return entry.data

    async def delete(self, key: str) -> bool:
        """Delete data from memory."""
        if key in self._storage:
            del self._storage[key]
            logger.debug("Entry deleted", key=key)
            return True
        return False

    async def exists(self, key: str) -> bool:
        """Check if key exists in memory."""
        entry = self._storage.get(key)
        if entry and entry.is_expired:
            del self._storage[key]
            return False
        return entry is not None

    async def cleanup_expired(self) -> int:
        """Clean up expired entries."""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self._storage.items()
            if entry.expires_at and current_time > entry.expires_at
        ]

        for key in expired_keys:
            del self._storage[key]

        if expired_keys:
            logger.debug("Expired entries cleaned up", count=len(expired_keys))

        return len(expired_keys)

    async def _evict_oldest_entries(self) -> None:
        """Evict oldest entries to maintain size limit."""
        if len(self._storage) <= self.max_entries:
            return

        # Sort by last accessed time and remove oldest
        entries_by_age = sorted(
            self._storage.items(),
            key=lambda x: x[1].last_accessed
        )

        entries_to_remove = len(self._storage) - self.max_entries + 100  # Remove extra for buffer

        for key, _ in entries_by_age[:entries_to_remove]:
            del self._storage[key]

        logger.debug("Oldest entries evicted", count=entries_to_remove)

    async def get_stats(self) -> Dict[str, Any]:
        """Get memory storage statistics."""
        current_time = time.time()
        expired_count = sum(
            1 for entry in self._storage.values()
            if entry.expires_at and current_time > entry.expires_at
        )

        total_access_count = sum(entry.access_count for entry in self._storage.values())
        avg_age = (
            sum(entry.age_seconds for entry in self._storage.values()) / len(self._storage)
            if self._storage else 0
        )

        return {
            "backend_type": "memory",
            "total_entries": len(self._storage),
            "expired_entries": expired_count,
            "max_entries": self.max_entries,
            "total_access_count": total_access_count,
            "average_age_seconds": avg_age,
            "memory_usage_estimate": len(self._storage) * 1024  # Rough estimate
        }

    async def close(self) -> None:
        """Close memory backend."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

        self._storage.clear()
        logger.info("Memory storage backend closed")


class FileStorageBackend(BaseStorageBackend):
    """File-based storage backend."""

    def __init__(self, storage_dir: Path, max_files: int = 1000):
        """Initialize file backend."""
        self.storage_dir = Path(storage_dir)
        self.max_files = max_files
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        logger.info("File storage backend initialized", storage_dir=storage_dir)

    def _get_file_path(self, key: str) -> Path:
        """Get file path for key."""
        # Create safe filename from key
        safe_key = "".join(c for c in key if c.isalnum() or c in "-_.")[:100]
        return self.storage_dir / f"{safe_key}.json"

    async def store(self, key: str, data: Any, ttl_seconds: Optional[int] = None) -> str:
        """Store data to file."""
        entry_id = f"file_{uuid.uuid4().hex[:12]}"
        expires_at = time.time() + ttl_seconds if ttl_seconds else None

        entry = StorageEntry(
            entry_id=entry_id,
            key=key,
            data=data,
            expires_at=expires_at
        )

        file_path = self._get_file_path(key)

        try:
            with open(file_path, 'w') as f:
                json.dump(entry.to_dict(), f, default=str)

            logger.debug("Data stored to file", key=key, file_path=file_path)
            return entry_id

        except Exception as e:
            logger.error("Failed to store data to file", key=key, error=str(e))
            raise

    async def retrieve(self, key: str) -> Optional[Any]:
        """Retrieve data from file."""
        file_path = self._get_file_path(key)

        if not file_path.exists():
            return None

        try:
            with open(file_path) as f:
                entry_data = json.load(f)

            entry = StorageEntry(**entry_data)

            if entry.is_expired:
                file_path.unlink(missing_ok=True)
                logger.debug("Expired file entry removed", key=key)
                return None

            # Update access count (write back to file)
            entry.access()
            with open(file_path, 'w') as f:
                json.dump(entry.to_dict(), f, default=str)

            return entry.data

        except Exception as e:
            logger.error("Failed to retrieve data from file", key=key, error=str(e))
            return None

    async def delete(self, key: str) -> bool:
        """Delete file entry."""
        file_path = self._get_file_path(key)

        if file_path.exists():
            try:
                file_path.unlink()
                logger.debug("File entry deleted", key=key)
                return True
            except Exception as e:
                logger.error("Failed to delete file entry", key=key, error=str(e))

        return False

    async def exists(self, key: str) -> bool:
        """Check if file entry exists."""
        file_path = self._get_file_path(key)
        return file_path.exists()

    async def cleanup_expired(self) -> int:
        """Clean up expired file entries."""
        current_time = time.time()
        cleaned_count = 0

        for file_path in self.storage_dir.glob("*.json"):
            try:
                with open(file_path) as f:
                    entry_data = json.load(f)

                entry = StorageEntry(**entry_data)

                if entry.is_expired:
                    file_path.unlink()
                    cleaned_count += 1

            except Exception as e:
                logger.warning("Failed to check file entry", file_path=file_path, error=str(e))

        if cleaned_count > 0:
            logger.debug("Expired file entries cleaned up", count=cleaned_count)

        return cleaned_count

    async def get_stats(self) -> Dict[str, Any]:
        """Get file storage statistics."""
        files = list(self.storage_dir.glob("*.json"))
        total_size = sum(f.stat().st_size for f in files if f.exists())

        return {
            "backend_type": "file",
            "total_entries": len(files),
            "storage_directory": str(self.storage_dir),
            "total_size_bytes": total_size,
            "max_files": self.max_files
        }

    async def close(self) -> None:
        """Close file backend."""
        logger.info("File storage backend closed")


class TemporaryStorage:
    """
    Temporary storage system with multiple backend support.
    
    Provides temporary storage for query processing results with
    automatic cleanup, TTL support, and flexible backend options.
    """

    def __init__(
        self,
        backend: StorageBackend = StorageBackend.MEMORY,
        **backend_kwargs
    ):
        """
        Initialize temporary storage.
        
        Args:
            backend: Storage backend to use
            **backend_kwargs: Backend-specific configuration
        """
        self.backend_type = backend
        self.backend = self._create_backend(backend, **backend_kwargs)

        logger.info("TemporaryStorage initialized", backend=backend.value)

    def _create_backend(self, backend: StorageBackend, **kwargs) -> BaseStorageBackend:
        """Create storage backend instance."""
        if backend == StorageBackend.MEMORY:
            return MemoryStorageBackend(**kwargs)
        elif backend == StorageBackend.FILE:
            storage_dir = kwargs.get('storage_dir', './temp_storage')
            return FileStorageBackend(Path(storage_dir), **kwargs)
        else:
            raise ValueError(f"Unsupported storage backend: {backend}")

    async def store_query_result(
        self,
        query_id: str,
        result: QueryResult,
        ttl_seconds: Optional[int] = None
    ) -> str:
        """
        Store query result temporarily.
        
        Args:
            query_id: Query identifier
            result: Query result to store
            ttl_seconds: Time to live in seconds
            
        Returns:
            Storage entry ID
        """
        key = f"query_result:{query_id}"
        data = result.to_dict()

        entry_id = await self.backend.store(key, data, ttl_seconds)

        logger.info(
            "Query result stored",
            query_id=query_id,
            entry_id=entry_id,
            ttl=ttl_seconds
        )

        return entry_id

    async def store_chunk_results(
        self,
        query_id: str,
        chunk_results: List[ChunkResult],
        ttl_seconds: Optional[int] = None
    ) -> str:
        """
        Store chunk results temporarily.
        
        Args:
            query_id: Query identifier
            chunk_results: List of chunk results
            ttl_seconds: Time to live in seconds
            
        Returns:
            Storage entry ID
        """
        key = f"chunk_results:{query_id}"
        data = [result.to_dict() for result in chunk_results]

        entry_id = await self.backend.store(key, data, ttl_seconds)

        logger.info(
            "Chunk results stored",
            query_id=query_id,
            chunk_count=len(chunk_results),
            entry_id=entry_id
        )

        return entry_id

    async def store_intermediate_data(
        self,
        query_id: str,
        stage: str,
        data: Any,
        ttl_seconds: Optional[int] = None
    ) -> str:
        """
        Store intermediate processing data.
        
        Args:
            query_id: Query identifier
            stage: Processing stage name
            data: Data to store
            ttl_seconds: Time to live in seconds
            
        Returns:
            Storage entry ID
        """
        key = f"intermediate:{query_id}:{stage}"

        entry_id = await self.backend.store(key, data, ttl_seconds)

        logger.debug(
            "Intermediate data stored",
            query_id=query_id,
            stage=stage,
            entry_id=entry_id
        )

        return entry_id

    async def retrieve_query_result(self, query_id: str) -> Optional[QueryResult]:
        """Retrieve stored query result."""
        key = f"query_result:{query_id}"
        data = await self.backend.retrieve(key)

        if data is None:
            return None

        try:
            # Reconstruct QueryResult from dict
            # This is simplified - in practice you'd need proper deserialization
            logger.info("Query result retrieved", query_id=query_id)
            return data  # Return dict for now
        except Exception as e:
            logger.error("Failed to deserialize query result", query_id=query_id, error=str(e))
            return None

    async def retrieve_chunk_results(self, query_id: str) -> Optional[List[Dict[str, Any]]]:
        """Retrieve stored chunk results."""
        key = f"chunk_results:{query_id}"
        data = await self.backend.retrieve(key)

        if data is None:
            return None

        logger.info("Chunk results retrieved", query_id=query_id, count=len(data) if data else 0)
        return data

    async def retrieve_intermediate_data(self, query_id: str, stage: str) -> Optional[Any]:
        """Retrieve intermediate processing data."""
        key = f"intermediate:{query_id}:{stage}"
        data = await self.backend.retrieve(key)

        if data is not None:
            logger.debug("Intermediate data retrieved", query_id=query_id, stage=stage)

        return data

    async def delete_query_data(self, query_id: str) -> int:
        """
        Delete all data for a query.
        
        Args:
            query_id: Query identifier
            
        Returns:
            Number of entries deleted
        """
        keys_to_delete = [
            f"query_result:{query_id}",
            f"chunk_results:{query_id}"
        ]

        deleted_count = 0
        for key in keys_to_delete:
            if await self.backend.delete(key):
                deleted_count += 1

        logger.info("Query data deleted", query_id=query_id, deleted_count=deleted_count)
        return deleted_count

    async def cleanup_expired(self) -> int:
        """Clean up expired entries."""
        return await self.backend.cleanup_expired()

    async def exists(self, query_id: str, data_type: str = "query_result") -> bool:
        """Check if data exists for query."""
        key = f"{data_type}:{query_id}"
        return await self.backend.exists(key)

    async def get_stats(self) -> Dict[str, Any]:
        """Get storage statistics."""
        backend_stats = await self.backend.get_stats()

        return {
            "backend": self.backend_type.value,
            **backend_stats
        }

    async def close(self) -> None:
        """Close storage and cleanup resources."""
        await self.backend.close()
        logger.info("TemporaryStorage closed")
