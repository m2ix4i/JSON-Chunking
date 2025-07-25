"""
Performance optimization module for IFC JSON Chunking system.

This module provides memory optimization, efficient data structures,
and resource pooling for high-performance operations.
"""

from .memory_efficient_structures import (
    ObjectPool,
    CompressedBuffer,
    MemoryMappedCache,
    ChunkBuffer,
    ResourceManager,
    get_resource_manager,
    PoolStats
)

__all__ = [
    "ObjectPool",
    "CompressedBuffer", 
    "MemoryMappedCache",
    "ChunkBuffer",
    "ResourceManager",
    "get_resource_manager",
    "PoolStats"
]