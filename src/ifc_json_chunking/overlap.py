"""
Chunk overlap management for context preservation.

This module provides intelligent overlap mechanisms to preserve context
across chunk boundaries, ensuring semantic continuity for LLM processing.
"""

from typing import Any, Dict, List, Optional, Set, Tuple
from dataclasses import dataclass
from enum import Enum

import structlog

from .models import Chunk, ChunkType
from .token_counter import TokenCounter, create_token_counter

logger = structlog.get_logger(__name__)


class OverlapStrategy(Enum):
    """Different strategies for creating chunk overlaps."""
    
    TOKEN_BASED = "token_based"  # Fixed token count overlap
    PERCENTAGE_BASED = "percentage_based"  # Percentage of chunk size
    ENTITY_BOUNDARY = "entity_boundary"  # Semantic entity boundaries
    RELATIONSHIP_AWARE = "relationship_aware"  # IFC relationship preservation


@dataclass
class OverlapConfig:
    """Configuration for chunk overlap behavior."""
    
    strategy: OverlapStrategy
    size_tokens: int = 400  # Token-based overlap size
    percentage: float = 0.1  # Percentage-based overlap (10%)
    preserve_entities: bool = True  # Preserve complete entities
    preserve_relationships: bool = True  # Preserve IFC relationships
    max_overlap_ratio: float = 0.3  # Maximum overlap as ratio of chunk size


