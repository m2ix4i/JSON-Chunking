"""
Semantic chunking strategies for IFC building data.

This module provides the framework and implementations for various semantic chunking
strategies that preserve IFC entity relationships and maintain semantic context
for optimal LLM processing.
"""

import asyncio
import time
from abc import ABC, abstractmethod
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Set, Any, Optional, Tuple, Union
from pathlib import Path

import structlog

from .exceptions import IFCChunkingError, ValidationError
from .ifc_schema import IFCEntity, IFCEntityType, IFCHierarchy, Discipline
from .relationships import RelationshipGraph, RelationshipType, EntityRelationship
from .config import Config

logger = structlog.get_logger(__name__)


class ChunkingMode(Enum):
    """Chunking operation modes."""
    
    STRICT = "strict"           # Strict boundaries, no overlap
    OVERLAP = "overlap"         # Allow configurable overlap
    ADAPTIVE = "adaptive"       # Adaptive boundaries based on relationships
    HYBRID = "hybrid"          # Combine multiple strategies


class ChunkPriority(Enum):
    """Priority levels for chunks."""
    
    CRITICAL = "critical"       # Essential building components
    HIGH = "high"              # Important structural elements  
    MEDIUM = "medium"          # Standard building elements
    LOW = "low"               # Supporting elements


@dataclass
class ChunkingContext:
    """
    Context information for chunking decisions.
    
    Provides comprehensive context about the current chunking operation
    including entities, relationships, and configuration parameters.
    """
    
    entities: Dict[str, IFCEntity]
    hierarchy: IFCHierarchy
    relationship_graph: RelationshipGraph
    config: Config
    mode: ChunkingMode = ChunkingMode.ADAPTIVE
    target_size_mb: float = 10.0
    max_entities_per_chunk: int = 1000
    min_entities_per_chunk: int = 10
    overlap_percentage: float = 0.15
    preserve_relationships: bool = True
    maintain_hierarchy: bool = True
    current_chunk_count: int = 0
    
    def get_entity(self, entity_id: str) -> Optional[IFCEntity]:
        """Get entity by ID."""
        return self.entities.get(entity_id)
    
    def get_related_entities(self, entity_id: str) -> List[IFCEntity]:
        """Get entities related to the given entity."""
        relationships = self.relationship_graph.get_entity_relationships(entity_id)
        related_entities = []
        
        for rel in relationships:
            other_id = rel.get_other_entity(entity_id)
            if other_id and other_id in self.entities:
                related_entities.append(self.entities[other_id])
        
        return related_entities
    
    def calculate_overlap_size(self, chunk_size: int) -> int:
        """Calculate overlap size based on chunk size and percentage."""
        return max(1, int(chunk_size * self.overlap_percentage))


