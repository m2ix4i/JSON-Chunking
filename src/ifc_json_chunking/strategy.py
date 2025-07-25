"""
Chunking strategies for IFC JSON data processing.

This module contains strategies for determining when and how to
create chunks from IFC JSON data, following the Strategy pattern.
"""

from typing import Any, List
from abc import ABC, abstractmethod

from .config import Config
from .models import Chunk, ChunkingDecision, ChunkType


class ChunkingStrategy(ABC):
    """Abstract base class for chunking strategies."""
    
    @abstractmethod
    def should_create_chunk(
        self, 
        json_path: str, 
        value: Any, 
        existing_chunks: List[Chunk]
    ) -> ChunkingDecision:
        """
        Determine if a new chunk should be created.
        
        Args:
            json_path: JSON path of the element
            value: Element value
            existing_chunks: List of existing chunks
            
        Returns:
            ChunkingDecision with reasoning
        """
        pass


class IFCChunkingStrategy(ChunkingStrategy):
    """
    Default chunking strategy for IFC JSON data.
    
    Creates chunks based on IFC object types and size limits.
    """
    
    def __init__(self, config: Config):
        """
        Initialize strategy with configuration.
        
        Args:
            config: Configuration object
        """
        self.config = config
        self.size_limit_bytes = config.chunk_size_mb * 1024 * 1024
    
    def should_create_chunk(
        self, 
        json_path: str, 
        value: Any, 
        existing_chunks: List[Chunk]
    ) -> ChunkingDecision:
        """
        Determine if a new chunk should be created based on IFC patterns.
        
        Args:
            json_path: JSON path of the element
            value: Element value
            existing_chunks: List of existing chunks
            
        Returns:
            ChunkingDecision with reasoning
        """
        # Create chunks for major IFC objects
        if self._is_major_ifc_object(json_path, value):
            return ChunkingDecision.yes(
                f"Major IFC object at {json_path}",
                ChunkType.IFC_OBJECT
            )
        
        # Create chunks for geometry data
        if self._is_geometry_data(json_path, value):
            return ChunkingDecision.yes(
                f"Geometry data at {json_path}",
                ChunkType.GEOMETRY
            )
        
        # Create chunks for header data
        if self._is_header_data(json_path):
            return ChunkingDecision.yes(
                f"Header data at {json_path}",
                ChunkType.HEADER
            )
        
        # Create chunk when size limit is exceeded
        if self._exceeds_size_limit(existing_chunks):
            return ChunkingDecision.yes(
                f"Size limit exceeded ({self.config.chunk_size_mb}MB)",
                ChunkType.GENERAL
            )
        
        return ChunkingDecision.no(f"No chunking criteria met for {json_path}")
    
    def _is_major_ifc_object(self, json_path: str, value: Any) -> bool:
        """Check if this is a major IFC object worth chunking."""
        return (json_path.startswith('objects.') and 
                isinstance(value, dict) and
                self._has_ifc_structure(value))
    
    def _is_geometry_data(self, json_path: str, value: Any) -> bool:
        """Check if this is geometry data worth chunking."""
        return (json_path.startswith('geometry.') and 
                isinstance(value, (dict, list)))
    
    def _is_header_data(self, json_path: str) -> bool:
        """Check if this is header data."""
        return json_path.startswith('header')
    
    def _has_ifc_structure(self, obj: dict) -> bool:
        """Check if object has typical IFC structure."""
        # Basic check for IFC object structure
        return ('type' in obj or 'id' in obj or 
                'properties' in obj or 'attributes' in obj)
    
    def _exceeds_size_limit(self, existing_chunks: List[Chunk]) -> bool:
        """Check if recent chunks exceed size limit."""
        if not existing_chunks:
            return False
        
        # Check size of last few chunks to avoid creating too large chunks
        recent_chunks = existing_chunks[-5:]  # Last 5 chunks
        total_size = sum(chunk.size_bytes for chunk in recent_chunks)
        
        return total_size > self.size_limit_bytes


class SizeBasedChunkingStrategy(ChunkingStrategy):
    """
    Simple size-based chunking strategy.
    
    Creates chunks purely based on size limits, ignoring JSON structure.
    """
    
    def __init__(self, config: Config):
        """Initialize with configuration."""
        self.config = config
        self.size_limit_bytes = config.chunk_size_mb * 1024 * 1024
    
    def should_create_chunk(
        self, 
        json_path: str, 
        value: Any, 
        existing_chunks: List[Chunk]
    ) -> ChunkingDecision:
        """Create chunks based purely on size."""
        current_size = len(str(value))
        
        if current_size > self.size_limit_bytes / 2:  # Large individual item
            return ChunkingDecision.yes(
                f"Large item ({current_size} bytes)",
                ChunkType.GENERAL
            )
        
        if existing_chunks:
            total_size = sum(chunk.size_bytes for chunk in existing_chunks[-10:])
            if total_size > self.size_limit_bytes:
                return ChunkingDecision.yes(
                    f"Size limit exceeded ({total_size} bytes)",
                    ChunkType.GENERAL
                )
        
        return ChunkingDecision.no("Size limit not exceeded")


class AggressiveChunkingStrategy(ChunkingStrategy):
    """
    Aggressive chunking strategy for maximum granularity.
    
    Creates many small chunks for fine-grained processing.
    """
    
    def __init__(self, config: Config):
        """Initialize with configuration."""
        self.config = config
        self.small_size_limit = (config.chunk_size_mb * 1024 * 1024) // 10  # 10% of normal
    
    def should_create_chunk(
        self, 
        json_path: str, 
        value: Any, 
        existing_chunks: List[Chunk]
    ) -> ChunkingDecision:
        """Create chunks aggressively for small items."""
        # Create chunk for any structured data
        if isinstance(value, (dict, list)) and len(str(value)) > 100:
            chunk_type = ChunkType.IFC_OBJECT if json_path.startswith('objects.') else ChunkType.GENERAL
            return ChunkingDecision.yes(
                f"Structured data at {json_path}",
                chunk_type
            )
        
        # Very small size limit
        if existing_chunks and len(existing_chunks) > 0:
            recent_size = sum(chunk.size_bytes for chunk in existing_chunks[-2:])
            if recent_size > self.small_size_limit:
                return ChunkingDecision.yes(
                    f"Small size limit exceeded ({recent_size} bytes)",
                    ChunkType.GENERAL
                )
        
        return ChunkingDecision.no("Aggressive criteria not met")


def create_chunking_strategy(strategy_name: str, config: Config) -> ChunkingStrategy:
    """
    Factory function to create chunking strategies.
    
    Args:
        strategy_name: Name of strategy to create
        config: Configuration object
        
    Returns:
        ChunkingStrategy instance
        
    Raises:
        ValueError: If strategy name is unknown
    """
    strategies = {
        'ifc': IFCChunkingStrategy,
        'size': SizeBasedChunkingStrategy,
        'aggressive': AggressiveChunkingStrategy
    }
    
    if strategy_name not in strategies:
        raise ValueError(f"Unknown chunking strategy: {strategy_name}. "
                        f"Available: {list(strategies.keys())}")
    
    return strategies[strategy_name](config)