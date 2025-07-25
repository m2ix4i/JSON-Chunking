"""
IFC Schema understanding and entity parsing for semantic chunking.

This module provides comprehensive IFC schema parsing capabilities, including
entity representation, relationship mapping, and building hierarchy construction
for intelligent semantic chunking of IFC JSON data.
"""

import asyncio
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Any, Optional, Set, Iterator, Tuple
from pathlib import Path

import structlog

from .exceptions import IFCChunkingError, ValidationError
from .config import Config

logger = structlog.get_logger(__name__)


class SpatialElements(Enum):
    """IFC spatial structure elements."""
    SITE = "IfcSite"
    BUILDING = "IfcBuilding"
    BUILDING_STOREY = "IfcBuildingStorey"
    SPACE = "IfcSpace"
    ROOM = "IfcRoom"
    ZONE = "IfcZone"


class ArchitecturalElements(Enum):
    """IFC architectural building elements."""
    WALL = "IfcWall"
    DOOR = "IfcDoor"
    WINDOW = "IfcWindow"
    ROOF = "IfcRoof"
    STAIR = "IfcStair"
    RAMP = "IfcRamp"
    CURTAIN_WALL = "IfcCurtainWall"


class StructuralElements(Enum):
    """IFC structural building elements."""
    BEAM = "IfcBeam"
    COLUMN = "IfcColumn"
    SLAB = "IfcSlab"
    FOOTING = "IfcFooting"
    PILE = "IfcPile"
    PLATE = "IfcPlate"
    MEMBER = "IfcMember"
    REINFORCING_BAR = "IfcReinforcingBar"


class MEPElements(Enum):
    """IFC mechanical, electrical, and plumbing elements."""
    PIPE = "IfcPipe"
    DUCT = "IfcDuct"
    CABLE_CARRIER_FITTING = "IfcCableCarrierFitting"
    FLOW_TERMINAL = "IfcFlowTerminal"
    DISTRIBUTION_ELEMENT = "IfcDistributionElement"
    FLOW_CONTROLLER = "IfcFlowController"
    FLOW_MOVING_DEVICE = "IfcFlowMovingDevice"
    ENERGY_CONVERSION_DEVICE = "IfcEnergyConversionDevice"
    FLOW_STORAGE_DEVICE = "IfcFlowStorageDevice"


class RelationshipTypes(Enum):
    """IFC relationship types."""
    REL_CONTAINED_IN_SPATIAL = "IfcRelContainedInSpatialStructure"
    REL_AGGREGATES = "IfcRelAggregates"
    REL_ASSIGNS_TO_GROUP = "IfcRelAssignsToGroup"
    REL_DEFINES_BY_PROPERTIES = "IfcRelDefinesByProperties"
    REL_CONNECTS_ELEMENTS = "IfcRelConnectsElements"
    REL_CONNECTS_PATH_ELEMENTS = "IfcRelConnectsPathElements"


class IFCEntityRegistry:
    """Registry for all IFC entity types organized by domain."""
    
    # Combine all entity types
    ALL_ENTITIES = {
        **{e.name: e.value for e in SpatialElements},
        **{e.name: e.value for e in ArchitecturalElements},
        **{e.name: e.value for e in StructuralElements},
        **{e.name: e.value for e in MEPElements},
        **{e.name: e.value for e in RelationshipTypes}
    }
    
    # Group by discipline for easy access
    SPATIAL = {e.name: e.value for e in SpatialElements}
    ARCHITECTURAL = {e.name: e.value for e in ArchitecturalElements}
    STRUCTURAL = {e.name: e.value for e in StructuralElements}
    MEP = {e.name: e.value for e in MEPElements}
    RELATIONSHIPS = {e.name: e.value for e in RelationshipTypes}
    
    @classmethod
    def from_string(cls, type_str: str) -> str:
        """Convert string to IFC entity type."""
        # Normalize input
        normalized = type_str.strip()
        
        # Direct match
        for entity_value in cls.ALL_ENTITIES.values():
            if entity_value.lower() == normalized.lower():
                return entity_value
        
        return "Unknown"
    
    @classmethod
    def get_discipline(cls, entity_type: str) -> str:
        """Get discipline for an entity type."""
        if entity_type in cls.SPATIAL.values():
            return "Spatial"
        elif entity_type in cls.ARCHITECTURAL.values():
            return "Architectural"
        elif entity_type in cls.STRUCTURAL.values():
            return "Structural"
        elif entity_type in cls.MEP.values():
            return "MEP"
        elif entity_type in cls.RELATIONSHIPS.values():
            return "Relationship"
        else:
            return "Unknown"


