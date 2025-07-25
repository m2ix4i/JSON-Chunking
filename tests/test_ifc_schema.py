"""
Tests for IFC schema parsing and hierarchy building components.

This module tests the Phase 1 implementation of the IFC-Aware Semantic Chunking System,
including entity representation, relationship mapping, and spatial hierarchy building.
"""

import pytest
import asyncio
from typing import Dict, Any, List

from ifc_json_chunking.ifc_schema import (
    IFCEntity, IFCEntityType, IFCHierarchy, IFCSchemaParser, Discipline
)
from ifc_json_chunking.relationships import (
    RelationshipType, RelationshipDirection, EntityRelationship, 
    RelationshipGraph, RelationshipMapper
)
from ifc_json_chunking.config import Config


class TestIFCEntity:
    """Test cases for IFCEntity class."""
    
    def test_entity_creation_from_json(self):
        """Test creating IFC entity from JSON data."""
        json_data = {
            "type": "IfcWall",
            "name": "Wall-001",
            "description": "External wall",
            "properties": {"height": 3.0, "width": 0.2},
            "material": "Concrete"
        }
        
        entity = IFCEntity.from_json_data("wall_001", json_data)
        
        assert entity.entity_id == "wall_001"
        assert entity.entity_type == IFCEntityType.WALL
        assert entity.name == "Wall-001"
        assert entity.description == "External wall"
        assert entity.properties["height"] == 3.0
        assert entity.material == "Concrete"
        assert entity.discipline == Discipline.ARCHITECTURAL
    
    def test_entity_type_classification(self):
        """Test entity type classification methods."""
        # Test spatial element
        site_data = {"type": "IfcSite", "name": "Building Site"}
        site = IFCEntity.from_json_data("site_001", site_data)
        assert site.is_spatial_element()
        assert not site.is_building_element()
        assert not site.is_mep_element()
        
        # Test building element
        wall_data = {"type": "IfcWall", "name": "Wall-001"}
        wall = IFCEntity.from_json_data("wall_001", wall_data)
        assert not wall.is_spatial_element()
        assert wall.is_building_element()
        assert not wall.is_mep_element()
        
        # Test MEP element
        pipe_data = {"type": "IfcPipe", "name": "Pipe-001"}
        pipe = IFCEntity.from_json_data("pipe_001", pipe_data)
        assert not pipe.is_spatial_element()
        assert not pipe.is_building_element()
        assert pipe.is_mep_element()
    
    def test_hierarchy_levels(self):
        """Test hierarchy level calculation."""
        test_cases = [
            ("IfcSite", 0),
            ("IfcBuilding", 1),
            ("IfcBuildingStorey", 2),
            ("IfcSpace", 3),
            ("IfcWall", 4),
            ("IfcPipe", 4)
        ]
        
        for entity_type_str, expected_level in test_cases:
            entity_data = {"type": entity_type_str}
            entity = IFCEntity.from_json_data("test", entity_data)
            assert entity.get_hierarchy_level() == expected_level
    
    def test_discipline_classification(self):
        """Test discipline classification from entity types."""
        test_cases = [
            ("IfcWall", Discipline.ARCHITECTURAL),
            ("IfcBeam", Discipline.STRUCTURAL),
            ("IfcColumn", Discipline.STRUCTURAL),
            ("IfcPipe", Discipline.MECHANICAL),
            ("IfcDuct", Discipline.MECHANICAL),
            ("Unknown", Discipline.UNKNOWN)
        ]
        
        for entity_type_str, expected_discipline in test_cases:
            entity_data = {"type": entity_type_str}
            entity = IFCEntity.from_json_data("test", entity_data)
            assert entity.discipline == expected_discipline


