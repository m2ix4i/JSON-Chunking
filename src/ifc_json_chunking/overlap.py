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
from .tokenization import EstimativeTokenCounter, LLMModel

logger = structlog.get_logger(__name__)


@dataclass
class ChunkBoundary:
    """
    Represents the boundary between chunks for overlap analysis.
    
    Contains information about chunk boundaries to enable intelligent
    overlap creation that preserves semantic context.
    """
    
    chunk_id: str
    entities: List[Any]
    relationships: List[Any]
    semantic_context: Dict[str, Any]
    
    def get_boundary_entities(self, count: int = 5) -> List[Any]:
        """Get entities at the boundary for overlap creation."""
        return self.entities[-count:] if len(self.entities) >= count else self.entities
    
    def has_relationships_to(self, other_boundary: 'ChunkBoundary') -> bool:
        """Check if this boundary has relationships to another boundary."""
        other_entity_ids = {getattr(e, 'entity_id', None) for e in other_boundary.entities}
        
        for relationship in self.relationships:
            if hasattr(relationship, 'target_id') and relationship.target_id in other_entity_ids:
                return True
        return False
    
    def calculate_semantic_gap(self, other_boundary: 'ChunkBoundary') -> float:
        """Calculate semantic gap score between boundaries (0.0 = no gap, 1.0 = large gap)."""
        # Simple heuristic based on shared context
        shared_context = 0
        total_context = 0
        
        for key in self.semantic_context:
            total_context += 1
            if key in other_boundary.semantic_context:
                if self.semantic_context[key] == other_boundary.semantic_context[key]:
                    shared_context += 1
        
        return 1.0 - (shared_context / max(1, total_context))


@dataclass 
class ContextPreserver:
    """
    Preserves semantic context across chunk boundaries.
    
    Analyzes chunk boundaries and creates context-preserving overlaps
    that maintain semantic continuity for LLM processing.
    """
    
    overlap_config: 'OverlapConfig'
    
    def preserve_context(self, prev_boundary: ChunkBoundary, curr_boundary: ChunkBoundary) -> Optional[Dict[str, Any]]:
        """
        Create context-preserving overlap between boundaries.
        
        Args:
            prev_boundary: Previous chunk boundary
            curr_boundary: Current chunk boundary
            
        Returns:
            Context preservation data or None if no overlap needed
        """
        semantic_gap = prev_boundary.calculate_semantic_gap(curr_boundary)
        
        if semantic_gap < 0.3:  # Low semantic gap, minimal overlap needed
            return self._create_minimal_overlap(prev_boundary, curr_boundary)
        elif semantic_gap < 0.7:  # Medium gap, moderate overlap
            return self._create_moderate_overlap(prev_boundary, curr_boundary)
        else:  # High gap, comprehensive overlap
            return self._create_comprehensive_overlap(prev_boundary, curr_boundary)
    
    def _create_minimal_overlap(self, prev_boundary: ChunkBoundary, curr_boundary: ChunkBoundary) -> Dict[str, Any]:
        """Create minimal overlap for low semantic gap."""
        overlap_entities = prev_boundary.get_boundary_entities(2)
        
        return {
            "type": "minimal",
            "entities": overlap_entities,
            "semantic_gap": prev_boundary.calculate_semantic_gap(curr_boundary),
            "context_elements": ["entity_references"]
        }
    
    def _create_moderate_overlap(self, prev_boundary: ChunkBoundary, curr_boundary: ChunkBoundary) -> Dict[str, Any]:
        """Create moderate overlap for medium semantic gap."""
        overlap_entities = prev_boundary.get_boundary_entities(5)
        shared_context = self._extract_shared_context(prev_boundary, curr_boundary)
        
        return {
            "type": "moderate", 
            "entities": overlap_entities,
            "shared_context": shared_context,
            "semantic_gap": prev_boundary.calculate_semantic_gap(curr_boundary),
            "context_elements": ["entity_references", "relationships", "spatial_context"]
        }
    
    def _create_comprehensive_overlap(self, prev_boundary: ChunkBoundary, curr_boundary: ChunkBoundary) -> Dict[str, Any]:
        """Create comprehensive overlap for high semantic gap."""
        overlap_entities = prev_boundary.get_boundary_entities(10)
        shared_context = self._extract_shared_context(prev_boundary, curr_boundary)
        bridging_relationships = self._find_bridging_relationships(prev_boundary, curr_boundary)
        
        return {
            "type": "comprehensive",
            "entities": overlap_entities,
            "shared_context": shared_context,
            "bridging_relationships": bridging_relationships,
            "semantic_gap": prev_boundary.calculate_semantic_gap(curr_boundary),
            "context_elements": ["entity_references", "relationships", "spatial_context", "semantic_links"]
        }
    
    def _extract_shared_context(self, prev_boundary: ChunkBoundary, curr_boundary: ChunkBoundary) -> Dict[str, Any]:
        """Extract shared semantic context between boundaries."""
        shared = {}
        
        for key, value in prev_boundary.semantic_context.items():
            if key in curr_boundary.semantic_context:
                if prev_boundary.semantic_context[key] == curr_boundary.semantic_context[key]:
                    shared[key] = value
        
        return shared
    
    def _find_bridging_relationships(self, prev_boundary: ChunkBoundary, curr_boundary: ChunkBoundary) -> List[Any]:
        """Find relationships that bridge between boundaries."""
        bridging = []
        
        prev_entity_ids = {getattr(e, 'entity_id', None) for e in prev_boundary.entities}
        curr_entity_ids = {getattr(e, 'entity_id', None) for e in curr_boundary.entities}
        
        for relationship in prev_boundary.relationships:
            if hasattr(relationship, 'source_id') and hasattr(relationship, 'target_id'):
                if (relationship.source_id in prev_entity_ids and 
                    relationship.target_id in curr_entity_ids):
                    bridging.append(relationship)
        
        return bridging