@dataclass 
class SemanticChunk:
    """
    Enhanced chunk with semantic metadata and relationships.
    
    Represents a semantically coherent group of IFC entities with
    preserved relationships and contextual information.
    """
    
    chunk_id: str
    strategy_used: str
    entities: List[IFCEntity] = field(default_factory=list)
    entity_ids: Set[str] = field(default_factory=set)
    relationships: List[EntityRelationship] = field(default_factory=list)
    spatial_context: Optional[Dict[str, Any]] = None
    discipline: Optional[Discipline] = None
    hierarchy_level: Optional[int] = None
    properties_summary: Dict[str, Any] = field(default_factory=dict)
    overlap_info: Dict[str, Any] = field(default_factory=dict)
    quality_metrics: Dict[str, float] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    priority: ChunkPriority = ChunkPriority.MEDIUM
    created_at: float = field(default_factory=time.time)
    
    def __post_init__(self):
        """Initialize computed fields after creation."""
        if not self.entity_ids:
            self.entity_ids = {entity.entity_id for entity in self.entities}
        
        # Calculate basic metrics
        self._calculate_basic_metrics()
    
    def _calculate_basic_metrics(self):
        """Calculate basic quality metrics for the chunk."""
        if not self.entities:
            return
        
        # Entity type diversity
        entity_types = {entity.entity_type for entity in self.entities}
        self.quality_metrics["entity_type_diversity"] = len(entity_types) / len(self.entities)
        
        # Discipline consistency
        disciplines = {entity.discipline for entity in self.entities}
        self.quality_metrics["discipline_consistency"] = 1.0 - (len(disciplines) - 1) / max(1, len(disciplines))
        
        # Relationship density
        internal_relationships = sum(
            1 for rel in self.relationships
            if rel.source_entity_id in self.entity_ids and rel.target_entity_id in self.entity_ids
        )
        max_possible_relationships = len(self.entities) * (len(self.entities) - 1) / 2
        self.quality_metrics["relationship_density"] = (
            internal_relationships / max_possible_relationships if max_possible_relationships > 0 else 0
        )
        
        # Spatial coherence
        if self.spatial_context and "hierarchy_paths" in self.spatial_context:
            paths = self.spatial_context["hierarchy_paths"]
            if paths:
                avg_path_length = sum(len(path) for path in paths) / len(paths)
                path_length_variance = sum((len(path) - avg_path_length) ** 2 for path in paths) / len(paths)
                self.quality_metrics["spatial_coherence"] = 1.0 / (1.0 + path_length_variance)
            else:
                self.quality_metrics["spatial_coherence"] = 0.0
        else:
            self.quality_metrics["spatial_coherence"] = 0.0
    
    def add_entity(self, entity: IFCEntity) -> None:
        """Add an entity to the chunk."""
        if entity.entity_id not in self.entity_ids:
            self.entities.append(entity)
            self.entity_ids.add(entity.entity_id)
            self._calculate_basic_metrics()
    
    def add_relationship(self, relationship: EntityRelationship) -> None:
        """Add a relationship to the chunk."""
        if relationship not in self.relationships:
            self.relationships.append(relationship)
            self._calculate_basic_metrics()
    
    def contains_entity(self, entity_id: str) -> bool:
        """Check if chunk contains the specified entity."""
        return entity_id in self.entity_ids
    
    def get_size_estimate(self) -> int:
        """Estimate chunk size in bytes."""
        # Rough estimation based on entity count and properties
        base_size = len(self.entities) * 1024  # 1KB per entity base
        
        # Add property size estimates
        for entity in self.entities:
            base_size += len(str(entity.properties)) * 2  # Property overhead
            base_size += len(entity.property_sets) * 512   # Property sets
        
        # Add relationship overhead
        base_size += len(self.relationships) * 256
        
        return base_size
    
    def get_entity_count(self) -> int:
        """Get number of entities in chunk."""
        return len(self.entities)
    
    def get_relationship_count(self) -> int:
        """Get number of relationships in chunk."""
        return len(self.relationships)
    
    def calculate_overlap_with(self, other_chunk: "SemanticChunk") -> float:
        """Calculate overlap percentage with another chunk."""
        if not self.entity_ids or not other_chunk.entity_ids:
            return 0.0
        
        intersection = self.entity_ids.intersection(other_chunk.entity_ids)
        union = self.entity_ids.union(other_chunk.entity_ids)
        
        return len(intersection) / len(union) if union else 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert chunk to dictionary representation."""
        return {
            "chunk_id": self.chunk_id,
            "strategy_used": self.strategy_used,
            "entity_count": len(self.entities),
            "entity_ids": list(self.entity_ids),
            "relationship_count": len(self.relationships),
            "spatial_context": self.spatial_context,
            "discipline": self.discipline.value if self.discipline else None,
            "hierarchy_level": self.hierarchy_level,
            "properties_summary": self.properties_summary,
            "overlap_info": self.overlap_info,
            "quality_metrics": self.quality_metrics,
            "metadata": self.metadata,
            "priority": self.priority.value,
            "size_estimate_bytes": self.get_size_estimate(),
            "created_at": self.created_at
        }


class ChunkingStrategy(ABC):
    """
    Abstract base class for all chunking strategies.
    
    Defines the interface that all semantic chunking strategies must implement
    for processing IFC entities into semantically coherent chunks.
    """
    
    def __init__(self, config: Optional[Config] = None):
        """
        Initialize the chunking strategy.
        
        Args:
            config: Configuration object with strategy settings
        """
        self.config = config or Config()
        self.strategy_name = self.__class__.__name__
        self.chunks_created = 0
        
        logger.info(f"{self.strategy_name} initialized", config=str(self.config))
    
    @abstractmethod
    async def chunk_entities(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """
        Chunk entities using this strategy.
        
        Args:
            entities: List of IFC entities to chunk
            context: Chunking context with configuration and relationships
            
        Returns:
            List of semantic chunks
            
        Raises:
            IFCChunkingError: If chunking fails
        """
        pass
    
    def calculate_chunk_size(self, chunk: SemanticChunk) -> int:
        """Calculate the size of a chunk in bytes."""
        return chunk.get_size_estimate()
    
    def estimate_tokens(self, chunk: SemanticChunk, model: str = "gemini-2.5-pro") -> int:
        """
        Estimate token count for a chunk for a specific LLM model.
        
        Args:
            chunk: Semantic chunk to estimate
            model: Target LLM model name
            
        Returns:
            Estimated token count
        """
        # Rough token estimation based on content
        text_content = ""
        
        # Add entity information
        for entity in chunk.entities:
            text_content += f"Entity: {entity.name or entity.entity_id}\n"
            text_content += f"Type: {entity.entity_type.value}\n"
            text_content += f"Properties: {str(entity.properties)}\n"
            
            for pset_name, pset_data in entity.property_sets.items():
                text_content += f"{pset_name}: {str(pset_data)}\n"
        
        # Add relationship information
        for rel in chunk.relationships:
            text_content += f"Relationship: {rel.relationship_type.value}\n"
        
        # Token estimation (rough approximation)
        # GPT models: ~4 characters per token
        # Gemini models: ~3.5 characters per token
        if "gemini" in model.lower():
            return len(text_content) // 4
        elif "gpt" in model.lower():
            return len(text_content) // 4
        else:
            return len(text_content) // 4  # Default estimation
    
    def validate_chunk(self, chunk: SemanticChunk, context: ChunkingContext) -> Dict[str, Any]:
        """
        Validate a chunk for quality and integrity.
        
        Args:
            chunk: Semantic chunk to validate
            context: Chunking context
            
        Returns:
            Validation report dictionary
        """
        validation_report = {
            "is_valid": True,
            "warnings": [],
            "errors": [],
            "quality_score": 0.0,
            "metrics": {}
        }
        
        # Check minimum size requirements
        if chunk.get_entity_count() < context.min_entities_per_chunk:
            validation_report["warnings"].append(
                f"Chunk has only {chunk.get_entity_count()} entities, minimum is {context.min_entities_per_chunk}"
            )
        
        # Check maximum size requirements  
        if chunk.get_entity_count() > context.max_entities_per_chunk:
            validation_report["errors"].append(
                f"Chunk has {chunk.get_entity_count()} entities, maximum is {context.max_entities_per_chunk}"
            )
            validation_report["is_valid"] = False
        
        # Check for broken relationships
        broken_relationships = []
        for rel in chunk.relationships:
            if (rel.source_entity_id not in chunk.entity_ids or 
                rel.target_entity_id not in chunk.entity_ids):
                broken_relationships.append(rel.relationship_id)
        
        if broken_relationships:
            validation_report["warnings"].append(
                f"Chunk has {len(broken_relationships)} relationships with external entities"
            )
        
        # Calculate quality score based on metrics
        quality_metrics = chunk.quality_metrics
        quality_score = (
            quality_metrics.get("relationship_density", 0.0) * 0.3 +
            quality_metrics.get("discipline_consistency", 0.0) * 0.3 +
            quality_metrics.get("spatial_coherence", 0.0) * 0.2 +
            (1.0 - quality_metrics.get("entity_type_diversity", 0.0)) * 0.2
        )
        
        validation_report["quality_score"] = quality_score
        validation_report["metrics"] = quality_metrics
        
        return validation_report
    
    def _should_chunk_together(
        self, 
        entity1: IFCEntity, 
        entity2: IFCEntity,
        context: ChunkingContext
    ) -> bool:
        """
        Determine if two entities should be chunked together.
        
        Args:
            entity1: First entity
            entity2: Second entity  
            context: Chunking context
            
        Returns:
            True if entities should be in the same chunk
        """
        # Check if entities are related
        relationships = context.relationship_graph.get_entity_relationships(entity1.entity_id)
        
        for rel in relationships:
            if rel.involves_entity(entity2.entity_id):
                # Weight the relationship strength
                if rel.get_strength() > 0.5:  # Strong relationship threshold
                    return True
        
        return False
    
    def _create_chunk(
        self, 
        chunk_id: str,
        entities: List[IFCEntity],
        context: ChunkingContext,
        **kwargs
    ) -> SemanticChunk:
        """
        Create a semantic chunk from entities.
        
        Args:
            chunk_id: Unique identifier for the chunk
            entities: List of entities to include
            context: Chunking context
            **kwargs: Additional chunk properties
            
        Returns:
            Created semantic chunk
        """
        chunk = SemanticChunk(
            chunk_id=chunk_id,
            strategy_used=self.strategy_name,
            entities=entities,
            **kwargs
        )
        
        # Add relevant relationships
        entity_ids = chunk.entity_ids
        
        for entity_id in entity_ids:
            relationships = context.relationship_graph.get_entity_relationships(entity_id)
            for rel in relationships:
                # Include relationship if both entities are in chunk
                if (rel.source_entity_id in entity_ids and 
                    rel.target_entity_id in entity_ids):
                    chunk.add_relationship(rel)
        
        # Set spatial context
        if entities:
            hierarchy_paths = []
            for entity in entities:
                path = context.hierarchy.get_hierarchy_path(entity.entity_id)
                hierarchy_paths.append(path)
            
            chunk.spatial_context = {
                "hierarchy_paths": hierarchy_paths,
                "common_ancestors": self._find_common_ancestors(hierarchy_paths, context.hierarchy)
            }
        
        # Set primary discipline if entities are consistent
        disciplines = {entity.discipline for entity in entities}
        if len(disciplines) == 1:
            chunk.discipline = list(disciplines)[0]
        
        # Set hierarchy level based on most common level
        levels = [entity.get_hierarchy_level() for entity in entities]
        if levels:
            chunk.hierarchy_level = max(set(levels), key=levels.count)
        
        self.chunks_created += 1
        return chunk
    
    def _find_common_ancestors(
        self, 
        hierarchy_paths: List[List[str]], 
        hierarchy: IFCHierarchy
    ) -> List[str]:
        """Find common ancestors across hierarchy paths."""
        if not hierarchy_paths:
            return []
        
        # Find the shortest path length
        min_length = min(len(path) for path in hierarchy_paths)
        common_ancestors = []
        
        # Check each level for common ancestors
        for i in range(min_length):
            ancestors_at_level = {path[i] for path in hierarchy_paths}
            if len(ancestors_at_level) == 1:
                common_ancestors.append(list(ancestors_at_level)[0])
            else:
                break  # No more common ancestors
        
        return common_ancestors
    
    async def _yield_control(self):
        """Yield control to allow other coroutines to run."""
        await asyncio.sleep(0)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get strategy statistics."""
        return {
            "strategy_name": self.strategy_name,
            "chunks_created": self.chunks_created,
            "config": self.config.to_dict()
        }