class TestIFCHierarchy:
    """Test cases for IFCHierarchy class."""
    
    def setup_method(self):
        """Set up test hierarchy with sample entities."""
        self.hierarchy = IFCHierarchy()
        
        # Create test entities
        self.site = IFCEntity.from_json_data("site_001", {"type": "IfcSite", "name": "Site"})
        self.building = IFCEntity.from_json_data("building_001", {"type": "IfcBuilding", "name": "Building"})
        self.floor = IFCEntity.from_json_data("floor_001", {"type": "IfcBuildingStorey", "name": "Floor 1"})
        self.space = IFCEntity.from_json_data("space_001", {"type": "IfcSpace", "name": "Room 101"})
        self.wall = IFCEntity.from_json_data("wall_001", {"type": "IfcWall", "name": "Wall-001"})
        
        # Set up spatial containment
        self.building.spatial_container = self.site.entity_id
        self.floor.spatial_container = self.building.entity_id
        self.space.spatial_container = self.floor.entity_id
        self.wall.spatial_container = self.space.entity_id
        
        # Add to hierarchy
        for entity in [self.site, self.building, self.floor, self.space, self.wall]:
            self.hierarchy.add_entity(entity)
    
    def test_hierarchy_navigation(self):
        """Test hierarchy navigation methods."""
        # Test children
        children = self.hierarchy.get_children(self.site.entity_id)
        assert self.building.entity_id in children
        
        # Test parent
        parent = self.hierarchy.get_parent(self.building.entity_id)
        assert parent == self.site.entity_id
        
        # Test ancestors
        ancestors = self.hierarchy.get_ancestors(self.wall.entity_id)
        expected_ancestors = [self.space.entity_id, self.floor.entity_id, 
                            self.building.entity_id, self.site.entity_id]
        assert ancestors == expected_ancestors
        
        # Test descendants
        descendants = self.hierarchy.get_descendants(self.site.entity_id)
        expected_descendants = [self.building.entity_id, self.floor.entity_id, 
                              self.space.entity_id, self.wall.entity_id]
        assert set(descendants) == set(expected_descendants)
    
    def test_hierarchy_path(self):
        """Test hierarchy path generation."""
        path = self.hierarchy.get_hierarchy_path(self.wall.entity_id)
        expected_path = [self.site.entity_id, self.building.entity_id, 
                        self.floor.entity_id, self.space.entity_id, self.wall.entity_id]
        assert path == expected_path
    
    def test_entities_by_level(self):
        """Test level-based entity grouping."""
        level_0 = self.hierarchy.get_entities_at_level(0)
        assert self.site.entity_id in level_0
        
        level_4 = self.hierarchy.get_entities_at_level(4)
        assert self.wall.entity_id in level_4
        
        max_depth = self.hierarchy.get_max_depth()
        assert max_depth == 4
    
    def test_building_decomposition(self):
        """Test building decomposition structure."""
        decomposition = self.hierarchy.get_building_decomposition()
        
        # Should have the building in decomposition
        assert self.building.entity_id in decomposition
        
        building_structure = decomposition[self.building.entity_id]
        assert building_structure["entity_id"] == self.building.entity_id
        assert building_structure["child_count"] == 1  # One floor
        assert building_structure["descendant_count"] == 3  # Floor, space, wall
    
    def test_hierarchy_validation(self):
        """Test hierarchy integrity validation."""
        validation_result = self.hierarchy.validate_hierarchy_integrity()
        
        assert validation_result["is_valid"] is True
        assert validation_result["total_issues"] == 0
        assert validation_result["statistics"]["total_entities"] == 5
        assert validation_result["statistics"]["root_entities"] == 1
        assert validation_result["statistics"]["max_depth"] == 4


class TestEntityRelationship:
    """Test cases for EntityRelationship class."""
    
    def test_relationship_creation(self):
        """Test relationship creation methods."""
        # Test spatial containment
        rel = EntityRelationship.create_spatial_containment("building_001", "floor_001", weight=0.9)
        assert rel.source_entity_id == "building_001"
        assert rel.target_entity_id == "floor_001"
        assert rel.relationship_type == RelationshipType.SPATIAL_CONTAINMENT
        assert rel.direction == RelationshipDirection.DIRECTIONAL
        assert rel.weight == 0.9
        
        # Test physical connection
        rel = EntityRelationship.create_physical_connection("wall_001", "door_001", weight=0.8)
        assert rel.relationship_type == RelationshipType.PHYSICAL_CONNECTION
        assert rel.direction == RelationshipDirection.BIDIRECTIONAL
        assert rel.weight == 0.8
    
    def test_relationship_from_ifc_data(self):
        """Test creating relationship from IFC relationship data."""
        ifc_rel_data = {
            "type": "IfcRelContainedInSpatialStructure",
            "id": "rel_001",
            "properties": {"test": "value"}
        }
        
        rel = EntityRelationship.from_ifc_relationship(ifc_rel_data, "building_001", "wall_001")
        assert rel.relationship_type == RelationshipType.SPATIAL_CONTAINMENT
        assert rel.relationship_id == "rel_001"
        assert rel.properties["test"] == "value"
        assert rel.metadata["ifc_type"] == "IfcRelContainedInSpatialStructure"
    
    def test_relationship_utility_methods(self):
        """Test relationship utility methods."""
        rel = EntityRelationship("entity_a", "entity_b", RelationshipType.PHYSICAL_CONNECTION)
        
        # Test get_other_entity
        assert rel.get_other_entity("entity_a") == "entity_b"
        assert rel.get_other_entity("entity_b") == "entity_a"
        assert rel.get_other_entity("entity_c") is None
        
        # Test involves_entity
        assert rel.involves_entity("entity_a") is True
        assert rel.involves_entity("entity_b") is True
        assert rel.involves_entity("entity_c") is False