# Maintain backward compatibility
class IFCEntityType(Enum):
    """Common IFC entity types - maintained for backward compatibility."""
    
    # Spatial Structure
    SITE = "IfcSite"
    BUILDING = "IfcBuilding"
    BUILDING_STOREY = "IfcBuildingStorey"
    SPACE = "IfcSpace"
    
    # Building Elements  
    WALL = "IfcWall"
    DOOR = "IfcDoor"
    WINDOW = "IfcWindow"
    SLAB = "IfcSlab"
    BEAM = "IfcBeam"
    COLUMN = "IfcColumn"
    ROOF = "IfcRoof"
    STAIR = "IfcStair"
    
    # MEP Elements
    PIPE = "IfcPipe"
    DUCT = "IfcDuct"
    EQUIPMENT = "IfcFlowTerminal"
    
    # Other
    UNKNOWN = "Unknown"

    @classmethod
    def from_string(cls, type_str: str) -> "IFCEntityType":
        """Convert string to IFCEntityType enum."""
        # Use registry for comprehensive lookup
        entity_value = IFCEntityRegistry.from_string(type_str)
        
        # Map to enum values
        for entity_type in cls:
            if entity_type.value == entity_value:
                return entity_type
        return cls.UNKNOWN


class Discipline(Enum):
    """Building disciplines for entity classification."""
    
    ARCHITECTURAL = "Architectural"
    STRUCTURAL = "Structural"
    MECHANICAL = "Mechanical"
    ELECTRICAL = "Electrical"
    PLUMBING = "Plumbing"
    FIRE_PROTECTION = "Fire Protection"
    UNKNOWN = "Unknown"

    @classmethod
    def from_entity_type(cls, entity_type: IFCEntityType) -> "Discipline":
        """Determine discipline from IFC entity type."""
        structural_types = {IFCEntityType.BEAM, IFCEntityType.COLUMN, IFCEntityType.SLAB}
        mep_types = {IFCEntityType.PIPE, IFCEntityType.DUCT, IFCEntityType.EQUIPMENT}
        architectural_types = {
            IFCEntityType.WALL, IFCEntityType.DOOR, IFCEntityType.WINDOW,
            IFCEntityType.ROOF, IFCEntityType.STAIR, IFCEntityType.SPACE
        }
        
        if entity_type in structural_types:
            return cls.STRUCTURAL
        elif entity_type in mep_types:
            return cls.MECHANICAL
        elif entity_type in architectural_types:
            return cls.ARCHITECTURAL
        else:
            return cls.UNKNOWN


