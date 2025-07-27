"""
IFC relationship mapping and graph analysis for semantic chunking.

This module provides comprehensive relationship mapping capabilities for IFC entities,
enabling the preservation of entity relationships across chunk boundaries and 
supporting relationship-aware semantic chunking strategies.
"""

import asyncio
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set

import structlog

from .exceptions import IFCChunkingError
from .ifc_schema import IFCEntity, IFCEntityType

logger = structlog.get_logger(__name__)


class RelationshipType(Enum):
    """Types of relationships between IFC entities."""

    # Spatial containment relationships
    SPATIAL_CONTAINMENT = "spatial_containment"  # Building contains Floor
    SPATIAL_DECOMPOSITION = "spatial_decomposition"  # Floor decomposes into Spaces

    # Physical relationships
    PHYSICAL_ADJACENCY = "physical_adjacency"  # Wall adjacent to Wall
    PHYSICAL_CONNECTION = "physical_connection"  # Door connected to Wall
    PHYSICAL_OPENING = "physical_opening"  # Window opens in Wall

    # Functional relationships
    FUNCTIONAL_DEPENDENCY = "functional_dependency"  # Equipment depends on Space
    FUNCTIONAL_SERVICE = "functional_service"  # MEP serves Space
    FUNCTIONAL_CONTROL = "functional_control"  # Controller controls Equipment

    # Material relationships
    MATERIAL_ASSIGNMENT = "material_assignment"  # Entity has Material
    MATERIAL_CONSTITUTION = "material_constitution"  # Material constitutes Entity

    # Property relationships
    PROPERTY_ASSIGNMENT = "property_assignment"  # PropertySet assigned to Entity
    PROPERTY_DEFINITION = "property_definition"  # Property defines Entity

    # Classification relationships
    CLASSIFICATION_ASSIGNMENT = "classification_assignment"  # Classification assigned
    TYPE_DEFINITION = "type_definition"  # TypeObject defines Entity

    # Group relationships
    GROUP_MEMBERSHIP = "group_membership"  # Entity belongs to Group
    SYSTEM_MEMBERSHIP = "system_membership"  # Entity belongs to System

    # Assembly relationships
    ASSEMBLY_COMPOSITION = "assembly_composition"  # Assembly composed of Parts
    PART_DECOMPOSITION = "part_decomposition"  # Part of larger Assembly

    # Generic relationships
    ASSOCIATION = "association"  # Generic association
    DEPENDENCY = "dependency"  # Generic dependency
    REFERENCE = "reference"  # Generic reference

    @classmethod
    def from_ifc_relationship(cls, ifc_rel_type: str) -> "RelationshipType":
        """Convert IFC relationship type string to RelationshipType enum."""
        mapping = {
            "IfcRelContainedInSpatialStructure": cls.SPATIAL_CONTAINMENT,
            "IfcRelAggregates": cls.SPATIAL_DECOMPOSITION,
            "IfcRelConnectsElements": cls.PHYSICAL_CONNECTION,
            "IfcRelVoidsElement": cls.PHYSICAL_OPENING,
            "IfcRelFillsElement": cls.PHYSICAL_OPENING,
            "IfcRelAssignsToGroup": cls.GROUP_MEMBERSHIP,
            "IfcRelDefinesByProperties": cls.PROPERTY_ASSIGNMENT,
            "IfcRelDefinesByType": cls.TYPE_DEFINITION,
            "IfcRelAssociatesMaterial": cls.MATERIAL_ASSIGNMENT,
            "IfcRelAssociatesClassification": cls.CLASSIFICATION_ASSIGNMENT,
            "IfcRelServicesBuildings": cls.FUNCTIONAL_SERVICE,
            "IfcRelSequence": cls.DEPENDENCY,
        }

        return mapping.get(ifc_rel_type, cls.ASSOCIATION)


class RelationshipDirection(Enum):
    """Direction of a relationship between entities."""

    BIDIRECTIONAL = "bidirectional"  # A ↔ B
    DIRECTIONAL = "directional"      # A → B
    REVERSE = "reverse"              # A ← B


