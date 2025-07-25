"""
Context management for query processing.

This module provides context preservation and management across
chunk processing operations to maintain query coherence.
"""

import time
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, field
from collections import defaultdict

import structlog

from ..query.types import (
    QueryContext,
    QueryIntent,
    QueryParameters,
    ChunkResult
)
from ..models import Chunk

logger = structlog.get_logger(__name__)


@dataclass
class ContextSnapshot:
    """Snapshot of context at a specific point in time."""
    
    timestamp: float
    step_name: str
    context_data: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "timestamp": self.timestamp,
            "step_name": self.step_name,
            "context_data": self.context_data,
            "metadata": self.metadata
        }


@dataclass
class EntityContext:
    """Context for specific entities across chunks."""
    
    entity_id: str
    entity_type: str
    properties: Dict[str, Any] = field(default_factory=dict)
    relationships: List[Dict[str, Any]] = field(default_factory=list)
    locations: List[str] = field(default_factory=list)  # Chunk IDs where entity appears
    confidence_scores: List[float] = field(default_factory=list)
    
    @property
    def average_confidence(self) -> float:
        """Calculate average confidence across appearances."""
        return sum(self.confidence_scores) / len(self.confidence_scores) if self.confidence_scores else 0.0
    
    def merge_properties(self, new_properties: Dict[str, Any], confidence: float = 1.0) -> None:
        """Merge new properties with existing ones."""
        for key, value in new_properties.items():
            if key not in self.properties:
                self.properties[key] = value
            elif isinstance(value, (int, float)) and isinstance(self.properties[key], (int, float)):
                # For numeric values, take weighted average based on confidence
                current_weight = self.average_confidence
                new_weight = confidence
                total_weight = current_weight + new_weight
                
                if total_weight > 0:
                    self.properties[key] = (
                        (self.properties[key] * current_weight + value * new_weight) / total_weight
                    )
        
        self.confidence_scores.append(confidence)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "properties": self.properties,
            "relationships": self.relationships,
            "locations": self.locations,
            "average_confidence": self.average_confidence
        }


