"""
Overlap management system for semantic chunk boundaries.

This module provides intelligent overlap mechanisms to preserve semantic context
and entity relationships across chunk boundaries, ensuring no information loss
during chunking operations.
"""

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Set, Any, Optional, Tuple, Union
from collections import defaultdict

import structlog

from .exceptions import IFCChunkingError, ValidationError
from .ifc_schema import IFCEntity, IFCEntityType, IFCHierarchy, Discipline
from .relationships import RelationshipGraph, RelationshipType, EntityRelationship
from .chunking_strategies import SemanticChunk, ChunkingContext
from .config import Config

logger = structlog.get_logger(__name__)


class OverlapStrategy(Enum):
    """Different strategies for creating chunk overlaps."""
    
    ENTITY_BASED = "entity_based"           # Overlap based on entity relationships
    HIERARCHY_BASED = "hierarchy_based"     # Overlap based on spatial hierarchy
    SEMANTIC_BASED = "semantic_based"       # Overlap based on semantic similarity
    FIXED_PERCENTAGE = "fixed_percentage"   # Fixed percentage of chunk content
    ADAPTIVE = "adaptive"                   # Adaptive based on content analysis


@dataclass
class ChunkBoundary:
    """
    Represents and analyzes the boundary between two chunks.
    
    Provides detailed analysis of what entities and relationships
    exist at chunk boundaries to enable intelligent overlap creation.
    """
    
    source_chunk: SemanticChunk
    target_chunk: SemanticChunk
    boundary_entities: Set[str] = field(default_factory=set)
    cross_boundary_relationships: List[EntityRelationship] = field(default_factory=list)
    semantic_gap_score: float = 0.0
    overlap_priority: float = 0.0
    
    def __post_init__(self):
        """Analyze boundary characteristics after creation."""
        self._analyze_boundary()
    
    def _analyze_boundary(self) -> None:
        """Analyze the characteristics of this chunk boundary."""
        # Find entities that have relationships across the boundary
        source_entity_ids = self.source_chunk.entity_ids
        target_entity_ids = self.target_chunk.entity_ids
        
        # Check relationships from source chunk
        for relationship in self.source_chunk.relationships:
            if (relationship.source_entity_id in source_entity_ids and 
                relationship.target_entity_id in target_entity_ids):
                self.cross_boundary_relationships.append(relationship)
                self.boundary_entities.add(relationship.source_entity_id)
                self.boundary_entities.add(relationship.target_entity_id)
        
        # Check relationships from target chunk
        for relationship in self.target_chunk.relationships:
            if (relationship.source_entity_id in source_entity_ids and 
                relationship.target_entity_id in target_entity_ids):
                if relationship not in self.cross_boundary_relationships:
                    self.cross_boundary_relationships.append(relationship)
                    self.boundary_entities.add(relationship.source_entity_id)
                    self.boundary_entities.add(relationship.target_entity_id)
        
        # Calculate semantic gap score (higher = more semantic discontinuity)
        self.semantic_gap_score = self._calculate_semantic_gap()
        
        # Calculate overlap priority (higher = more important to overlap)
        self.overlap_priority = self._calculate_overlap_priority()
    
    def _calculate_semantic_gap(self) -> float:
        """Calculate semantic discontinuity at the boundary."""
        if not self.cross_boundary_relationships:
            return 1.0  # Maximum gap if no relationships
        
        # Lower gap score for more relationships
        relationship_density = len(self.cross_boundary_relationships) / max(
            len(self.source_chunk.entity_ids) + len(self.target_chunk.entity_ids), 1
        )
        
        # Consider relationship types - spatial relationships reduce gap more
        spatial_relationships = sum(
            1 for rel in self.cross_boundary_relationships 
            if rel.relationship_type == RelationshipType.SPATIAL_CONTAINMENT
        )
        
        spatial_factor = min(spatial_relationships / len(self.cross_boundary_relationships), 1.0) if self.cross_boundary_relationships else 0.0
        
        # Gap score: 0.0 = no gap, 1.0 = maximum gap
        gap_score = max(0.0, 1.0 - (relationship_density * 2.0) - (spatial_factor * 0.5))
        return min(gap_score, 1.0)
    
    def _calculate_overlap_priority(self) -> float:
        """Calculate priority for creating overlap at this boundary."""
        # Higher priority for boundaries with more important relationships
        priority_score = 0.0
        
        # Cross-boundary relationships increase priority
        priority_score += len(self.cross_boundary_relationships) * 0.3
        
        # High semantic gap increases priority (need overlap to bridge gap)
        priority_score += self.semantic_gap_score * 0.4
        
        # Spatial relationships are high priority
        spatial_count = sum(
            1 for rel in self.cross_boundary_relationships
            if rel.relationship_type == RelationshipType.SPATIAL_CONTAINMENT
        )
        priority_score += spatial_count * 0.5
        
        # Critical entities increase priority
        critical_entities = sum(
            1 for entity_id in self.boundary_entities
            if self._is_critical_entity(entity_id)
        )
        priority_score += critical_entities * 0.3
        
        return min(priority_score, 1.0)
    
    def _is_critical_entity(self, entity_id: str) -> bool:
        """Check if an entity is critical for overlap."""
        # This is a simplified check - in practice, you'd want more sophisticated logic
        # For now, consider spatial elements as critical
        for entity in self.source_chunk.entities + self.target_chunk.entities:
            if entity.entity_id == entity_id:
                return entity.is_spatial_element()
        return False
    
    def get_overlap_entities(self, max_entities: int = 10) -> List[IFCEntity]:
        """
        Get the most important entities for overlap at this boundary.
        
        Args:
            max_entities: Maximum number of entities to include in overlap
            
        Returns:
            List of entities to include in overlap
        """
        overlap_entities = []
        entity_scores = {}
        
        # Score entities based on their importance for overlap
        for entity_id in self.boundary_entities:
            score = 0.0
            
            # Entities involved in cross-boundary relationships get high scores
            for rel in self.cross_boundary_relationships:
                if rel.involves_entity(entity_id):
                    score += rel.weight * 0.5
            
            # Spatial elements get bonus scores
            entity = self._find_entity(entity_id)
            if entity and entity.is_spatial_element():
                score += 0.3
            
            entity_scores[entity_id] = score
        
        # Sort by score and return top entities
        sorted_entities = sorted(entity_scores.items(), key=lambda x: x[1], reverse=True)
        
        for entity_id, score in sorted_entities[:max_entities]:
            entity = self._find_entity(entity_id)
            if entity:
                overlap_entities.append(entity)
        
        return overlap_entities
    
    def _find_entity(self, entity_id: str) -> Optional[IFCEntity]:
        """Find entity by ID in either chunk."""
        for entity in self.source_chunk.entities:
            if entity.entity_id == entity_id:
                return entity
        for entity in self.target_chunk.entities:
            if entity.entity_id == entity_id:
                return entity
        return None


