"""
Quantity-focused aggregation strategy for numerical IFC data.

This module provides specialized aggregation for quantitative queries
including measurements, volumes, areas, counts, and other numerical data.
"""

from typing import Dict, List, Any, Optional
import structlog

from ...query.types import QueryContext, QueryIntent
from ...types.aggregation_types import ExtractedData, Conflict, ConflictResolution

logger = structlog.get_logger(__name__)


class QuantityAggregationStrategy:
    """
    Aggregation strategy specialized for quantitative data analysis.
    
    Handles numerical data aggregation, unit conversion, statistical operations,
    and quantitative conflict resolution.
    """
    
    def __init__(self):
        """Initialize quantity aggregation strategy."""
        logger.info("QuantityAggregationStrategy initialized")
    
    async def aggregate(
        self,
        data_list: List[ExtractedData],
        context: QueryContext
    ) -> Dict[str, Any]:
        """
        Aggregate quantitative data from multiple sources.
        
        Args:
            data_list: List of extracted data to aggregate
            context: Query context for aggregation guidance
            
        Returns:
            Dictionary containing aggregated quantitative results
        """
        logger.debug(
            "Starting quantity aggregation",
            data_sources=len(data_list),
            query_id=context.query_id
        )
        
        aggregated_quantities = {}
        
        # Collect all quantities by type
        quantity_collections = self._collect_quantities_by_type(data_list)
        
        # Aggregate each quantity type
        for qty_type, qty_data in quantity_collections.items():
            aggregated_result = await self._aggregate_quantity_type(
                qty_type, qty_data, context
            )
            if aggregated_result:
                aggregated_quantities[qty_type] = aggregated_result
        
        # Add metadata
        aggregated_quantities['_metadata'] = {
            'strategy': 'quantitative',
            'data_sources': len(data_list),
            'quantity_types': len(aggregated_quantities) - 1,  # Exclude metadata
            'aggregation_method': self._get_aggregation_method(context.intent)
        }
        
        logger.debug(
            "Quantity aggregation completed",
            quantity_types=len(aggregated_quantities) - 1,
            total_values=sum(len(data.quantities) for data in data_list)
        )
        
        return aggregated_quantities
    
    def _collect_quantities_by_type(
        self, 
        data_list: List[ExtractedData]
    ) -> Dict[str, List[tuple]]:
        """Collect quantities grouped by type."""
        collections = {}
        
        for i, data in enumerate(data_list):
            for qty_key, qty_value in data.quantities.items():
                if qty_key not in collections:
                    collections[qty_key] = []
                
                collections[qty_key].append((
                    qty_value,
                    data.extraction_confidence,
                    i,  # source index
                    data
                ))
        
        return collections
    
    async def _aggregate_quantity_type(
        self,
        qty_type: str,
        qty_data: List[tuple],
        context: QueryContext
    ) -> Optional[Dict[str, Any]]:
        """Aggregate a specific quantity type."""
        if not qty_data:
            return None
        
        # Extract numeric values
        numeric_values = []
        confidences = []
        units = set()
        
        for qty_value, confidence, source_idx, source_data in qty_data:
            numeric_value, unit = self._extract_numeric_and_unit(qty_value)
            
            if numeric_value is not None:
                numeric_values.append(numeric_value)
                confidences.append(confidence)
                if unit:
                    units.add(unit)
        
        if not numeric_values:
            return None
        
        # Determine aggregation operation based on context
        operation = self._determine_operation(qty_type, context.intent, len(numeric_values))
        
        # Calculate aggregated value
        if operation == 'sum':
            aggregated_value = sum(numeric_values)
        elif operation == 'average':
            aggregated_value = sum(numeric_values) / len(numeric_values)
        elif operation == 'weighted_average':
            weighted_sum = sum(val * conf for val, conf in zip(numeric_values, confidences))
            total_weight = sum(confidences)
            aggregated_value = weighted_sum / total_weight if total_weight > 0 else 0
        elif operation == 'max':
            aggregated_value = max(numeric_values)
        elif operation == 'min':
            aggregated_value = min(numeric_values)
        elif operation == 'median':
            sorted_values = sorted(numeric_values)
            n = len(sorted_values)
            aggregated_value = (
                sorted_values[n // 2] if n % 2 == 1 
                else (sorted_values[n // 2 - 1] + sorted_values[n // 2]) / 2
            )
        else:
            aggregated_value = numeric_values[0] if numeric_values else 0
        
        # Calculate confidence
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        # Determine unit
        final_unit = list(units)[0] if len(units) == 1 else "mixed" if units else ""
        
        return {
            'value': aggregated_value,
            'unit': final_unit,
            'operation': operation,
            'confidence': avg_confidence,
            'source_count': len(qty_data),
            'raw_values': numeric_values,
            'value_range': {
                'min': min(numeric_values),
                'max': max(numeric_values),
                'std_dev': self._calculate_std_dev(numeric_values)
            }
        }
    
    def _extract_numeric_and_unit(self, value: Any) -> tuple[Optional[float], Optional[str]]:
        """Extract numeric value and unit from mixed data."""
        if isinstance(value, (int, float)):
            return float(value), None
        
        if isinstance(value, str):
            import re
            
            # Try to find number and unit pattern
            pattern = r'(-?\d+\.?\d*)\s*([a-zA-Z²³/]*)'
            match = re.search(pattern, value)
            
            if match:
                try:
                    numeric_value = float(match.group(1))
                    unit = match.group(2).strip() if match.group(2) else None
                    return numeric_value, unit
                except ValueError:
                    pass
        
        return None, None
    
    def _determine_operation(
        self,
        qty_type: str,
        intent: QueryIntent,
        value_count: int
    ) -> str:
        """Determine appropriate aggregation operation."""
        # Single value - no aggregation needed
        if value_count == 1:
            return 'single'
        
        # Intent-based operation selection
        if intent == QueryIntent.QUANTITY:
            # For quantities, usually sum for counts, average for measurements
            if any(keyword in qty_type.lower() for keyword in ['count', 'number', 'quantity']):
                return 'sum'
            elif any(keyword in qty_type.lower() for keyword in ['area', 'volume', 'length', 'height', 'width']):
                return 'sum'  # Total area, volume, etc.
            else:
                return 'weighted_average'
        
        elif intent == QueryIntent.COST:
            # For costs, usually sum
            return 'sum'
        
        else:
            # Default to weighted average for mixed intents
            return 'weighted_average'
    
    def _get_aggregation_method(self, intent: QueryIntent) -> str:
        """Get aggregation method description based on intent."""
        if intent == QueryIntent.QUANTITY:
            return "sum_for_totals_average_for_measurements"
        elif intent == QueryIntent.COST:
            return "sum_for_total_costs"
        else:
            return "weighted_average_default"
    
    def _calculate_std_dev(self, values: List[float]) -> float:
        """Calculate standard deviation of values."""
        if len(values) < 2:
            return 0.0
        
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
        return variance ** 0.5
    
    async def handle_conflicts(
        self,
        conflicts: List[Conflict],
        resolutions: List[ConflictResolution]
    ) -> Dict[str, Any]:
        """Handle quantitative conflicts using statistical methods."""
        conflict_handling = {
            'conflicts_processed': len(conflicts),
            'resolutions_applied': len(resolutions),
            'methods_used': [],
            'adjustments_made': []
        }
        
        for resolution in resolutions:
            if resolution.strategy.value in ['confidence_weighted', 'statistical_median']:
                conflict_handling['methods_used'].append(resolution.strategy.value)
                conflict_handling['adjustments_made'].append({
                    'conflict_type': resolution.conflict.conflict_type.value,
                    'resolved_value': resolution.resolved_value,
                    'confidence': resolution.confidence
                })
        
        return conflict_handling