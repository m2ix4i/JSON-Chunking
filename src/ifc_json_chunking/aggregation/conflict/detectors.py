"""
Specialized conflict detection strategies.

This module implements focused detector classes for different types 
of conflicts, following the strategy pattern for maintainability.
"""

import statistics
from collections import defaultdict
from typing import Any, Dict, List, Tuple

import structlog

from ...types.aggregation_types import Conflict, ConflictType, ExtractedData

logger = structlog.get_logger(__name__)


class QuantitativeConflictDetector:
    """Detects quantitative mismatches in numerical data."""

    def __init__(self, tolerance_thresholds: Dict[str, float]):
        self.tolerance_thresholds = tolerance_thresholds

    async def detect_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect conflicts in quantitative data."""
        conflicts = []

        # Group quantities by key
        quantity_groups = defaultdict(list)
        for data in data_list:
            for qty_key, qty_value in data.quantities.items():
                if isinstance(qty_value, (int, float)):
                    quantity_groups[qty_key].append((qty_value, data))

        # Check for conflicts in each quantity group
        for qty_key, values_data in quantity_groups.items():
            if len(values_data) < 2:
                continue

            values = [vd[0] for vd in values_data]
            data_objects = [vd[1] for vd in values_data]

            # Check for statistical outliers
            if len(values) >= 3:
                mean_val = statistics.mean(values)
                stdev = statistics.stdev(values) if len(values) > 1 else 0

                if stdev > 0:
                    outliers = []
                    for i, val in enumerate(values):
                        z_score = abs(val - mean_val) / stdev
                        if z_score > self.tolerance_thresholds.get('statistical_outlier_threshold', 2.0):
                            outliers.append((i, val, data_objects[i]))

                    if outliers:
                        conflicts.append(Conflict(
                            conflict_type=ConflictType.QUANTITATIVE_MISMATCH,
                            description=f"Statistical outliers in {qty_key}: {[o[1] for o in outliers]}",
                            conflicting_chunks=[o[2].chunk_id for o in outliers],
                            conflicting_values=[o[1] for o in outliers],
                            severity=min(len(outliers) / len(values), 0.8),
                            evidence=[],
                            context={
                                'quantity_key': qty_key,
                                'mean': mean_val,
                                'stdev': stdev,
                                'outlier_threshold': self.tolerance_thresholds.get('statistical_outlier_threshold', 2.0)
                            }
                        ))

            # Check for relative tolerance violations
            if len(values) >= 2:
                min_val, max_val = min(values), max(values)
                if min_val > 0:  # Avoid division by zero
                    relative_diff = (max_val - min_val) / min_val
                    if relative_diff > self.tolerance_thresholds.get('quantity_relative_tolerance', 0.05):
                        conflicts.append(Conflict(
                            conflict_type=ConflictType.QUANTITATIVE_MISMATCH,
                            description=f"Relative tolerance exceeded for {qty_key}: {relative_diff:.3f}",
                            conflicting_chunks=[d.chunk_id for d in data_objects],
                            conflicting_values=values,
                            severity=min(relative_diff, 0.9),
                            evidence=[],
                            context={
                                'quantity_key': qty_key,
                                'relative_difference': relative_diff,
                                'tolerance_threshold': self.tolerance_thresholds.get('quantity_relative_tolerance', 0.05)
                            }
                        ))

        return conflicts


class QualitativeConflictDetector:
    """Detects qualitative contradictions in descriptive data."""

    def __init__(self, tolerance_thresholds: Dict[str, float]):
        self.tolerance_thresholds = tolerance_thresholds

    async def detect_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect conflicts in qualitative data."""
        conflicts = []

        # Group properties by key
        property_groups = defaultdict(list)
        for data in data_list:
            for prop_key, prop_value in data.properties.items():
                if isinstance(prop_value, str):
                    property_groups[prop_key].append((prop_value, data))

        # Check for contradictory descriptions
        for prop_key, values_data in property_groups.items():
            if len(values_data) < 2:
                continue

            values = [vd[0].lower().strip() for vd in values_data]
            data_objects = [vd[1] for vd in values_data]

            # Look for obvious contradictions
            contradictory_pairs = self._find_contradictory_pairs(values)

            if contradictory_pairs:
                conflicts.append(Conflict(
                    conflict_type=ConflictType.QUALITATIVE_CONTRADICTION,
                    description=f"Contradictory descriptions for {prop_key}: {contradictory_pairs}",
                    conflicting_chunks=[d.chunk_id for d in data_objects],
                    conflicting_values=[vd[0] for vd in values_data],
                    severity=0.6,
                    evidence=[],
                    context={
                        'property_key': prop_key,
                        'contradictory_pairs': contradictory_pairs
                    }
                ))

        return conflicts

    def _find_contradictory_pairs(self, values: List[str]) -> List[Tuple[str, str]]:
        """Find pairs of values that appear contradictory."""
        contradictory_pairs = []

        # Simple contradiction detection based on negation patterns
        negation_patterns = [
            ('yes', 'no'), ('true', 'false'), ('present', 'absent'),
            ('exists', 'missing'), ('available', 'unavailable'),
            ('included', 'excluded'), ('active', 'inactive')
        ]

        for val1 in values:
            for val2 in values:
                if val1 != val2:
                    for pos, neg in negation_patterns:
                        if (pos in val1.lower() and neg in val2.lower()) or \
                           (neg in val1.lower() and pos in val2.lower()):
                            contradictory_pairs.append((val1, val2))

        return contradictory_pairs