@dataclass
class EntityRelationship:
    """
    Represents a relationship between two IFC entities.
    
    Encapsulates the type, direction, and context of relationships
    between entities to enable relationship-aware chunking.
    """

    source_entity_id: str
    target_entity_id: str
    relationship_type: RelationshipType
    direction: RelationshipDirection = RelationshipDirection.DIRECTIONAL
    relationship_id: Optional[str] = None  # IFC relationship entity ID
    weight: float = 1.0  # Relationship strength/importance
    properties: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)

    def __post_init__(self):
        """Initialize computed fields after creation."""
        if not self.relationship_id:
            self.relationship_id = f"{self.source_entity_id}_{self.target_entity_id}_{self.relationship_type.value}"

    @classmethod
    def create_spatial_containment(
        cls,
        container_id: str,
        contained_id: str,
        weight: float = 1.0
    ) -> "EntityRelationship":
        """Create a spatial containment relationship."""
        return cls(
            source_entity_id=container_id,
            target_entity_id=contained_id,
            relationship_type=RelationshipType.SPATIAL_CONTAINMENT,
            direction=RelationshipDirection.DIRECTIONAL,
            weight=weight
        )

    @classmethod
    def create_physical_connection(
        cls,
        entity1_id: str,
        entity2_id: str,
        weight: float = 0.8
    ) -> "EntityRelationship":
        """Create a physical connection relationship."""
        return cls(
            source_entity_id=entity1_id,
            target_entity_id=entity2_id,
            relationship_type=RelationshipType.PHYSICAL_CONNECTION,
            direction=RelationshipDirection.BIDIRECTIONAL,
            weight=weight
        )

    @classmethod
    def from_ifc_relationship(
        cls,
        ifc_rel_data: Dict[str, Any],
        source_id: str,
        target_id: str
    ) -> "EntityRelationship":
        """Create relationship from IFC relationship data."""
        rel_type_str = ifc_rel_data.get("type", "")
        rel_type = RelationshipType.from_ifc_relationship(rel_type_str)

        # Determine direction based on relationship type
        bidirectional_types = {
            RelationshipType.PHYSICAL_CONNECTION,
            RelationshipType.PHYSICAL_ADJACENCY,
            RelationshipType.ASSOCIATION
        }

        direction = (RelationshipDirection.BIDIRECTIONAL
                    if rel_type in bidirectional_types
                    else RelationshipDirection.DIRECTIONAL)

        return cls(
            source_entity_id=source_id,
            target_entity_id=target_id,
            relationship_type=rel_type,
            direction=direction,
            relationship_id=ifc_rel_data.get("id"),
            properties=ifc_rel_data.get("properties", {}),
            metadata={"ifc_type": rel_type_str}
        )

    def get_other_entity(self, entity_id: str) -> Optional[str]:
        """Get the other entity ID in this relationship."""
        if entity_id == self.source_entity_id:
            return self.target_entity_id
        elif entity_id == self.target_entity_id:
            return self.source_entity_id
        return None

    def involves_entity(self, entity_id: str) -> bool:
        """Check if this relationship involves the given entity."""
        return entity_id in (self.source_entity_id, self.target_entity_id)

    def is_bidirectional(self) -> bool:
        """Check if this relationship is bidirectional."""
        return self.direction == RelationshipDirection.BIDIRECTIONAL

    def get_strength(self) -> float:
        """Get the relationship strength (weight)."""
        return self.weight

    def to_dict(self) -> Dict[str, Any]:
        """Convert relationship to dictionary representation."""
        return {
            "source_entity_id": self.source_entity_id,
            "target_entity_id": self.target_entity_id,
            "relationship_type": self.relationship_type.value,
            "direction": self.direction.value,
            "relationship_id": self.relationship_id,
            "weight": self.weight,
            "properties": self.properties,
            "metadata": self.metadata,
            "created_at": self.created_at
        }