class TestRelationshipGraph:
    """Test cases for RelationshipGraph class."""
    
    def setup_method(self):
        """Set up test relationship graph."""
        self.graph = RelationshipGraph()
        
        # Create test relationships
        self.rel1 = EntityRelationship.create_spatial_containment("building", "floor", weight=0.9)
        self.rel2 = EntityRelationship.create_spatial_containment("floor", "space", weight=0.9)
        self.rel3 = EntityRelationship.create_physical_connection("wall", "door", weight=0.8)
        
        # Add to graph
        for rel in [self.rel1, self.rel2, self.rel3]:
            self.graph.add_relationship(rel)
    
    def test_graph_queries(self):
        """Test graph query methods."""
        # Test get_entity_relationships
        building_rels = self.graph.get_entity_relationships("building")
        assert len(building_rels) == 1
        assert building_rels[0].relationship_id == self.rel1.relationship_id
        
        # Test get_relationships_by_type
        spatial_rels = self.graph.get_relationships_by_type(RelationshipType.SPATIAL_CONTAINMENT)
        assert len(spatial_rels) == 2
        
        # Test get_connected_entities
        connected = self.graph.get_connected_entities("building")
        assert "floor" in connected
    
    def test_pathfinding(self):
        """Test pathfinding between entities."""
        # Test direct connection
        path = self.graph.find_path("building", "floor")
        assert path == ["building", "floor"]
        
        # Test indirect connection
        path = self.graph.find_path("building", "space")
        assert path == ["building", "floor", "space"]
        
        # Test no connection
        path = self.graph.find_path("building", "door")
        assert path is None
    
    def test_neighborhood_analysis(self):
        """Test neighborhood analysis."""
        # Test immediate neighborhood
        neighborhood = self.graph.get_entity_neighborhood("floor", radius=1)
        expected = {"building", "space"}
        assert neighborhood == expected
        
        # Test extended neighborhood
        neighborhood = self.graph.get_entity_neighborhood("building", radius=2)
        expected = {"floor", "space"}
        assert neighborhood == expected
    
    def test_relationship_strength(self):
        """Test relationship strength calculation."""
        strength = self.graph.calculate_relationship_strength("building", "floor")
        assert strength == 0.9  # Direct relationship with weight 0.9
        
        strength = self.graph.calculate_relationship_strength("building", "wall")
        assert strength == 0.0  # No relationship


