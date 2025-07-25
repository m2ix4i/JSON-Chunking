"""
Specialized conflict detection strategies.

This module contains focused conflict detectors for different types
of conflicts: quantitative, qualitative, entity, spatial, and relationship.
"""

import statistics
from typing import Any, Dict, List, Optional, Tuple, Set
from collections import defaultdict, Counter
import structlog

from ...types.aggregation_types import ExtractedData, Conflict, ConflictType, Evidence

logger = structlog.get_logger(__name__)


class QuantitativeConflictDetector:
    """Detects quantitative mismatches in numerical data."""
    
    def __init__(self, tolerance_thresholds: Dict[str, float]):
        self.tolerance_thresholds = tolerance_thresholds
    
    async def detect_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect quantitative conflicts in numerical data."""
        conflicts = []
        
        # Group quantities by key
        quantity_groups = defaultdict(list)
        for data in data_list:
            for qty_key, qty_value in data.quantities.items():
                if isinstance(qty_value, (int, float)):
                    quantity_groups[qty_key].append((qty_value, data))
        
        # Check each quantity group for conflicts
        for qty_key, values_and_data in quantity_groups.items():
            if len(values_and_data) < 2:
                continue
                
            values = [v[0] for v in values_and_data]
            data_objects = [v[1] for v in values_and_data]
            
            conflict = await self._check_numerical_conflict(qty_key, values, data_objects)
            if conflict:
                conflicts.append(conflict)
        
        return conflicts
    
    async def _check_numerical_conflict(
        self, 
        qty_key: str, 
        values: List[float], 
        data_objects: List[ExtractedData]
    ) -> Optional[Conflict]:
        """Check if numerical values represent a conflict."""
        if len(values) < 2:
            return None
        
        # Calculate statistics
        mean_value = statistics.mean(values)
        std_dev = statistics.stdev(values) if len(values) > 1 else 0
        min_val, max_val = min(values), max(values)
        
        # Check for significant variance
        relative_tolerance = self.tolerance_thresholds['quantity_relative_tolerance']
        absolute_tolerance = self.tolerance_thresholds['quantity_absolute_tolerance']
        
        if std_dev > max(mean_value * relative_tolerance, absolute_tolerance):
            # Create evidence
            evidence = [
                Evidence(
                    source_chunk_id=data.chunk_id,
                    content=f"{qty_key}: {value}",
                    confidence=data.extraction_confidence,
                    quality_score=1.0 if data.data_quality == 'high' else 0.5
                )
                for value, data in zip(values, data_objects)
            ]
            
            severity = min(std_dev / mean_value, 1.0) if mean_value > 0 else 1.0
            
            return Conflict(
                conflict_type=ConflictType.QUANTITATIVE_MISMATCH,
                description=f"Quantitative mismatch for {qty_key}: values range from {min_val:.2f} to {max_val:.2f}",
                conflicting_chunks=[data.chunk_id for data in data_objects],
                conflicting_values=values,
                severity=severity,
                evidence=evidence,
                context={'quantity_key': qty_key, 'statistics': {'mean': mean_value, 'std_dev': std_dev}}
            )
        
        return None


class QualitativeConflictDetector:
    """Detects qualitative contradictions in textual data."""
    
    def __init__(self, tolerance_thresholds: Dict[str, float]):
        self.tolerance_thresholds = tolerance_thresholds
    
    async def detect_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect qualitative conflicts in property data."""
        conflicts = []
        
        # Group properties by key
        property_groups = defaultdict(list)
        for data in data_list:
            for prop_key, prop_value in data.properties.items():
                if isinstance(prop_value, str):
                    property_groups[prop_key].append((prop_value, data))
        
        # Check each property group for conflicts
        for prop_key, values_and_data in property_groups.items():
            if len(values_and_data) < 2:
                continue
                
            conflict = await self._check_qualitative_conflict(prop_key, values_and_data)
            if conflict:
                conflicts.append(conflict)
        
        return conflicts
    
    async def _check_qualitative_conflict(
        self, 
        prop_key: str, 
        values_and_data: List[Tuple[str, ExtractedData]]
    ) -> Optional[Conflict]:
        """Check if qualitative values represent a conflict."""
        values = [v[0] for v in values_and_data]
        data_objects = [v[1] for v in values_and_data]
        
        # Check for contradictory values
        unique_values = set(v.lower().strip() for v in values)
        if len(unique_values) > 1:
            # Create evidence
            evidence = [
                Evidence(
                    source_chunk_id=data.chunk_id,
                    content=f"{prop_key}: {value}",
                    confidence=data.extraction_confidence,
                    quality_score=1.0 if data.data_quality == 'high' else 0.5
                )
                for value, data in values_and_data
            ]
            
            # Calculate severity based on confidence spread
            confidences = [data.extraction_confidence for data in data_objects]
            confidence_spread = max(confidences) - min(confidences)
            severity = min(confidence_spread + 0.5, 1.0)
            
            return Conflict(
                conflict_type=ConflictType.QUALITATIVE_CONTRADICTION,
                description=f"Qualitative contradiction for {prop_key}: {list(unique_values)}",
                conflicting_chunks=[data.chunk_id for data in data_objects],
                conflicting_values=values,
                severity=severity,
                evidence=evidence,
                context={'property_key': prop_key, 'unique_values': list(unique_values)}
            )
        
        return None


