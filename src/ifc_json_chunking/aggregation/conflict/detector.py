"""
Conflict detection component for identifying contradictions and inconsistencies.

This module detects conflicts between extracted data from different chunks,
identifying quantitative mismatches, qualitative contradictions, and
inconsistencies that need resolution during aggregation.
"""

from typing import Any, Dict, List, Optional, Tuple, Set
import statistics
from collections import defaultdict, Counter
import structlog

from ...types.aggregation_types import (
    ExtractedData, Conflict, ConflictType, Evidence
)
from ...query.types import QueryContext, QueryIntent

logger = structlog.get_logger(__name__)


class ConflictDetector:
    """
    Detects conflicts and contradictions in extracted data.
    
    Analyzes multiple ExtractedData objects to identify
    quantitative mismatches, qualitative contradictions,
    and consistency issues across chunks.
    """
    
    def __init__(self, tolerance_thresholds: Optional[Dict[str, float]] = None):
        """
        Initialize conflict detector.
        
        Args:
            tolerance_thresholds: Custom tolerance levels for different types of conflicts
        """
        self.tolerance_thresholds = tolerance_thresholds or {
            'quantity_relative_tolerance': 0.05,  # 5% relative tolerance for quantities
            'quantity_absolute_tolerance': 0.1,   # Absolute tolerance for small quantities
            'confidence_threshold': 0.3,          # Minimum confidence to consider data
            'majority_threshold': 0.6,            # Threshold for majority rule
            'statistical_outlier_threshold': 2.0  # Standard deviations for outlier detection
        }
        
        logger.info(
            "ConflictDetector initialized",
            tolerance_thresholds=self.tolerance_thresholds
        )
    
    async def detect_conflicts(
        self,
        extracted_data_list: List[ExtractedData],
        context: QueryContext
    ) -> List[Conflict]:
        """
        Detect conflicts across multiple extracted data objects.
        
        Args:
            extracted_data_list: List of extracted data from different chunks
            context: Query context for contextual conflict detection
            
        Returns:
            List of detected conflicts
        """
        logger.debug(
            "Starting conflict detection",
            data_count=len(extracted_data_list),
            query_intent=context.intent.value
        )
        
        if len(extracted_data_list) < 2:
            logger.debug("Insufficient data for conflict detection")
            return []
        conflicts = []
        
        try:
            # Filter out low-confidence data
            high_confidence_data = [
                data for data in extracted_data_list
                if data.extraction_confidence >= self.tolerance_thresholds['confidence_threshold']
            ]
            
            if len(high_confidence_data) < 2:
                logger.debug("Insufficient high-confidence data for conflict detection")
                return []
            
            # Detect different types of conflicts based on query intent
            if context.intent in [QueryIntent.QUANTITY, QueryIntent.COST]:
                conflicts.extend(await self._detect_quantitative_conflicts(high_confidence_data))
            
            if context.intent in [QueryIntent.COMPONENT, QueryIntent.MATERIAL]:
                conflicts.extend(await self._detect_qualitative_conflicts(high_confidence_data))
                conflicts.extend(await self._detect_entity_conflicts(high_confidence_data))
            
            if context.intent == QueryIntent.SPATIAL:
                conflicts.extend(await self._detect_spatial_conflicts(high_confidence_data))
                conflicts.extend(await self._detect_relationship_conflicts(high_confidence_data))
            
            # Always check for property conflicts and missing information
            conflicts.extend(await self._detect_property_conflicts(high_confidence_data))
            conflicts.extend(await self._detect_missing_information_conflicts(high_confidence_data))
            conflicts.extend(await self._detect_unit_inconsistencies(high_confidence_data))
            
            # Filter and rank conflicts by severity
            conflicts = await self._filter_and_rank_conflicts(conflicts)
            
            logger.info(
                "Conflict detection completed",
                conflicts_detected=len(conflicts),
                conflict_types=[c.conflict_type.value for c in conflicts]
            )
            
            return conflicts
            
        except Exception as e:
            logger.error(
                "Conflict detection failed",
                error=str(e)
            )
            return []
    
    async def _detect_quantitative_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect conflicts in quantitative data."""
        conflicts = []
        
        # Group quantities by type
        quantity_groups = defaultdict(list)
        for data in data_list:
            for qty_type, qty_value in data.quantities.items():
                if isinstance(qty_value, (int, float, dict)):
                    # Handle both raw numbers and normalized measurements
                    if isinstance(qty_value, dict) and 'value' in qty_value:
                        numeric_value = qty_value['value']
                    else:
                        numeric_value = qty_value
                    
                    if isinstance(numeric_value, (int, float)):
                        quantity_groups[qty_type].append({
                            'value': numeric_value,
                            'chunk_id': data.chunk_id,
                            'data': data,
                            'original': qty_value
                        })
        
        # Check for conflicts in each quantity type
        for qty_type, values in quantity_groups.items():
            if len(values) < 2:
                continue
            
            conflict = await self._analyze_quantitative_values(qty_type, values)
            if conflict:
                conflicts.append(conflict)
        
        return conflicts
    
    async def _analyze_quantitative_values(
        self,
        qty_type: str,
        values: List[Dict[str, Any]]
    ) -> Optional[Conflict]:
        """Analyze quantitative values for conflicts."""
        
        numeric_values = [v['value'] for v in values]
        
        # Statistical analysis
        mean_val = statistics.mean(numeric_values)
        if len(numeric_values) > 2:
            stdev = statistics.stdev(numeric_values)
        else:
            stdev = 0
        
        # Detect outliers using statistical threshold
        outliers = []
        for i, val in enumerate(numeric_values):
            if stdev > 0:
                z_score = abs(val - mean_val) / stdev
                if z_score > self.tolerance_thresholds['statistical_outlier_threshold']:
                    outliers.append(i)
        
        # Detect significant variations using relative tolerance
        max_val = max(numeric_values)
        min_val = min(numeric_values)
        relative_diff = (max_val - min_val) / max_val if max_val > 0 else 0
        
        # Check if variation exceeds tolerance
        has_conflict = False
        if relative_diff > self.tolerance_thresholds['quantity_relative_tolerance']:
            # Also check absolute tolerance for small values
            absolute_diff = max_val - min_val
            if absolute_diff > self.tolerance_thresholds['quantity_absolute_tolerance']:
                has_conflict = True
        
        if has_conflict or outliers:
            # Create evidence for each value
            evidence = []
            for value_info in values:
                evidence.append(Evidence(
                    source_chunk_id=value_info['chunk_id'],
                    content=f"{qty_type}: {value_info['value']}",
                    confidence=value_info['data'].extraction_confidence,
                    quality_score=0.8 if value_info['data'].data_quality == 'high' else 0.5,
                    supporting_data={'original_value': value_info['original']}
                ))
            
            # Calculate severity based on variation
            severity = min(relative_diff * 2, 1.0)  # Scale to 0-1
            
            return Conflict(
                conflict_type=ConflictType.QUANTITATIVE_MISMATCH,
                description=f"Quantitative mismatch in {qty_type}: values range from {min_val:.2f} to {max_val:.2f} ({relative_diff:.1%} variation)",
                conflicting_chunks=[v['chunk_id'] for v in values],
                conflicting_values=[v['value'] for v in values],
                severity=severity,
                evidence=evidence,
                context={
                    'quantity_type': qty_type,
                    'statistics': {
                        'mean': mean_val,
                        'standard_deviation': stdev,
                        'relative_variation': relative_diff,
                        'outlier_indices': outliers
                    }
                }
            )
        
        return None
    
    async def _detect_qualitative_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect conflicts in qualitative/descriptive data."""
        conflicts = []
        
        # Group properties by key
        property_groups = defaultdict(list)
        for data in data_list:
            for prop_key, prop_value in data.properties.items():
                if isinstance(prop_value, str):
                    property_groups[prop_key].append({
                        'value': prop_value.lower().strip(),
                        'original_value': prop_value,
                        'chunk_id': data.chunk_id,
                        'data': data
                    })
        
        # Check for conflicts in each property
        for prop_key, prop_values in property_groups.items():
            if len(prop_values) < 2:
                continue
            
            # Check for contradictory values
            unique_values = set(v['value'] for v in prop_values)
            if len(unique_values) > 1:
                # Analyze if these are genuine conflicts or variations
                conflict = await self._analyze_qualitative_values(prop_key, prop_values)
                if conflict:
                    conflicts.append(conflict)
        
        return conflicts
    
    async def _analyze_qualitative_values(
        self,
        prop_key: str,
        prop_values: List[Dict[str, Any]]
    ) -> Optional[Conflict]:
        """Analyze qualitative values for conflicts."""
        
        # Count occurrences of each value
        value_counts = Counter(v['value'] for v in prop_values)
        
        # If there's a clear majority, might not be a conflict
        total_count = len(prop_values)
        majority_count = value_counts.most_common(1)[0][1]
        majority_ratio = majority_count / total_count
        
        # Only consider it a conflict if no clear majority exists
        if majority_ratio < self.tolerance_thresholds['majority_threshold']:
            evidence = []
            for prop_info in prop_values:
                evidence.append(Evidence(
                    source_chunk_id=prop_info['chunk_id'],
                    content=f"{prop_key}: {prop_info['original_value']}",
                    confidence=prop_info['data'].extraction_confidence,
                    quality_score=0.7,
                    supporting_data={'normalized_value': prop_info['value']}
                ))
            
            # Calculate severity based on how evenly values are distributed
            severity = 1.0 - majority_ratio  # Higher severity for more even distribution
            
            return Conflict(
                conflict_type=ConflictType.QUALITATIVE_CONTRADICTION,
                description=f"Qualitative contradiction in {prop_key}: {len(value_counts)} different values found",
                conflicting_chunks=[v['chunk_id'] for v in prop_values],
                conflicting_values=[v['original_value'] for v in prop_values],
                severity=severity,
                evidence=evidence,
                context={
                    'property_key': prop_key,
                    'value_distribution': dict(value_counts),
                    'majority_ratio': majority_ratio
                }
            )
        
        return None
    
    async def _detect_entity_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect conflicts in entity identification."""
        conflicts = []
        
        # Group entities by ID if available
        entity_groups = defaultdict(list)
        for data in data_list:
            for entity in data.entities:
                entity_id = entity.get('entity_id')
                if entity_id:
                    entity_groups[entity_id].append({
                        'entity': entity,
                        'chunk_id': data.chunk_id,
                        'data': data
                    })
        
        # Check for conflicts in entity types or properties for the same ID
        for entity_id, entities in entity_groups.items():
            if len(entities) < 2:
                continue
            
            # Check for type conflicts
            entity_types = set(e['entity'].get('type') for e in entities if e['entity'].get('type'))
            if len(entity_types) > 1:
                evidence = []
                for entity_info in entities:
                    evidence.append(Evidence(
                        source_chunk_id=entity_info['chunk_id'],
                        content=f"Entity {entity_id} type: {entity_info['entity'].get('type')}",
                        confidence=entity_info['data'].extraction_confidence,
                        quality_score=0.8
                    ))
                
                conflicts.append(Conflict(
                    conflict_type=ConflictType.ENTITY_MISMATCH,
                    description=f"Entity {entity_id} has conflicting types: {', '.join(entity_types)}",
                    conflicting_chunks=[e['chunk_id'] for e in entities],
                    conflicting_values=list(entity_types),
                    severity=0.8,
                    evidence=evidence,
                    context={'entity_id': entity_id, 'conflicting_types': list(entity_types)}
                ))
        
        return conflicts
    
    async def _detect_property_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect property-level conflicts."""
        conflicts = []
        
        # This is similar to qualitative conflicts but focuses on specific property contradictions
        # Could be expanded with domain-specific property validation rules
        
        return conflicts
    
    async def _detect_spatial_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect spatial relationship conflicts."""
        conflicts = []
        
        # Check for spatial context inconsistencies
        spatial_contexts = []
        for data in data_list:
            if data.spatial_context:
                spatial_contexts.append({
                    'context': data.spatial_context,
                    'chunk_id': data.chunk_id,
                    'data': data
                })
        
        if len(spatial_contexts) < 2:
            return conflicts
        
        # Check for floor/level conflicts
        floors = [ctx['context'].get('floor') for ctx in spatial_contexts if ctx['context'].get('floor') is not None]
        if len(set(floors)) > 1 and len(floors) > 1:
            evidence = []
            for ctx_info in spatial_contexts:
                floor = ctx_info['context'].get('floor')
                if floor is not None:
                    evidence.append(Evidence(
                        source_chunk_id=ctx_info['chunk_id'],
                        content=f"Floor: {floor}",
                        confidence=ctx_info['data'].extraction_confidence,
                        quality_score=0.7
                    ))
            
            conflicts.append(Conflict(
                conflict_type=ConflictType.ENTITY_MISMATCH,
                description=f"Spatial floor conflict: multiple floors mentioned ({', '.join(map(str, set(floors)))})",
                conflicting_chunks=[ctx['chunk_id'] for ctx in spatial_contexts if ctx['context'].get('floor') is not None],
                conflicting_values=list(set(floors)),
                severity=0.6,
                evidence=evidence,
                context={'spatial_type': 'floor', 'conflicting_floors': list(set(floors))}
            ))
        
        return conflicts
    
    async def _detect_relationship_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect relationship conflicts."""
        conflicts = []
        
        # Collect all relationships
        all_relationships = []
        for data in data_list:
            for relationship in data.relationships:
                all_relationships.append({
                    'relationship': relationship,
                    'chunk_id': data.chunk_id,
                    'data': data
                })
        
        # Check for contradictory relationships (same source/target with different types)
        relationship_map = defaultdict(list)
        for rel_info in all_relationships:
            rel = rel_info['relationship']
            source = rel.get('source')
            target = rel.get('target')
            if source and target:
                key = (source, target)
                relationship_map[key].append(rel_info)
        
        # Look for conflicts in relationship types
        for (source, target), relationships in relationship_map.items():
            if len(relationships) < 2:
                continue
            
            rel_types = set(r['relationship'].get('type') for r in relationships if r['relationship'].get('type'))
            if len(rel_types) > 1:
                evidence = []
                for rel_info in relationships:
                    evidence.append(Evidence(
                        source_chunk_id=rel_info['chunk_id'],
                        content=f"{source} -> {target}: {rel_info['relationship'].get('type')}",
                        confidence=rel_info['data'].extraction_confidence,
                        quality_score=0.6
                    ))
                
                conflicts.append(Conflict(
                    conflict_type=ConflictType.RELATIONSHIP_CONFLICT,
                    description=f"Relationship conflict between {source} and {target}: {', '.join(rel_types)}",
                    conflicting_chunks=[r['chunk_id'] for r in relationships],
                    conflicting_values=list(rel_types),
                    severity=0.7,
                    evidence=evidence,
                    context={
                        'source_entity': source,
                        'target_entity': target,
                        'conflicting_types': list(rel_types)
                    }
                ))
        
        return conflicts
    
    async def _detect_missing_information_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect missing information that should be consistent across chunks."""
        conflicts = []
        
        # Find entities that appear in multiple chunks
        entity_appearances = defaultdict(list)
        for data in data_list:
            for entity in data.entities:
                entity_id = entity.get('entity_id')
                if entity_id:
                    entity_appearances[entity_id].append({
                        'entity': entity,
                        'chunk_id': data.chunk_id,
                        'data': data
                    })
        
        # Check for missing properties in some chunks
        for entity_id, appearances in entity_appearances.items():
            if len(appearances) < 2:
                continue
            
            # Collect all properties mentioned for this entity
            all_properties = set()
            entity_properties = {}
            for appearance in appearances:
                entity = appearance['entity']
                chunk_id = appearance['chunk_id']
                entity_props = entity.get('properties', {})
                all_properties.update(entity_props.keys())
                entity_properties[chunk_id] = entity_props
            
            # Check for properties missing in some chunks
            for prop_name in all_properties:
                chunks_with_prop = [cid for cid, props in entity_properties.items() if prop_name in props]
                chunks_without_prop = [cid for cid, props in entity_properties.items() if prop_name not in props]
                
                if chunks_without_prop and len(chunks_with_prop) >= 2:
                    # This might indicate missing information
                    evidence = []
                    for chunk_id in chunks_with_prop:
                        evidence.append(Evidence(
                            source_chunk_id=chunk_id,
                            content=f"Entity {entity_id} has property {prop_name}: {entity_properties[chunk_id][prop_name]}",
                            confidence=0.6,
                            quality_score=0.5
                        ))
                    
                    conflicts.append(Conflict(
                        conflict_type=ConflictType.MISSING_INFORMATION,
                        description=f"Property {prop_name} for entity {entity_id} missing in some chunks",
                        conflicting_chunks=chunks_without_prop,
                        conflicting_values=[f"missing_{prop_name}"],
                        severity=0.4,  # Lower severity for missing info
                        evidence=evidence,
                        context={
                            'entity_id': entity_id,
                            'missing_property': prop_name,
                            'chunks_with_property': chunks_with_prop,
                            'chunks_without_property': chunks_without_prop
                        }
                    ))
        
        return conflicts
    
    async def _detect_unit_inconsistencies(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect unit inconsistencies in measurements."""
        conflicts = []
        
        # Check for quantities with different units
        quantity_units = defaultdict(list)
        for data in data_list:
            for qty_type, qty_value in data.quantities.items():
                if isinstance(qty_value, dict) and 'unit' in qty_value and 'original_unit' in qty_value:
                    if qty_value['original_unit'] and qty_value['original_unit'] != qty_value['unit']:
                        quantity_units[qty_type].append({
                            'original_unit': qty_value['original_unit'],
                            'standard_unit': qty_value['unit'],
                            'chunk_id': data.chunk_id,
                            'value': qty_value['original_value']
                        })
        
        # Look for inconsistent original units
        for qty_type, unit_info in quantity_units.items():
            if len(unit_info) < 2:
                continue
            
            original_units = set(info['original_unit'] for info in unit_info)
            if len(original_units) > 1:
                evidence = []
                for info in unit_info:
                    evidence.append(Evidence(
                        source_chunk_id=info['chunk_id'],
                        content=f"{qty_type}: {info['value']} {info['original_unit']}",
                        confidence=0.7,
                        quality_score=0.6
                    ))
                
                conflicts.append(Conflict(
                    conflict_type=ConflictType.INCONSISTENT_UNITS,
                    description=f"Inconsistent units for {qty_type}: {', '.join(original_units)}",
                    conflicting_chunks=[info['chunk_id'] for info in unit_info],
                    conflicting_values=list(original_units),
                    severity=0.5,
                    evidence=evidence,
                    context={
                        'quantity_type': qty_type,
                        'inconsistent_units': list(original_units)
                    }
                ))
        
        return conflicts
    
    async def _filter_and_rank_conflicts(self, conflicts: List[Conflict]) -> List[Conflict]:
        """Filter and rank conflicts by severity and importance."""
        
        # Filter out low-severity conflicts
        filtered_conflicts = [c for c in conflicts if c.severity >= 0.3]
        
        # Sort by severity (highest first)
        filtered_conflicts.sort(key=lambda c: c.severity, reverse=True)
        
        return filtered_conflicts