@dataclass
class IFCEntity:
    """
    Represents an individual IFC entity with its properties and relationships.
    
    This class provides a structured representation of IFC building components
    including their type, properties, relationships, and spatial context.
    """
    
    entity_id: str
    entity_type: IFCEntityType
    name: Optional[str] = None
    description: Optional[str] = None
    properties: Dict[str, Any] = field(default_factory=dict)
    property_sets: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    relationships: List[str] = field(default_factory=list)  # IDs of related entities
    spatial_container: Optional[str] = None  # ID of containing spatial element
    contained_elements: Set[str] = field(default_factory=set)  # IDs of contained elements
    geometry: Optional[Dict[str, Any]] = None
    material: Optional[str] = None
    classification: Optional[str] = None
    discipline: Discipline = field(init=False)
    
    def __post_init__(self):
        """Initialize computed fields after creation."""
        self.discipline = Discipline.from_entity_type(self.entity_type)
    
    @classmethod
    def from_json_data(cls, entity_id: str, data: Dict[str, Any]) -> "IFCEntity":
        """
        Create IFCEntity from JSON data.
        
        Args:
            entity_id: Unique identifier for the entity
            data: JSON data containing entity information
            
        Returns:
            IFCEntity instance populated from JSON data
        """
        entity_type_str = data.get("type", "Unknown")
        entity_type = IFCEntityType.from_string(entity_type_str)
        
        return cls(
            entity_id=entity_id,
            entity_type=entity_type,
            name=data.get("name"),
            description=data.get("description"),
            properties=data.get("properties", {}),
            property_sets=data.get("property_sets", {}),
            relationships=data.get("relationships", []),
            spatial_container=data.get("spatial_container"),
            contained_elements=set(data.get("contained_elements", [])),
            geometry=data.get("geometry"),
            material=data.get("material"),
            classification=data.get("classification")
        )
    
    def is_spatial_element(self) -> bool:
        """Check if this entity represents a spatial structure element."""
        spatial_types = {
            IFCEntityType.SITE, IFCEntityType.BUILDING, 
            IFCEntityType.BUILDING_STOREY, IFCEntityType.SPACE
        }
        return self.entity_type in spatial_types
    
    def is_building_element(self) -> bool:
        """Check if this entity represents a building element."""
        building_types = {
            IFCEntityType.WALL, IFCEntityType.DOOR, IFCEntityType.WINDOW,
            IFCEntityType.SLAB, IFCEntityType.BEAM, IFCEntityType.COLUMN,
            IFCEntityType.ROOF, IFCEntityType.STAIR
        }
        return self.entity_type in building_types
    
    def is_mep_element(self) -> bool:
        """Check if this entity represents an MEP element."""
        mep_types = {IFCEntityType.PIPE, IFCEntityType.DUCT, IFCEntityType.EQUIPMENT}
        return self.entity_type in mep_types
    
    def get_hierarchy_level(self) -> int:
        """
        Get the hierarchy level of this entity in the spatial structure.
        
        Returns:
            Integer representing hierarchy level (0=Site, 1=Building, 2=Floor, 3=Space, 4=Element)
        """
        hierarchy_levels = {
            IFCEntityType.SITE: 0,
            IFCEntityType.BUILDING: 1,
            IFCEntityType.BUILDING_STOREY: 2,
            IFCEntityType.SPACE: 3
        }
        
        if self.entity_type in hierarchy_levels:
            return hierarchy_levels[self.entity_type]
        elif self.is_building_element() or self.is_mep_element():
            return 4  # Building elements are at the bottom level
        else:
            return 5  # Unknown elements at the lowest level