class EntityConflictDetector:
    """Detects conflicts in entity identification and classification."""

    def __init__(self, tolerance_thresholds: Dict[str, float]):
        self.tolerance_thresholds = tolerance_thresholds

    async def detect_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect conflicts in entity data."""
        conflicts = []

        # Group entities by identifier or name
        entity_groups = defaultdict(list)
        for data in data_list:
            for entity in data.entities:
                entity_id = entity.get('id') or entity.get('name') or entity.get('type')
                if entity_id:
                    entity_groups[entity_id].append((entity, data))

        # Check for conflicting entity definitions
        for entity_id, entities_data in entity_groups.items():
            if len(entities_data) < 2:
                continue

            entities = [ed[0] for ed in entities_data]
            data_objects = [ed[1] for ed in entities_data]

            # Check for type conflicts
            types = set(e.get('type') for e in entities if e.get('type'))
            if len(types) > 1:
                conflicts.append(Conflict(
                    conflict_type=ConflictType.ENTITY_MISMATCH,
                    description=f"Entity {entity_id} has conflicting types: {list(types)}",
                    conflicting_chunks=[d.chunk_id for d in data_objects],
                    conflicting_values=list(types),
                    severity=0.7,
                    evidence=[],
                    context={
                        'entity_id': entity_id,
                        'conflicting_types': list(types)
                    }
                ))

            # Check for property conflicts
            property_conflicts = self._detect_property_conflicts(entities, entity_id)
            conflicts.extend([
                Conflict(
                    conflict_type=ConflictType.PROPERTY_CONTRADICTION,
                    description=conflict_desc,
                    conflicting_chunks=[d.chunk_id for d in data_objects],
                    conflicting_values=conflict_values,
                    severity=0.5,
                    evidence=[],
                    context={
                        'entity_id': entity_id,
                        'property_key': prop_key
                    }
                )
                for conflict_desc, conflict_values, prop_key in property_conflicts
            ])

        return conflicts

    def _detect_property_conflicts(self, entities: List[Dict[str, Any]], entity_id: str) -> List[Tuple[str, List[Any], str]]:
        """Detect conflicts in entity properties."""
        conflicts = []

        # Group properties across entities
        property_groups = defaultdict(list)
        for entity in entities:
            for prop_key, prop_value in entity.items():
                if prop_key not in ['id', 'name', 'type']:  # Skip identity fields
                    property_groups[prop_key].append(prop_value)

        # Check for conflicting property values
        for prop_key, values in property_groups.items():
            unique_values = list(set(str(v) for v in values if v is not None))
            if len(unique_values) > 1:
                conflicts.append((
                    f"Entity {entity_id} has conflicting {prop_key}: {unique_values}",
                    unique_values,
                    prop_key
                ))

        return conflicts


class SpatialConflictDetector:
    """Detects conflicts in spatial relationships and positioning."""

    def __init__(self, tolerance_thresholds: Dict[str, float]):
        self.tolerance_thresholds = tolerance_thresholds

    async def detect_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect conflicts in spatial data."""
        conflicts = []

        # Analyze spatial context conflicts
        spatial_contexts = []
        for data in data_list:
            if data.spatial_context:
                spatial_contexts.append((data.spatial_context, data))

        if len(spatial_contexts) >= 2:
            # Check for conflicting spatial locations
            location_conflicts = self._detect_location_conflicts(spatial_contexts)
            conflicts.extend(location_conflicts)

            # Check for conflicting spatial relationships
            relationship_conflicts = self._detect_spatial_relationship_conflicts(spatial_contexts)
            conflicts.extend(relationship_conflicts)

        return conflicts

    def _detect_location_conflicts(self, spatial_contexts: List[Tuple[Dict[str, Any], ExtractedData]]) -> List[Conflict]:
        """Detect conflicts in spatial locations."""
        conflicts = []

        # Group by spatial entity
        location_groups = defaultdict(list)
        for spatial_context, data in spatial_contexts:
            for entity_id, location in spatial_context.items():
                if isinstance(location, dict) and 'coordinates' in location:
                    location_groups[entity_id].append((location, data))

        # Check for conflicting coordinates
        for entity_id, locations_data in location_groups.items():
            if len(locations_data) < 2:
                continue

            locations = [ld[0] for ld in locations_data]
            data_objects = [ld[1] for ld in locations_data]

            # Simple coordinate conflict detection
            coordinates = [loc.get('coordinates') for loc in locations if loc.get('coordinates')]
            if len(set(str(coord) for coord in coordinates)) > 1:
                conflicts.append(Conflict(
                    conflict_type=ConflictType.ENTITY_MISMATCH,
                    description=f"Conflicting coordinates for spatial entity {entity_id}",
                    conflicting_chunks=[d.chunk_id for d in data_objects],
                    conflicting_values=coordinates,
                    severity=0.6,
                    evidence=[],
                    context={
                        'entity_id': entity_id,
                        'conflicting_coordinates': coordinates
                    }
                ))

        return conflicts

    def _detect_spatial_relationship_conflicts(self, spatial_contexts: List[Tuple[Dict[str, Any], ExtractedData]]) -> List[Conflict]:
        """Detect conflicts in spatial relationships."""
        # Simplified implementation - could be expanded for complex spatial logic
        return []


