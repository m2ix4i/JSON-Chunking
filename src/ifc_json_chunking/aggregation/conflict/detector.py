"""
Conflict detection system for aggregated IFC data.

This module identifies conflicts and inconsistencies across multiple
data sources in the aggregation pipeline.
"""

from typing import List, Dict, Any, Optional
import structlog

from ...query.types import QueryContext
from ...types.aggregation_types import (
    ExtractedData, Conflict, ConflictType, Evidence
)

logger = structlog.get_logger(__name__)


class ConflictDetector:
    """
    Detects conflicts and inconsistencies in extracted data across multiple sources.
    
    Analyzes extracted data for quantitative mismatches, qualitative contradictions,
    and other inconsistencies that need resolution.
    """
    
    def __init__(self, sensitivity_threshold: float = 0.1):
        """
        Initialize conflict detector.
        
        Args:
            sensitivity_threshold: Threshold for detecting quantitative differences
        """
        self.sensitivity_threshold = sensitivity_threshold
        
        logger.info(
            "ConflictDetector initialized", 
            sensitivity_threshold=sensitivity_threshold
        )
    
    async def detect_conflicts(
        self,
        normalized_data_list: List[ExtractedData],
        context: QueryContext
    ) -> List[Conflict]:
        """
        Detect conflicts across normalized data sources.
        
        Args:
            normalized_data_list: List of normalized extracted data
            context: Query context for conflict detection scope
            
        Returns:
            List of detected conflicts
        """
        conflicts = []
        
        logger.debug(
            "Starting conflict detection",
            data_sources=len(normalized_data_list),
            query_id=context.query_id
        )
        
        # Detect quantitative conflicts
        quantitative_conflicts = await self._detect_quantitative_conflicts(
            normalized_data_list, context
        )
        conflicts.extend(quantitative_conflicts)
        
        # Detect qualitative conflicts
        qualitative_conflicts = await self._detect_qualitative_conflicts(
            normalized_data_list, context
        )
        conflicts.extend(qualitative_conflicts)
        
        # Detect structural conflicts
        structural_conflicts = await self._detect_structural_conflicts(
            normalized_data_list, context
        )
        conflicts.extend(structural_conflicts)
        
        logger.info(
            "Conflict detection completed",
            total_conflicts=len(conflicts),
            quantitative=len(quantitative_conflicts),
            qualitative=len(qualitative_conflicts),
            structural=len(structural_conflicts)
        )
        
        return conflicts
    
    async def _detect_quantitative_conflicts(
        self,
        data_list: List[ExtractedData],
        context: QueryContext
    ) -> List[Conflict]:
        """Detect conflicts in quantitative data."""
        conflicts = []
        
        # Group quantities by type
        quantity_groups: Dict[str, List[tuple]] = {}
        
        for i, data in enumerate(data_list):
            for qty_key, qty_value in data.quantities.items():
                if qty_key not in quantity_groups:
                    quantity_groups[qty_key] = []
                
                quantity_groups[qty_key].append((qty_value, data, i))
        
        # Check for conflicts within each quantity type
        for qty_type, qty_data in quantity_groups.items():
            if len(qty_data) < 2:
                continue
                
            values = [item[0] for item in qty_data]
            
            # Check for significant differences
            if self._has_quantitative_conflict(values):
                # Create evidence list
                evidence = []
                for qty_value, data, idx in qty_data:
                    evidence.append(Evidence(
                        source_id=f"chunk_{idx}",
                        content=f"{qty_type}: {qty_value}",
                        confidence=data.extraction_confidence,
                        chunk_index=idx
                    ))
                
                conflict = Conflict(
                    conflict_type=ConflictType.QUANTITATIVE_MISMATCH,
                    description=f"Conflicting values for {qty_type}",
                    conflicting_values=values,
                    affected_entities=[qty_type],
                    evidence=evidence,
                    severity=self._calculate_conflict_severity(values),
                    resolution_suggestions=[
                        "Use confidence-weighted average",
                        "Use median value",
                        "Flag for manual review"
                    ]
                )
                
                conflicts.append(conflict)
        
        return conflicts
    
    async def _detect_qualitative_conflicts(
        self,
        data_list: List[ExtractedData],
        context: QueryContext
    ) -> List[Conflict]:
        """Detect conflicts in qualitative data."""
        conflicts = []
        
        # Group properties by key
        property_groups: Dict[str, List[tuple]] = {}
        
        for i, data in enumerate(data_list):
            for prop_key, prop_value in data.properties.items():
                if prop_key not in property_groups:
                    property_groups[prop_key] = []
                
                property_groups[prop_key].append((prop_value, data, i))
        
        # Check for conflicts within each property type
        for prop_type, prop_data in property_groups.items():
            if len(prop_data) < 2:
                continue
                
            values = [str(item[0]) for item in prop_data]
            unique_values = set(values)
            
            # Check for contradictions
            if len(unique_values) > 1:
                # Create evidence list
                evidence = []
                for prop_value, data, idx in prop_data:
                    evidence.append(Evidence(
                        source_id=f"chunk_{idx}",
                        content=f"{prop_type}: {prop_value}",
                        confidence=data.extraction_confidence,
                        chunk_index=idx
                    ))
                
                conflict = Conflict(
                    conflict_type=ConflictType.QUALITATIVE_CONTRADICTION,
                    description=f"Contradictory values for {prop_type}",
                    conflicting_values=list(unique_values),
                    affected_entities=[prop_type],
                    evidence=evidence,
                    severity=0.7,  # Medium severity for qualitative conflicts
                    resolution_suggestions=[
                        "Use majority rule",
                        "Use highest confidence source",
                        "Combine all values"
                    ]
                )
                
                conflicts.append(conflict)
        
        return conflicts
    
    async def _detect_structural_conflicts(
        self,
        data_list: List[ExtractedData],
        context: QueryContext
    ) -> List[Conflict]:
        """Detect structural conflicts in data organization."""
        conflicts = []
        
        # Check for missing expected data types
        has_entities = any(data.entities for data in data_list)
        has_quantities = any(data.quantities for data in data_list)
        has_properties = any(data.properties for data in data_list)
        
        # Create structural conflict if data is unexpectedly sparse
        if not has_entities and not has_quantities and not has_properties:
            conflict = Conflict(
                conflict_type=ConflictType.STRUCTURAL_INCONSISTENCY,
                description="No structured data found across all sources",
                conflicting_values=["empty_data"],
                affected_entities=["all"],
                evidence=[Evidence(
                    source_id="global",
                    content="All data sources lack structured content",
                    confidence=1.0,
                    chunk_index=-1
                )],
                severity=0.9,  # High severity
                resolution_suggestions=[
                    "Review extraction process",
                    "Check data quality",
                    "Verify chunk content"
                ]
            )
            
            conflicts.append(conflict)
        
        return conflicts
    
    def _has_quantitative_conflict(self, values: List[Any]) -> bool:
        """Check if quantitative values have significant conflicts."""
        try:
            # Convert to numbers
            numeric_values = []
            for val in values:
                if isinstance(val, (int, float)):
                    numeric_values.append(float(val))
                elif isinstance(val, str):
                    # Try to extract number from string
                    import re
                    numbers = re.findall(r'-?\d+\.?\d*', val)
                    if numbers:
                        numeric_values.append(float(numbers[0]))
            
            if len(numeric_values) < 2:
                return False
            
            # Check coefficient of variation
            mean_val = sum(numeric_values) / len(numeric_values)
            if mean_val == 0:
                return len(set(numeric_values)) > 1
            
            variance = sum((x - mean_val) ** 2 for x in numeric_values) / len(numeric_values)
            cv = (variance ** 0.5) / abs(mean_val)  # Coefficient of variation
            
            return cv > self.sensitivity_threshold
            
        except (ValueError, TypeError):
            # If we can't process as numbers, check for exact matches
            return len(set(str(v) for v in values)) > 1
    
    def _calculate_conflict_severity(self, values: List[Any]) -> float:
        """Calculate severity score for a conflict."""
        try:
            # For numeric values, base severity on coefficient of variation
            numeric_values = []
            for val in values:
                if isinstance(val, (int, float)):
                    numeric_values.append(float(val))
                elif isinstance(val, str):
                    import re
                    numbers = re.findall(r'-?\d+\.?\d*', val)
                    if numbers:
                        numeric_values.append(float(numbers[0]))
            
            if len(numeric_values) >= 2:
                mean_val = sum(numeric_values) / len(numeric_values)
                if mean_val != 0:
                    variance = sum((x - mean_val) ** 2 for x in numeric_values) / len(numeric_values)
                    cv = (variance ** 0.5) / abs(mean_val)
                    return min(cv * 2, 1.0)  # Scale and cap at 1.0
            
            # For non-numeric, base on number of unique values
            unique_count = len(set(str(v) for v in values))
            total_count = len(values)
            
            return min(unique_count / total_count, 1.0)
            
        except Exception:
            return 0.5  # Default medium severity