class EntityConflictDetector:
    """Detects conflicts in entity identification and classification."""
    
    def __init__(self, tolerance_thresholds: Dict[str, float]):
        self.tolerance_thresholds = tolerance_thresholds
    
    async def detect_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect entity conflicts in extracted data."""
        conflicts = []
        
        # Group entities by identifier or similar characteristics
        entity_groups = defaultdict(list)
        for data in data_list:
            for entity in data.entities:
                entity_id = entity.get('entity_id') or entity.get('name') or entity.get('type')
                if entity_id:
                    entity_groups[entity_id].append((entity, data))
        
        # Check each entity group for conflicts
        for entity_id, entities_and_data in entity_groups.items():
            if len(entities_and_data) < 2:
                continue
                
            conflict = await self._check_entity_conflict(entity_id, entities_and_data)
            if conflict:
                conflicts.append(conflict)
        
        return conflicts
    
    async def _check_entity_conflict(
        self, 
        entity_id: str, 
        entities_and_data: List[Tuple[Dict[str, Any], ExtractedData]]
    ) -> Optional[Conflict]:
        """Check if entity definitions represent a conflict."""
        entities = [e[0] for e in entities_and_data]
        data_objects = [e[1] for e in entities_and_data]
        
        # Check for type conflicts
        entity_types = [entity.get('type', 'unknown') for entity in entities]
        unique_types = set(entity_types)
        
        if len(unique_types) > 1:
            # Create evidence
            evidence = [
                Evidence(
                    source_chunk_id=data.chunk_id,
                    content=f"Entity {entity_id} type: {entity.get('type', 'unknown')}",
                    confidence=data.extraction_confidence,
                    quality_score=1.0 if data.data_quality == 'high' else 0.5
                )
                for entity, data in entities_and_data
            ]
            
            severity = min(len(unique_types) / len(entities), 1.0)
            
            return Conflict(
                conflict_type=ConflictType.ENTITY_MISMATCH,
                description=f"Entity type mismatch for {entity_id}: {list(unique_types)}",
                conflicting_chunks=[data.chunk_id for data in data_objects],
                conflicting_values=entity_types,
                severity=severity,
                evidence=evidence,
                context={'entity_id': entity_id, 'conflicting_types': list(unique_types)}
            )
        
        return None


class SpatialConflictDetector:
    """Detects conflicts in spatial relationships and locations."""
    
    def __init__(self, tolerance_thresholds: Dict[str, float]):
        self.tolerance_thresholds = tolerance_thresholds
    
    async def detect_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect spatial conflicts in location data."""
        conflicts = []
        
        # Group spatial contexts
        spatial_groups = defaultdict(list)
        for data in data_list:
            for location_key, location_value in data.spatial_context.items():
                spatial_groups[location_key].append((location_value, data))
        
        # Check each spatial group for conflicts
        for location_key, values_and_data in spatial_groups.items():
            if len(values_and_data) < 2:
                continue
                
            conflict = await self._check_spatial_conflict(location_key, values_and_data)
            if conflict:
                conflicts.append(conflict)
        
        return conflicts
    
    async def _check_spatial_conflict(
        self, 
        location_key: str, 
        values_and_data: List[Tuple[Any, ExtractedData]]
    ) -> Optional[Conflict]:
        """Check if spatial values represent a conflict."""
        values = [v[0] for v in values_and_data]
        data_objects = [v[1] for v in values_and_data]
        
        # Check for contradictory spatial information
        str_values = [str(v).lower().strip() for v in values]
        unique_values = set(str_values)
        
        if len(unique_values) > 1:
            # Create evidence
            evidence = [
                Evidence(
                    source_chunk_id=data.chunk_id,
                    content=f"Spatial {location_key}: {value}",
                    confidence=data.extraction_confidence,
                    quality_score=1.0 if data.data_quality == 'high' else 0.5
                )
                for value, data in values_and_data
            ]
            
            severity = min(len(unique_values) / len(values), 1.0)
            
            return Conflict(
                conflict_type=ConflictType.INCONSISTENT_UNITS,  # Using existing enum
                description=f"Spatial conflict for {location_key}: {list(unique_values)}",
                conflicting_chunks=[data.chunk_id for data in data_objects],
                conflicting_values=str_values,
                severity=severity,
                evidence=evidence,
                context={'location_key': location_key, 'unique_values': list(unique_values)}
            )
        
        return None