@dataclass
class IFCHierarchy:
    """
    Represents the building hierarchy structure from Site to Elements.
    
    Provides methods to navigate and query the spatial containment hierarchy
    of IFC building data, enabling semantic chunking strategies.
    """
    
    root_entities: Dict[str, IFCEntity] = field(default_factory=dict)  # Sites
    hierarchy_map: Dict[str, List[str]] = field(default_factory=dict)  # parent_id -> [child_ids]
    reverse_hierarchy: Dict[str, str] = field(default_factory=dict)  # child_id -> parent_id
    entities_by_level: Dict[int, Set[str]] = field(default_factory=dict)  # level -> entity_ids
    
    def add_entity(self, entity: IFCEntity) -> None:
        """
        Add an entity to the hierarchy.
        
        Args:
            entity: IFCEntity to add to the hierarchy
        """
        level = entity.get_hierarchy_level()
        
        # Add to level mapping
        if level not in self.entities_by_level:
            self.entities_by_level[level] = set()
        self.entities_by_level[level].add(entity.entity_id)
        
        # Handle spatial containment
        if entity.spatial_container:
            # Add to hierarchy map
            if entity.spatial_container not in self.hierarchy_map:
                self.hierarchy_map[entity.spatial_container] = []
            self.hierarchy_map[entity.spatial_container].append(entity.entity_id)
            
            # Add to reverse hierarchy
            self.reverse_hierarchy[entity.entity_id] = entity.spatial_container
        elif entity.is_spatial_element() and level == 0:
            # This is a root entity (Site)
            self.root_entities[entity.entity_id] = entity
    
    def get_children(self, entity_id: str) -> List[str]:
        """Get direct children of an entity."""
        return self.hierarchy_map.get(entity_id, [])
    
    def get_parent(self, entity_id: str) -> Optional[str]:
        """Get parent of an entity."""
        return self.reverse_hierarchy.get(entity_id)
    
    def get_ancestors(self, entity_id: str) -> List[str]:
        """Get all ancestors of an entity up to the root."""
        ancestors = []
        current_id = entity_id
        
        while current_id in self.reverse_hierarchy:
            parent_id = self.reverse_hierarchy[current_id]
            ancestors.append(parent_id)
            current_id = parent_id
        
        return ancestors
    
    def get_descendants(self, entity_id: str) -> List[str]:
        """Get all descendants of an entity."""
        descendants = []
        
        def collect_descendants(current_id: str):
            children = self.get_children(current_id)
            for child_id in children:
                descendants.append(child_id)
                collect_descendants(child_id)
        
        collect_descendants(entity_id)
        return descendants
    
    def get_entities_at_level(self, level: int) -> Set[str]:
        """Get all entity IDs at a specific hierarchy level."""
        return self.entities_by_level.get(level, set())
    
    def get_max_depth(self) -> int:
        """Get the maximum depth of the hierarchy."""
        return max(self.entities_by_level.keys()) if self.entities_by_level else 0
    
    def get_hierarchy_path(self, entity_id: str) -> List[str]:
        """Get the full hierarchy path from root to entity."""
        ancestors = self.get_ancestors(entity_id)
        ancestors.reverse()  # Start from root
        ancestors.append(entity_id)
        return ancestors


