"""
Quantity aggregation strategy for numerical data.

This module implements statistical aggregation techniques for quantitative
data including volumes, areas, counts, and measurements with uncertainty
propagation and confidence calculation.
"""

import statistics
from typing import Any, Dict, List, Optional, Union
from collections import defaultdict
import structlog

from ...types.aggregation_types import (
    ExtractedData, AggregationStrategyBase, AggregationStrategy,
    ConflictResolution, QualityMetrics
)
from ...query.types import QueryContext, QueryIntent

logger = structlog.get_logger(__name__)


class QuantityAggregationStrategy(AggregationStrategyBase):
    """Statistical aggregation strategy for quantitative data."""
    
    def __init__(self, confidence_threshold: float = 0.3):
        self.confidence_threshold = confidence_threshold
        self.supported_intents = [QueryIntent.QUANTITY, QueryIntent.COST]
        
    async def aggregate(
        self,
        extracted_data: List[ExtractedData],
        context: QueryContext,
        resolutions: Optional[List[ConflictResolution]] = None
    ) -> Dict[str, Any]:
        """Aggregate quantitative data using statistical methods."""
        logger.debug(
            "Starting quantity aggregation",
            data_count=len(extracted_data),
            intent=context.intent.value
        )
        
        # Filter high-confidence data
        high_conf_data = [
            data for data in extracted_data
            if data.extraction_confidence >= self.confidence_threshold
        ]
        
        if not high_conf_data:
            logger.warning("No high-confidence data for aggregation")
            return {"aggregation_method": "none", "reason": "insufficient_confidence"}
        
        # Apply conflict resolutions if provided
        resolved_data = self._apply_resolutions(high_conf_data, resolutions or [])
        
        # Aggregate quantities
        aggregated_quantities = await self._aggregate_quantities(resolved_data)
        
        # Calculate statistical metrics
        statistical_metrics = await self._calculate_statistics(resolved_data)
        
        # Determine aggregation confidence
        aggregation_confidence = self._calculate_aggregation_confidence(resolved_data)
        
        result = {
            "aggregation_method": "statistical",
            "strategy": AggregationStrategy.QUANTITATIVE.value,
            "aggregated_quantities": aggregated_quantities,
            "statistical_metrics": statistical_metrics,
            "aggregation_confidence": aggregation_confidence,
            "data_sources": len(resolved_data),
            "resolution_applied": len(resolutions or 0)
        }
        
        logger.info(
            "Quantity aggregation completed",
            quantities_count=len(aggregated_quantities),
            confidence=aggregation_confidence
        )
        
        return result
    
    def get_supported_intents(self) -> List[QueryIntent]:
        """Get list of query intents this strategy supports."""
        return self.supported_intents
    
    async def _aggregate_quantities(self, data_list: List[ExtractedData]) -> Dict[str, Dict[str, Any]]:
        """Aggregate quantities using statistical methods."""
        quantity_groups = defaultdict(list)
        
        # Group quantities by key
        for data in data_list:
            for qty_key, qty_value in data.quantities.items():
                if isinstance(qty_value, (int, float)):
                    quantity_groups[qty_key].append({
                        "value": qty_value,
                        "confidence": data.extraction_confidence,
                        "source": data.chunk_id
                    })
        
        aggregated = {}
        for qty_key, values_info in quantity_groups.items():
            if len(values_info) == 1:
                # Single value - no aggregation needed
                info = values_info[0]
                aggregated[qty_key] = {
                    "value": info["value"],
                    "method": "single_source",
                    "confidence": info["confidence"],
                    "uncertainty": 0.0,
                    "sources": [info["source"]]
                }
            else:
                # Multiple values - apply statistical aggregation
                aggregated[qty_key] = await self._statistical_aggregation(qty_key, values_info)
        
        return aggregated
    
    async def _statistical_aggregation(self, key: str, values_info: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply statistical aggregation to multiple values."""
        values = [vi["value"] for vi in values_info]
        confidences = [vi["confidence"] for vi in values_info]
        sources = [vi["source"] for vi in values_info]
        
        # Calculate statistical measures
        mean_val = statistics.mean(values)
        median_val = statistics.median(values)
        
        # Calculate weighted average by confidence
        total_weight = sum(confidences)
        weighted_avg = sum(v * c for v, c in zip(values, confidences)) / total_weight if total_weight > 0 else mean_val
        
        # Determine best aggregation method
        if len(values) >= 3:
            stdev = statistics.stdev(values)
            cv = stdev / mean_val if mean_val != 0 else float('inf')  # Coefficient of variation
            
            if cv < 0.1:  # Low variation - use weighted average
                final_value = weighted_avg
                method = "confidence_weighted"
                uncertainty = stdev / mean_val if mean_val != 0 else 0.5
            elif cv < 0.3:  # Moderate variation - use median
                final_value = median_val
                method = "median"
                uncertainty = stdev / mean_val if mean_val != 0 else 0.3
            else:  # High variation - flag for review
                final_value = mean_val
                method = "mean_with_high_uncertainty"
                uncertainty = min(cv, 1.0)
        else:
            # Only 2 values
            final_value = weighted_avg
            method = "confidence_weighted"
            diff = abs(values[0] - values[1])
            uncertainty = diff / max(abs(v) for v in values) if any(v != 0 for v in values) else 0.5
        
        return {
            "value": final_value,
            "method": method,
            "confidence": statistics.mean(confidences),
            "uncertainty": uncertainty,
            "sources": sources,
            "raw_values": values,
            "statistics": {
                "mean": mean_val,
                "median": median_val,
                "std_dev": statistics.stdev(values) if len(values) > 1 else 0.0,
                "min": min(values),
                "max": max(values),
                "count": len(values)
            }
        }
    
    async def _calculate_statistics(self, data_list: List[ExtractedData]) -> Dict[str, Any]:
        """Calculate overall statistical metrics."""
        all_quantities = []
        for data in data_list:
            all_quantities.extend([v for v in data.quantities.values() if isinstance(v, (int, float))])
        
        if not all_quantities:
            return {"error": "no_numerical_quantities"}
        
        return {
            "total_quantities": len(all_quantities),
            "mean": statistics.mean(all_quantities),
            "median": statistics.median(all_quantities),
            "std_dev": statistics.stdev(all_quantities) if len(all_quantities) > 1 else 0.0,
            "min": min(all_quantities),
            "max": max(all_quantities),
            "sum": sum(all_quantities)
        }
    
    def _calculate_aggregation_confidence(self, data_list: List[ExtractedData]) -> float:
        """Calculate overall confidence in the aggregation."""
        if not data_list:
            return 0.0
        
        # Base confidence from individual extractions
        extraction_confidences = [data.extraction_confidence for data in data_list]
        base_confidence = statistics.mean(extraction_confidences)
        
        # Adjust for data consistency
        consistency_bonus = 0.0
        if len(data_list) > 1:
            # More data sources increase confidence
            source_bonus = min(len(data_list) * 0.05, 0.2)
            
            # Consistent extractions increase confidence
            if statistics.stdev(extraction_confidences) < 0.1:
                consistency_bonus = 0.1
            
            base_confidence += source_bonus + consistency_bonus
        
        return min(base_confidence, 1.0)
    
    def _apply_resolutions(
        self,
        data_list: List[ExtractedData],
        resolutions: List[ConflictResolution]
    ) -> List[ExtractedData]:
        """Apply conflict resolutions to the data."""
        if not resolutions:
            return data_list
        
        # Create a mapping of resolutions by chunk
        resolution_map = {}
        for resolution in resolutions:
            for chunk_id in resolution.conflict.conflicting_chunks:
                if chunk_id not in resolution_map:
                    resolution_map[chunk_id] = []
                resolution_map[chunk_id].append(resolution)
        
        # Apply resolutions
        resolved_data = []
        for data in data_list:
            if data.chunk_id in resolution_map:
                # Apply resolutions to this data
                modified_data = self._apply_resolution_to_data(data, resolution_map[data.chunk_id])
                resolved_data.append(modified_data)
            else:
                resolved_data.append(data)
        
        return resolved_data
    
    def _apply_resolution_to_data(
        self,
        data: ExtractedData,
        resolutions: List[ConflictResolution]
    ) -> ExtractedData:
        """Apply conflict resolutions to a single data object."""
        # Create a copy of the data
        modified_quantities = data.quantities.copy()
        
        # Apply each resolution
        for resolution in resolutions:
            conflict = resolution.conflict
            
            # For quantity conflicts, update the conflicting values
            if hasattr(conflict, 'context') and 'quantity_key' in conflict.context:
                qty_key = conflict.context['quantity_key']
                if qty_key in modified_quantities:
                    modified_quantities[qty_key] = resolution.resolved_value
        
        # Create new ExtractedData with modifications
        return ExtractedData(
            entities=data.entities,
            quantities=modified_quantities,
            properties=data.properties,
            relationships=data.relationships,
            chunk_id=data.chunk_id,
            extraction_confidence=data.extraction_confidence,
            data_quality=data.data_quality,
            processing_errors=data.processing_errors,
            spatial_context=data.spatial_context,
            temporal_context=data.temporal_context,
            semantic_context=data.semantic_context
        )