class RelationshipConflictDetector:
    """Detects conflicts in relationships between entities."""
    
    def __init__(self, tolerance_thresholds: Dict[str, float]):
        self.tolerance_thresholds = tolerance_thresholds
    
    async def detect_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect relationship conflicts in extracted data."""
        conflicts = []
        
        # Group relationships by type and entities involved
        relationship_groups = defaultdict(list)
        for data in data_list:
            for relationship in data.relationships:
                rel_key = f"{relationship.get('type', 'unknown')}_{relationship.get('from', '')}_{relationship.get('to', '')}"
                relationship_groups[rel_key].append((relationship, data))
        
        # Check each relationship group for conflicts
        for rel_key, relationships_and_data in relationship_groups.items():
            if len(relationships_and_data) < 2:
                continue
                
            conflict = await self._check_relationship_conflict(rel_key, relationships_and_data)
            if conflict:
                conflicts.append(conflict)
        
        return conflicts
    
    async def _check_relationship_conflict(
        self, 
        rel_key: str, 
        relationships_and_data: List[Tuple[Dict[str, Any], ExtractedData]]
    ) -> Optional[Conflict]:
        """Check if relationship definitions represent a conflict."""
        relationships = [r[0] for r in relationships_and_data]
        data_objects = [r[1] for r in relationships_and_data]
        
        # Check for contradictory relationship properties
        rel_properties = []
        for relationship in relationships:
            prop_str = ",".join(f"{k}:{v}" for k, v in relationship.items() if k not in ['from', 'to'])
            rel_properties.append(prop_str)
        
        unique_properties = set(rel_properties)
        
        if len(unique_properties) > 1:
            # Create evidence
            evidence = [
                Evidence(
                    source_chunk_id=data.chunk_id,
                    content=f"Relationship {rel_key}: {prop_str}",
                    confidence=data.extraction_confidence,
                    quality_score=1.0 if data.data_quality == 'high' else 0.5
                )
                for prop_str, data in zip(rel_properties, data_objects)
            ]
            
            severity = min(len(unique_properties) / len(relationships), 1.0)
            
            return Conflict(
                conflict_type=ConflictType.RELATIONSHIP_CONFLICT,
                description=f"Relationship conflict for {rel_key}: {list(unique_properties)}",
                conflicting_chunks=[data.chunk_id for data in data_objects],
                conflicting_values=rel_properties,
                severity=severity,
                evidence=evidence,
                context={'relationship_key': rel_key, 'unique_properties': list(unique_properties)}
            )
        
        return None