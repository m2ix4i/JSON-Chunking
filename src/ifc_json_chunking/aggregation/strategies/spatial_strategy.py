"""
Spatial aggregation strategy for location and relationship data.

This module implements aggregation techniques for spatial information
including locations, zones, relationships, and geometric data.
"""

from typing import Any, Dict, List, Optional, Tuple
from collections import defaultdict
import structlog

from ...types.aggregation_types import (
    ExtractedData, AggregationStrategyBase, AggregationStrategy,
    ConflictResolution
)
from ...query.types import QueryContext, QueryIntent

logger = structlog.get_logger(__name__)


class SpatialAggregationStrategy(AggregationStrategyBase):
    """Aggregation strategy for spatial and location-based data."""
    
    def __init__(self):
        self.supported_intents = [QueryIntent.SPATIAL]
        
    async def aggregate(
        self,
        extracted_data: List[ExtractedData],
        context: QueryContext,
        resolutions: Optional[List[ConflictResolution]] = None
    ) -> Dict[str, Any]:
        """Aggregate spatial data with hierarchy and relationship analysis."""
        logger.debug(
            "Starting spatial aggregation",
            data_count=len(extracted_data),
            intent=context.intent.value
        )
        
        if not extracted_data:
            return {"aggregation_method": "none", "reason": "no_data"}
        
        # Apply conflict resolutions if provided
        resolved_data = self._apply_resolutions(extracted_data, resolutions or [])
        
        # Extract spatial information
        spatial_elements = await self._extract_spatial_elements(resolved_data)
        
        # Build spatial hierarchy
        spatial_hierarchy = await self._build_spatial_hierarchy(spatial_elements)
        
        # Analyze spatial relationships
        spatial_relationships = await self._analyze_spatial_relationships(spatial_elements)
        
        # Calculate spatial statistics
        spatial_statistics = await self._calculate_spatial_statistics(spatial_elements)
        
        # Calculate aggregation confidence
        aggregation_confidence = self._calculate_aggregation_confidence(resolved_data, spatial_elements)
        
        result = {
            "aggregation_method": "spatial_hierarchy",
            "strategy": AggregationStrategy.HIERARCHICAL.value,
            "spatial_elements": spatial_elements,
            "spatial_hierarchy": spatial_hierarchy,
            "spatial_relationships": spatial_relationships,
            "spatial_statistics": spatial_statistics,
            "aggregation_confidence": aggregation_confidence,
            "data_sources": len(resolved_data)
        }
        
        logger.info(
            "Spatial aggregation completed",
            elements_count=len(spatial_elements),
            hierarchy_levels=len(spatial_hierarchy),
            confidence=aggregation_confidence
        )
        
        return result
    
    def get_supported_intents(self) -> List[QueryIntent]:
        """Get list of query intents this strategy supports."""
        return self.supported_intents
    
    async def _extract_spatial_elements(self, data_list: List[ExtractedData]) -> List[Dict[str, Any]]:
        """Extract spatial elements from all data sources."""
        spatial_elements = []
        
        for data in data_list:
            # Extract from spatial context
            if data.spatial_context:
                for element_id, spatial_info in data.spatial_context.items():
                    element = self._create_spatial_element(element_id, spatial_info, data)
                    spatial_elements.append(element)
            
            # Extract from entities with spatial properties
            for entity in data.entities:
                if self._has_spatial_properties(entity):
                    element = self._create_spatial_element_from_entity(entity, data)
                    spatial_elements.append(element)
            
            # Extract from relationships
            for relationship in data.relationships:
                if self._is_spatial_relationship(relationship):
                    spatial_elements.append(self._create_spatial_relationship(relationship, data))
        
        return spatial_elements
    
    def _has_spatial_properties(self, entity: Dict[str, Any]) -> bool:
        """Check if an entity has spatial properties."""
        spatial_keywords = ['location', 'position', 'coordinates', 'space', 'room', 'floor', 'zone']
        entity_type = entity.get('type', '').lower()
        
        # Check entity type
        if any(keyword in entity_type for keyword in spatial_keywords):
            return True
        
        # Check properties
        for key in entity.keys():
            if any(keyword in key.lower() for keyword in spatial_keywords):
                return True
        
        return False
    
    def _is_spatial_relationship(self, relationship: Dict[str, Any]) -> bool:
        """Check if a relationship is spatial in nature."""
        spatial_rel_types = ['contains', 'adjacent', 'above', 'below', 'inside', 'outside']
        rel_type = relationship.get('type', '').lower()
        
        return any(spatial_type in rel_type for spatial_type in spatial_rel_types)
    
    def _create_spatial_element(self, element_id: str, spatial_info: Dict[str, Any], data: ExtractedData) -> Dict[str, Any]:
        """Create a spatial element from spatial context."""
        return {
            'id': element_id,
            'type': 'spatial_context',
            'spatial_info': spatial_info,
            'location': spatial_info.get('location'),
            'coordinates': spatial_info.get('coordinates'),
            'properties': spatial_info,
            'source_chunk': data.chunk_id,
            'extraction_confidence': data.extraction_confidence,
            'parent': spatial_info.get('parent'),
            'children': spatial_info.get('children', [])
        }
    
    def _create_spatial_element_from_entity(self, entity: Dict[str, Any], data: ExtractedData) -> Dict[str, Any]:
        """Create a spatial element from an entity."""
        return {
            'id': entity.get('id', entity.get('name', 'unknown')),
            'type': entity.get('type', 'unknown'),
            'spatial_info': {k: v for k, v in entity.items() if self._is_spatial_property(k)},
            'location': entity.get('location') or entity.get('position'),
            'coordinates': entity.get('coordinates'),
            'properties': entity,
            'source_chunk': data.chunk_id,
            'extraction_confidence': data.extraction_confidence,
            'parent': entity.get('parent') or entity.get('container'),
            'children': entity.get('children', [])
        }
    
    def _create_spatial_relationship(self, relationship: Dict[str, Any], data: ExtractedData) -> Dict[str, Any]:
        """Create a spatial element from a relationship."""
        return {
            'id': f"{relationship.get('source', 'unknown')}_to_{relationship.get('target', 'unknown')}",
            'type': 'spatial_relationship',
            'relationship_type': relationship.get('type'),
            'source': relationship.get('source'),
            'target': relationship.get('target'),
            'properties': relationship,
            'source_chunk': data.chunk_id,
            'extraction_confidence': data.extraction_confidence
        }
    
    def _is_spatial_property(self, prop_key: str) -> bool:
        """Check if a property key is spatial."""
        spatial_props = ['location', 'position', 'coordinates', 'x', 'y', 'z', 'floor', 'level', 'zone']
        return any(prop in prop_key.lower() for prop in spatial_props)
    
    async def _build_spatial_hierarchy(self, spatial_elements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build a hierarchical representation of spatial elements."""
        # Group elements by level/type
        hierarchy_levels = defaultdict(list)
        parent_child_map = defaultdict(list)
        
        for element in spatial_elements:
            if element['type'] == 'spatial_relationship':
                continue  # Skip relationships in hierarchy building
            
            # Determine hierarchy level
            level = self._determine_hierarchy_level(element)
            hierarchy_levels[level].append(element)
            
            # Build parent-child relationships
            parent = element.get('parent')
            if parent:
                parent_child_map[parent].append(element['id'])
        
        # Build tree structure
        hierarchy_tree = {}
        for level in sorted(hierarchy_levels.keys()):
            hierarchy_tree[level] = []
            for element in hierarchy_levels[level]:
                tree_node = {
                    'element': element,
                    'children': parent_child_map.get(element['id'], [])
                }
                hierarchy_tree[level].append(tree_node)
        
        return {
            'levels': hierarchy_tree,
            'parent_child_map': dict(parent_child_map),
            'total_levels': len(hierarchy_levels)
        }
    
    def _determine_hierarchy_level(self, element: Dict[str, Any]) -> int:
        """Determine the hierarchy level of a spatial element."""
        element_type = element.get('type', '').lower()
        
        # Building level hierarchy
        if 'building' in element_type or 'project' in element_type:
            return 0
        elif 'floor' in element_type or 'level' in element_type or 'storey' in element_type:
            return 1
        elif 'zone' in element_type or 'area' in element_type:
            return 2
        elif 'room' in element_type or 'space' in element_type:
            return 3
        elif 'element' in element_type or 'component' in element_type:
            return 4
        else:
            return 5  # Default for unknown types
    
    async def _analyze_spatial_relationships(self, spatial_elements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze spatial relationships between elements."""
        relationships = []
        adjacencies = defaultdict(list)
        containments = defaultdict(list)
        
        for element in spatial_elements:
            if element['type'] == 'spatial_relationship':
                relationships.append(element)
                
                rel_type = element.get('relationship_type', '').lower()
                source = element.get('source')
                target = element.get('target')
                
                if 'adjacent' in rel_type:
                    adjacencies[source].append(target)
                    adjacencies[target].append(source)  # Bidirectional
                elif 'contain' in rel_type or 'inside' in rel_type:
                    containments[source].append(target)
        
        # Calculate connectivity metrics
        connectivity_metrics = await self._calculate_connectivity_metrics(adjacencies, containments)
        
        return {
            'relationships': relationships,
            'adjacencies': dict(adjacencies),
            'containments': dict(containments),
            'connectivity_metrics': connectivity_metrics,
            'total_relationships': len(relationships)
        }
    
    async def _calculate_connectivity_metrics(
        self,
        adjacencies: Dict[str, List[str]],
        containments: Dict[str, List[str]]
    ) -> Dict[str, Any]:
        """Calculate spatial connectivity metrics."""
        # Count connections per element
        connection_counts = {}
        for element, adjacent_elements in adjacencies.items():
            connection_counts[element] = len(adjacent_elements)
        
        # Find most connected elements
        if connection_counts:
            most_connected = max(connection_counts.items(), key=lambda x: x[1])
            avg_connections = sum(connection_counts.values()) / len(connection_counts)
        else:
            most_connected = None
            avg_connections = 0
        
        # Analyze containment depth
        containment_depths = {}
        for container, contained in containments.items():
            containment_depths[container] = len(contained)
        
        return {
            'connection_counts': connection_counts,
            'most_connected_element': most_connected,
            'average_connections': avg_connections,
            'containment_depths': containment_depths,
            'total_connected_elements': len(connection_counts)
        }
    
    async def _calculate_spatial_statistics(self, spatial_elements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate statistical information about spatial elements."""
        if not spatial_elements:
            return {"error": "no_spatial_elements"}
        
        # Count by type
        type_counts = defaultdict(int)
        for element in spatial_elements:
            type_counts[element.get('type', 'unknown')] += 1
        
        # Confidence statistics
        confidences = [elem['extraction_confidence'] for elem in spatial_elements]
        avg_confidence = sum(confidences) / len(confidences)
        
        # Spatial coverage analysis
        elements_with_coordinates = sum(1 for elem in spatial_elements if elem.get('coordinates'))
        elements_with_location = sum(1 for elem in spatial_elements if elem.get('location'))
        
        # Hierarchy statistics
        elements_with_parent = sum(1 for elem in spatial_elements if elem.get('parent'))
        elements_with_children = sum(1 for elem in spatial_elements if elem.get('children'))
        
        return {
            "total_elements": len(spatial_elements),
            "type_distribution": dict(type_counts),
            "average_confidence": avg_confidence,
            "spatial_coverage": {
                "with_coordinates": elements_with_coordinates,
                "with_location": elements_with_location,
                "coordinate_coverage": elements_with_coordinates / len(spatial_elements),
                "location_coverage": elements_with_location / len(spatial_elements)
            },
            "hierarchy_stats": {
                "with_parent": elements_with_parent,
                "with_children": elements_with_children,
                "parent_coverage": elements_with_parent / len(spatial_elements),
                "children_coverage": elements_with_children / len(spatial_elements)
            }
        }
    
    def _calculate_aggregation_confidence(
        self,
        data_list: List[ExtractedData],
        spatial_elements: List[Dict[str, Any]]
    ) -> float:
        """Calculate overall confidence in the spatial aggregation."""
        if not data_list or not spatial_elements:
            return 0.0
        
        # Base confidence from extractions
        extraction_confidences = [data.extraction_confidence for data in data_list]
        base_confidence = sum(extraction_confidences) / len(extraction_confidences)
        
        # Confidence from spatial completeness
        complete_elements = sum(1 for elem in spatial_elements 
                              if elem.get('coordinates') or elem.get('location'))
        completeness_bonus = min(complete_elements / len(spatial_elements) * 0.15, 0.15)
        
        # Confidence from relationship information
        relationship_elements = sum(1 for elem in spatial_elements 
                                  if elem['type'] == 'spatial_relationship')
        relationship_bonus = min(relationship_elements / len(spatial_elements) * 0.1, 0.1)
        
        total_confidence = base_confidence + completeness_bonus + relationship_bonus
        return min(total_confidence, 1.0)
    
    def _apply_resolutions(
        self,
        data_list: List[ExtractedData],
        resolutions: List[ConflictResolution]
    ) -> List[ExtractedData]:
        """Apply conflict resolutions to the data."""
        if not resolutions:
            return data_list
        
        # For spatial strategy, resolutions mainly affect location conflicts
        # This is a simplified implementation
        return data_list