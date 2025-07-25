"""
Uncertainty handling and quantification for aggregated results.

This module provides uncertainty estimation, propagation, and
management for aggregated IFC data analysis results.
"""

from typing import List, Dict, Any, Optional, Tuple
import statistics
import math
import structlog

from ...types.aggregation_types import ExtractedData, Conflict, ConflictResolution

logger = structlog.get_logger(__name__)


class UncertaintyHandler:
    """
    Handles uncertainty quantification and propagation in aggregated results.
    
    Provides methods to estimate uncertainty from various sources including
    measurement errors, conflicts, data quality issues, and aggregation
    processes themselves.
    """
    
    def __init__(self, default_uncertainty: float = 0.1):
        """
        Initialize uncertainty handler.
        
        Args:
            default_uncertainty: Default uncertainty level when none can be estimated
        """
        self.default_uncertainty = default_uncertainty
        
        logger.debug(
            "UncertaintyHandler initialized",
            default_uncertainty=default_uncertainty
        )
    
    def estimate_uncertainty(
        self,
        extracted_data_list: List[ExtractedData],
        conflicts: List[Conflict],
        resolutions: List[ConflictResolution],
        aggregated_data: Dict[str, Any]
    ) -> Dict[str, float]:
        """
        Estimate uncertainty for aggregated results.
        
        Args:
            extracted_data_list: Source data used in aggregation
            conflicts: Detected conflicts
            resolutions: Applied conflict resolutions
            aggregated_data: Aggregated results
            
        Returns:
            Dictionary mapping result types to uncertainty levels (0.0-1.0)
        """
        uncertainties = {}
        
        # Quantitative uncertainty
        if 'quantitative' in aggregated_data:
            quant_uncertainty = self._estimate_quantitative_uncertainty(
                extracted_data_list, conflicts, aggregated_data['quantitative']
            )
            uncertainties['quantitative'] = quant_uncertainty
        
        # Entity uncertainty
        if 'entities' in aggregated_data:
            entity_uncertainty = self._estimate_entity_uncertainty(
                extracted_data_list, conflicts
            )
            uncertainties['entities'] = entity_uncertainty
        
        # Property uncertainty
        if 'properties' in aggregated_data:
            property_uncertainty = self._estimate_property_uncertainty(
                extracted_data_list, conflicts
            )
            uncertainties['properties'] = property_uncertainty
        
        # Overall uncertainty from unresolved conflicts
        unresolved_conflicts = len(conflicts) - len(resolutions)
        conflict_uncertainty = min(unresolved_conflicts * 0.1, 0.5)
        uncertainties['overall'] = conflict_uncertainty
        
        logger.debug(
            "Uncertainty estimation completed",
            uncertainties=uncertainties,
            unresolved_conflicts=unresolved_conflicts
        )
        
        return uncertainties
    
    def _estimate_quantitative_uncertainty(
        self,
        data_list: List[ExtractedData],
        conflicts: List[Conflict],
        quantitative_results: Dict[str, Any]
    ) -> float:
        """Estimate uncertainty in quantitative results."""
        uncertainty_sources = []
        
        # Measurement uncertainty from source data
        measurement_uncertainty = self._calculate_measurement_uncertainty(data_list)
        uncertainty_sources.append(measurement_uncertainty)
        
        # Conflict-based uncertainty
        quant_conflicts = [
            c for c in conflicts 
            if c.conflict_type.value == 'quantitative_mismatch'
        ]
        if quant_conflicts:
            conflict_uncertainty = min(len(quant_conflicts) * 0.15, 0.4)
            uncertainty_sources.append(conflict_uncertainty)
        
        # Statistical uncertainty from aggregation
        statistical_uncertainty = self._calculate_statistical_uncertainty(
            data_list, quantitative_results
        )
        uncertainty_sources.append(statistical_uncertainty)
        
        # Combine uncertainties (root sum of squares for independent sources)
        if uncertainty_sources:
            combined_uncertainty = math.sqrt(
                sum(u ** 2 for u in uncertainty_sources)
            )
            return min(combined_uncertainty, 1.0)
        
        return self.default_uncertainty
    
    def _calculate_measurement_uncertainty(self, data_list: List[ExtractedData]) -> float:
        """Calculate uncertainty from measurement precision."""
        if not data_list:
            return self.default_uncertainty
        
        # Use extraction confidence as a proxy for measurement uncertainty
        confidences = [d.extraction_confidence for d in data_list if d.extraction_confidence > 0]
        if not confidences:
            return self.default_uncertainty
        
        avg_confidence = sum(confidences) / len(confidences)
        # Convert confidence to uncertainty (inverse relationship)
        uncertainty = 1.0 - avg_confidence
        
        return min(max(uncertainty, 0.05), 0.5)  # Clamp between 5% and 50%
    
    def _calculate_statistical_uncertainty(
        self,
        data_list: List[ExtractedData],
        quantitative_results: Dict[str, Any]
    ) -> float:
        """Calculate uncertainty from statistical analysis."""
        uncertainties = []
        
        # Analyze each quantity type
        quantity_groups = {}
        for data in data_list:
            for qty_type, qty_value in data.quantities.items():
                if qty_type not in quantity_groups:
                    quantity_groups[qty_type] = []
                
                if isinstance(qty_value, (int, float)):
                    quantity_groups[qty_type].append(qty_value)
                elif isinstance(qty_value, dict) and 'value' in qty_value:
                    quantity_groups[qty_type].append(qty_value['value'])
        
        # Calculate statistical uncertainty for each quantity
        for qty_type, values in quantity_groups.items():
            if len(values) >= 2:
                stat_uncertainty = self._statistical_uncertainty_from_values(values)
                uncertainties.append(stat_uncertainty)
        
        return sum(uncertainties) / len(uncertainties) if uncertainties else self.default_uncertainty
    
    def _statistical_uncertainty_from_values(self, values: List[float]) -> float:
        """Calculate statistical uncertainty from a set of values."""
        if len(values) < 2:
            return self.default_uncertainty
        
        try:
            mean_val = statistics.mean(values)
            if mean_val == 0:
                return self.default_uncertainty
            
            # Use coefficient of variation as uncertainty measure
            std_val = statistics.stdev(values)
            cv = std_val / abs(mean_val)
            
            # Convert CV to uncertainty (0-1 scale)
            # CV of 0.1 (10%) maps to uncertainty of 0.1
            uncertainty = min(cv, 1.0)
            
            return uncertainty
            
        except (statistics.StatisticsError, ZeroDivisionError):
            return self.default_uncertainty
    
    def _estimate_entity_uncertainty(
        self,
        data_list: List[ExtractedData],
        conflicts: List[Conflict]
    ) -> float:
        """Estimate uncertainty in entity identification."""
        if not data_list:
            return self.default_uncertainty
        
        # Count entity-related conflicts
        entity_conflicts = [
            c for c in conflicts 
            if c.conflict_type.value in ['entity_mismatch', 'qualitative_contradiction']
        ]
        
        total_entities = sum(len(d.entities) for d in data_list)
        if total_entities == 0:
            return self.default_uncertainty
        
        # Uncertainty based on conflict rate
        conflict_rate = len(entity_conflicts) / total_entities
        uncertainty = min(conflict_rate * 2, 0.6)  # Scale and cap at 60%
        
        # Add base uncertainty for extraction process
        base_uncertainty = 0.1
        
        return min(uncertainty + base_uncertainty, 1.0)
    
    def _estimate_property_uncertainty(
        self,
        data_list: List[ExtractedData],
        conflicts: List[Conflict]
    ) -> float:
        """Estimate uncertainty in property values."""
        if not data_list:
            return self.default_uncertainty
        
        # Count property-related conflicts
        property_conflicts = [
            c for c in conflicts 
            if c.conflict_type.value == 'qualitative_contradiction'
        ]
        
        total_properties = sum(len(d.properties) for d in data_list)
        if total_properties == 0:
            return self.default_uncertainty
        
        # Uncertainty based on conflict rate
        conflict_rate = len(property_conflicts) / total_properties
        uncertainty = min(conflict_rate * 1.5, 0.5)  # Scale and cap at 50%
        
        return max(uncertainty, 0.05)  # Minimum 5% uncertainty
    
    def propagate_uncertainty(
        self,
        operation: str,
        input_uncertainties: List[float],
        input_values: Optional[List[float]] = None
    ) -> float:
        """
        Propagate uncertainty through mathematical operations.
        
        Args:
            operation: Type of operation ('sum', 'average', 'product', 'ratio')
            input_uncertainties: Uncertainties of input values
            input_values: Input values (needed for some operations)
            
        Returns:
            Propagated uncertainty
        """
        if not input_uncertainties:
            return self.default_uncertainty
        
        if operation == 'sum':
            # Sum: uncertainties add in quadrature
            return math.sqrt(sum(u ** 2 for u in input_uncertainties))
        
        elif operation == 'average':
            # Average: uncertainty scales with 1/sqrt(n)
            avg_uncertainty = math.sqrt(sum(u ** 2 for u in input_uncertainties))
            return avg_uncertainty / math.sqrt(len(input_uncertainties))
        
        elif operation == 'product' and input_values:
            # Product: relative uncertainties add in quadrature
            relative_uncertainties = []
            for val, unc in zip(input_values, input_uncertainties):
                if val != 0:
                    relative_uncertainties.append(unc / abs(val))
            
            if relative_uncertainties:
                combined_relative = math.sqrt(sum(u ** 2 for u in relative_uncertainties))
                # Convert back to absolute uncertainty (approximate)
                return combined_relative * (sum(abs(v) for v in input_values) / len(input_values))
        
        elif operation == 'ratio' and input_values and len(input_values) == 2:
            # Ratio: relative uncertainties add in quadrature
            if input_values[0] != 0 and input_values[1] != 0:
                rel_unc_1 = input_uncertainties[0] / abs(input_values[0])
                rel_unc_2 = input_uncertainties[1] / abs(input_values[1])
                combined_relative = math.sqrt(rel_unc_1 ** 2 + rel_unc_2 ** 2)
                ratio_value = abs(input_values[0] / input_values[1])
                return combined_relative * ratio_value
        
        # Default: maximum uncertainty
        return max(input_uncertainties)
    
    def classify_uncertainty_level(self, uncertainty: float) -> Tuple[str, str]:
        """
        Classify uncertainty level into categories.
        
        Args:
            uncertainty: Uncertainty value (0.0-1.0)
            
        Returns:
            Tuple of (level, description)
        """
        if uncertainty <= 0.1:
            return ("low", "High confidence in results")
        elif uncertainty <= 0.25:
            return ("moderate", "Moderate confidence with some uncertainty")
        elif uncertainty <= 0.5:
            return ("high", "Significant uncertainty in results")
        else:
            return ("very_high", "Results have very high uncertainty")
    
    def recommend_uncertainty_reduction(
        self,
        uncertainties: Dict[str, float],
        conflicts: List[Conflict]
    ) -> List[str]:
        """
        Recommend actions to reduce uncertainty.
        
        Args:
            uncertainties: Uncertainty levels by category
            conflicts: Detected conflicts
            
        Returns:
            List of recommendations
        """
        recommendations = []
        
        # High quantitative uncertainty
        if uncertainties.get('quantitative', 0) > 0.3:
            recommendations.append(
                "Collect additional measurements to reduce quantitative uncertainty"
            )
            recommendations.append(
                "Verify measurement precision and calibration"
            )
        
        # High entity uncertainty
        if uncertainties.get('entities', 0) > 0.3:
            recommendations.append(
                "Review entity identification criteria"
            )
            recommendations.append(
                "Cross-reference with additional data sources"
            )
        
        # Unresolved conflicts contributing to uncertainty
        unresolved_conflicts = [c for c in conflicts if c.severity > 0.5]
        if unresolved_conflicts:
            recommendations.append(
                f"Resolve {len(unresolved_conflicts)} high-severity conflicts"
            )
        
        # General recommendations for high overall uncertainty
        overall_uncertainty = uncertainties.get('overall', 0)
        if overall_uncertainty > 0.4:
            recommendations.append(
                "Consider collecting additional data sources for verification"
            )
            recommendations.append(
                "Apply more stringent quality control measures"
            )
        
        return recommendations