class TestIFCSchemaParser:
    """Test cases for IFCSchemaParser class."""
    
    def setup_method(self):
        """Set up test parser."""
        self.parser = IFCSchemaParser(Config())
        
        # Create test entities data
        self.test_entities = [
            IFCEntity.from_json_data("site_001", {"type": "IfcSite", "name": "Site"}),
            IFCEntity.from_json_data("building_001", {"type": "IfcBuilding", "name": "Building"}),
            IFCEntity.from_json_data("floor_001", {"type": "IfcBuildingStorey", "name": "Floor 1"}),
            IFCEntity.from_json_data("wall_001", {"type": "IfcWall", "name": "Wall-001"})
        ]
        
        # Set up spatial containment
        self.test_entities[1].spatial_container = self.test_entities[0].entity_id  # building in site
        self.test_entities[2].spatial_container = self.test_entities[1].entity_id  # floor in building
        self.test_entities[3].spatial_container = self.test_entities[2].entity_id  # wall in floor
        
        # Mock relationship data
        self.test_relationships = {
            "rel_001": {
                "type": "IfcRelContainedInSpatialStructure",
                "RelatingStructure": "site_001",
                "RelatedElements": ["building_001"]
            }
        }
    
    def test_entity_filtering_by_type(self):
        """Test filtering entities by type."""
        # Add entities to parser
        for entity in self.test_entities:
            self.parser.entities[entity.entity_id] = entity
        
        walls = self.parser.get_entities_by_type(IFCEntityType.WALL)
        assert len(walls) == 1
        assert walls[0].entity_id == "wall_001"
        
        buildings = self.parser.get_entities_by_type(IFCEntityType.BUILDING)
        assert len(buildings) == 1
        assert buildings[0].entity_id == "building_001"
    
    def test_entity_filtering_by_discipline(self):
        """Test filtering entities by discipline."""
        # Add entities to parser
        for entity in self.test_entities:
            self.parser.entities[entity.entity_id] = entity
        
        architectural = self.parser.get_entities_by_discipline(Discipline.ARCHITECTURAL)
        architectural_ids = {e.entity_id for e in architectural}
        expected_ids = {"wall_001"}  # Only wall is architectural in our test set
        assert architectural_ids == expected_ids
    
    def test_spatial_structure_export(self):
        """Test spatial structure export."""
        # Add entities to parser
        for entity in self.test_entities:
            self.parser.entities[entity.entity_id] = entity
            self.parser.hierarchy.add_entity(entity)
        
        structure = self.parser.get_spatial_structure()
        
        # Should have site as root
        assert "site_001" in structure
        site_structure = structure["site_001"]
        assert site_structure["type"] == "IfcSite"
        assert len(site_structure["children"]) == 1
        
        # Should have building as child of site
        building_structure = site_structure["children"][0]
        assert building_structure["type"] == "IfcBuilding"
    
    def test_entity_context(self):
        """Test entity context retrieval."""
        # Add entities to parser
        for entity in self.test_entities:
            self.parser.entities[entity.entity_id] = entity
            self.parser.hierarchy.add_entity(entity)
        
        context = self.parser.get_entity_context("wall_001")
        
        assert context["entity"].entity_id == "wall_001"
        assert len(context["hierarchy_path"]) == 4  # site -> building -> floor -> wall
        assert len(context["ancestors"]) == 3  # floor, building, site
        
    def test_hierarchy_summary(self):
        """Test building hierarchy summary."""
        # Add entities to parser
        for entity in self.test_entities:
            self.parser.entities[entity.entity_id] = entity
            self.parser.hierarchy.add_entity(entity)
        
        summary = self.parser.get_building_hierarchy_summary()
        
        assert summary["total_entities"] == 4
        assert summary["spatial_hierarchy"]["root_entities"] == 1
        assert summary["spatial_hierarchy"]["max_depth"] == 4
        assert summary["integrity_validation"]["is_valid"] is True
        
        # Check entity distribution
        distribution = summary["entity_distribution"]
        assert distribution["spatial_elements"] == 3  # site, building, floor
        assert distribution["building_elements"] == 1  # wall


@pytest.mark.asyncio
class TestAsyncFunctionality:
    """Test cases for async functionality."""
    
    async def test_relationship_mapper_build_graph(self):
        """Test RelationshipMapper graph building."""
        mapper = RelationshipMapper()
        
        # Create test entities
        entities = [
            IFCEntity.from_json_data("site_001", {"type": "IfcSite", "name": "Site"}),
            IFCEntity.from_json_data("building_001", {"type": "IfcBuilding", "name": "Building"}),
            IFCEntity.from_json_data("wall_001", {"type": "IfcWall", "name": "Wall"})
        ]
        
        # Create test relationship data
        relationship_data = {
            "rel_001": {
                "type": "IfcRelContainedInSpatialStructure",
                "RelatingStructure": "site_001",
                "RelatedElements": ["building_001"]
            }
        }
        
        # Build graph
        graph = await mapper.build_relationship_graph(entities, relationship_data)
        
        assert isinstance(graph, RelationshipGraph)
        assert len(graph.relationships) > 0
        
        # Check that relationships were created
        site_relationships = graph.get_entity_relationships("site_001")
        assert len(site_relationships) > 0


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])