class HierarchicalChunkingStrategy(ChunkingStrategy):
    """
    Hierarchical chunking strategy that groups entities by spatial hierarchy levels.
    
    Creates chunks based on the building's spatial containment hierarchy,
    respecting relationships like Site → Building → Floor → Room → Elements.
    """
    
    def __init__(self, config: Optional[Config] = None):
        """Initialize hierarchical chunking strategy."""
        super().__init__(config)
        self.max_hierarchy_depth = getattr(config, 'max_hierarchy_depth', 3)
        self.preserve_parent_child = getattr(config, 'preserve_parent_child', True)
    
    async def chunk_entities(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """
        Chunk entities by spatial hierarchy.
        
        Groups entities based on their position in the spatial hierarchy,
        creating chunks that preserve spatial containment relationships.
        """
        logger.info(
            "Starting hierarchical chunking",
            entity_count=len(entities),
            max_depth=self.max_hierarchy_depth
        )
        
        chunks = []
        
        try:
            # Group entities by hierarchy patterns
            hierarchy_groups = await self._group_by_hierarchy(entities, context)
            
            # Create chunks for each hierarchy group
            for group_id, group_entities in hierarchy_groups.items():
                if not group_entities:
                    continue
                
                # Split large groups if needed
                entity_groups = await self._split_large_groups(group_entities, context)
                
                for i, entity_group in enumerate(entity_groups):
                    chunk_id = f"hierarchical_{group_id}_{i}" if len(entity_groups) > 1 else f"hierarchical_{group_id}"
                    
                    chunk = self._create_chunk(
                        chunk_id=chunk_id,
                        entities=entity_group,
                        context=context,
                        priority=self._determine_chunk_priority(entity_group)
                    )
                    
                    chunks.append(chunk)
                    await self._yield_control()
            
            logger.info(
                "Hierarchical chunking completed",
                chunks_created=len(chunks),
                hierarchy_groups=len(hierarchy_groups)
            )
            
            return chunks
            
        except Exception as e:
            logger.error("Hierarchical chunking failed", error=str(e))
            raise IFCChunkingError(f"Hierarchical chunking failed: {e}") from e
    
    async def _group_by_hierarchy(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> Dict[str, List[IFCEntity]]:
        """Group entities by their position in the spatial hierarchy."""
        hierarchy_groups = defaultdict(list)
        
        for entity in entities:
            # Get hierarchy path
            hierarchy_path = context.hierarchy.get_hierarchy_path(entity.entity_id)
            
            # Create group key based on hierarchy depth
            group_key = await self._create_hierarchy_group_key(hierarchy_path, entity)
            hierarchy_groups[group_key].append(entity)
        
        return dict(hierarchy_groups)
    
    async def _create_hierarchy_group_key(
        self, 
        hierarchy_path: List[str], 
        entity: IFCEntity
    ) -> str:
        """Create a grouping key based on hierarchy path."""
        if len(hierarchy_path) <= self.max_hierarchy_depth:
            # Use full path for shallow hierarchies
            return "_".join(hierarchy_path[:-1]) if len(hierarchy_path) > 1 else "root"
        else:
            # Use truncated path for deep hierarchies
            truncated_path = hierarchy_path[:self.max_hierarchy_depth]
            return "_".join(truncated_path)
    
    async def _split_large_groups(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> List[List[IFCEntity]]:
        """Split large entity groups into manageable chunks."""
        if len(entities) <= context.max_entities_per_chunk:
            return [entities]
        
        # Split by entity type to maintain coherence
        type_groups = defaultdict(list)
        for entity in entities:
            type_groups[entity.entity_type].append(entity)
        
        chunks = []
        current_chunk = []
        
        for entity_type, type_entities in type_groups.items():
            for entity in type_entities:
                current_chunk.append(entity)
                
                if len(current_chunk) >= context.max_entities_per_chunk:
                    chunks.append(current_chunk)
                    current_chunk = []
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def _determine_chunk_priority(self, entities: List[IFCEntity]) -> ChunkPriority:
        """Determine priority based on entity types and hierarchy level."""
        # Spatial structure entities have higher priority
        spatial_count = sum(1 for e in entities if e.is_spatial_element())
        structural_count = sum(1 for e in entities if e.discipline == Discipline.STRUCTURAL)
        
        spatial_ratio = spatial_count / len(entities)
        structural_ratio = structural_count / len(entities)
        
        if spatial_ratio > 0.5:
            return ChunkPriority.CRITICAL
        elif structural_ratio > 0.3:
            return ChunkPriority.HIGH
        else:
            return ChunkPriority.MEDIUM


class DisciplineBasedChunkingStrategy(ChunkingStrategy):
    """
    Discipline-based chunking strategy that groups entities by building disciplines.
    
    Creates chunks based on building disciplines (Architectural, Structural, MEP)
    while maintaining functional relationships within each discipline.
    """
    
    def __init__(self, config: Optional[Config] = None):
        """Initialize discipline-based chunking strategy."""
        super().__init__(config)
        self.discipline_priorities = {
            Discipline.STRUCTURAL: ChunkPriority.CRITICAL,
            Discipline.ARCHITECTURAL: ChunkPriority.HIGH,
            Discipline.MECHANICAL: ChunkPriority.MEDIUM,
            Discipline.ELECTRICAL: ChunkPriority.MEDIUM,
            Discipline.PLUMBING: ChunkPriority.MEDIUM,
            Discipline.FIRE_PROTECTION: ChunkPriority.HIGH,
            Discipline.UNKNOWN: ChunkPriority.LOW
        }
    
    async def chunk_entities(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """
        Chunk entities by discipline with relationship preservation.
        
        Groups entities by their building discipline while preserving
        important cross-discipline relationships.
        """
        logger.info(
            "Starting discipline-based chunking",
            entity_count=len(entities)
        )
        
        chunks = []
        
        try:
            # Group entities by discipline
            discipline_groups = await self._group_by_discipline(entities, context)
            
            # Handle multi-discipline elements
            multi_discipline_entities = await self._handle_multi_discipline_elements(
                entities, context, discipline_groups
            )
            
            # Create chunks for each discipline
            for discipline, discipline_entities in discipline_groups.items():
                if not discipline_entities:
                    continue
                
                # Add related multi-discipline entities
                if discipline in multi_discipline_entities:
                    discipline_entities.extend(multi_discipline_entities[discipline])
                
                # Split large discipline groups
                entity_groups = await self._split_by_spatial_context(discipline_entities, context)
                
                for i, entity_group in enumerate(entity_groups):
                    chunk_id = f"discipline_{discipline.value.lower()}_{i}" if len(entity_groups) > 1 else f"discipline_{discipline.value.lower()}"
                    
                    chunk = self._create_chunk(
                        chunk_id=chunk_id,
                        entities=entity_group,
                        context=context,
                        discipline=discipline,
                        priority=self.discipline_priorities.get(discipline, ChunkPriority.MEDIUM)
                    )
                    
                    chunks.append(chunk)
                    await self._yield_control()
            
            logger.info(
                "Discipline-based chunking completed",
                chunks_created=len(chunks),
                disciplines_processed=len(discipline_groups)
            )
            
            return chunks
            
        except Exception as e:
            logger.error("Discipline-based chunking failed", error=str(e))
            raise IFCChunkingError(f"Discipline-based chunking failed: {e}") from e
    
    async def _group_by_discipline(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> Dict[Discipline, List[IFCEntity]]:
        """Group entities by their discipline."""
        discipline_groups = defaultdict(list)
        
        for entity in entities:
            discipline_groups[entity.discipline].append(entity)
        
        return dict(discipline_groups)
    
    async def _handle_multi_discipline_elements(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext,
        discipline_groups: Dict[Discipline, List[IFCEntity]]
    ) -> Dict[Discipline, List[IFCEntity]]:
        """Handle elements that serve multiple disciplines."""
        multi_discipline_elements = defaultdict(list)
        
        # Find elements with strong cross-discipline relationships
        for entity in entities:
            related_entities = context.get_related_entities(entity.entity_id)
            related_disciplines = {rel_entity.discipline for rel_entity in related_entities}
            
            # If entity is related to multiple disciplines, consider duplication
            if len(related_disciplines) > 1 and entity.discipline != Discipline.UNKNOWN:
                for discipline in related_disciplines:
                    if discipline != entity.discipline:
                        # Add reference to entity in other disciplines
                        multi_discipline_elements[discipline].append(entity)
        
        return dict(multi_discipline_elements)
    
    async def _split_by_spatial_context(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> List[List[IFCEntity]]:
        """Split large discipline groups by spatial context."""
        if len(entities) <= context.max_entities_per_chunk:
            return [entities]
        
        # Group by spatial container
        spatial_groups = defaultdict(list)
        
        for entity in entities:
            container = entity.spatial_container or "no_container"
            spatial_groups[container].append(entity)
        
        # Create chunks from spatial groups
        chunks = []
        current_chunk = []
        
        for container, container_entities in spatial_groups.items():
            for entity in container_entities:
                current_chunk.append(entity)
                
                if len(current_chunk) >= context.max_entities_per_chunk:
                    chunks.append(current_chunk)
                    current_chunk = []
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks


class EntityBasedChunkingStrategy(ChunkingStrategy):
    """
    Entity-based chunking strategy that groups related building elements.
    
    Creates chunks based on functional relationships between entities,
    such as grouping walls with their doors and windows.
    """
    
    def __init__(self, config: Optional[Config] = None):
        """Initialize entity-based chunking strategy."""
        super().__init__(config)
        self.relationship_weights = {
            RelationshipType.PHYSICAL_CONNECTION: 1.0,
            RelationshipType.PHYSICAL_OPENING: 0.9,
            RelationshipType.SPATIAL_CONTAINMENT: 0.8,
            RelationshipType.FUNCTIONAL_DEPENDENCY: 0.7,
            RelationshipType.ASSEMBLY_COMPOSITION: 0.8
        }
    
    async def chunk_entities(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """
        Chunk entities based on functional relationships.
        
        Groups related building elements while maintaining functional
        relationships like door-wall, window-wall connections.
        """
        logger.info(
            "Starting entity-based chunking",
            entity_count=len(entities)
        )
        
        chunks = []
        processed_entities = set()
        
        try:
            # Find strongly connected components
            entity_clusters = await self._find_entity_clusters(entities, context)
            
            for cluster_id, cluster_entities in entity_clusters.items():
                if not cluster_entities:
                    continue
                
                # Mark entities as processed
                for entity in cluster_entities:
                    processed_entities.add(entity.entity_id)
                
                # Split large clusters
                entity_groups = await self._split_clusters(cluster_entities, context)
                
                for i, entity_group in enumerate(entity_groups):
                    chunk_id = f"entity_cluster_{cluster_id}_{i}" if len(entity_groups) > 1 else f"entity_cluster_{cluster_id}"
                    
                    chunk = self._create_chunk(
                        chunk_id=chunk_id,
                        entities=entity_group,
                        context=context,
                        priority=self._calculate_cluster_priority(entity_group)
                    )
                    
                    chunks.append(chunk)
                    await self._yield_control()
            
            # Handle remaining unprocessed entities
            remaining_entities = [e for e in entities if e.entity_id not in processed_entities]
            if remaining_entities:
                remaining_chunks = await self._chunk_remaining_entities(remaining_entities, context)
                chunks.extend(remaining_chunks)
            
            logger.info(
                "Entity-based chunking completed",
                chunks_created=len(chunks),
                clusters_found=len(entity_clusters)
            )
            
            return chunks
            
        except Exception as e:
            logger.error("Entity-based chunking failed", error=str(e))
            raise IFCChunkingError(f"Entity-based chunking failed: {e}") from e
    
    async def _find_entity_clusters(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> Dict[str, List[IFCEntity]]:
        """Find clusters of related entities using graph analysis."""
        # Build entity similarity graph
        entity_graph = await self._build_entity_similarity_graph(entities, context)
        
        # Find connected components
        clusters = {}
        visited = set()
        cluster_id = 0
        
        for entity in entities:
            if entity.entity_id not in visited:
                cluster = []
                await self._dfs_cluster(entity.entity_id, entity_graph, visited, cluster, entities)
                
                if cluster:
                    clusters[str(cluster_id)] = cluster
                    cluster_id += 1
        
        return clusters
    
    async def _build_entity_similarity_graph(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> Dict[str, Set[str]]:
        """Build a graph of entity similarities based on relationships."""
        similarity_graph = defaultdict(set)
        entity_dict = {e.entity_id: e for e in entities}
        
        for entity in entities:
            relationships = context.relationship_graph.get_entity_relationships(entity.entity_id)
            
            for rel in relationships:
                other_id = rel.get_other_entity(entity.entity_id)
                if other_id and other_id in entity_dict:
                    # Calculate relationship strength
                    strength = self._calculate_relationship_strength(rel, entity_dict[entity.entity_id], entity_dict[other_id])
                    
                    if strength > 0.5:  # Threshold for strong relationships
                        similarity_graph[entity.entity_id].add(other_id)
                        similarity_graph[other_id].add(entity.entity_id)
        
        return dict(similarity_graph)
    
    def _calculate_relationship_strength(
        self, 
        relationship: EntityRelationship, 
        entity1: IFCEntity, 
        entity2: IFCEntity
    ) -> float:
        """Calculate the strength of a relationship between two entities."""
        base_weight = self.relationship_weights.get(relationship.relationship_type, 0.5)
        
        # Adjust based on entity types
        type_compatibility = self._calculate_type_compatibility(entity1, entity2)
        
        # Adjust based on spatial proximity
        spatial_proximity = self._calculate_spatial_proximity(entity1, entity2)
        
        return base_weight * type_compatibility * spatial_proximity
    
    def _calculate_type_compatibility(self, entity1: IFCEntity, entity2: IFCEntity) -> float:
        """Calculate compatibility between entity types."""
        # Define compatible entity type pairs
        compatible_pairs = {
            (IFCEntityType.WALL, IFCEntityType.DOOR): 1.0,
            (IFCEntityType.WALL, IFCEntityType.WINDOW): 1.0,
            (IFCEntityType.BEAM, IFCEntityType.COLUMN): 0.9,
            (IFCEntityType.SLAB, IFCEntityType.BEAM): 0.8,
            (IFCEntityType.SPACE, IFCEntityType.EQUIPMENT): 0.7
        }
        
        pair = (entity1.entity_type, entity2.entity_type)
        reverse_pair = (entity2.entity_type, entity1.entity_type)
        
        return compatible_pairs.get(pair, compatible_pairs.get(reverse_pair, 0.5))
    
    def _calculate_spatial_proximity(self, entity1: IFCEntity, entity2: IFCEntity) -> float:
        """Calculate spatial proximity between entities."""
        # If entities share the same spatial container, they're close
        if (entity1.spatial_container and entity2.spatial_container and 
            entity1.spatial_container == entity2.spatial_container):
            return 1.0
        
        # If they're in the same discipline, they might be related
        if entity1.discipline == entity2.discipline:
            return 0.8
        
        return 0.5  # Default proximity
    
    async def _dfs_cluster(
        self, 
        entity_id: str, 
        graph: Dict[str, Set[str]], 
        visited: Set[str], 
        cluster: List[IFCEntity],
        entities: List[IFCEntity]
    ):
        """Depth-first search to find entity clusters."""
        if entity_id in visited:
            return
        
        visited.add(entity_id)
        
        # Find entity object
        entity = next((e for e in entities if e.entity_id == entity_id), None)
        if entity:
            cluster.append(entity)
        
        # Visit connected entities
        for connected_id in graph.get(entity_id, set()):
            await self._dfs_cluster(connected_id, graph, visited, cluster, entities)
    
    async def _split_clusters(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> List[List[IFCEntity]]:
        """Split large clusters into manageable chunks."""
        if len(entities) <= context.max_entities_per_chunk:
            return [entities]
        
        # Split by maintaining relationship density
        chunks = []
        current_chunk = []
        
        # Sort entities by number of relationships (most connected first)
        sorted_entities = sorted(
            entities, 
            key=lambda e: len(context.relationship_graph.get_entity_relationships(e.entity_id)),
            reverse=True
        )
        
        for entity in sorted_entities:
            current_chunk.append(entity)
            
            if len(current_chunk) >= context.max_entities_per_chunk:
                chunks.append(current_chunk)
                current_chunk = []
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def _calculate_cluster_priority(self, entities: List[IFCEntity]) -> ChunkPriority:
        """Calculate priority for an entity cluster."""
        # Priority based on entity types and relationships
        critical_types = {IFCEntityType.BEAM, IFCEntityType.COLUMN, IFCEntityType.SLAB}
        high_types = {IFCEntityType.WALL, IFCEntityType.ROOF}
        
        critical_count = sum(1 for e in entities if e.entity_type in critical_types)
        high_count = sum(1 for e in entities if e.entity_type in high_types)
        
        if critical_count > 0:
            return ChunkPriority.CRITICAL
        elif high_count > len(entities) * 0.3:
            return ChunkPriority.HIGH
        else:
            return ChunkPriority.MEDIUM
    
    async def _chunk_remaining_entities(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """Chunk entities that weren't part of any cluster."""
        chunks = []
        
        # Group by entity type
        type_groups = defaultdict(list)
        for entity in entities:
            type_groups[entity.entity_type].append(entity)
        
        chunk_id = 0
        for entity_type, type_entities in type_groups.items():
            entity_groups = await self._split_clusters(type_entities, context)
            
            for entity_group in entity_groups:
                chunk = self._create_chunk(
                    chunk_id=f"entity_remaining_{chunk_id}",
                    entities=entity_group,
                    context=context,
                    priority=ChunkPriority.LOW
                )
                chunks.append(chunk)
                chunk_id += 1
        
        return chunks


class PropertyBasedChunkingStrategy(ChunkingStrategy):
    """
    Property-based chunking strategy that groups entities by material types, 
    classifications, and specifications.
    
    Creates chunks based on shared properties like materials, classifications,
    and specification attributes for efficient property-based analysis.
    """
    
    def __init__(self, config: Optional[Config] = None):
        """Initialize property-based chunking strategy."""
        super().__init__(config)
        self.property_weights = {
            "material": 1.0,
            "classification": 0.8,
            "type": 0.7,
            "specification": 0.6,
            "finish": 0.5
        }
    
    async def chunk_entities(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """
        Chunk entities based on shared properties and materials.
        
        Groups entities by material types, classifications, and other
        shared properties for efficient property-based processing.
        """
        logger.info(
            "Starting property-based chunking",
            entity_count=len(entities)
        )
        
        chunks = []
        
        try:
            # Group entities by property similarity
            property_groups = await self._group_by_property_similarity(entities, context)
            
            # Create chunks for each property group
            for group_id, group_entities in property_groups.items():
                if not group_entities:
                    continue
                
                # Split large groups while maintaining property coherence
                entity_groups = await self._split_property_groups(group_entities, context)
                
                for i, entity_group in enumerate(entity_groups):
                    chunk_id = f"property_{group_id}_{i}" if len(entity_groups) > 1 else f"property_{group_id}"
                    
                    # Extract common properties for chunk metadata
                    common_properties = self._extract_common_properties(entity_group)
                    
                    chunk = self._create_chunk(
                        chunk_id=chunk_id,
                        entities=entity_group,
                        context=context,
                        properties_summary=common_properties,
                        priority=self._calculate_property_priority(entity_group, common_properties)
                    )
                    
                    chunks.append(chunk)
                    await self._yield_control()
            
            logger.info(
                "Property-based chunking completed",
                chunks_created=len(chunks),
                property_groups=len(property_groups)
            )
            
            return chunks
            
        except Exception as e:
            logger.error("Property-based chunking failed", error=str(e))
            raise IFCChunkingError(f"Property-based chunking failed: {e}") from e
    
    async def _group_by_property_similarity(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> Dict[str, List[IFCEntity]]:
        """Group entities by property similarity."""
        property_groups = defaultdict(list)
        
        for entity in entities:
            # Create property signature for grouping
            property_signature = await self._create_property_signature(entity)
            property_groups[property_signature].append(entity)
        
        return dict(property_groups)
    
    async def _create_property_signature(self, entity: IFCEntity) -> str:
        """Create a signature based on key properties for grouping."""
        signature_parts = []
        
        # Material signature
        if entity.material:
            signature_parts.append(f"mat_{entity.material.lower().replace(' ', '_')}")
        
        # Classification signature
        if entity.classification:
            signature_parts.append(f"class_{entity.classification.lower().replace(' ', '_')}")
        
        # Entity type signature
        signature_parts.append(f"type_{entity.entity_type.value.lower()}")
        
        # Discipline signature
        signature_parts.append(f"disc_{entity.discipline.value.lower()}")
        
        # Property set signatures
        for pset_name, pset_data in entity.property_sets.items():
            if isinstance(pset_data, dict):
                # Look for key properties
                for prop_name, prop_value in pset_data.items():
                    if prop_name.lower() in ["material", "finish", "specification", "grade", "type"]:
                        signature_parts.append(f"prop_{prop_name.lower()}_{str(prop_value).lower()}")
        
        return "_".join(signature_parts) if signature_parts else "unknown"
    
    async def _split_property_groups(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> List[List[IFCEntity]]:
        """Split large property groups while maintaining coherence."""
        if len(entities) <= context.max_entities_per_chunk:
            return [entities]
        
        # Sub-group by secondary properties to maintain coherence
        sub_groups = defaultdict(list)
        
        for entity in entities:
            # Create sub-grouping key based on spatial location
            sub_key = entity.spatial_container or "no_container"
            sub_groups[sub_key].append(entity)
        
        # Create chunks from sub-groups
        chunks = []
        current_chunk = []
        
        for sub_key, sub_entities in sub_groups.items():
            for entity in sub_entities:
                current_chunk.append(entity)
                
                if len(current_chunk) >= context.max_entities_per_chunk:
                    chunks.append(current_chunk)
                    current_chunk = []
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def _extract_common_properties(self, entities: List[IFCEntity]) -> Dict[str, Any]:
        """Extract common properties across entities in the group."""
        if not entities:
            return {}
        
        common_props = {
            "entity_types": list({e.entity_type.value for e in entities}),
            "disciplines": list({e.discipline.value for e in entities}),
            "materials": list({e.material for e in entities if e.material}),
            "classifications": list({e.classification for e in entities if e.classification}),
            "property_sets": {},
            "statistics": {
                "total_entities": len(entities),
                "material_count": len({e.material for e in entities if e.material}),
                "classification_count": len({e.classification for e in entities if e.classification})
            }
        }
        
        # Find common property sets
        all_pset_names = set()
        for entity in entities:
            all_pset_names.update(entity.property_sets.keys())
        
        for pset_name in all_pset_names:
            entities_with_pset = [e for e in entities if pset_name in e.property_sets]
            if len(entities_with_pset) > len(entities) * 0.5:  # If >50% have this pset
                common_props["property_sets"][pset_name] = {
                    "entity_count": len(entities_with_pset),
                    "percentage": len(entities_with_pset) / len(entities)
                }
        
        return common_props
    
    def _calculate_property_priority(
        self, 
        entities: List[IFCEntity], 
        common_properties: Dict[str, Any]
    ) -> ChunkPriority:
        """Calculate priority based on material and property importance."""
        # High priority for structural materials
        structural_materials = {"concrete", "steel", "timber", "reinforced concrete"}
        materials = {m.lower() for m in common_properties.get("materials", []) if m}
        
        if materials.intersection(structural_materials):
            return ChunkPriority.CRITICAL
        
        # High priority for fire-related properties
        if any("fire" in str(m).lower() for m in materials):
            return ChunkPriority.HIGH
        
        # Medium priority for standard building materials
        building_materials = {"brick", "wood", "glass", "aluminum", "gypsum"}
        if materials.intersection(building_materials):
            return ChunkPriority.MEDIUM
        
        return ChunkPriority.LOW


class GeometricChunkingStrategy(ChunkingStrategy):
    """
    Geometric chunking strategy that groups entities by spatial relationships 
    and proximity.
    
    Creates chunks based on geometric placement information and spatial
    proximity for geometry-aware processing.
    """
    
    def __init__(self, config: Optional[Config] = None):
        """Initialize geometric chunking strategy."""
        super().__init__(config)
        self.proximity_threshold = getattr(config, 'geometric_proximity_threshold', 10.0)  # meters
        self.geometric_weights = {
            "placement": 1.0,
            "orientation": 0.8,
            "size": 0.6,
            "shape": 0.7
        }
    
    async def chunk_entities(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """
        Chunk entities based on geometric relationships and spatial proximity.
        
        Groups entities by spatial relationships, geometric placement,
        and proximity for efficient geometric processing.
        """
        logger.info(
            "Starting geometric chunking",
            entity_count=len(entities),
            proximity_threshold=self.proximity_threshold
        )
        
        chunks = []
        
        try:
            # Filter entities with geometric information
            geometric_entities = [e for e in entities if e.geometry is not None]
            non_geometric_entities = [e for e in entities if e.geometry is None]
            
            if geometric_entities:
                # Group entities by spatial proximity
                proximity_groups = await self._group_by_spatial_proximity(geometric_entities, context)
                
                # Create chunks for each proximity group
                for group_id, group_entities in proximity_groups.items():
                    if not group_entities:
                        continue
                    
                    # Split large groups while maintaining spatial coherence
                    entity_groups = await self._split_geometric_groups(group_entities, context)
                    
                    for i, entity_group in enumerate(entity_groups):
                        chunk_id = f"geometric_{group_id}_{i}" if len(entity_groups) > 1 else f"geometric_{group_id}"
                        
                        # Calculate geometric metadata
                        geometric_metadata = self._calculate_geometric_metadata(entity_group)
                        
                        chunk = self._create_chunk(
                            chunk_id=chunk_id,
                            entities=entity_group,
                            context=context,
                            metadata=geometric_metadata,
                            priority=self._calculate_geometric_priority(entity_group)
                        )
                        
                        chunks.append(chunk)
                        await self._yield_control()
            
            # Handle non-geometric entities separately
            if non_geometric_entities:
                non_geometric_chunks = await self._chunk_non_geometric_entities(
                    non_geometric_entities, context
                )
                chunks.extend(non_geometric_chunks)
            
            logger.info(
                "Geometric chunking completed",
                chunks_created=len(chunks),
                geometric_entities=len(geometric_entities),
                non_geometric_entities=len(non_geometric_entities)
            )
            
            return chunks
            
        except Exception as e:
            logger.error("Geometric chunking failed", error=str(e))
            raise IFCChunkingError(f"Geometric chunking failed: {e}") from e
    
    async def _group_by_spatial_proximity(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> Dict[str, List[IFCEntity]]:
        """Group entities by spatial proximity using geometric information."""
        proximity_groups = defaultdict(list)
        
        # Extract spatial coordinates from geometry
        entity_positions = {}
        for entity in entities:
            position = self._extract_position(entity)
            if position:
                entity_positions[entity.entity_id] = position
        
        # Group entities using spatial clustering
        clustered_entities = await self._spatial_clustering(entity_positions, entities)
        
        for cluster_id, cluster_entities in clustered_entities.items():
            proximity_groups[str(cluster_id)] = cluster_entities
        
        return dict(proximity_groups)
    
    def _extract_position(self, entity: IFCEntity) -> Optional[Tuple[float, float, float]]:
        """Extract 3D position from entity geometry."""
        if not entity.geometry:
            return None
        
        geometry = entity.geometry
        
        # Look for placement information
        if isinstance(geometry, dict):
            # Check for IfcLocalPlacement
            if "placement" in geometry:
                placement = geometry["placement"]
                if isinstance(placement, dict) and "location" in placement:
                    location = placement["location"]
                    if isinstance(location, (list, tuple)) and len(location) >= 3:
                        return (float(location[0]), float(location[1]), float(location[2]))
            
            # Check for direct coordinates
            if "coordinates" in geometry:
                coords = geometry["coordinates"]
                if isinstance(coords, (list, tuple)) and len(coords) >= 3:
                    return (float(coords[0]), float(coords[1]), float(coords[2]))
            
            # Check for origin or center point
            for key in ["origin", "center", "position"]:
                if key in geometry:
                    point = geometry[key]
                    if isinstance(point, (list, tuple)) and len(point) >= 3:
                        return (float(point[0]), float(point[1]), float(point[2]))
        
        return None
    
    async def _spatial_clustering(
        self, 
        entity_positions: Dict[str, Tuple[float, float, float]], 
        entities: List[IFCEntity]
    ) -> Dict[int, List[IFCEntity]]:
        """Perform spatial clustering based on proximity threshold."""
        if not entity_positions:
            # If no positions available, group by spatial container
            container_groups = defaultdict(list)
            for entity in entities:
                container = entity.spatial_container or "no_container"
                container_groups[container].append(entity)
            
            return {i: entities_list for i, entities_list in enumerate(container_groups.values())}
        
        # Simple proximity-based clustering
        clusters = {}
        entity_dict = {e.entity_id: e for e in entities}
        unassigned = set(entity_positions.keys())
        cluster_id = 0
        
        while unassigned:
            # Start new cluster with first unassigned entity
            seed_entity_id = next(iter(unassigned))
            cluster = [entity_dict[seed_entity_id]]
            unassigned.remove(seed_entity_id)
            
            # Find all entities within proximity threshold
            seed_position = entity_positions[seed_entity_id]
            to_check = [seed_entity_id]
            
            while to_check:
                current_id = to_check.pop()
                current_position = entity_positions[current_id]
                
                # Find nearby entities
                nearby_entities = []
                for entity_id in list(unassigned):
                    if self._calculate_distance(current_position, entity_positions[entity_id]) <= self.proximity_threshold:
                        nearby_entities.append(entity_id)
                
                # Add nearby entities to cluster
                for nearby_id in nearby_entities:
                    cluster.append(entity_dict[nearby_id])
                    unassigned.remove(nearby_id)
                    to_check.append(nearby_id)
            
            clusters[cluster_id] = cluster
            cluster_id += 1
        
        return clusters
    
    def _calculate_distance(
        self, 
        pos1: Tuple[float, float, float], 
        pos2: Tuple[float, float, float]
    ) -> float:
        """Calculate 3D Euclidean distance between two positions."""
        return ((pos1[0] - pos2[0]) ** 2 + (pos1[1] - pos2[1]) ** 2 + (pos1[2] - pos2[2]) ** 2) ** 0.5
    
    async def _split_geometric_groups(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> List[List[IFCEntity]]:
        """Split large geometric groups while maintaining spatial coherence."""
        if len(entities) <= context.max_entities_per_chunk:
            return [entities]
        
        # Sort by entity type to maintain some coherence
        sorted_entities = sorted(entities, key=lambda e: e.entity_type.value)
        
        # Split into chunks
        chunks = []
        current_chunk = []
        
        for entity in sorted_entities:
            current_chunk.append(entity)
            
            if len(current_chunk) >= context.max_entities_per_chunk:
                chunks.append(current_chunk)
                current_chunk = []
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def _calculate_geometric_metadata(self, entities: List[IFCEntity]) -> Dict[str, Any]:
        """Calculate geometric metadata for entities."""
        metadata = {
            "has_geometry": sum(1 for e in entities if e.geometry is not None),
            "entity_types": list({e.entity_type.value for e in entities}),
            "spatial_distribution": {},
            "geometry_complexity": 0.0
        }
        
        # Calculate spatial bounds
        positions = []
        for entity in entities:
            position = self._extract_position(entity)
            if position:
                positions.append(position)
        
        if positions:
            x_coords = [p[0] for p in positions]
            y_coords = [p[1] for p in positions]
            z_coords = [p[2] for p in positions]
            
            metadata["spatial_distribution"] = {
                "bounds": {
                    "x_min": min(x_coords), "x_max": max(x_coords),
                    "y_min": min(y_coords), "y_max": max(y_coords),
                    "z_min": min(z_coords), "z_max": max(z_coords)
                },
                "center": {
                    "x": sum(x_coords) / len(x_coords),
                    "y": sum(y_coords) / len(y_coords),
                    "z": sum(z_coords) / len(z_coords)
                },
                "entity_count_with_position": len(positions)
            }
        
        # Estimate geometry complexity
        total_complexity = 0
        for entity in entities:
            if entity.geometry:
                # Simple complexity estimation based on geometry data size
                geometry_size = len(str(entity.geometry))
                total_complexity += geometry_size
        
        metadata["geometry_complexity"] = total_complexity / len(entities) if entities else 0.0
        
        return metadata
    
    def _calculate_geometric_priority(self, entities: List[IFCEntity]) -> ChunkPriority:
        """Calculate priority based on geometric complexity and entity importance."""
        # Higher priority for structural elements with complex geometry
        structural_types = {IFCEntityType.BEAM, IFCEntityType.COLUMN, IFCEntityType.SLAB}
        structural_count = sum(1 for e in entities if e.entity_type in structural_types)
        
        # Higher priority for entities with detailed geometry
        complex_geometry_count = sum(
            1 for e in entities 
            if e.geometry and len(str(e.geometry)) > 1000  # Arbitrary complexity threshold
        )
        
        if structural_count > len(entities) * 0.3:
            return ChunkPriority.CRITICAL
        elif complex_geometry_count > len(entities) * 0.5:
            return ChunkPriority.HIGH
        else:
            return ChunkPriority.MEDIUM
    
    async def _chunk_non_geometric_entities(
        self, 
        entities: List[IFCEntity], 
        context: ChunkingContext
    ) -> List[SemanticChunk]:
        """Chunk entities without geometric information."""
        chunks = []
        
        # Group by spatial container for non-geometric entities
        container_groups = defaultdict(list)
        for entity in entities:
            container = entity.spatial_container or "no_container"
            container_groups[container].append(entity)
        
        chunk_id = 0
        for container, container_entities in container_groups.items():
            # Split large groups
            entity_groups = await self._split_geometric_groups(container_entities, context)
            
            for entity_group in entity_groups:
                chunk = self._create_chunk(
                    chunk_id=f"non_geometric_{chunk_id}",
                    entities=entity_group,
                    context=context,
                    metadata={"geometry_type": "none", "spatial_container": container},
                    priority=ChunkPriority.LOW
                )
                chunks.append(chunk)
                chunk_id += 1
        
        return chunks