@dataclass
class OverlapConfiguration:
    """Configuration for overlap creation."""
    
    strategy: OverlapStrategy = OverlapStrategy.ADAPTIVE
    overlap_percentage: float = 0.15  # 15% overlap by default
    min_overlap_entities: int = 2
    max_overlap_entities: int = 20
    preserve_spatial_hierarchy: bool = True
    preserve_critical_relationships: bool = True
    adaptive_threshold: float = 0.7  # Threshold for adaptive decisions


class ContextPreserver:
    """
    Preserves semantic context at chunk boundaries.
    
    Analyzes chunk boundaries and determines what context information
    needs to be preserved to maintain semantic coherence.
    """
    
    def __init__(self, config: Optional[Config] = None):
        """
        Initialize context preserver.
        
        Args:
            config: Configuration object
        """
        self.config = config or Config()
        logger.info("ContextPreserver initialized")
    
    def analyze_context_requirements(
        self, 
        chunks: List[SemanticChunk], 
        relationship_graph: RelationshipGraph
    ) -> Dict[int, Dict[str, Any]]:
        """
        Analyze context requirements for each chunk boundary.
        
        Args:
            chunks: List of semantic chunks to analyze
            relationship_graph: Relationship graph for the entities
            
        Returns:
            Dictionary mapping chunk indices to context requirements
        """
        context_requirements = {}
        
        for i in range(len(chunks) - 1):
            boundary = ChunkBoundary(chunks[i], chunks[i + 1])
            
            requirements = {
                "boundary_analysis": {
                    "cross_boundary_relationships": len(boundary.cross_boundary_relationships),
                    "boundary_entities": len(boundary.boundary_entities),
                    "semantic_gap_score": boundary.semantic_gap_score,
                    "overlap_priority": boundary.overlap_priority
                },
                "context_entities": boundary.get_overlap_entities(),
                "required_relationships": boundary.cross_boundary_relationships,
                "preservation_strategy": self._determine_preservation_strategy(boundary)
            }
            
            context_requirements[i] = requirements
        
        return context_requirements
    
    def _determine_preservation_strategy(self, boundary: ChunkBoundary) -> str:
        """Determine the best strategy for preserving context at this boundary."""
        if boundary.overlap_priority > 0.8:
            return "comprehensive"  # Preserve extensive context
        elif boundary.semantic_gap_score > 0.6:
            return "bridging"      # Focus on bridging semantic gap
        elif len(boundary.cross_boundary_relationships) > 5:
            return "relationship_focused"  # Focus on preserving relationships
        else:
            return "minimal"       # Minimal overlap sufficient
    
    def create_context_chunk(
        self, 
        boundary: ChunkBoundary, 
        strategy: str = "adaptive"
    ) -> Optional[SemanticChunk]:
        """
        Create a context chunk to bridge the boundary.
        
        Args:
            boundary: Boundary analysis
            strategy: Context preservation strategy
            
        Returns:
            Context chunk if needed, None otherwise
        """
        if boundary.overlap_priority < 0.3:
            return None  # No context chunk needed
        
        overlap_entities = boundary.get_overlap_entities()
        if not overlap_entities:
            return None
        
        # Create context chunk
        context_chunk = SemanticChunk(
            chunk_id=f"context_{boundary.source_chunk.chunk_id}_{boundary.target_chunk.chunk_id}",
            strategy_used="ContextPreserver",
            entities=overlap_entities,
            relationships=boundary.cross_boundary_relationships,
            metadata={
                "is_context_chunk": True,
                "source_chunk_id": boundary.source_chunk.chunk_id,
                "target_chunk_id": boundary.target_chunk.chunk_id,
                "preservation_strategy": strategy,
                "semantic_gap_score": boundary.semantic_gap_score,
                "overlap_priority": boundary.overlap_priority
            }
        )
        
        return context_chunk