class RelationshipConflictDetector:
    """Detects conflicts in entity relationships."""

    def __init__(self, tolerance_thresholds: Dict[str, float]):
        self.tolerance_thresholds = tolerance_thresholds

    async def detect_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect conflicts in relationship data."""
        conflicts = []

        # Collect all relationships
        all_relationships = []
        for data in data_list:
            for relationship in data.relationships:
                all_relationships.append((relationship, data))

        if len(all_relationships) >= 2:
            # Check for contradictory relationships
            contradictory_relationships = self._find_contradictory_relationships(all_relationships)
            conflicts.extend(contradictory_relationships)

        return conflicts

    def _find_contradictory_relationships(self, relationships_data: List[Tuple[Dict[str, Any], ExtractedData]]) -> List[Conflict]:
        """Find contradictory relationships."""
        conflicts = []

        # Group relationships by entity pairs
        relationship_groups = defaultdict(list)
        for relationship, data in relationships_data:
            source = relationship.get('source')
            target = relationship.get('target')
            if source and target:
                # Create a consistent key regardless of direction
                key = tuple(sorted([str(source), str(target)]))
                relationship_groups[key].append((relationship, data))

        # Check for conflicting relationship types
        for entity_pair, rels_data in relationship_groups.items():
            if len(rels_data) < 2:
                continue

            relationships = [rd[0] for rd in rels_data]
            data_objects = [rd[1] for rd in rels_data]

            # Check for different relationship types between same entities
            rel_types = set(rel.get('type') for rel in relationships if rel.get('type'))
            if len(rel_types) > 1:
                conflicts.append(Conflict(
                    conflict_type=ConflictType.RELATIONSHIP_CONFLICT,
                    description=f"Conflicting relationship types between {entity_pair}: {list(rel_types)}",
                    conflicting_chunks=[d.chunk_id for d in data_objects],
                    conflicting_values=list(rel_types),
                    severity=0.5,
                    evidence=[],
                    context={
                        'entity_pair': entity_pair,
                        'conflicting_types': list(rel_types)
                    }
                ))

        return conflicts