class ContextManager:
    """
    Manages query context and entity relationships across chunk processing.
    
    Provides context preservation, entity tracking, relationship management,
    and cross-chunk coherence for query processing pipelines.
    """
    
    def __init__(self):
        """Initialize context manager."""
        self._contexts: Dict[str, QueryContext] = {}
        self._entity_contexts: Dict[str, Dict[str, EntityContext]] = defaultdict(dict)
        self._context_snapshots: Dict[str, List[ContextSnapshot]] = defaultdict(list)
        self._cross_chunk_relationships: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        
        logger.info("ContextManager initialized")
    
    def create_context(
        self,
        query_id: str,
        original_query: str,
        intent: QueryIntent,
        parameters: QueryParameters,
        confidence_score: float
    ) -> QueryContext:
        """
        Create new query context.
        
        Args:
            query_id: Unique query identifier
            original_query: Original user query
            intent: Detected query intent
            parameters: Extracted query parameters
            confidence_score: Intent classification confidence
            
        Returns:
            Created QueryContext
        """
        context = QueryContext(
            query_id=query_id,
            original_query=original_query,
            intent=intent,
            parameters=parameters,
            confidence_score=confidence_score
        )
        
        self._contexts[query_id] = context
        
        # Create initial snapshot
        self._create_snapshot(
            query_id,
            "context_created",
            context.to_dict()
        )
        
        logger.info(
            "Context created",
            query_id=query_id,
            intent=intent.value,
            confidence=confidence_score
        )
        
        return context
    
    def get_context(self, query_id: str) -> Optional[QueryContext]:
        """Get query context by ID."""
        return self._contexts.get(query_id)
    
    def update_context_with_chunk_result(
        self,
        query_id: str,
        chunk: Chunk,
        result: ChunkResult
    ) -> None:
        """
        Update context with chunk processing result.
        
        Args:
            query_id: Query identifier
            chunk: Processed chunk
            result: Chunk processing result
        """
        if query_id not in self._contexts:
            logger.warning("Context update for unknown query", query_id=query_id)
            return
        
        context = self._contexts[query_id]
        
        # Update basic context
        context.update_context(chunk.chunk_id, {
            "content": result.content,
            "status": result.status,
            "tokens": result.tokens_used,
            "processing_time": result.processing_time,
            "confidence": result.confidence_score
        })
        
        # Extract and merge entities
        self._extract_and_merge_entities(query_id, chunk, result)
        
        # Update cross-chunk relationships
        self._update_cross_chunk_relationships(query_id, chunk, result)
        
        # Create snapshot
        self._create_snapshot(
            query_id,
            f"chunk_processed_{chunk.chunk_id}",
            {
                "chunk_id": chunk.chunk_id,
                "result_status": result.status,
                "entities_extracted": len(result.entities),
                "confidence": result.confidence_score
            }
        )
        
        logger.debug(
            "Context updated with chunk result",
            query_id=query_id,
            chunk_id=chunk.chunk_id,
            entities=len(result.entities)
        )
    
    def _extract_and_merge_entities(
        self,
        query_id: str,
        chunk: Chunk,
        result: ChunkResult
    ) -> None:
        """Extract entities from chunk result and merge with existing context."""
        for entity_data in result.entities:
            entity_id = entity_data.get("id", f"entity_{len(self._entity_contexts[query_id])}")
            entity_type = entity_data.get("type", "unknown")
            
            # Get or create entity context
            if entity_id not in self._entity_contexts[query_id]:
                self._entity_contexts[query_id][entity_id] = EntityContext(
                    entity_id=entity_id,
                    entity_type=entity_type
                )
            
            entity_context = self._entity_contexts[query_id][entity_id]
            
            # Add location
            if chunk.chunk_id not in entity_context.locations:
                entity_context.locations.append(chunk.chunk_id)
            
            # Merge properties
            properties = entity_data.get("properties", {})
            entity_context.merge_properties(properties, result.confidence_score)
            
            # Add relationships
            relationships = entity_data.get("relationships", [])
            for rel in relationships:
                if rel not in entity_context.relationships:
                    entity_context.relationships.append(rel)
    
    def _update_cross_chunk_relationships(
        self,
        query_id: str,
        chunk: Chunk,
        result: ChunkResult
    ) -> None:
        """Update relationships that span across chunks."""
        for relationship in result.relationships:
            # Check if relationship references entities from other chunks
            source_entity = relationship.get("source")
            target_entity = relationship.get("target")
            
            if source_entity and target_entity:
                # Check if entities exist in different chunks
                source_chunks = self._find_entity_chunks(query_id, source_entity)
                target_chunks = self._find_entity_chunks(query_id, target_entity)
                
                # If entities span multiple chunks, it's a cross-chunk relationship
                all_chunks = set(source_chunks + target_chunks + [chunk.chunk_id])
                if len(all_chunks) > 1:
                    cross_chunk_rel = {
                        "source": source_entity,
                        "target": target_entity,
                        "relationship_type": relationship.get("type", "unknown"),
                        "chunks_involved": list(all_chunks),
                        "discovered_in": chunk.chunk_id,
                        "confidence": result.confidence_score
                    }
                    
                    self._cross_chunk_relationships[query_id].append(cross_chunk_rel)
    
    def _find_entity_chunks(self, query_id: str, entity_id: str) -> List[str]:
        """Find chunks where an entity appears."""
        if entity_id in self._entity_contexts[query_id]:
            return self._entity_contexts[query_id][entity_id].locations
        return []
    
    def get_entity_context(self, query_id: str, entity_id: str) -> Optional[EntityContext]:
        """Get entity context for a specific entity."""
        return self._entity_contexts[query_id].get(entity_id)
    
    def get_all_entities(self, query_id: str) -> Dict[str, EntityContext]:
        """Get all entity contexts for a query."""
        return self._entity_contexts[query_id].copy()
    
    def get_cross_chunk_relationships(self, query_id: str) -> List[Dict[str, Any]]:
        """Get all cross-chunk relationships for a query."""
        return self._cross_chunk_relationships[query_id].copy()
    
    def aggregate_entity_information(
        self,
        query_id: str,
        entity_filter: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Aggregate entity information across all chunks.
        
        Args:
            query_id: Query identifier
            entity_filter: Optional list of entity types to include
            
        Returns:
            Aggregated entity information
        """
        entities = self._entity_contexts[query_id]
        
        # Filter entities if requested
        if entity_filter:
            entities = {
                eid: context for eid, context in entities.items()
                if context.entity_type in entity_filter
            }
        
        # Group by entity type
        by_type = defaultdict(list)
        for entity_context in entities.values():
            by_type[entity_context.entity_type].append(entity_context.to_dict())
        
        # Calculate statistics
        total_entities = len(entities)
        average_confidence = (
            sum(e.average_confidence for e in entities.values()) / total_entities
            if total_entities > 0 else 0.0
        )
        
        return {
            "total_entities": total_entities,
            "average_confidence": average_confidence,
            "entities_by_type": dict(by_type),
            "cross_chunk_relationships": self.get_cross_chunk_relationships(query_id),
            "entity_distribution": {
                entity_type: len(entities_list)
                for entity_type, entities_list in by_type.items()
            }
        }
    
    def get_contextual_summary(self, query_id: str) -> Dict[str, Any]:
        """
        Get comprehensive contextual summary for a query.
        
        Args:
            query_id: Query identifier
            
        Returns:
            Contextual summary with all relevant information
        """
        if query_id not in self._contexts:
            return {}
        
        context = self._contexts[query_id]
        entities = self.aggregate_entity_information(query_id)
        
        # Analyze context coherence
        coherence_score = self._calculate_coherence_score(query_id)
        
        # Get processing timeline
        timeline = [snapshot.to_dict() for snapshot in self._context_snapshots[query_id]]
        
        return {
            "query_context": context.to_dict(),
            "entity_analysis": entities,
            "coherence_score": coherence_score,
            "processing_timeline": timeline,
            "context_preservation": {
                "entities_tracked": len(self._entity_contexts[query_id]),
                "cross_chunk_relationships": len(self._cross_chunk_relationships[query_id]),
                "context_snapshots": len(self._context_snapshots[query_id])
            }
        }
    
    def _calculate_coherence_score(self, query_id: str) -> float:
        """Calculate context coherence score across chunks."""
        entities = self._entity_contexts[query_id]
        
        if not entities:
            return 0.0
        
        # Calculate coherence based on:
        # 1. Entity consistency across chunks
        # 2. Relationship completeness
        # 3. Cross-chunk entity references
        
        consistency_scores = []
        for entity_context in entities.values():
            # Entities appearing in multiple chunks with consistent properties
            # indicate good coherence
            location_count = len(entity_context.locations)
            confidence = entity_context.average_confidence
            
            if location_count > 1:
                consistency_score = min(confidence * (location_count / 10), 1.0)
            else:
                consistency_score = confidence * 0.5
            
            consistency_scores.append(consistency_score)
        
        # Average consistency across all entities
        avg_consistency = sum(consistency_scores) / len(consistency_scores)
        
        # Boost score for cross-chunk relationships
        relationship_bonus = min(len(self._cross_chunk_relationships[query_id]) * 0.1, 0.3)
        
        return min(avg_consistency + relationship_bonus, 1.0)
    
    def optimize_context_for_intent(
        self,
        query_id: str,
        target_intent: QueryIntent
    ) -> Dict[str, Any]:
        """
        Optimize context data for specific query intent.
        
        Args:
            query_id: Query identifier
            target_intent: Target query intent
            
        Returns:
            Optimized context data for the intent
        """
        if query_id not in self._contexts:
            return {}
        
        entities = self._entity_contexts[query_id]
        optimized_data = {}
        
        if target_intent == QueryIntent.QUANTITY:
            # Focus on quantitative data
            quantities = {}
            for entity_id, entity_context in entities.items():
                for prop_name, prop_value in entity_context.properties.items():
                    if isinstance(prop_value, (int, float)):
                        quantities[f"{entity_context.entity_type}_{prop_name}"] = prop_value
            
            optimized_data["quantities"] = quantities
            optimized_data["total_entities_by_type"] = defaultdict(int)
            
            for entity_context in entities.values():
                optimized_data["total_entities_by_type"][entity_context.entity_type] += 1
        
        elif target_intent == QueryIntent.COMPONENT:
            # Focus on component identification
            components = {}
            for entity_id, entity_context in entities.items():
                components[entity_id] = {
                    "type": entity_context.entity_type,
                    "properties": entity_context.properties,
                    "locations": entity_context.locations
                }
            
            optimized_data["components"] = components
        
        elif target_intent == QueryIntent.MATERIAL:
            # Focus on material properties
            materials = defaultdict(list)
            for entity_context in entities.values():
                material_props = {
                    k: v for k, v in entity_context.properties.items()
                    if "material" in k.lower() or "density" in k.lower() or "strength" in k.lower()
                }
                if material_props:
                    materials[entity_context.entity_type].append(material_props)
            
            optimized_data["materials"] = dict(materials)
        
        elif target_intent == QueryIntent.SPATIAL:
            # Focus on spatial relationships
            spatial_data = {}
            for entity_id, entity_context in entities.items():
                spatial_props = {
                    k: v for k, v in entity_context.properties.items()
                    if any(spatial_key in k.lower() for spatial_key in ["location", "position", "floor", "room", "zone"])
                }
                if spatial_props:
                    spatial_data[entity_id] = {
                        "type": entity_context.entity_type,
                        "spatial_properties": spatial_props,
                        "chunk_locations": entity_context.locations
                    }
            
            optimized_data["spatial_entities"] = spatial_data
            optimized_data["cross_chunk_relationships"] = self.get_cross_chunk_relationships(query_id)
        
        return optimized_data
    
    def _create_snapshot(
        self,
        query_id: str,
        step_name: str,
        context_data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Create a context snapshot."""
        snapshot = ContextSnapshot(
            timestamp=time.time(),
            step_name=step_name,
            context_data=context_data,
            metadata=metadata or {}
        )
        
        self._context_snapshots[query_id].append(snapshot)
        
        # Limit snapshot history (keep last 50 snapshots)
        if len(self._context_snapshots[query_id]) > 50:
            self._context_snapshots[query_id] = self._context_snapshots[query_id][-50:]
    
    def cleanup_context(self, query_id: str) -> None:
        """Clean up context data for a completed query."""
        self._contexts.pop(query_id, None)
        self._entity_contexts.pop(query_id, None)
        self._context_snapshots.pop(query_id, None)
        self._cross_chunk_relationships.pop(query_id, None)
        
        logger.info("Context cleaned up", query_id=query_id)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get context manager statistics."""
        total_entities = sum(len(entities) for entities in self._entity_contexts.values())
        total_relationships = sum(len(rels) for rels in self._cross_chunk_relationships.values())
        total_snapshots = sum(len(snapshots) for snapshots in self._context_snapshots.values())
        
        return {
            "active_contexts": len(self._contexts),
            "total_entities": total_entities,
            "total_cross_chunk_relationships": total_relationships,
            "total_snapshots": total_snapshots,
            "avg_entities_per_query": total_entities / max(len(self._contexts), 1),
            "avg_relationships_per_query": total_relationships / max(len(self._contexts), 1)
        }