class OverlapManager:
    """
    Manages intelligent overlap creation between semantic chunks.
    
    Coordinates overlap strategies and context preservation to maintain
    semantic continuity across chunk boundaries for optimal LLM processing.
    """
    
    def __init__(self, config: 'OverlapConfig'):
        """
        Initialize overlap manager with configuration.
        
        Args:
            config: Overlap configuration settings
        """
        self.config = config
        self.token_counter = EstimativeTokenCounter(LLMModel.GEMINI_2_5_PRO)
        self.context_preserver = ContextPreserver(config)
        
        logger.info(
            "OverlapManager initialized",
            strategy=config.strategy.value,
            size_tokens=config.size_tokens,
            preserve_entities=config.preserve_entities
        )
    
    def create_overlap(self, prev_boundary: ChunkBoundary, curr_boundary: ChunkBoundary) -> Optional[Dict[str, Any]]:
        """
        Create intelligent overlap between chunk boundaries.
        
        Args:
            prev_boundary: Previous chunk boundary
            curr_boundary: Current chunk boundary
            
        Returns:
            Overlap data or None if no overlap needed
        """
        if not self._should_create_overlap(prev_boundary, curr_boundary):
            return None
        
        # Use context preserver to create semantic overlap
        context_overlap = self.context_preserver.preserve_context(prev_boundary, curr_boundary)
        
        if not context_overlap:
            return None
        
        # Apply strategy-specific processing
        if self.config.strategy == OverlapStrategy.TOKEN_BASED:
            return self._apply_token_based_limits(context_overlap)
        elif self.config.strategy == OverlapStrategy.PERCENTAGE_BASED:
            return self._apply_percentage_based_limits(context_overlap, prev_boundary)
        elif self.config.strategy == OverlapStrategy.ENTITY_BOUNDARY:
            return self._apply_entity_boundary_limits(context_overlap)
        elif self.config.strategy == OverlapStrategy.RELATIONSHIP_AWARE:
            return self._apply_relationship_aware_limits(context_overlap, prev_boundary, curr_boundary)
        
        return context_overlap
    
    def _should_create_overlap(self, prev_boundary: ChunkBoundary, curr_boundary: ChunkBoundary) -> bool:
        """Determine if overlap should be created between boundaries."""
        # Don't create overlap if chunks are from very different contexts
        semantic_gap = prev_boundary.calculate_semantic_gap(curr_boundary)
        
        if semantic_gap > 0.9:  # Very different contexts
            return False
        
        # Create overlap if there are relationships between boundaries
        if prev_boundary.has_relationships_to(curr_boundary):
            return True
        
        # Create overlap if semantic gap is moderate
        return semantic_gap >= 0.2
    
    def _apply_token_based_limits(self, context_overlap: Dict[str, Any]) -> Dict[str, Any]:
        """Apply token-based size limits to overlap."""
        entities = context_overlap.get("entities", [])
        target_tokens = self.config.size_tokens
        
        # Truncate entities to fit token limit
        limited_entities = []
        current_tokens = 0
        
        for entity in entities:
            entity_tokens = self.token_counter.count_tokens(str(entity))
            if current_tokens + entity_tokens <= target_tokens:
                limited_entities.append(entity)
                current_tokens += entity_tokens
            else:
                break
        
        context_overlap["entities"] = limited_entities
        context_overlap["overlap_tokens"] = current_tokens
        context_overlap["strategy_applied"] = "token_based"
        
        return context_overlap
    
    def _apply_percentage_based_limits(self, context_overlap: Dict[str, Any], prev_boundary: ChunkBoundary) -> Dict[str, Any]:
        """Apply percentage-based size limits to overlap."""
        # Calculate target tokens based on percentage of previous chunk
        prev_chunk_tokens = sum(self.token_counter.count_tokens(str(e)) for e in prev_boundary.entities)
        target_tokens = int(prev_chunk_tokens * self.config.percentage)
        
        # Apply token limit
        original_size_tokens = self.config.size_tokens
        self.config.size_tokens = target_tokens
        
        result = self._apply_token_based_limits(context_overlap)
        result["strategy_applied"] = "percentage_based"
        result["percentage"] = self.config.percentage
        result["prev_chunk_tokens"] = prev_chunk_tokens
        
        # Restore original size
        self.config.size_tokens = original_size_tokens
        
        return result
    
    def _apply_entity_boundary_limits(self, context_overlap: Dict[str, Any]) -> Dict[str, Any]:
        """Apply entity boundary preservation to overlap."""
        # Ensure complete entities are preserved
        entities = context_overlap.get("entities", [])
        
        # Filter to complete entities only
        complete_entities = []
        current_tokens = 0
        
        for entity in entities:
            entity_tokens = self.token_counter.count_tokens(str(entity))
            if current_tokens + entity_tokens <= self.config.size_tokens:
                complete_entities.append(entity)
                current_tokens += entity_tokens
            else:
                break
        
        context_overlap["entities"] = complete_entities
        context_overlap["overlap_tokens"] = current_tokens
        context_overlap["strategy_applied"] = "entity_boundary"
        context_overlap["entities_preserved"] = len(complete_entities)
        
        return context_overlap
    
    def _apply_relationship_aware_limits(self, context_overlap: Dict[str, Any], prev_boundary: ChunkBoundary, curr_boundary: ChunkBoundary) -> Dict[str, Any]:
        """Apply relationship-aware overlap creation."""
        # Include bridging relationships in overlap
        bridging_rels = context_overlap.get("bridging_relationships", [])
        entities = context_overlap.get("entities", [])
        
        # Calculate tokens for entities and relationships
        entity_tokens = sum(self.token_counter.count_tokens(str(e)) for e in entities)
        rel_tokens = sum(self.token_counter.count_tokens(str(r)) for r in bridging_rels)
        total_tokens = entity_tokens + rel_tokens
        
        # Adjust if over limit
        if total_tokens > self.config.size_tokens:
            # Prioritize relationships, reduce entities if needed
            available_for_entities = self.config.size_tokens - rel_tokens
            
            if available_for_entities > 0:
                limited_entities = []
                current_entity_tokens = 0
                
                for entity in entities:
                    entity_token_count = self.token_counter.count_tokens(str(entity))
                    if current_entity_tokens + entity_token_count <= available_for_entities:
                        limited_entities.append(entity)
                        current_entity_tokens += entity_token_count
                    else:
                        break
                
                context_overlap["entities"] = limited_entities
                total_tokens = current_entity_tokens + rel_tokens
        
        context_overlap["overlap_tokens"] = total_tokens
        context_overlap["strategy_applied"] = "relationship_aware"
        context_overlap["bridging_relationships_count"] = len(bridging_rels)
        
        return context_overlap


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