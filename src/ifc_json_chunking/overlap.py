"""
Chunk overlap management for context preservation.

This module provides intelligent overlap mechanisms to preserve context
across chunk boundaries, ensuring semantic continuity for LLM processing.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import structlog

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

    def __post_init__(self):
        """Validate chunk boundary data after initialization."""
        if not self.chunk_id:
            raise ValueError("chunk_id cannot be empty")

        if not isinstance(self.entities, list):
            raise TypeError("entities must be a list")

        if not isinstance(self.relationships, list):
            raise TypeError("relationships must be a list")

        if not isinstance(self.semantic_context, dict):
            raise TypeError("semantic_context must be a dictionary")

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
        shared_count = self._count_shared_context(other_boundary)
        total_count = self._count_total_context()
        return self._compute_gap_score(shared_count, total_count)

    def _count_shared_context(self, other_boundary: 'ChunkBoundary') -> int:
        """Count context keys that are shared and have matching values."""
        return sum(1 for key in self.semantic_context
                  if key in other_boundary.semantic_context
                  and self.semantic_context[key] == other_boundary.semantic_context[key])

    def _count_total_context(self) -> int:
        """Count total context keys in this boundary."""
        return len(self.semantic_context)

    def _compute_gap_score(self, shared: int, total: int) -> float:
        """Compute semantic gap score from shared and total counts."""
        return 1.0 - (shared / max(1, total))

    def create_overlap_with(self, other_boundary: 'ChunkBoundary', overlap_config: 'OverlapConfig') -> Optional[Dict[str, Any]]:
        """
        Create overlap with another boundary based on semantic gap analysis.
        
        Args:
            other_boundary: The boundary to create overlap with
            overlap_config: Configuration for overlap creation
            
        Returns:
            Overlap data or None if no overlap needed
        """
        semantic_gap = self.calculate_semantic_gap(other_boundary)

        if semantic_gap < 0.3:  # Low semantic gap, minimal overlap needed
            return self._create_minimal_overlap_with(other_boundary)
        elif semantic_gap < 0.7:  # Medium gap, moderate overlap
            return self._create_moderate_overlap_with(other_boundary)
        else:  # High gap, comprehensive overlap
            return self._create_comprehensive_overlap_with(other_boundary)

    def _create_minimal_overlap_with(self, other_boundary: 'ChunkBoundary') -> Dict[str, Any]:
        """Create minimal overlap for low semantic gap."""
        overlap_entities = self.get_boundary_entities(2)

        return {
            "type": "minimal",
            "entities": overlap_entities,
            "semantic_gap": self.calculate_semantic_gap(other_boundary),
            "context_elements": ["entity_references"]
        }

    def _create_moderate_overlap_with(self, other_boundary: 'ChunkBoundary') -> Dict[str, Any]:
        """Create moderate overlap for medium semantic gap."""
        overlap_entities = self.get_boundary_entities(5)
        shared_context = self._extract_shared_context_with(other_boundary)

        return {
            "type": "moderate",
            "entities": overlap_entities,
            "shared_context": shared_context,
            "semantic_gap": self.calculate_semantic_gap(other_boundary),
            "context_elements": ["entity_references", "relationships", "spatial_context"]
        }

    def _create_comprehensive_overlap_with(self, other_boundary: 'ChunkBoundary') -> Dict[str, Any]:
        """Create comprehensive overlap for high semantic gap."""
        overlap_entities = self.get_boundary_entities(10)
        shared_context = self._extract_shared_context_with(other_boundary)
        bridging_relationships = self._find_bridging_relationships_with(other_boundary)

        return {
            "type": "comprehensive",
            "entities": overlap_entities,
            "shared_context": shared_context,
            "bridging_relationships": bridging_relationships,
            "semantic_gap": self.calculate_semantic_gap(other_boundary),
            "context_elements": ["entity_references", "relationships", "spatial_context", "semantic_links"]
        }

    def _extract_shared_context_with(self, other_boundary: 'ChunkBoundary') -> Dict[str, Any]:
        """Extract shared semantic context between boundaries."""
        shared = {}

        for key, value in self.semantic_context.items():
            if key in other_boundary.semantic_context:
                if self.semantic_context[key] == other_boundary.semantic_context[key]:
                    shared[key] = value

        return shared

    def _find_bridging_relationships_with(self, other_boundary: 'ChunkBoundary') -> List[Any]:
        """Find relationships that bridge between boundaries."""
        bridging = []

        self_entity_ids = {getattr(e, 'entity_id', None) for e in self.entities}
        other_entity_ids = {getattr(e, 'entity_id', None) for e in other_boundary.entities}

        for relationship in self.relationships:
            if hasattr(relationship, 'source_id') and hasattr(relationship, 'target_id'):
                if (relationship.source_id in self_entity_ids and
                    relationship.target_id in other_entity_ids):
                    bridging.append(relationship)

        return bridging


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
        return prev_boundary.create_overlap_with(curr_boundary, self.overlap_config)


class TokenBudget:
    """
    Manages token allocation for entities and relationships in overlaps.
    
    Addresses feature envy by encapsulating token calculation and allocation logic.
    """

    def __init__(self, limit: int, token_counter: 'EstimativeTokenCounter'):
        """
        Initialize token budget with limit and counter.
        
        Args:
            limit: Maximum tokens allowed
            token_counter: Token counter for calculations
        """
        self.limit = limit
        self.token_counter = token_counter

    def allocate_for_entities_and_relationships(self, entities: List[Any], relationships: List[Any]) -> Dict[str, Any]:
        """
        Allocate tokens optimally between entities and relationships.
        
        Args:
            entities: List of entities to include
            relationships: List of relationships to include
            
        Returns:
            Allocation result with optimized entities and relationships
        """
        entity_tokens = self._calculate_entity_tokens(entities)
        rel_tokens = self._calculate_relationship_tokens(relationships)

        if entity_tokens + rel_tokens <= self.limit:
            return {
                "entities": entities,
                "relationships": relationships,
                "total_tokens": entity_tokens + rel_tokens,
                "entity_tokens": entity_tokens,
                "relationship_tokens": rel_tokens
            }

        return self._optimize_allocation(entities, relationships, entity_tokens, rel_tokens)

    def _calculate_entity_tokens(self, entities: List[Any]) -> int:
        """Calculate total tokens for entities."""
        return sum(self.token_counter.count_tokens(str(e)) for e in entities)

    def _calculate_relationship_tokens(self, relationships: List[Any]) -> int:
        """Calculate total tokens for relationships."""
        return sum(self.token_counter.count_tokens(str(r)) for r in relationships)

    def _optimize_allocation(self, entities: List[Any], relationships: List[Any],
                           entity_tokens: int, rel_tokens: int) -> Dict[str, Any]:
        """Optimize allocation when over limit, prioritizing relationships."""
        # Prioritize relationships, reduce entities if needed
        available_for_entities = self.limit - rel_tokens

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

            return {
                "entities": limited_entities,
                "relationships": relationships,
                "total_tokens": current_entity_tokens + rel_tokens,
                "entity_tokens": current_entity_tokens,
                "relationship_tokens": rel_tokens
            }
        else:
            # If relationships alone exceed limit, just return relationships
            return {
                "entities": [],
                "relationships": relationships,
                "total_tokens": rel_tokens,
                "entity_tokens": 0,
                "relationship_tokens": rel_tokens
            }


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

    def _apply_token_limit_to_entities(self, entities: List[Any], token_limit: int) -> Tuple[List[Any], int]:
        """Template method for applying token limits to entity lists."""
        limited_entities = []
        current_tokens = 0

        for entity in entities:
            entity_tokens = self.token_counter.count_tokens(str(entity))
            if current_tokens + entity_tokens <= token_limit:
                limited_entities.append(entity)
                current_tokens += entity_tokens
            else:
                break

        return limited_entities, current_tokens

    def _apply_token_based_limits(self, context_overlap: Dict[str, Any]) -> Dict[str, Any]:
        """Apply token-based size limits to overlap."""
        entities = context_overlap.get("entities", [])
        limited_entities, current_tokens = self._apply_token_limit_to_entities(entities, self.config.size_tokens)

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
        entities = context_overlap.get("entities", [])
        complete_entities, current_tokens = self._apply_token_limit_to_entities(entities, self.config.size_tokens)

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

        # Use TokenBudget to handle allocation logic
        token_budget = TokenBudget(self.config.size_tokens, self.token_counter)
        allocation_result = token_budget.allocate_for_entities_and_relationships(entities, bridging_rels)

        # Update context_overlap with allocation results
        context_overlap["entities"] = allocation_result["entities"]
        context_overlap["overlap_tokens"] = allocation_result["total_tokens"]
        context_overlap["strategy_applied"] = "relationship_aware"
        context_overlap["bridging_relationships_count"] = len(bridging_rels)
        context_overlap["entity_tokens"] = allocation_result["entity_tokens"]
        context_overlap["relationship_tokens"] = allocation_result["relationship_tokens"]

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