class RelationshipGraph:
    """
    Graph structure for efficient relationship queries and analysis.
    
    Provides optimized data structures and algorithms for navigating
    and analyzing entity relationships in IFC building data.
    """

    def __init__(self):
        """Initialize the relationship graph."""
        self.relationships: Dict[str, EntityRelationship] = {}
        self.entity_relationships: Dict[str, Set[str]] = defaultdict(set)  # entity_id -> rel_ids
        self.type_index: Dict[RelationshipType, Set[str]] = defaultdict(set)  # type -> rel_ids
        self.adjacency_list: Dict[str, Set[str]] = defaultdict(set)  # entity_id -> connected_entities
        self.reverse_adjacency: Dict[str, Set[str]] = defaultdict(set)  # for directed relationships

        logger.info("RelationshipGraph initialized")

    def add_relationship(self, relationship: EntityRelationship) -> None:
        """
        Add a relationship to the graph.
        
        Args:
            relationship: EntityRelationship to add
        """
        rel_id = relationship.relationship_id
        self.relationships[rel_id] = relationship

        # Update entity relationships index
        self.entity_relationships[relationship.source_entity_id].add(rel_id)
        self.entity_relationships[relationship.target_entity_id].add(rel_id)

        # Update type index
        self.type_index[relationship.relationship_type].add(rel_id)

        # Update adjacency lists
        source_id = relationship.source_entity_id
        target_id = relationship.target_entity_id

        self.adjacency_list[source_id].add(target_id)
        self.reverse_adjacency[target_id].add(source_id)

        # For bidirectional relationships, add reverse connection
        if relationship.is_bidirectional():
            self.adjacency_list[target_id].add(source_id)
            self.reverse_adjacency[source_id].add(target_id)

    def get_relationship(self, relationship_id: str) -> Optional[EntityRelationship]:
        """Get a relationship by ID."""
        return self.relationships.get(relationship_id)

    def get_entity_relationships(self, entity_id: str) -> List[EntityRelationship]:
        """Get all relationships involving an entity."""
        rel_ids = self.entity_relationships.get(entity_id, set())
        return [self.relationships[rel_id] for rel_id in rel_ids]

    def get_relationships_by_type(
        self,
        relationship_type: RelationshipType
    ) -> List[EntityRelationship]:
        """Get all relationships of a specific type."""
        rel_ids = self.type_index.get(relationship_type, set())
        return [self.relationships[rel_id] for rel_id in rel_ids]

    def get_connected_entities(
        self,
        entity_id: str,
        relationship_types: Optional[List[RelationshipType]] = None
    ) -> Set[str]:
        """
        Get entities connected to the given entity.
        
        Args:
            entity_id: ID of the entity to find connections for
            relationship_types: Optional filter for specific relationship types
            
        Returns:
            Set of connected entity IDs
        """
        if relationship_types is None:
            return self.adjacency_list.get(entity_id, set()).copy()

        # Filter by relationship types
        connected = set()
        relationships = self.get_entity_relationships(entity_id)

        for rel in relationships:
            if rel.relationship_type in relationship_types:
                other_entity = rel.get_other_entity(entity_id)
                if other_entity:
                    connected.add(other_entity)

        return connected

    def find_path(
        self,
        source_id: str,
        target_id: str,
        max_depth: int = 5
    ) -> Optional[List[str]]:
        """
        Find the shortest path between two entities.
        
        Args:
            source_id: Starting entity ID
            target_id: Target entity ID
            max_depth: Maximum search depth
            
        Returns:
            List of entity IDs representing the path, or None if no path found
        """
        if source_id == target_id:
            return [source_id]

        visited = set()
        queue = deque([(source_id, [source_id])])

        while queue:
            current_id, path = queue.popleft()

            if len(path) > max_depth:
                continue

            if current_id in visited:
                continue

            visited.add(current_id)

            # Check all connected entities
            for connected_id in self.adjacency_list.get(current_id, set()):
                if connected_id == target_id:
                    return path + [connected_id]

                if connected_id not in visited:
                    queue.append((connected_id, path + [connected_id]))

        return None

    def get_entity_neighborhood(
        self,
        entity_id: str,
        radius: int = 1,
        relationship_types: Optional[List[RelationshipType]] = None
    ) -> Set[str]:
        """
        Get all entities within a given radius of the entity.
        
        Args:
            entity_id: Center entity ID
            radius: Maximum distance (number of hops)
            relationship_types: Optional filter for relationship types
            
        Returns:
            Set of entity IDs within the neighborhood
        """
        neighborhood = {entity_id}
        current_level = {entity_id}

        for _ in range(radius):
            next_level = set()
            for current_entity in current_level:
                connected = self.get_connected_entities(current_entity, relationship_types)
                next_level.update(connected - neighborhood)

            if not next_level:
                break

            neighborhood.update(next_level)
            current_level = next_level

        return neighborhood - {entity_id}  # Exclude the center entity

    def calculate_relationship_strength(
        self,
        entity1_id: str,
        entity2_id: str
    ) -> float:
        """
        Calculate the overall relationship strength between two entities.
        
        Args:
            entity1_id: First entity ID
            entity2_id: Second entity ID
            
        Returns:
            Combined relationship strength (0.0 to 1.0)
        """
        relationships1 = self.get_entity_relationships(entity1_id)
        total_strength = 0.0
        relationship_count = 0

        for rel in relationships1:
            if rel.involves_entity(entity2_id):
                total_strength += rel.get_strength()
                relationship_count += 1

        if relationship_count == 0:
            return 0.0

        # Normalize by number of relationships and apply diminishing returns
        avg_strength = total_strength / relationship_count
        return min(1.0, avg_strength * (1.0 + 0.1 * (relationship_count - 1)))

    def get_strongly_connected_components(self, min_strength: float = 0.5) -> List[Set[str]]:
        """
        Find strongly connected components based on relationship strength.
        
        Args:
            min_strength: Minimum relationship strength threshold
            
        Returns:
            List of sets, each containing entity IDs in a component
        """
        # Build a filtered graph with only strong relationships
        strong_adjacency = defaultdict(set)

        for rel in self.relationships.values():
            if rel.get_strength() >= min_strength:
                strong_adjacency[rel.source_entity_id].add(rel.target_entity_id)
                if rel.is_bidirectional():
                    strong_adjacency[rel.target_entity_id].add(rel.source_entity_id)

        # Find connected components using DFS
        visited = set()
        components = []

        def dfs(entity_id: str, component: Set[str]):
            if entity_id in visited:
                return
            visited.add(entity_id)
            component.add(entity_id)

            for connected_id in strong_adjacency.get(entity_id, set()):
                dfs(connected_id, component)

        for entity_id in strong_adjacency:
            if entity_id not in visited:
                component = set()
                dfs(entity_id, component)
                if component:
                    components.append(component)

        return components

    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive graph statistics."""
        type_counts = {
            rel_type.value: len(rel_ids)
            for rel_type, rel_ids in self.type_index.items()
        }

        # Calculate average connectivity
        total_connections = sum(len(connections) for connections in self.adjacency_list.values())
        avg_connectivity = total_connections / len(self.adjacency_list) if self.adjacency_list else 0

        return {
            "total_relationships": len(self.relationships),
            "total_entities": len(self.entity_relationships),
            "relationship_types": type_counts,
            "average_connectivity": avg_connectivity,
            "max_connectivity": max(len(connections) for connections in self.adjacency_list.values()) if self.adjacency_list else 0
        }


class RelationshipMapper:
    """
    Builds and manages entity relationship graphs from IFC data.
    
    Provides high-level functionality for creating relationship graphs
    from IFC entities and relationship data, with support for various
    analysis and query operations.
    """

    def __init__(self):
        """Initialize the relationship mapper."""
        self.graph = RelationshipGraph()
        self.entities: Dict[str, IFCEntity] = {}

        logger.info("RelationshipMapper initialized")

    async def build_relationship_graph(
        self,
        entities: List[IFCEntity],
        relationship_data: Dict[str, Dict[str, Any]]
    ) -> RelationshipGraph:
        """
        Build a comprehensive relationship graph from entities and relationship data.
        
        Args:
            entities: List of IFC entities
            relationship_data: Dictionary of IFC relationship entities
            
        Returns:
            Populated RelationshipGraph
            
        Raises:
            IFCChunkingError: If graph building fails
        """
        logger.info(
            "Building relationship graph",
            entity_count=len(entities),
            relationship_count=len(relationship_data)
        )

        try:
            # Store entities for reference
            for entity in entities:
                self.entities[entity.entity_id] = entity

            # Process explicit IFC relationships
            await self._process_ifc_relationships(relationship_data)

            # Infer implicit relationships
            await self._infer_implicit_relationships()

            # Calculate relationship weights
            await self._calculate_relationship_weights()

            logger.info(
                "Relationship graph built successfully",
                graph_stats=self.graph.get_stats()
            )

            return self.graph

        except Exception as e:
            logger.error("Failed to build relationship graph", error=str(e))
            raise IFCChunkingError(f"Failed to build relationship graph: {e}") from e

    async def _process_ifc_relationships(
        self,
        relationship_data: Dict[str, Dict[str, Any]]
    ) -> None:
        """Process explicit IFC relationship entities."""
        processed_count = 0

        for rel_id, rel_data in relationship_data.items():
            try:
                relationships = await self._parse_ifc_relationship(rel_id, rel_data)
                for relationship in relationships:
                    self.graph.add_relationship(relationship)
                    processed_count += 1

                # Yield control periodically
                if processed_count % 50 == 0:
                    await asyncio.sleep(0)

            except Exception as e:
                logger.warning(
                    "Failed to process relationship",
                    relationship_id=rel_id,
                    error=str(e)
                )

        logger.info(f"Processed {processed_count} explicit relationships")

    async def _parse_ifc_relationship(
        self,
        rel_id: str,
        rel_data: Dict[str, Any]
    ) -> List[EntityRelationship]:
        """Parse a single IFC relationship entity into EntityRelationship objects."""
        relationships = []
        rel_type = rel_data.get("type", "")

        # Handle different IFC relationship patterns
        if rel_type == "IfcRelContainedInSpatialStructure":
            relationships.extend(
                await self._parse_spatial_containment(rel_id, rel_data)
            )
        elif rel_type == "IfcRelAggregates":
            relationships.extend(
                await self._parse_aggregation(rel_id, rel_data)
            )
        elif rel_type in ["IfcRelConnectsElements", "IfcRelConnectsPathElements"]:
            relationships.extend(
                await self._parse_element_connection(rel_id, rel_data)
            )
        elif rel_type == "IfcRelDefinesByProperties":
            relationships.extend(
                await self._parse_property_assignment(rel_id, rel_data)
            )
        else:
            # Generic relationship parsing
            relationships.extend(
                await self._parse_generic_relationship(rel_id, rel_data)
            )

        return relationships

    async def _parse_spatial_containment(
        self,
        rel_id: str,
        rel_data: Dict[str, Any]
    ) -> List[EntityRelationship]:
        """Parse IfcRelContainedInSpatialStructure relationships."""
        relationships = []

        relating_structure = rel_data.get("RelatingStructure")
        related_elements = rel_data.get("RelatedElements", [])

        if relating_structure and related_elements:
            for element_id in related_elements:
                if element_id in self.entities:
                    relationship = EntityRelationship.create_spatial_containment(
                        container_id=relating_structure,
                        contained_id=element_id,
                        weight=0.9  # High weight for spatial containment
                    )
                    relationship.relationship_id = f"{rel_id}_{element_id}"
                    relationships.append(relationship)

        return relationships

    async def _parse_aggregation(
        self,
        rel_id: str,
        rel_data: Dict[str, Any]
    ) -> List[EntityRelationship]:
        """Parse IfcRelAggregates relationships."""
        relationships = []

        relating_object = rel_data.get("RelatingObject")
        related_objects = rel_data.get("RelatedObjects", [])

        if relating_object and related_objects:
            for obj_id in related_objects:
                if obj_id in self.entities:
                    relationship = EntityRelationship(
                        source_entity_id=relating_object,
                        target_entity_id=obj_id,
                        relationship_type=RelationshipType.SPATIAL_DECOMPOSITION,
                        direction=RelationshipDirection.DIRECTIONAL,
                        relationship_id=f"{rel_id}_{obj_id}",
                        weight=0.85
                    )
                    relationships.append(relationship)

        return relationships

    async def _parse_element_connection(
        self,
        rel_id: str,
        rel_data: Dict[str, Any]
    ) -> List[EntityRelationship]:
        """Parse element connection relationships."""
        relationships = []

        relating_element = rel_data.get("RelatingElement")
        related_element = rel_data.get("RelatedElement")

        if relating_element and related_element:
            if relating_element in self.entities and related_element in self.entities:
                relationship = EntityRelationship.create_physical_connection(
                    entity1_id=relating_element,
                    entity2_id=related_element,
                    weight=0.8
                )
                relationship.relationship_id = rel_id
                relationships.append(relationship)

        return relationships

    async def _parse_property_assignment(
        self,
        rel_id: str,
        rel_data: Dict[str, Any]
    ) -> List[EntityRelationship]:
        """Parse property assignment relationships."""
        relationships = []

        related_objects = rel_data.get("RelatedObjects", [])
        relating_property_definition = rel_data.get("RelatingPropertyDefinition")

        if relating_property_definition and related_objects:
            for obj_id in related_objects:
                if obj_id in self.entities:
                    relationship = EntityRelationship(
                        source_entity_id=relating_property_definition,
                        target_entity_id=obj_id,
                        relationship_type=RelationshipType.PROPERTY_ASSIGNMENT,
                        direction=RelationshipDirection.DIRECTIONAL,
                        relationship_id=f"{rel_id}_{obj_id}",
                        weight=0.6
                    )
                    relationships.append(relationship)

        return relationships

    async def _parse_generic_relationship(
        self,
        rel_id: str,
        rel_data: Dict[str, Any]
    ) -> List[EntityRelationship]:
        """Parse generic relationships."""
        relationships = []

        # Try to extract entities from common relationship patterns
        entity_keys = ["RelatingElement", "RelatedElement", "RelatingObject", "RelatedObjects"]

        entities_found = []
        for key in entity_keys:
            value = rel_data.get(key)
            if value:
                if isinstance(value, list):
                    entities_found.extend(value)
                else:
                    entities_found.append(value)

        # Create relationships between found entities
        if len(entities_found) >= 2:
            for i, entity1 in enumerate(entities_found):
                for entity2 in entities_found[i+1:]:
                    if entity1 in self.entities and entity2 in self.entities:
                        relationship = EntityRelationship.from_ifc_relationship(
                            rel_data, entity1, entity2
                        )
                        relationship.relationship_id = f"{rel_id}_{entity1}_{entity2}"
                        relationships.append(relationship)

        return relationships

    async def _infer_implicit_relationships(self) -> None:
        """Infer implicit relationships based on entity properties and proximity."""
        logger.info("Inferring implicit relationships")

        # Infer spatial adjacency relationships
        await self._infer_spatial_adjacency()

        # Infer functional relationships
        await self._infer_functional_relationships()

        # Infer material relationships
        await self._infer_material_relationships()

    async def _infer_spatial_adjacency(self) -> None:
        """Infer spatial adjacency relationships between building elements."""
        # Group entities by spatial container
        spatial_groups = defaultdict(list)

        for entity in self.entities.values():
            if entity.spatial_container:
                spatial_groups[entity.spatial_container].append(entity)

        # Create adjacency relationships within each spatial container
        for container_id, contained_entities in spatial_groups.items():
            building_elements = [e for e in contained_entities if e.is_building_element()]

            # Create adjacency relationships between building elements
            for i, entity1 in enumerate(building_elements):
                for entity2 in building_elements[i+1:]:
                    # Infer adjacency based on entity types
                    if self._should_be_adjacent(entity1, entity2):
                        relationship = EntityRelationship(
                            source_entity_id=entity1.entity_id,
                            target_entity_id=entity2.entity_id,
                            relationship_type=RelationshipType.PHYSICAL_ADJACENCY,
                            direction=RelationshipDirection.BIDIRECTIONAL,
                            weight=0.4  # Lower weight for inferred relationships
                        )
                        self.graph.add_relationship(relationship)

    def _should_be_adjacent(self, entity1: IFCEntity, entity2: IFCEntity) -> bool:
        """Determine if two entities should be considered adjacent."""
        # Doors and windows are typically adjacent to walls
        if ((entity1.entity_type == IFCEntityType.DOOR and entity2.entity_type == IFCEntityType.WALL) or
            (entity1.entity_type == IFCEntityType.WALL and entity2.entity_type == IFCEntityType.DOOR) or
            (entity1.entity_type == IFCEntityType.WINDOW and entity2.entity_type == IFCEntityType.WALL) or
            (entity1.entity_type == IFCEntityType.WALL and entity2.entity_type == IFCEntityType.WINDOW)):
            return True

        # Walls can be adjacent to other walls
        if (entity1.entity_type == IFCEntityType.WALL and entity2.entity_type == IFCEntityType.WALL):
            return True

        return False

    async def _infer_functional_relationships(self) -> None:
        """Infer functional relationships between MEP elements and spaces."""
        spaces = [e for e in self.entities.values() if e.entity_type == IFCEntityType.SPACE]
        mep_elements = [e for e in self.entities.values() if e.is_mep_element()]

        # Create functional service relationships
        for space in spaces:
            for mep_element in mep_elements:
                # If MEP element is in the same spatial container as space
                if (space.spatial_container and
                    mep_element.spatial_container == space.spatial_container):

                    relationship = EntityRelationship(
                        source_entity_id=mep_element.entity_id,
                        target_entity_id=space.entity_id,
                        relationship_type=RelationshipType.FUNCTIONAL_SERVICE,
                        direction=RelationshipDirection.DIRECTIONAL,
                        weight=0.6
                    )
                    self.graph.add_relationship(relationship)

    async def _infer_material_relationships(self) -> None:
        """Infer material relationships between entities with similar materials."""
        # Group entities by material
        material_groups = defaultdict(list)

        for entity in self.entities.values():
            if entity.material:
                material_groups[entity.material].append(entity)

        # Create material relationships within each group
        for material, entities in material_groups.items():
            if len(entities) > 1:  # Only if multiple entities share the material
                for i, entity1 in enumerate(entities):
                    for entity2 in entities[i+1:]:
                        relationship = EntityRelationship(
                            source_entity_id=entity1.entity_id,
                            target_entity_id=entity2.entity_id,
                            relationship_type=RelationshipType.MATERIAL_CONSTITUTION,
                            direction=RelationshipDirection.BIDIRECTIONAL,
                            weight=0.3  # Lower weight for material relationships
                        )
                        self.graph.add_relationship(relationship)

    async def _calculate_relationship_weights(self) -> None:
        """Calculate and adjust relationship weights based on various factors."""
        logger.info("Calculating relationship weights")

        for relationship in self.graph.relationships.values():
            # Adjust weight based on relationship type
            base_weight = relationship.weight

            # Spatial relationships are more important
            if relationship.relationship_type in [
                RelationshipType.SPATIAL_CONTAINMENT,
                RelationshipType.SPATIAL_DECOMPOSITION
            ]:
                relationship.weight = min(1.0, base_weight * 1.2)

            # Physical connections are also important
            elif relationship.relationship_type in [
                RelationshipType.PHYSICAL_CONNECTION,
                RelationshipType.PHYSICAL_OPENING
            ]:
                relationship.weight = min(1.0, base_weight * 1.1)

            # Property and classification relationships are less critical
            elif relationship.relationship_type in [
                RelationshipType.PROPERTY_ASSIGNMENT,
                RelationshipType.CLASSIFICATION_ASSIGNMENT
            ]:
                relationship.weight = max(0.1, base_weight * 0.8)

    def get_relationship_graph(self) -> RelationshipGraph:
        """Get the built relationship graph."""
        return self.graph

    def get_entity_relationship_summary(self, entity_id: str) -> Dict[str, Any]:
        """
        Get a comprehensive summary of an entity's relationships.
        
        Args:
            entity_id: ID of the entity to analyze
            
        Returns:
            Dictionary containing relationship summary
        """
        if entity_id not in self.entities:
            return {}

        entity = self.entities[entity_id]
        relationships = self.graph.get_entity_relationships(entity_id)

        # Group relationships by type
        relationships_by_type = defaultdict(list)
        for rel in relationships:
            relationships_by_type[rel.relationship_type].append(rel)

        # Calculate connectivity metrics
        connected_entities = self.graph.get_connected_entities(entity_id)
        neighborhood = self.graph.get_entity_neighborhood(entity_id, radius=2)

        return {
            "entity": entity.to_dict() if hasattr(entity, 'to_dict') else str(entity),
            "total_relationships": len(relationships),
            "relationships_by_type": {
                rel_type.value: len(rels)
                for rel_type, rels in relationships_by_type.items()
            },
            "direct_connections": len(connected_entities),
            "neighborhood_size": len(neighborhood),
            "average_relationship_strength": (
                sum(rel.weight for rel in relationships) / len(relationships)
                if relationships else 0.0
            ),
            "strongest_connections": [
                {
                    "target_entity": rel.get_other_entity(entity_id),
                    "relationship_type": rel.relationship_type.value,
                    "strength": rel.weight
                }
                for rel in sorted(relationships, key=lambda r: r.weight, reverse=True)[:5]
            ]
        }
