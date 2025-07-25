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


class IFCEntityType(Enum):
    """Common IFC entity types for building components."""
    
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
    
    # Relationships
    REL_CONTAINED_IN_SPATIAL = "IfcRelContainedInSpatialStructure"
    REL_AGGREGATES = "IfcRelAggregates"
    REL_ASSIGNS_TO_GROUP = "IfcRelAssignsToGroup"
    REL_DEFINES_BY_PROPERTIES = "IfcRelDefinesByProperties"
    
    # Other
    UNKNOWN = "Unknown"

    @classmethod
    def from_string(cls, type_str: str) -> "IFCEntityType":
        """Convert string to IFCEntityType enum."""
        for entity_type in cls:
            if entity_type.value.lower() == type_str.lower():
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
    
    def get_building_decomposition(self) -> Dict[str, Dict[str, Any]]:
        """
        Get complete building decomposition structure for all buildings.
        
        Returns:
            Dictionary mapping building IDs to their complete decomposition
        """
        decomposition = {}
        
        # Find all buildings (level 1 entities)
        buildings = self.get_entities_at_level(1)
        
        for building_id in buildings:
            decomposition[building_id] = self._get_entity_decomposition(building_id)
        
        return decomposition
    
    def _get_entity_decomposition(self, entity_id: str) -> Dict[str, Any]:
        """Get the complete decomposition structure for an entity."""
        children = self.get_children(entity_id)
        
        decomposition = {
            "entity_id": entity_id,
            "children": {},
            "child_count": len(children),
            "descendant_count": len(self.get_descendants(entity_id))
        }
        
        for child_id in children:
            decomposition["children"][child_id] = self._get_entity_decomposition(child_id)
        
        return decomposition
    
    def find_entities_by_hierarchy_pattern(
        self, 
        pattern: List[int]
    ) -> List[List[str]]:
        """
        Find entity paths that match a specific hierarchy pattern.
        
        Args:
            pattern: List of hierarchy levels to match (e.g., [0, 1, 2] for Site→Building→Floor)
            
        Returns:
            List of entity ID paths matching the pattern
        """
        matching_paths = []
        
        def find_paths_recursive(current_path: List[str], remaining_pattern: List[int]):
            if not remaining_pattern:
                matching_paths.append(current_path.copy())
                return
            
            current_level = remaining_pattern[0]
            remaining = remaining_pattern[1:]
            
            if not current_path:
                # Start with root entities
                start_entities = self.get_entities_at_level(current_level)
                for entity_id in start_entities:
                    find_paths_recursive([entity_id], remaining)
            else:
                # Continue from current path
                last_entity = current_path[-1]
                children = self.get_children(last_entity)
                
                for child_id in children:
                    # Check if child is at the expected level
                    child_entities_at_level = self.get_entities_at_level(current_level)
                    if child_id in child_entities_at_level:
                        find_paths_recursive(current_path + [child_id], remaining)
        
        find_paths_recursive([], pattern)
        return matching_paths
    
    def get_spatial_siblings(self, entity_id: str) -> List[str]:
        """Get entities at the same spatial level with the same parent."""
        parent_id = self.get_parent(entity_id)
        if not parent_id:
            return []
        
        siblings = self.get_children(parent_id)
        return [sibling_id for sibling_id in siblings if sibling_id != entity_id]
    
    def validate_hierarchy_integrity(self) -> Dict[str, Any]:
        """
        Validate the integrity of the spatial hierarchy.
        
        Returns:
            Dictionary with validation results and any issues found
        """
        issues = []
        
        # Check for orphaned entities (entities with missing parents)
        orphaned_entities = []
        for entity_id, parent_id in self.reverse_hierarchy.items():
            if parent_id not in self.hierarchy_map:
                orphaned_entities.append(entity_id)
        
        if orphaned_entities:
            issues.append({
                "type": "orphaned_entities",
                "count": len(orphaned_entities),
                "entities": orphaned_entities[:10]  # Show first 10
            })
        
        # Check for circular references
        circular_refs = []
        visited = set()
        
        def check_circular(entity_id: str, path: Set[str]) -> bool:
            if entity_id in path:
                return True
            if entity_id in visited:
                return False
            
            visited.add(entity_id)
            path.add(entity_id)
            
            children = self.get_children(entity_id)
            for child_id in children:
                if check_circular(child_id, path.copy()):
                    circular_refs.append(entity_id)
                    return True
            
            return False
        
        for root_id in self.root_entities:
            check_circular(root_id, set())
        
        if circular_refs:
            issues.append({
                "type": "circular_references",
                "count": len(circular_refs),
                "entities": circular_refs
            })
        
        # Check hierarchy level consistency
        level_inconsistencies = []
        for level, entities in self.entities_by_level.items():
            for entity_id in entities:
                parent_id = self.get_parent(entity_id)
                if parent_id:
                    # Parent should be at a lower level number
                    parent_level = None
                    for lvl, lvl_entities in self.entities_by_level.items():
                        if parent_id in lvl_entities:
                            parent_level = lvl
                            break
                    
                    if parent_level is not None and parent_level >= level:
                        level_inconsistencies.append({
                            "entity_id": entity_id,
                            "level": level,
                            "parent_id": parent_id,
                            "parent_level": parent_level
                        })
        
        if level_inconsistencies:
            issues.append({
                "type": "level_inconsistencies",
                "count": len(level_inconsistencies),
                "examples": level_inconsistencies[:5]
            })
        
        return {
            "is_valid": len(issues) == 0,
            "total_issues": len(issues),
            "issues": issues,
            "statistics": {
                "total_entities": sum(len(entities) for entities in self.entities_by_level.values()),
                "root_entities": len(self.root_entities),
                "max_depth": self.get_max_depth(),
                "levels_populated": len(self.entities_by_level)
            }
        }


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
        spatial_entities_added = 0
        for entity in self.entities.values():
            if entity.is_spatial_element():
                self.hierarchy.add_entity(entity)
                spatial_entities_added += 1
        
        # Second pass: Process containment relationships
        await self._process_containment_relationships()
        
        # Third pass: Add non-spatial entities to their containers
        non_spatial_entities_added = 0
        for entity in self.entities.values():
            if not entity.is_spatial_element():
                # Find spatial container for this entity
                container_id = await self._find_spatial_container(entity)
                if container_id:
                    entity.spatial_container = container_id
                    self.hierarchy.add_entity(entity)
                    non_spatial_entities_added += 1
        
        # Fourth pass: Handle complex spatial structures and multiple buildings
        await self._process_complex_spatial_structures()
        
        # Fifth pass: Validate and fix hierarchy integrity
        validation_result = self.hierarchy.validate_hierarchy_integrity()
        if not validation_result["is_valid"]:
            logger.warning(
                "Hierarchy integrity issues detected",
                issues=validation_result["total_issues"],
                issue_types=[issue["type"] for issue in validation_result["issues"]]
            )
            await self._repair_hierarchy_issues(validation_result["issues"])
        
        logger.info(
            "Spatial hierarchy built",
            spatial_entities=spatial_entities_added,
            non_spatial_entities=non_spatial_entities_added,
            root_entities=len(self.hierarchy.root_entities),
            hierarchy_levels=len(self.hierarchy.entities_by_level),
            max_depth=self.hierarchy.get_max_depth(),
            is_valid=validation_result["is_valid"]
        )
    
    async def _process_complex_spatial_structures(self) -> None:
        """Handle complex spatial structures and multiple buildings."""
        logger.info("Processing complex spatial structures")
        
        # Handle multiple buildings on a single site
        sites = [entity for entity in self.entities.values() 
                if entity.entity_type == IFCEntityType.SITE]
        
        for site in sites:
            # Find buildings that should be under this site
            buildings = [entity for entity in self.entities.values()
                        if (entity.entity_type == IFCEntityType.BUILDING and 
                            entity.spatial_container is None)]
            
            # If we have buildings without a site container, assign them
            for building in buildings:
                if not building.spatial_container:
                    building.spatial_container = site.entity_id
                    self.hierarchy.add_entity(building)
        
        # Handle building complexes (multiple buildings)
        building_groups = await self._identify_building_groups()
        for group_id, buildings in building_groups.items():
            logger.info(f"Identified building group {group_id} with {len(buildings)} buildings")
    
    async def _identify_building_groups(self) -> Dict[str, List[IFCEntity]]:
        """Identify groups of related buildings (building complexes)."""
        building_groups = {}
        
        buildings = [entity for entity in self.entities.values() 
                    if entity.entity_type == IFCEntityType.BUILDING]
        
        # Simple grouping by site container
        for building in buildings:
            site_id = building.spatial_container or "default_site"
            if site_id not in building_groups:
                building_groups[site_id] = []
            building_groups[site_id].append(building)
        
        return building_groups
    
    async def _repair_hierarchy_issues(self, issues: List[Dict[str, Any]]) -> None:
        """Attempt to repair hierarchy integrity issues."""
        for issue in issues:
            issue_type = issue["type"]
            
            if issue_type == "orphaned_entities":
                await self._repair_orphaned_entities(issue["entities"])
            elif issue_type == "level_inconsistencies":
                await self._repair_level_inconsistencies(issue["examples"])
            # Note: Circular references are more complex and may require manual intervention
    
    async def _repair_orphaned_entities(self, orphaned_entities: List[str]) -> None:
        """Attempt to repair orphaned entities by finding appropriate parents."""
        for entity_id in orphaned_entities:
            if entity_id in self.entities:
                entity = self.entities[entity_id]
                
                # Try to find an appropriate spatial container
                container_id = await self._find_spatial_container(entity)
                if container_id and container_id in self.entities:
                    entity.spatial_container = container_id
                    self.hierarchy.add_entity(entity)
                    logger.info(f"Repaired orphaned entity {entity_id} by assigning to {container_id}")
    
    async def _repair_level_inconsistencies(self, inconsistencies: List[Dict[str, Any]]) -> None:
        """Attempt to repair level inconsistencies."""
        for inconsistency in inconsistencies:
            entity_id = inconsistency["entity_id"]
            parent_id = inconsistency["parent_id"]
            
            # Remove the problematic relationship and try to reassign
            if entity_id in self.hierarchy.reverse_hierarchy:
                del self.hierarchy.reverse_hierarchy[entity_id]
            
            if parent_id in self.hierarchy.hierarchy_map:
                self.hierarchy.hierarchy_map[parent_id] = [
                    child for child in self.hierarchy.hierarchy_map[parent_id] 
                    if child != entity_id
                ]
            
            # Try to find a better parent
            if entity_id in self.entities:
                entity = self.entities[entity_id]
                container_id = await self._find_spatial_container(entity)
                if container_id and container_id != parent_id:
                    entity.spatial_container = container_id
                    self.hierarchy.add_entity(entity)
                    logger.info(f"Repaired level inconsistency for {entity_id}")
    
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
    
    def get_building_hierarchy_summary(self) -> Dict[str, Any]:
        """
        Get a comprehensive summary of the entire building hierarchy.
        
        Returns:
            Dictionary containing hierarchy statistics and structure overview
        """
        # Get all buildings and their decomposition
        building_decomposition = self.hierarchy.get_building_decomposition()
        
        # Calculate statistics by level
        level_stats = {}
        for level, entity_ids in self.hierarchy.entities_by_level.items():
            entities = [self.entities[eid] for eid in entity_ids if eid in self.entities]
            
            level_stats[level] = {
                "count": len(entities),
                "entity_types": {},
                "disciplines": {}
            }
            
            # Count by entity type
            for entity in entities:
                entity_type = entity.entity_type.value
                if entity_type not in level_stats[level]["entity_types"]:
                    level_stats[level]["entity_types"][entity_type] = 0
                level_stats[level]["entity_types"][entity_type] += 1
                
                # Count by discipline
                discipline = entity.discipline.value
                if discipline not in level_stats[level]["disciplines"]:
                    level_stats[level]["disciplines"][discipline] = 0
                level_stats[level]["disciplines"][discipline] += 1
        
        # Validation results
        validation_result = self.hierarchy.validate_hierarchy_integrity()
        
        return {
            "total_entities": len(self.entities),
            "spatial_hierarchy": {
                "root_entities": len(self.hierarchy.root_entities),
                "max_depth": self.hierarchy.get_max_depth(),
                "levels_populated": len(self.hierarchy.entities_by_level),
                "level_statistics": level_stats
            },
            "building_decomposition": building_decomposition,
            "integrity_validation": validation_result,
            "entity_distribution": {
                "spatial_elements": len([e for e in self.entities.values() if e.is_spatial_element()]),
                "building_elements": len([e for e in self.entities.values() if e.is_building_element()]),
                "mep_elements": len([e for e in self.entities.values() if e.is_mep_element()]),
                "other_elements": len([e for e in self.entities.values() 
                                     if not (e.is_spatial_element() or e.is_building_element() or e.is_mep_element())])
            },
            "discipline_distribution": {
                discipline.value: len([e for e in self.entities.values() if e.discipline == discipline])
                for discipline in Discipline
            }
        }
    
    def export_hierarchy_for_chunking(self) -> Dict[str, Any]:
        """
        Export hierarchy data optimized for semantic chunking strategies.
        
        Returns:
            Dictionary with hierarchy data formatted for chunking algorithms
        """
        return {
            "spatial_structure": self.get_spatial_structure(),
            "entity_relationships": {
                entity_id: {
                    "entity": entity,
                    "spatial_container": entity.spatial_container,
                    "children": self.hierarchy.get_children(entity_id),
                    "level": entity.get_hierarchy_level(),
                    "discipline": entity.discipline.value,
                    "relationships": entity.relationships
                }
                for entity_id, entity in self.entities.items()
            },
            "chunking_metadata": {
                "hierarchy_paths": {
                    entity_id: self.hierarchy.get_hierarchy_path(entity_id)
                    for entity_id in self.entities.keys()
                },
                "building_groups": self.hierarchy.get_building_decomposition(),
                "level_groupings": {
                    level: list(entity_ids)
                    for level, entity_ids in self.hierarchy.entities_by_level.items()
                },
                "discipline_groupings": {
                    discipline.value: [
                        entity.entity_id for entity in self.entities.values()
                        if entity.discipline == discipline
                    ]
                    for discipline in Discipline
                }
            }
        }