class ChunkOverlapManager:
    """
    Manages chunk overlaps for context preservation.
    
    Provides intelligent overlap creation that preserves semantic
    boundaries and IFC relationships across chunk boundaries.
    """
    
    def __init__(
        self, 
        config: OverlapConfig,
        token_counter: Optional[TokenCounter] = None
    ):
        """
        Initialize overlap manager.
        
        Args:
            config: Overlap configuration
            token_counter: Token counter for size calculations
        """
        self.config = config
        self.token_counter = token_counter or create_token_counter()
        
        logger.info(
            "ChunkOverlapManager initialized",
            strategy=config.strategy.value,
            size_tokens=config.size_tokens,
            percentage=config.percentage
        )
    
    def create_overlap(
        self, 
        previous_chunk: Chunk, 
        current_chunk: Chunk
    ) -> Optional[Dict[str, Any]]:
        """
        Create overlap content between two consecutive chunks.
        
        Args:
            previous_chunk: Previous chunk for overlap source
            current_chunk: Current chunk for overlap context
            
        Returns:
            Overlap content dictionary or None if no overlap needed
        """
        if not self._should_create_overlap(previous_chunk, current_chunk):
            return None
        
        if self.config.strategy == OverlapStrategy.TOKEN_BASED:
            return self._create_token_based_overlap(previous_chunk, current_chunk)
        elif self.config.strategy == OverlapStrategy.PERCENTAGE_BASED:
            return self._create_percentage_based_overlap(previous_chunk, current_chunk)
        elif self.config.strategy == OverlapStrategy.ENTITY_BOUNDARY:
            return self._create_entity_boundary_overlap(previous_chunk, current_chunk)
        elif self.config.strategy == OverlapStrategy.RELATIONSHIP_AWARE:
            return self._create_relationship_aware_overlap(previous_chunk, current_chunk)
        
        return None
    
    def _should_create_overlap(self, previous_chunk: Chunk, current_chunk: Chunk) -> bool:
        """Determine if overlap should be created between chunks."""
        # Don't create overlap for header chunks
        if previous_chunk.chunk_type == ChunkType.HEADER:
            return False
        
        # Don't create overlap if chunks are from different spatial containers
        if self._are_different_spatial_contexts(previous_chunk, current_chunk):
            return False
        
        # Create overlap for related building elements
        return True
    
    def _create_token_based_overlap(
        self, 
        previous_chunk: Chunk, 
        current_chunk: Chunk
    ) -> Dict[str, Any]:
        """Create overlap based on fixed token count."""
        overlap_tokens = self.config.size_tokens
        
        # Extract ending content from previous chunk
        overlap_content = self._extract_ending_content(
            previous_chunk, 
            overlap_tokens
        )
        
        # Calculate actual token usage
        actual_tokens = self.token_counter.count_tokens(overlap_content)
        
        overlap = {
            "type": "token_based",
            "content": overlap_content,
            "source_chunk_id": previous_chunk.chunk_id,
            "target_chunk_id": current_chunk.chunk_id,
            "requested_tokens": overlap_tokens,
            "actual_tokens": actual_tokens,
            "created_timestamp": previous_chunk.created_timestamp
        }
        
        logger.debug(
            "Token-based overlap created",
            source_chunk=previous_chunk.chunk_id,
            target_chunk=current_chunk.chunk_id,
            actual_tokens=actual_tokens
        )
        
        return overlap
    
    def _create_percentage_based_overlap(
        self, 
        previous_chunk: Chunk, 
        current_chunk: Chunk
    ) -> Dict[str, Any]:
        """Create overlap based on percentage of chunk size."""
        # Calculate target overlap size
        chunk_tokens = previous_chunk.token_count or self.token_counter.count_tokens(previous_chunk.data)
        overlap_tokens = int(chunk_tokens * self.config.percentage)
        
        # Respect maximum overlap ratio
        max_overlap = int(chunk_tokens * self.config.max_overlap_ratio)
        overlap_tokens = min(overlap_tokens, max_overlap)
        
        overlap_content = self._extract_ending_content(
            previous_chunk, 
            overlap_tokens
        )
        
        actual_tokens = self.token_counter.count_tokens(overlap_content)
        
        overlap = {
            "type": "percentage_based",
            "content": overlap_content,
            "source_chunk_id": previous_chunk.chunk_id,
            "target_chunk_id": current_chunk.chunk_id,
            "percentage": self.config.percentage,
            "chunk_tokens": chunk_tokens,
            "overlap_tokens": overlap_tokens,
            "actual_tokens": actual_tokens,
            "created_timestamp": previous_chunk.created_timestamp
        }
        
        logger.debug(
            "Percentage-based overlap created",
            source_chunk=previous_chunk.chunk_id,
            target_chunk=current_chunk.chunk_id,
            percentage=self.config.percentage,
            actual_tokens=actual_tokens
        )
        
        return overlap
    
    def _create_entity_boundary_overlap(
        self, 
        previous_chunk: Chunk, 
        current_chunk: Chunk
    ) -> Dict[str, Any]:
        """Create overlap that preserves complete IFC entities."""
        # Find complete entities at the end of previous chunk
        ending_entities = self._extract_complete_entities_from_end(previous_chunk)
        
        if not ending_entities:
            # Fallback to token-based overlap
            return self._create_token_based_overlap(previous_chunk, current_chunk)
        
        # Calculate token count for selected entities
        actual_tokens = self.token_counter.count_tokens(ending_entities)
        
        overlap = {
            "type": "entity_boundary",
            "content": ending_entities,
            "source_chunk_id": previous_chunk.chunk_id,
            "target_chunk_id": current_chunk.chunk_id,
            "entity_count": len(ending_entities) if isinstance(ending_entities, list) else 1,
            "actual_tokens": actual_tokens,
            "created_timestamp": previous_chunk.created_timestamp
        }
        
        logger.debug(
            "Entity boundary overlap created",
            source_chunk=previous_chunk.chunk_id,
            target_chunk=current_chunk.chunk_id,
            entity_count=overlap["entity_count"],
            actual_tokens=actual_tokens
        )
        
        return overlap
    
    def _create_relationship_aware_overlap(
        self, 
        previous_chunk: Chunk, 
        current_chunk: Chunk
    ) -> Dict[str, Any]:
        """Create overlap that preserves IFC relationships."""
        # Extract entities with their relationships from previous chunk
        related_entities = self._extract_related_entities_from_end(previous_chunk, current_chunk)
        
        if not related_entities:
            # Fallback to entity boundary overlap
            return self._create_entity_boundary_overlap(previous_chunk, current_chunk)
        
        actual_tokens = self.token_counter.count_tokens(related_entities)
        
        overlap = {
            "type": "relationship_aware",
            "content": related_entities,
            "source_chunk_id": previous_chunk.chunk_id,
            "target_chunk_id": current_chunk.chunk_id,
            "relationship_count": self._count_relationships(related_entities),
            "actual_tokens": actual_tokens,
            "created_timestamp": previous_chunk.created_timestamp
        }
        
        logger.debug(
            "Relationship-aware overlap created",
            source_chunk=previous_chunk.chunk_id,
            target_chunk=current_chunk.chunk_id,
            relationship_count=overlap["relationship_count"],
            actual_tokens=actual_tokens
        )
        
        return overlap
    
    def _extract_ending_content(self, chunk: Chunk, target_tokens: int) -> Any:
        """Extract content from the end of a chunk up to target token count."""
        if not isinstance(chunk.data, (dict, list)):
            # For simple data, take a substring based on estimated position
            content_str = str(chunk.data)
            total_tokens = self.token_counter.count_tokens(content_str)
            
            if total_tokens <= target_tokens:
                return chunk.data
            
            # Estimate character position for target tokens
            chars_per_token = len(content_str) / total_tokens
            target_chars = int(target_tokens * chars_per_token)
            
            return content_str[-target_chars:]
        
        if isinstance(chunk.data, list):
            return self._extract_ending_from_list(chunk.data, target_tokens)
        elif isinstance(chunk.data, dict):
            return self._extract_ending_from_dict(chunk.data, target_tokens)
        
        return chunk.data
    
    def _extract_ending_from_list(self, data: List[Any], target_tokens: int) -> List[Any]:
        """Extract ending elements from a list up to target token count."""
        ending_elements = []
        current_tokens = 0
        
        # Process from the end
        for item in reversed(data):
            item_tokens = self.token_counter.count_tokens(item)
            
            if current_tokens + item_tokens <= target_tokens:
                ending_elements.insert(0, item)  # Insert at beginning to maintain order
                current_tokens += item_tokens
            else:
                break
        
        return ending_elements
    
    def _extract_ending_from_dict(self, data: Dict[str, Any], target_tokens: int) -> Dict[str, Any]:
        """Extract ending key-value pairs from a dict up to target token count."""
        ending_dict = {}
        current_tokens = 0
        
        # Process from the end (reverse key order)
        for key in reversed(list(data.keys())):
            value = data[key]
            item_tokens = self.token_counter.count_tokens({key: value})
            
            if current_tokens + item_tokens <= target_tokens:
                ending_dict[key] = value
                current_tokens += item_tokens
            else:
                break
        
        return ending_dict
    
    def _extract_complete_entities_from_end(self, chunk: Chunk) -> Any:
        """Extract complete IFC entities from the end of a chunk."""
        if not isinstance(chunk.data, (dict, list)):
            return None
        
        # Look for IFC entities (objects with 'type' field containing 'Ifc')
        entities = []
        
        if isinstance(chunk.data, list):
            for item in reversed(chunk.data):
                if isinstance(item, dict) and self._is_ifc_entity(item):
                    entities.insert(0, item)
                    
                    # Stop if we have enough tokens
                    if self.token_counter.count_tokens(entities) > self.config.size_tokens:
                        break
        
        elif isinstance(chunk.data, dict):
            # Look for nested entity structures
            for key, value in reversed(list(chunk.data.items())):
                if isinstance(value, dict) and self._is_ifc_entity(value):
                    entities.insert(0, {key: value})
                    
                    if self.token_counter.count_tokens(entities) > self.config.size_tokens:
                        break
        
        return entities if entities else None
    
    def _extract_related_entities_from_end(self, previous_chunk: Chunk, current_chunk: Chunk) -> Any:
        """Extract entities with relationships from the end of previous chunk."""
        # This would require more sophisticated relationship analysis
        # For now, fallback to complete entities
        return self._extract_complete_entities_from_end(previous_chunk)
    
    def _is_ifc_entity(self, data: Dict[str, Any]) -> bool:
        """Check if data represents an IFC entity."""
        entity_type = data.get('type', '')
        return isinstance(entity_type, str) and entity_type.startswith('Ifc')
    
    def _count_relationships(self, data: Any) -> int:
        """Count IFC relationships in the data."""
        if not isinstance(data, (dict, list)):
            return 0
        
        relationship_count = 0
        
        def count_in_dict(d: dict):
            nonlocal relationship_count
            for key, value in d.items():
                if 'rel' in key.lower() or 'relationship' in key.lower():
                    relationship_count += 1
                elif isinstance(value, dict):
                    count_in_dict(value)
                elif isinstance(value, list):
                    count_in_list(value)
        
        def count_in_list(l: list):
            for item in l:
                if isinstance(item, dict):
                    count_in_dict(item)
                elif isinstance(item, list):
                    count_in_list(item)
        
        if isinstance(data, dict):
            count_in_dict(data)
        elif isinstance(data, list):
            count_in_list(data)
        
        return relationship_count
    
    def _are_different_spatial_contexts(self, chunk1: Chunk, chunk2: Chunk) -> bool:
        """Check if chunks are from different spatial contexts."""
        # Extract spatial context from both chunks
        context1 = self._extract_spatial_context(chunk1)
        context2 = self._extract_spatial_context(chunk2)
        
        # If we can't determine context, assume they're related
        if not context1 or not context2:
            return False
        
        return context1 != context2
    
    def _extract_spatial_context(self, chunk: Chunk) -> Optional[str]:
        """Extract spatial context identifier from chunk."""
        if not isinstance(chunk.data, dict):
            return None
        
        # Look for spatial container references
        relationships = chunk.data.get('relationships', {})
        if 'IfcRelContainedInSpatialStructure' in relationships:
            return relationships['IfcRelContainedInSpatialStructure']
        
        # Look for spatial element types
        entity_type = chunk.data.get('type', '')
        if entity_type in ['IfcSpace', 'IfcRoom', 'IfcBuildingStorey', 'IfcBuilding']:
            return chunk.data.get('id', chunk.chunk_id)
        
        return None


def create_overlap_config(
    strategy: str = "token_based",
    size_tokens: int = 400,
    percentage: float = 0.1
) -> OverlapConfig:
    """
    Create overlap configuration with specified parameters.
    
    Args:
        strategy: Overlap strategy name
        size_tokens: Token count for token-based overlap
        percentage: Percentage for percentage-based overlap
        
    Returns:
        OverlapConfig instance
    """
    strategy_map = {
        "token_based": OverlapStrategy.TOKEN_BASED,
        "percentage_based": OverlapStrategy.PERCENTAGE_BASED,
        "entity_boundary": OverlapStrategy.ENTITY_BOUNDARY,
        "relationship_aware": OverlapStrategy.RELATIONSHIP_AWARE
    }
    
    if strategy not in strategy_map:
        available = list(strategy_map.keys())
        raise ValueError(f"Unknown overlap strategy: {strategy}. Available: {available}")
    
    return OverlapConfig(
        strategy=strategy_map[strategy],
        size_tokens=size_tokens,
        percentage=percentage
    )