class IFCSchemaParser:
    """
    Parser for IFC schema understanding and entity relationship mapping.
    
    This class provides comprehensive parsing capabilities for IFC JSON data,
    extracting entities, relationships, and building the spatial hierarchy
    required for semantic chunking strategies.
    """
    
    def __init__(self, config: Optional[Config] = None):
        """
        Initialize the IFC schema parser.
        
        Args:
            config: Configuration object for parser settings
        """
        self.config = config or Config()
        self.entities: Dict[str, IFCEntity] = {}
        self.hierarchy = IFCHierarchy()
        self.relationship_entities: Dict[str, Dict[str, Any]] = {}
        
        logger.info("IFCSchemaParser initialized", config=str(self.config))
    
    async def parse_entities(self, json_stream: Iterator[Tuple[str, Any]]) -> List[IFCEntity]:
        """
        Parse IFC entities from streaming JSON data.
        
        Args:
            json_stream: Iterator yielding (json_path, value) tuples
            
        Returns:
            List of parsed IFCEntity objects
            
        Raises:
            IFCChunkingError: If parsing fails
        """
        logger.info("Starting IFC entity parsing from stream")
        
        try:
            entity_count = 0
            
            async for json_path, value in self._async_iterator(json_stream):
                # Parse entities from objects section
                if json_path.startswith('objects.') and isinstance(value, dict):
                    entity_id = json_path.split('.')[-1]
                    entity = await self._parse_single_entity(entity_id, value)
                    
                    if entity:
                        self.entities[entity_id] = entity
                        entity_count += 1
                        
                        # Yield control periodically
                        if entity_count % 100 == 0:
                            await asyncio.sleep(0)
                
                # Parse relationship entities separately
                elif self._is_relationship_entity(json_path, value):
                    rel_id = json_path.split('.')[-1]
                    self.relationship_entities[rel_id] = value
            
            # Build hierarchy after parsing all entities
            await self._build_hierarchy()
            
            logger.info(
                "IFC entity parsing completed",
                entities_parsed=len(self.entities),
                relationships_found=len(self.relationship_entities),
                hierarchy_levels=len(self.hierarchy.entities_by_level)
            )
            
            return list(self.entities.values())
            
        except Exception as e:
            logger.error("IFC entity parsing failed", error=str(e))
            raise IFCChunkingError(f"Failed to parse IFC entities: {e}") from e
    
    async def _async_iterator(self, iterator: Iterator) -> Iterator:
        """Convert synchronous iterator to async with yielding."""
        for item in iterator:
            yield item
            await asyncio.sleep(0)  # Yield control
    
    async def _parse_single_entity(self, entity_id: str, data: Dict[str, Any]) -> Optional[IFCEntity]:
        """
        Parse a single IFC entity from JSON data.
        
        Args:
            entity_id: Unique identifier for the entity
            data: JSON data for the entity
            
        Returns:
            Parsed IFCEntity or None if parsing fails
        """
        try:
            # Skip relationship entities (handled separately)
            entity_type_str = data.get("type", "")
            if entity_type_str.startswith("IfcRel"):
                return None
            
            entity = IFCEntity.from_json_data(entity_id, data)
            
            # Extract additional IFC-specific information
            await self._extract_entity_relationships(entity, data)
            await self._extract_property_sets(entity, data)
            
            return entity
            
        except Exception as e:
            logger.warning(
                "Failed to parse entity",
                entity_id=entity_id,
                error=str(e)
            )
            return None
    
    async def _extract_entity_relationships(self, entity: IFCEntity, data: Dict[str, Any]) -> None:
        """Extract relationship information from entity data."""
        # Extract relationships from various IFC attributes
        relationships = data.get("relationships", [])
        
        # Look for common relationship attributes
        for key, value in data.items():
            if key.lower().endswith("_rel") or key.lower().startswith("rel_"):
                if isinstance(value, str):
                    relationships.append(value)
                elif isinstance(value, list):
                    relationships.extend(value)
        
        entity.relationships = list(set(relationships))  # Remove duplicates
    
    async def _extract_property_sets(self, entity: IFCEntity, data: Dict[str, Any]) -> None:
        """Extract property sets from entity data."""
        # Extract property sets (Psets)
        psets = data.get("property_sets", {})
        if isinstance(psets, dict):
            entity.property_sets = psets
        
        # Extract material information
        material_info = data.get("material") or data.get("Material")
        if material_info:
            entity.material = str(material_info)
        
        # Extract classification
        classification = data.get("classification") or data.get("Classification")
        if classification:
            entity.classification = str(classification)
    
    def _is_relationship_entity(self, json_path: str, value: Any) -> bool:
        """Check if this entity represents a relationship."""
        if not isinstance(value, dict):
            return False
        
        entity_type = value.get("type", "")
        return entity_type.startswith("IfcRel")
    
    async def _build_hierarchy(self) -> None:
        """Build the spatial hierarchy from parsed entities and relationships."""
        logger.info("Building IFC spatial hierarchy")
        
        # First pass: Add all spatial entities to hierarchy
        for entity in self.entities.values():
            if entity.is_spatial_element():
                self.hierarchy.add_entity(entity)
        
        # Second pass: Process containment relationships
        await self._process_containment_relationships()
        
        # Third pass: Add non-spatial entities to their containers
        for entity in self.entities.values():
            if not entity.is_spatial_element():
                # Find spatial container for this entity
                container_id = await self._find_spatial_container(entity)
                if container_id:
                    entity.spatial_container = container_id
                    self.hierarchy.add_entity(entity)
        
        logger.info(
            "Spatial hierarchy built",
            root_entities=len(self.hierarchy.root_entities),
            hierarchy_levels=len(self.hierarchy.entities_by_level),
            max_depth=self.hierarchy.get_max_depth()
        )
    
    async def _process_containment_relationships(self) -> None:
        """Process IFC spatial containment relationships."""
        for rel_id, rel_data in self.relationship_entities.items():
            rel_type = rel_data.get("type", "")
            
            if rel_type == "IfcRelContainedInSpatialStructure":
                await self._process_spatial_containment(rel_data)
            elif rel_type == "IfcRelAggregates":
                await self._process_aggregation_relationship(rel_data)
    
    async def _process_spatial_containment(self, rel_data: Dict[str, Any]) -> None:
        """Process IfcRelContainedInSpatialStructure relationships."""
        relating_structure = rel_data.get("RelatingStructure")
        related_elements = rel_data.get("RelatedElements", [])
        
        if relating_structure and related_elements:
            for element_id in related_elements:
                if element_id in self.entities:
                    self.entities[element_id].spatial_container = relating_structure
    
    async def _process_aggregation_relationship(self, rel_data: Dict[str, Any]) -> None:
        """Process IfcRelAggregates relationships."""
        relating_object = rel_data.get("RelatingObject")
        related_objects = rel_data.get("RelatedObjects", [])
        
        if relating_object and related_objects:
            if relating_object in self.entities:
                relating_entity = self.entities[relating_object]
                for obj_id in related_objects:
                    relating_entity.contained_elements.add(obj_id)
                    if obj_id in self.entities:
                        self.entities[obj_id].spatial_container = relating_object
    
    async def _find_spatial_container(self, entity: IFCEntity) -> Optional[str]:
        """Find the spatial container for a non-spatial entity."""
        # First check if already assigned through relationships
        if entity.spatial_container:
            return entity.spatial_container
        
        # Look through relationships to find spatial containment
        for rel_id, rel_data in self.relationship_entities.items():
            rel_type = rel_data.get("type", "")
            
            if rel_type == "IfcRelContainedInSpatialStructure":
                related_elements = rel_data.get("RelatedElements", [])
                if entity.entity_id in related_elements:
                    return rel_data.get("RelatingStructure")
        
        return None
    
    def get_entities_by_type(self, entity_type: IFCEntityType) -> List[IFCEntity]:
        """Get all entities of a specific type."""
        return [entity for entity in self.entities.values() 
                if entity.entity_type == entity_type]
    
    def get_entities_by_discipline(self, discipline: Discipline) -> List[IFCEntity]:
        """Get all entities of a specific discipline."""
        return [entity for entity in self.entities.values() 
                if entity.discipline == discipline]
    
    def get_spatial_structure(self) -> Dict[str, Any]:
        """
        Get the complete spatial structure as a nested dictionary.
        
        Returns:
            Nested dictionary representing the spatial hierarchy
        """
        def build_structure(entity_id: str) -> Dict[str, Any]:
            entity = self.entities.get(entity_id)
            if not entity:
                return {}
            
            structure = {
                "id": entity_id,
                "type": entity.entity_type.value,
                "name": entity.name,
                "children": []
            }
            
            children = self.hierarchy.get_children(entity_id)
            for child_id in children:
                child_structure = build_structure(child_id)
                if child_structure:
                    structure["children"].append(child_structure)
            
            return structure
        
        # Build structure starting from root entities
        spatial_structure = {}
        for root_id, root_entity in self.hierarchy.root_entities.items():
            spatial_structure[root_id] = build_structure(root_id)
        
        return spatial_structure
    
    def get_entity_context(self, entity_id: str) -> Dict[str, Any]:
        """
        Get comprehensive context information for an entity.
        
        Args:
            entity_id: ID of the entity to get context for
            
        Returns:
            Dictionary containing entity context information
        """
        entity = self.entities.get(entity_id)
        if not entity:
            return {}
        
        context = {
            "entity": entity,
            "hierarchy_path": self.hierarchy.get_hierarchy_path(entity_id),
            "ancestors": self.hierarchy.get_ancestors(entity_id),
            "descendants": self.hierarchy.get_descendants(entity_id),
            "related_entities": [],
            "spatial_context": {}
        }
        
        # Add related entities
        for rel_id in entity.relationships:
            if rel_id in self.entities:
                context["related_entities"].append(self.entities[rel_id])
        
        # Add spatial context
        if entity.spatial_container and entity.spatial_container in self.entities:
            context["spatial_context"] = {
                "container": self.entities[entity.spatial_container],
                "siblings": [
                    self.entities[sibling_id] 
                    for sibling_id in self.hierarchy.get_children(entity.spatial_container)
                    if sibling_id != entity_id and sibling_id in self.entities
                ]
            }
        
        return context