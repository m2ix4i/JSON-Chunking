#!/usr/bin/env python3
"""
Simple validation script for Phase 1 IFC Schema implementation.

This script validates that the Phase 1 components (IFC Schema Parser, 
Relationship Mapping, and Building Hierarchy Builder) are working correctly
without requiring complex test infrastructure.
"""

import sys
import os
import asyncio

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from ifc_json_chunking.ifc_schema import (
    IFCEntity, IFCEntityType, IFCHierarchy, IFCSchemaParser, Discipline
)
from ifc_json_chunking.relationships import (
    RelationshipType, RelationshipDirection, EntityRelationship, 
    RelationshipGraph, RelationshipMapper
)
from ifc_json_chunking.config import Config


def test_ifc_entity_creation():
    """Test IFC entity creation and basic functionality."""
    print("Testing IFC Entity creation...")
    
    # Test entity creation from JSON
    wall_data = {
        "type": "IfcWall",
        "name": "Wall-001", 
        "description": "External wall",
        "properties": {"height": 3.0, "width": 0.2},
        "material": "Concrete"
    }
    
    wall = IFCEntity.from_json_data("wall_001", wall_data)
    
    # Validate basic properties
    assert wall.entity_id == "wall_001"
    assert wall.entity_type == IFCEntityType.WALL
    assert wall.name == "Wall-001"
    assert wall.discipline == Discipline.ARCHITECTURAL
    assert wall.is_building_element()
    assert not wall.is_spatial_element()
    assert wall.get_hierarchy_level() == 4
    
    print("✅ IFC Entity creation test passed")


def test_ifc_hierarchy():
    """Test IFC hierarchy building and navigation."""
    print("Testing IFC Hierarchy...")
    
    hierarchy = IFCHierarchy()
    
    # Create test entities
    site = IFCEntity.from_json_data("site_001", {"type": "IfcSite", "name": "Site"})
    building = IFCEntity.from_json_data("building_001", {"type": "IfcBuilding", "name": "Building"})
    floor = IFCEntity.from_json_data("floor_001", {"type": "IfcBuildingStorey", "name": "Floor 1"})
    wall = IFCEntity.from_json_data("wall_001", {"type": "IfcWall", "name": "Wall-001"})
    
    # Set up spatial containment
    building.spatial_container = site.entity_id
    floor.spatial_container = building.entity_id
    wall.spatial_container = floor.entity_id
    
    # Add to hierarchy
    for entity in [site, building, floor, wall]:
        hierarchy.add_entity(entity)
    
    # Test navigation
    children = hierarchy.get_children(site.entity_id)
    assert building.entity_id in children
    
    ancestors = hierarchy.get_ancestors(wall.entity_id)
    assert len(ancestors) == 3  # floor, building, site
    
    path = hierarchy.get_hierarchy_path(wall.entity_id)
    assert len(path) == 4  # site -> building -> floor -> wall
    
    # Test validation
    validation = hierarchy.validate_hierarchy_integrity()
    assert validation["is_valid"] is True
    
    print("✅ IFC Hierarchy test passed")


def test_entity_relationships():
    """Test entity relationship creation and graph functionality."""
    print("Testing Entity Relationships...")
    
    graph = RelationshipGraph()
    
    # Create relationships
    rel1 = EntityRelationship.create_spatial_containment("building", "floor", weight=0.9)
    rel2 = EntityRelationship.create_physical_connection("wall", "door", weight=0.8)
    
    # Add to graph
    graph.add_relationship(rel1)
    graph.add_relationship(rel2)
    
    # Test queries
    building_rels = graph.get_entity_relationships("building")
    assert len(building_rels) == 1
    
    connected = graph.get_connected_entities("building")
    assert "floor" in connected
    
    spatial_rels = graph.get_relationships_by_type(RelationshipType.SPATIAL_CONTAINMENT)
    assert len(spatial_rels) == 1
    
    print("✅ Entity Relationships test passed")


async def test_ifc_schema_parser():
    """Test IFC schema parser functionality."""
    print("Testing IFC Schema Parser...")
    
    parser = IFCSchemaParser(Config())
    
    # Create test entities
    entities = [
        IFCEntity.from_json_data("site_001", {"type": "IfcSite", "name": "Site"}),
        IFCEntity.from_json_data("building_001", {"type": "IfcBuilding", "name": "Building"}),
        IFCEntity.from_json_data("wall_001", {"type": "IfcWall", "name": "Wall"})
    ]
    
    # Add entities to parser
    for entity in entities:
        parser.entities[entity.entity_id] = entity
        parser.hierarchy.add_entity(entity)
    
    # Test filtering
    walls = parser.get_entities_by_type(IFCEntityType.WALL)
    assert len(walls) == 1
    
    architectural = parser.get_entities_by_discipline(Discipline.ARCHITECTURAL)
    assert len(architectural) == 1  # Just the wall
    
    # Test hierarchy summary
    summary = parser.get_building_hierarchy_summary()
    assert summary["total_entities"] == 3
    assert summary["integrity_validation"]["is_valid"] is True
    
    print("✅ IFC Schema Parser test passed")


async def test_relationship_mapper():
    """Test relationship mapper functionality."""
    print("Testing Relationship Mapper...")
    
    mapper = RelationshipMapper()
    
    # Create test entities
    entities = [
        IFCEntity.from_json_data("site_001", {"type": "IfcSite", "name": "Site"}),
        IFCEntity.from_json_data("building_001", {"type": "IfcBuilding", "name": "Building"})
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
    
    print("✅ Relationship Mapper test passed")


def run_all_tests():
    """Run all Phase 1 validation tests."""
    print("🚀 Starting Phase 1 IFC Schema Implementation Validation")
    print("=" * 60)
    
    try:
        # Synchronous tests
        test_ifc_entity_creation()
        test_ifc_hierarchy()
        test_entity_relationships()
        
        # Asynchronous tests
        asyncio.run(test_ifc_schema_parser())
        asyncio.run(test_relationship_mapper())
        
        print("=" * 60)
        print("🎉 All Phase 1 tests passed successfully!")
        print("✅ IFC Schema Parser Module - Working")
        print("✅ Relationship Mapping System - Working")
        print("✅ Building Hierarchy Builder - Working")
        print("=" * 60)
        print("✨ Phase 1 implementation is ready for Phase 2!")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)