class OverlapManager:
    """
    Coordinates overlap creation and management across chunks.
    
    Provides high-level coordination of overlap strategies and ensures
    consistent overlap policies across the entire chunking operation.
    """
    
    def __init__(self, config: OverlapConfiguration):
        """
        Initialize overlap manager.
        
        Args:
            config: Overlap configuration
        """
        self.config = config
        self.context_preserver = ContextPreserver()
        self.overlap_statistics = defaultdict(int)
        
        logger.info(
            f"OverlapManager initialized with {config.strategy.value} strategy",
            overlap_percentage=config.overlap_percentage
        )
    
    async def create_overlaps(
        self, 
        chunks: List[SemanticChunk], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """
        Create overlaps between chunks using the configured strategy.
        
        Args:
            chunks: List of semantic chunks
            context: Chunking context with entities and relationships
            
        Returns:
            List of chunks with overlaps applied
        """
        if len(chunks) < 2:
            return chunks
        
        logger.info(f"Creating overlaps for {len(chunks)} chunks using {self.config.strategy.value}")
        
        # Apply strategy-specific overlap creation
        if self.config.strategy == OverlapStrategy.ENTITY_BASED:
            return await self._create_entity_based_overlaps(chunks, context)
        elif self.config.strategy == OverlapStrategy.HIERARCHY_BASED:
            return await self._create_hierarchy_based_overlaps(chunks, context)
        elif self.config.strategy == OverlapStrategy.SEMANTIC_BASED:
            return await self._create_semantic_based_overlaps(chunks, context)
        elif self.config.strategy == OverlapStrategy.FIXED_PERCENTAGE:
            return await self._create_fixed_percentage_overlaps(chunks, context)
        elif self.config.strategy == OverlapStrategy.ADAPTIVE:
            return await self._create_adaptive_overlaps(chunks, context)
        else:
            logger.warning(f"Unknown overlap strategy: {self.config.strategy}")
            return chunks
    
    async def _create_entity_based_overlaps(
        self, 
        chunks: List[SemanticChunk], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """Create overlaps based on entity relationships."""
        overlapped_chunks = []
        
        for i in range(len(chunks)):
            chunk = chunks[i]
            overlapped_chunk = self._copy_chunk(chunk)
            
            # Add entities from previous chunk if relationships exist
            if i > 0:
                prev_chunk = chunks[i - 1]
                overlap_entities = self._find_related_entities(
                    chunk, prev_chunk, context.relationship_graph
                )
                overlapped_chunk.entities.extend(overlap_entities)
                overlapped_chunk.entity_ids.update(e.entity_id for e in overlap_entities)
            
            # Add entities from next chunk if relationships exist
            if i < len(chunks) - 1:
                next_chunk = chunks[i + 1]
                overlap_entities = self._find_related_entities(
                    chunk, next_chunk, context.relationship_graph
                )
                overlapped_chunk.entities.extend(overlap_entities)
                overlapped_chunk.entity_ids.update(e.entity_id for e in overlap_entities)
            
            overlapped_chunks.append(overlapped_chunk)
            self.overlap_statistics["entity_based"] += 1
        
        return overlapped_chunks
    
    async def _create_hierarchy_based_overlaps(
        self, 
        chunks: List[SemanticChunk], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """Create overlaps based on spatial hierarchy."""
        overlapped_chunks = []
        
        for i, chunk in enumerate(chunks):
            overlapped_chunk = self._copy_chunk(chunk)
            
            # Add parent entities for spatial context
            if self.config.preserve_spatial_hierarchy:
                parent_entities = self._get_spatial_parents(chunk, context.hierarchy)
                overlapped_chunk.entities.extend(parent_entities)
                overlapped_chunk.entity_ids.update(e.entity_id for e in parent_entities)
            
            overlapped_chunks.append(overlapped_chunk)
            self.overlap_statistics["hierarchy_based"] += 1
        
        return overlapped_chunks
    
    async def _create_semantic_based_overlaps(
        self, 
        chunks: List[SemanticChunk], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """Create overlaps based on semantic similarity."""
        overlapped_chunks = []
        
        for i, chunk in enumerate(chunks):
            overlapped_chunk = self._copy_chunk(chunk)
            
            # Find semantically similar entities in adjacent chunks
            if i > 0:
                similar_entities = self._find_semantically_similar_entities(
                    chunk, chunks[i - 1]
                )
                overlapped_chunk.entities.extend(similar_entities)
                overlapped_chunk.entity_ids.update(e.entity_id for e in similar_entities)
            
            overlapped_chunks.append(overlapped_chunk)
            self.overlap_statistics["semantic_based"] += 1
        
        return overlapped_chunks
    
    async def _create_fixed_percentage_overlaps(
        self, 
        chunks: List[SemanticChunk], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """Create fixed percentage overlaps."""
        overlapped_chunks = []
        
        for i, chunk in enumerate(chunks):
            overlapped_chunk = self._copy_chunk(chunk)
            
            # Add fixed percentage of entities from adjacent chunks
            overlap_count = max(
                self.config.min_overlap_entities,
                int(len(chunk.entities) * self.config.overlap_percentage)
            )
            overlap_count = min(overlap_count, self.config.max_overlap_entities)
            
            if i > 0 and overlap_count > 0:
                prev_entities = chunks[i - 1].entities[:overlap_count // 2]
                overlapped_chunk.entities.extend(prev_entities)
                overlapped_chunk.entity_ids.update(e.entity_id for e in prev_entities)
            
            if i < len(chunks) - 1 and overlap_count > 0:
                next_entities = chunks[i + 1].entities[:overlap_count // 2]
                overlapped_chunk.entities.extend(next_entities)
                overlapped_chunk.entity_ids.update(e.entity_id for e in next_entities)
            
            overlapped_chunks.append(overlapped_chunk)
            self.overlap_statistics["fixed_percentage"] += 1
        
        return overlapped_chunks
    
    async def _create_adaptive_overlaps(
        self, 
        chunks: List[SemanticChunk], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """Create adaptive overlaps based on boundary analysis."""
        overlapped_chunks = []
        
        # Analyze all boundaries first
        boundaries = []
        for i in range(len(chunks) - 1):
            boundary = ChunkBoundary(chunks[i], chunks[i + 1])
            boundaries.append(boundary)
        
        # Create overlaps based on boundary analysis
        for i, chunk in enumerate(chunks):
            overlapped_chunk = self._copy_chunk(chunk)
            
            # Add overlaps from previous boundary
            if i > 0:
                boundary = boundaries[i - 1]
                if boundary.overlap_priority > self.config.adaptive_threshold:
                    overlap_entities = boundary.get_overlap_entities()
                    overlapped_chunk.entities.extend(overlap_entities)
                    overlapped_chunk.entity_ids.update(e.entity_id for e in overlap_entities)
            
            # Add overlaps from next boundary
            if i < len(boundaries):
                boundary = boundaries[i]
                if boundary.overlap_priority > self.config.adaptive_threshold:
                    overlap_entities = boundary.get_overlap_entities()
                    overlapped_chunk.entities.extend(overlap_entities)
                    overlapped_chunk.entity_ids.update(e.entity_id for e in overlap_entities)
            
            overlapped_chunks.append(overlapped_chunk)
            self.overlap_statistics["adaptive"] += 1
        
        return overlapped_chunks
    
    def _copy_chunk(self, chunk: SemanticChunk) -> SemanticChunk:
        """Create a copy of a chunk for overlap modification."""
        from copy import deepcopy
        return deepcopy(chunk)
    
    def _find_related_entities(
        self, 
        chunk1: SemanticChunk, 
        chunk2: SemanticChunk, 
        relationship_graph: RelationshipGraph
    ) -> List[IFCEntity]:
        """Find entities in chunk2 that are related to entities in chunk1."""
        related_entities = []
        
        for entity1_id in chunk1.entity_ids:
            relationships = relationship_graph.get_entity_relationships(entity1_id)
            for rel in relationships:
                other_entity_id = rel.get_other_entity(entity1_id)
                if other_entity_id and other_entity_id in chunk2.entity_ids:
                    # Find the entity in chunk2
                    for entity in chunk2.entities:
                        if entity.entity_id == other_entity_id:
                            related_entities.append(entity)
                            break
        
        return related_entities
    
    def _get_spatial_parents(
        self, 
        chunk: SemanticChunk, 
        hierarchy: IFCHierarchy
    ) -> List[IFCEntity]:
        """Get spatial parent entities for context."""
        parent_entities = []
        
        for entity in chunk.entities:
            if entity.is_spatial_element():
                parent_id = hierarchy.get_parent(entity.entity_id)
                if parent_id and parent_id in hierarchy.entities:
                    parent_entities.append(hierarchy.entities[parent_id])
        
        return parent_entities
    
    def _find_semantically_similar_entities(
        self, 
        chunk1: SemanticChunk, 
        chunk2: SemanticChunk
    ) -> List[IFCEntity]:
        """Find semantically similar entities between chunks."""
        similar_entities = []
        
        # Simple similarity based on entity type and discipline
        for entity1 in chunk1.entities:
            for entity2 in chunk2.entities:
                if (entity1.entity_type == entity2.entity_type and 
                    entity1.discipline == entity2.discipline):
                    similar_entities.append(entity2)
        
        return similar_entities[:self.config.max_overlap_entities // 2]
    
    def get_overlap_statistics(self) -> Dict[str, Any]:
        """Get statistics about overlap operations."""
        return {
            "strategy_usage": dict(self.overlap_statistics),
            "total_overlaps_created": sum(self.overlap_statistics.values()),
            "configuration": {
                "strategy": self.config.strategy.value,
                "overlap_percentage": self.config.overlap_percentage,
                "min_overlap_entities": self.config.min_overlap_entities,
                "max_overlap_entities": self.config.max_overlap_entities
            }
        }


def create_overlap_manager(
    strategy: OverlapStrategy = OverlapStrategy.ADAPTIVE,
    overlap_percentage: float = 0.15
) -> OverlapManager:
    """
    Factory function to create overlap manager with configuration.
    
    Args:
        strategy: Overlap strategy to use
        overlap_percentage: Percentage of content to overlap
        
    Returns:
        Configured overlap manager
    """
    config = OverlapConfiguration(
        strategy=strategy,
        overlap_percentage=overlap_percentage
    )
    return OverlapManager(config)