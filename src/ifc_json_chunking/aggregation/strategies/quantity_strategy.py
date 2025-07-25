"""
Quantitative aggregation strategy for numerical data.

This module implements sophisticated aggregation algorithms for
quantitative data including summation, averaging, statistical analysis,
and handling of measurements with units and uncertainties.
"""

import statistics
from typing import Any, Dict, List, Optional, Tuple, Union
from collections import defaultdict
import structlog

from ...query.types import QueryContext, QueryIntent
from ...types.aggregation_types import (
    ExtractedData, AggregationStrategyBase, Conflict, ConflictResolution
)

logger = structlog.get_logger(__name__)


class QuantityAggregationStrategy(AggregationStrategyBase):
    """
    Aggregation strategy for quantitative/numerical data.
    
    Handles summation, averaging, statistical analysis, and
    uncertainty propagation for measurements and calculations.
    """
    
    def __init__(self):
        """Initialize quantity aggregation strategy."""
        self.supported_intents = [
            QueryIntent.QUANTITY,
            QueryIntent.COST,
            QueryIntent.COMPONENT  # For counting components
        ]
        
        self.aggregation_methods = {
            'volume': 'sum',
            'area': 'sum', 
            'length': 'sum',
            'weight': 'sum',
            'cost': 'sum',
            'count': 'sum',
            'temperature': 'average',
            'pressure': 'average',
            'density': 'average'
        }
        
        logger.info("QuantityAggregationStrategy initialized")
    
    async def aggregate(
        self,
        extracted_data: List[ExtractedData],
        context: QueryContext
    ) -> Dict[str, Any]:
        """
        Aggregate quantitative data from multiple chunks.
        
        Args:
            extracted_data: List of extracted data to aggregate
            context: Query context for aggregation guidance
            
        Returns:
            Aggregated quantitative results
        """
        logger.debug(
            "Starting quantity aggregation",
            data_count=len(extracted_data),
            query_intent=context.intent.value
        )
        
        if not extracted_data:
            return {}
        
        try:
            # Filter high-confidence data
            reliable_data = [
                data for data in extracted_data
                if data.extraction_confidence >= 0.3 and data.quantities
            ]
            
            if not reliable_data:
                logger.warning("No reliable quantitative data found")
                return {}
            
            # Group quantities by type
            quantity_groups = await self._group_quantities(reliable_data)
            
            # Aggregate each quantity type
            aggregated_results = {}
            for qty_type, qty_data in quantity_groups.items():
                aggregated_qty = await self._aggregate_quantity_type(qty_type, qty_data, context)
                if aggregated_qty:
                    aggregated_results[qty_type] = aggregated_qty
            
            # Calculate summary statistics
            summary = await self._calculate_summary_statistics(aggregated_results, reliable_data)
            aggregated_results['_summary'] = summary
            
            logger.info(
                "Quantity aggregation completed",
                aggregated_types=list(aggregated_results.keys()),
                total_quantities=len(aggregated_results)
            )
            
            return aggregated_results
            
        except Exception as e:
            logger.error(
                "Quantity aggregation failed",
                error=str(e)
            )
            return {}
    
    async def _group_quantities(self, data_list: List[ExtractedData]) -> Dict[str, List[Dict[str, Any]]]:
        """Group quantities by type across all data sources."""
        quantity_groups = defaultdict(list)
        
        for data in data_list:
            for qty_type, qty_value in data.quantities.items():
                if qty_type == 'raw_numbers':
                    # Handle raw numbers separately
                    if isinstance(qty_value, list):
                        for i, number in enumerate(qty_value):
                            quantity_groups[f'raw_number_{i}'].append({
                                'value': number,
                                'unit': None,
                                'confidence': data.extraction_confidence,
                                'chunk_id': data.chunk_id,
                                'data_quality': data.data_quality,
                                'original_value': number
                            })
                    continue
                
                # Handle structured quantity data
                if isinstance(qty_value, dict) and 'value' in qty_value:
                    quantity_groups[qty_type].append({
                        'value': qty_value['value'],
                        'unit': qty_value.get('unit'),
                        'confidence': data.extraction_confidence,
                        'chunk_id': data.chunk_id,
                        'data_quality': data.data_quality,
                        'original_value': qty_value.get('original_value', qty_value['value']),
                        'original_unit': qty_value.get('original_unit'),
                        'measurement_type': qty_value.get('measurement_type', qty_type)
                    })
                elif isinstance(qty_value, (int, float)):
                    # Handle simple numeric values
                    quantity_groups[qty_type].append({
                        'value': qty_value,
                        'unit': None,
                        'confidence': data.extraction_confidence,
                        'chunk_id': data.chunk_id,
                        'data_quality': data.data_quality,
                        'original_value': qty_value
                    })
        
        return quantity_groups
    
    async def _aggregate_quantity_type(
        self,
        qty_type: str,
        qty_data: List[Dict[str, Any]],
        context: QueryContext
    ) -> Optional[Dict[str, Any]]:
        """Aggregate quantities of a specific type."""
        
        if not qty_data:
            return None
        
        # Extract numeric values
        values = [item['value'] for item in qty_data if isinstance(item['value'], (int, float))]
        
        if not values:
            return None
        
        # Determine aggregation method
        method = self.aggregation_methods.get(qty_type, 'sum')
        if 'count' in qty_type.lower():
            method = 'sum'
        elif 'average' in context.original_query.lower() or 'mean' in context.original_query.lower():
            method = 'average'
        
        # Perform aggregation
        try:
            if method == 'sum':
                aggregated_value = sum(values)
                operation = 'sum'
            elif method == 'average':
                aggregated_value = statistics.mean(values)
                operation = 'average'
            elif method == 'median':
                aggregated_value = statistics.median(values)
                operation = 'median'
            else:
                aggregated_value = sum(values)  # Default to sum
                operation = 'sum'
            
            # Calculate confidence and uncertainty
            confidence = await self._calculate_aggregated_confidence(qty_data)
            uncertainty = await self._calculate_uncertainty(values, method)
            
            # Get unit information
            units = [item.get('unit') for item in qty_data if item.get('unit')]
            primary_unit = units[0] if units else None
            
            # Build result
            result = {
                'value': aggregated_value,
                'unit': primary_unit,
                'operation': operation,
                'confidence': confidence,
                'uncertainty': uncertainty,
                'source_count': len(qty_data),
                'source_chunks': [item['chunk_id'] for item in qty_data],
                'statistics': {
                    'min': min(values),
                    'max': max(values),
                    'mean': statistics.mean(values),
                    'median': statistics.median(values) if len(values) >= 2 else values[0],
                    'standard_deviation': statistics.stdev(values) if len(values) > 1 else 0.0
                }
            }
            
            # Add range if relevant
            if method in ['sum', 'average'] and uncertainty > 0:
                result['range'] = {
                    'lower_bound': aggregated_value - uncertainty,
                    'upper_bound': aggregated_value + uncertainty
                }
            
            return result
            
        except Exception as e:
            logger.error(
                "Quantity aggregation failed for type",
                qty_type=qty_type,
                error=str(e)
            )
            return None
    
    async def _calculate_aggregated_confidence(self, qty_data: List[Dict[str, Any]]) -> float:
        """Calculate confidence for aggregated quantity."""
        
        if not qty_data:
            return 0.0
        
        # Weight confidence by data quality
        weighted_confidences = []
        for item in qty_data:
            weight = 1.0
            if item.get('data_quality') == 'high':
                weight = 1.2
            elif item.get('data_quality') == 'low':
                weight = 0.8
            
            weighted_confidences.append(item.get('confidence', 0.5) * weight)
        
        # Calculate average with diminishing returns for more sources
        avg_confidence = statistics.mean(weighted_confidences)
        
        # Boost confidence slightly for multiple sources (but with diminishing returns)
        source_boost = min(0.1, 0.02 * len(qty_data))
        
        return min(avg_confidence + source_boost, 1.0)
    
    async def _calculate_uncertainty(self, values: List[float], method: str) -> float:
        """Calculate uncertainty in the aggregated value."""
        
        if len(values) <= 1:
            return 0.0
        
        try:
            if method == 'sum':
                # For sums, uncertainty compounds (simplified model)
                stdev = statistics.stdev(values)
                # Simplified uncertainty propagation for independent measurements
                return stdev * (len(values) ** 0.5)
            
            elif method in ['average', 'median']:
                # For averages, uncertainty decreases with more samples
                stdev = statistics.stdev(values)
                return stdev / (len(values) ** 0.5)  # Standard error
            
            else:
                return statistics.stdev(values)
                
        except statistics.StatisticsError:
            return 0.0
    
    async def _calculate_summary_statistics(
        self,
        aggregated_results: Dict[str, Any],
        data_list: List[ExtractedData]
    ) -> Dict[str, Any]:
        """Calculate summary statistics for the aggregation."""
        
        summary = {
            'total_sources': len(data_list),
            'quantity_types_found': len(aggregated_results),
            'overall_confidence': 0.0,
            'data_quality_distribution': {'high': 0, 'medium': 0, 'low': 0, 'unknown': 0}
        }
        
        # Calculate overall confidence
        if aggregated_results:
            confidences = [
                result.get('confidence', 0.0) 
                for result in aggregated_results.values()
                if isinstance(result, dict) and 'confidence' in result
            ]
            if confidences:
                summary['overall_confidence'] = statistics.mean(confidences)
        
        # Data quality distribution
        for data in data_list:
            quality = data.data_quality
            if quality in summary['data_quality_distribution']:
                summary['data_quality_distribution'][quality] += 1
        
        # Add aggregation metadata
        summary['aggregation_method'] = 'quantitative'
        summary['has_uncertainties'] = any(
            isinstance(result, dict) and result.get('uncertainty', 0) > 0
            for result in aggregated_results.values()
        )
        
        return summary
    
    def get_supported_intents(self) -> List[QueryIntent]:
        """Get list of query intents this strategy supports."""
        return self.supported_intents
    
    async def handle_conflicts(
        self,
        conflicts: List[Conflict],
        resolutions: List[ConflictResolution]
    ) -> Dict[str, Any]:
        """Handle conflicts specific to quantitative aggregation."""
        
        conflict_handling = {
            'conflicts_addressed': len(conflicts),
            'resolution_methods': {},
            'remaining_uncertainties': []
        }
        
        for resolution in resolutions:
            conflict_type = resolution.conflict.conflict_type.value
            if conflict_type not in conflict_handling['resolution_methods']:
                conflict_handling['resolution_methods'][conflict_type] = []
            
            conflict_handling['resolution_methods'][conflict_type].append({
                'strategy': resolution.strategy.value,
                'confidence': resolution.confidence,
                'resolved_value': resolution.resolved_value
            })
        
        # Identify unresolved conflicts
        resolved_conflict_ids = {id(res.conflict) for res in resolutions}
        unresolved = [c for c in conflicts if id(c) not in resolved_conflict_ids]
        
        for conflict in unresolved:
            conflict_handling['remaining_uncertainties'].append({
                'type': conflict.conflict_type.value,
                'description': conflict.description,
                'severity': conflict.severity
            })
        
        return conflict_handling