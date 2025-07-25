"""
Refactored conflict detection orchestrator.

This module coordinates different conflict detection strategies
for maintainability and single responsibility compliance.
"""

from typing import Any, Dict, List, Optional
import structlog

from ...types.aggregation_types import ExtractedData, Conflict, ConflictType
from ...query.types import QueryContext, QueryIntent
from .detectors import (
    QuantitativeConflictDetector,
    QualitativeConflictDetector, 
    EntityConflictDetector,
    SpatialConflictDetector,
    RelationshipConflictDetector
)

logger = structlog.get_logger(__name__)


class ConflictDetector:
    """
    Orchestrates conflict detection using specialized detector strategies.
    
    Coordinates multiple focused conflict detectors to identify
    contradictions and inconsistencies across extracted data.
    """
    
    def __init__(self, tolerance_thresholds: Optional[Dict[str, float]] = None):
        """Initialize conflict detector with specialized detectors."""
        self.tolerance_thresholds = tolerance_thresholds or {
            'quantity_relative_tolerance': 0.05,  # 5% relative tolerance for quantities
            'quantity_absolute_tolerance': 0.1,   # Absolute tolerance for small quantities
            'confidence_threshold': 0.3,          # Minimum confidence to consider data
            'majority_threshold': 0.6,            # Threshold for majority rule
            'statistical_outlier_threshold': 2.0  # Standard deviations for outlier detection
        }
        
        # Initialize specialized detectors
        self.quantitative_detector = QuantitativeConflictDetector(self.tolerance_thresholds)
        self.qualitative_detector = QualitativeConflictDetector(self.tolerance_thresholds)
        self.entity_detector = EntityConflictDetector(self.tolerance_thresholds)
        self.spatial_detector = SpatialConflictDetector(self.tolerance_thresholds)
        self.relationship_detector = RelationshipConflictDetector(self.tolerance_thresholds)
        
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
        
        # Filter out low-confidence data
        high_confidence_data = [
            data for data in extracted_data_list
            if data.extraction_confidence >= self.tolerance_thresholds['confidence_threshold']
        ]
        
        if len(high_confidence_data) < 2:
            logger.debug("Insufficient high-confidence data for conflict detection")
            return []
        
        conflicts = []
        
        try:
            # Apply appropriate detectors based on query intent
            if context.intent in [QueryIntent.QUANTITY, QueryIntent.COST]:
                conflicts.extend(await self.quantitative_detector.detect_conflicts(high_confidence_data))
            
            if context.intent in [QueryIntent.COMPONENT, QueryIntent.MATERIAL]:
                conflicts.extend(await self.qualitative_detector.detect_conflicts(high_confidence_data))
                conflicts.extend(await self.entity_detector.detect_conflicts(high_confidence_data))
            
            if context.intent == QueryIntent.SPATIAL:
                conflicts.extend(await self.spatial_detector.detect_conflicts(high_confidence_data))
                conflicts.extend(await self.relationship_detector.detect_conflicts(high_confidence_data))
            
            # Always check for general conflicts regardless of intent
            conflicts.extend(await self._detect_general_conflicts(high_confidence_data))
            
            logger.info(
                "Conflict detection completed",
                conflicts_detected=len(conflicts),
                conflict_types=[c.conflict_type.value for c in conflicts]
            )
            
            return conflicts
            
        except Exception as e:
            logger.error("Conflict detection failed", error=str(e))
            return []
    
    async def _detect_general_conflicts(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect general conflicts that apply regardless of query intent."""
        conflicts = []
        
        # Check for missing information conflicts
        conflicts.extend(await self._detect_missing_information(data_list))
        
        # Check for unit inconsistencies
        conflicts.extend(await self._detect_unit_inconsistencies(data_list))
        
        return conflicts
    
    async def _detect_missing_information(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect missing information conflicts."""
        conflicts = []
        
        # Check if some chunks have significantly more data than others
        data_richness = [
            len(data.entities) + len(data.quantities) + len(data.properties)
            for data in data_list
        ]
        
        if data_richness and max(data_richness) > min(data_richness) * 2:
            # Significant data imbalance detected
            conflicts.append(Conflict(
                conflict_type=ConflictType.MISSING_INFORMATION,
                description=f"Data richness imbalance: {min(data_richness)} to {max(data_richness)} items",
                conflicting_chunks=[data.chunk_id for data in data_list],
                conflicting_values=data_richness,
                severity=0.3,
                evidence=[],
                context={'data_richness': data_richness}
            ))
        
        return conflicts
    
    async def _detect_unit_inconsistencies(self, data_list: List[ExtractedData]) -> List[Conflict]:
        """Detect unit inconsistencies in quantity data."""
        conflicts = []
        
        # Check for different units in similar quantities
        quantity_units = {}
        for data in data_list:
            for qty_key, qty_value in data.quantities.items():
                if isinstance(qty_value, str) and any(unit in qty_value.lower() for unit in ['m³', 'm²', 'm', 'kg', 'ton']):
                    if qty_key not in quantity_units:
                        quantity_units[qty_key] = set()
                    # Extract unit (simplified)
                    for unit in ['m³', 'm²', 'm', 'kg', 'ton']:
                        if unit in qty_value.lower():
                            quantity_units[qty_key].add(unit)
                            break
        
        # Check for multiple units for the same quantity type
        for qty_key, units in quantity_units.items():
            if len(units) > 1:
                conflicts.append(Conflict(
                    conflict_type=ConflictType.INCONSISTENT_UNITS,
                    description=f"Unit inconsistency for {qty_key}: {list(units)}",
                    conflicting_chunks=[data.chunk_id for data in data_list],
                    conflicting_values=list(units),
                    severity=0.4,
                    evidence=[],
                    context={'quantity_key': qty_key, 'units': list(units)}
                ))
        
        return conflicts