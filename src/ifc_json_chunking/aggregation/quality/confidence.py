"""
Confidence calculation for aggregated results.

This module provides confidence scoring based on data quality,
extraction reliability, and consensus across multiple sources.
"""

import statistics
from collections import Counter
from typing import Any, Dict, List

import structlog

from ...types.aggregation_types import Evidence, ExtractedData, QualityMetrics

logger = structlog.get_logger(__name__)


class ConfidenceCalculator:
    """
    Calculates confidence scores for aggregated results.
    
    Uses multiple factors including data quality, source reliability,
    consensus metrics, and statistical consistency to determine
    overall confidence in aggregated results.
    """

    def __init__(self, min_sources: int = 2, consensus_threshold: float = 0.6):
        """
        Initialize confidence calculator.
        
        Args:
            min_sources: Minimum sources required for high confidence
            consensus_threshold: Minimum consensus ratio for reliable results
        """
        self.min_sources = min_sources
        self.consensus_threshold = consensus_threshold

        logger.debug(
            "ConfidenceCalculator initialized",
            min_sources=min_sources,
            consensus_threshold=consensus_threshold
        )

    def calculate_confidence(
        self,
        extracted_data_list: List[ExtractedData],
        aggregated_data: Dict[str, Any],
        quality_metrics: QualityMetrics
    ) -> float:
        """
        Calculate overall confidence score for aggregated results.
        
        Args:
            extracted_data_list: Source data used in aggregation
            aggregated_data: Results of aggregation
            quality_metrics: Quality assessment metrics
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        if not extracted_data_list:
            return 0.0

        # Source reliability (30%)
        source_confidence = self._calculate_source_confidence(extracted_data_list)

        # Data consensus (25%)
        consensus_confidence = self._calculate_consensus_confidence(extracted_data_list)

        # Quality metrics integration (25%)
        quality_confidence = self._integrate_quality_metrics(quality_metrics)

        # Statistical consistency (20%)
        statistical_confidence = self._calculate_statistical_confidence(
            extracted_data_list, aggregated_data
        )

        # Weighted combination
        overall_confidence = (
            source_confidence * 0.30 +
            consensus_confidence * 0.25 +
            quality_confidence * 0.25 +
            statistical_confidence * 0.20
        )

        logger.debug(
            "Confidence calculation completed",
            source_confidence=source_confidence,
            consensus_confidence=consensus_confidence,
            quality_confidence=quality_confidence,
            statistical_confidence=statistical_confidence,
            overall_confidence=overall_confidence
        )

        return min(max(overall_confidence, 0.0), 1.0)

    def _calculate_source_confidence(self, data_list: List[ExtractedData]) -> float:
        """Calculate confidence based on source reliability."""
        if not data_list:
            return 0.0

        # Average extraction confidence
        avg_extraction_confidence = sum(
            d.extraction_confidence for d in data_list
        ) / len(data_list)

        # Quality distribution
        high_quality_ratio = len([
            d for d in data_list if d.data_quality == 'high'
        ]) / len(data_list)

        # Source count factor
        source_count_factor = min(len(data_list) / self.min_sources, 1.0)

        return (
            avg_extraction_confidence * 0.5 +
            high_quality_ratio * 0.3 +
            source_count_factor * 0.2
        )

    def _calculate_consensus_confidence(self, data_list: List[ExtractedData]) -> float:
        """Calculate confidence based on data consensus."""
        if len(data_list) < 2:
            return 0.5  # Neutral confidence for single source

        consensus_scores = []

        # Check consensus in quantities
        quantity_consensus = self._check_quantity_consensus(data_list)
        consensus_scores.append(quantity_consensus)

        # Check consensus in properties
        property_consensus = self._check_property_consensus(data_list)
        consensus_scores.append(property_consensus)

        # Check consensus in entities
        entity_consensus = self._check_entity_consensus(data_list)
        consensus_scores.append(entity_consensus)

        return sum(consensus_scores) / len(consensus_scores)

    def _check_quantity_consensus(self, data_list: List[ExtractedData]) -> float:
        """Check consensus in quantitative data."""
        all_quantities = {}

        for data in data_list:
            for qty_type, qty_value in data.quantities.items():
                if qty_type not in all_quantities:
                    all_quantities[qty_type] = []

                if isinstance(qty_value, (int, float)):
                    all_quantities[qty_type].append(qty_value)
                elif isinstance(qty_value, dict) and 'value' in qty_value:
                    all_quantities[qty_type].append(qty_value['value'])

        consensus_scores = []
        for qty_type, values in all_quantities.items():
            if len(values) >= 2:
                # Calculate coefficient of variation
                if values and sum(values) > 0:
                    mean_val = statistics.mean(values)
                    if mean_val > 0:
                        std_val = statistics.stdev(values) if len(values) > 1 else 0
                        cv = std_val / mean_val
                        # Lower CV = higher consensus
                        consensus = max(0.0, 1.0 - cv)
                        consensus_scores.append(consensus)

        return sum(consensus_scores) / len(consensus_scores) if consensus_scores else 0.5

    def _check_property_consensus(self, data_list: List[ExtractedData]) -> float:
        """Check consensus in property data."""
        all_properties = {}

        for data in data_list:
            for prop_key, prop_value in data.properties.items():
                if prop_key not in all_properties:
                    all_properties[prop_key] = []
                all_properties[prop_key].append(str(prop_value).lower().strip())

        consensus_scores = []
        for prop_key, values in all_properties.items():
            if len(values) >= 2:
                # Calculate consensus based on most common value frequency
                value_counts = Counter(values)
                most_common_count = value_counts.most_common(1)[0][1]
                consensus = most_common_count / len(values)
                consensus_scores.append(consensus)

        return sum(consensus_scores) / len(consensus_scores) if consensus_scores else 0.5

    def _check_entity_consensus(self, data_list: List[ExtractedData]) -> float:
        """Check consensus in entity identification."""
        entity_types = []

        for data in data_list:
            for entity in data.entities:
                entity_type = entity.get('type', 'unknown')
                entity_types.append(entity_type)

        if len(entity_types) < 2:
            return 0.5

        # Calculate diversity - lower diversity = higher consensus
        unique_types = len(set(entity_types))
        total_types = len(entity_types)

        if total_types == 0:
            return 0.5

        diversity = unique_types / total_types
        consensus = max(0.0, 1.0 - diversity + 0.3)  # Add base consensus

        return min(consensus, 1.0)

    def _integrate_quality_metrics(self, quality_metrics: QualityMetrics) -> float:
        """Integrate existing quality metrics into confidence."""
        if not quality_metrics:
            return 0.5

        # Use reliability and consistency as primary indicators
        return (
            quality_metrics.reliability_score * 0.6 +
            quality_metrics.consistency_score * 0.4
        )

    def _calculate_statistical_confidence(
        self,
        data_list: List[ExtractedData],
        aggregated_data: Dict[str, Any]
    ) -> float:
        """Calculate confidence based on statistical consistency."""
        if not aggregated_data or len(data_list) < 2:
            return 0.5

        confidence_scores = []

        # Check if quantitative aggregation shows good statistical properties
        if 'quantitative' in aggregated_data:
            quant_data = aggregated_data['quantitative']
            for qty_type, qty_info in quant_data.items():
                if isinstance(qty_info, dict) and 'confidence' in qty_info:
                    confidence_scores.append(qty_info['confidence'])

        # Check entity aggregation consistency
        if 'entities' in aggregated_data:
            entity_data = aggregated_data['entities']
            total_entities = entity_data.get('total_entities', 0)
            unique_entities = entity_data.get('unique_entities', 0)

            if total_entities > 0:
                uniqueness_ratio = unique_entities / total_entities
                # Higher uniqueness indicates better data quality
                confidence_scores.append(min(uniqueness_ratio * 1.5, 1.0))

        return sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.5

    def calculate_evidence_confidence(self, evidence_list: List[Evidence]) -> float:
        """
        Calculate confidence for a specific piece of evidence.
        
        Args:
            evidence_list: List of supporting evidence
            
        Returns:
            Confidence score for the evidence
        """
        if not evidence_list:
            return 0.0

        # Weight by individual confidence and quality scores
        weighted_sum = sum(
            ev.confidence * ev.quality_score for ev in evidence_list
        )
        total_weight = sum(ev.quality_score for ev in evidence_list)

        if total_weight == 0:
            return 0.0

        base_confidence = weighted_sum / total_weight

        # Boost confidence with more supporting evidence
        evidence_boost = min(len(evidence_list) * 0.1, 0.3)

        return min(base_confidence + evidence_boost, 1.0)
