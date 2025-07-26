"""
Quality scoring system for aggregated results.

This module provides comprehensive quality assessment including
accuracy, completeness, consistency, and reliability scoring
for aggregated IFC data analysis results.
"""

from typing import Any, Dict, List, Optional

import structlog

from ...types.aggregation_types import (
    Conflict,
    ConflictResolution,
    ExtractedData,
    QualityMetrics,
    QualityWeights,
)

logger = structlog.get_logger(__name__)


class QualityScorer:
    """
    Comprehensive quality scoring system for aggregated results.
    
    Evaluates multiple dimensions of quality including accuracy,
    completeness, consistency, reliability, and overall quality
    using configurable weighting schemes.
    """

    def __init__(self, weights: Optional[QualityWeights] = None):
        """
        Initialize quality scorer.
        
        Args:
            weights: Custom quality scoring weights
        """
        self.weights = weights or QualityWeights()

        logger.debug(
            "QualityScorer initialized",
            confidence_weight=self.weights.CONFIDENCE,
            completeness_weight=self.weights.COMPLETENESS,
            consistency_weight=self.weights.CONSISTENCY,
            reliability_weight=self.weights.RELIABILITY,
            extraction_weight=self.weights.EXTRACTION
        )

    def calculate_quality_metrics(
        self,
        extracted_data_list: List[ExtractedData],
        conflicts: List[Conflict],
        resolutions: List[ConflictResolution],
        aggregated_data: Dict[str, Any]
    ) -> QualityMetrics:
        """
        Calculate comprehensive quality metrics for aggregated results.
        
        Args:
            extracted_data_list: Source data used in aggregation
            conflicts: Detected conflicts
            resolutions: Applied conflict resolutions
            aggregated_data: Aggregated results
            
        Returns:
            Comprehensive quality metrics
        """
        logger.debug(
            "Starting quality metrics calculation",
            data_sources=len(extracted_data_list),
            conflicts_detected=len(conflicts),
            conflicts_resolved=len(resolutions)
        )

        # Individual quality scores
        confidence_score = self._calculate_confidence_score(extracted_data_list)
        completeness_score = self._calculate_completeness_score(
            extracted_data_list, aggregated_data
        )
        consistency_score = self._calculate_consistency_score(
            extracted_data_list, conflicts, resolutions
        )
        reliability_score = self._calculate_reliability_score(extracted_data_list)
        extraction_quality = self._calculate_extraction_quality(extracted_data_list)

        # Additional metrics
        data_coverage = self._calculate_data_coverage(extracted_data_list)
        uncertainty_level = self._calculate_uncertainty_level(conflicts, resolutions)
        validation_passed = self._determine_validation_status(
            confidence_score, completeness_score, consistency_score,
            reliability_score, conflicts
        )
        conflict_resolution_rate = (
            len(resolutions) / len(conflicts) if conflicts else 1.0
        )

        # Overall quality score (weighted combination)
        overall_quality = self._calculate_overall_quality(
            confidence_score, completeness_score, consistency_score,
            reliability_score, extraction_quality
        )

        quality_metrics = QualityMetrics(
            confidence_score=confidence_score,
            completeness_score=completeness_score,
            consistency_score=consistency_score,
            reliability_score=reliability_score,
            uncertainty_level=uncertainty_level,
            validation_passed=validation_passed,
            data_coverage=data_coverage,
            extraction_quality=extraction_quality,
            conflict_resolution_rate=conflict_resolution_rate,
            calculation_method="comprehensive_quality_scoring"
        )

        logger.info(
            "Quality metrics calculation completed",
            overall_quality=overall_quality,
            confidence=confidence_score,
            completeness=completeness_score,
            consistency=consistency_score,
            reliability=reliability_score,
            validation_passed=validation_passed
        )

        return quality_metrics

    def _calculate_confidence_score(self, data_list: List[ExtractedData]) -> float:
        """Calculate confidence score based on extraction reliability."""
        if not data_list:
            return 0.0

        # Base confidence from extraction scores
        extraction_confidences = [
            d.extraction_confidence for d in data_list if d.extraction_confidence > 0
        ]

        if not extraction_confidences:
            return 0.0

        avg_confidence = sum(extraction_confidences) / len(extraction_confidences)

        # Adjust for data quality distribution
        high_quality_ratio = len([
            d for d in data_list if d.data_quality == 'high'
        ]) / len(data_list)

        # Boost confidence with more high-quality sources
        quality_boost = high_quality_ratio * 0.2

        return min(avg_confidence + quality_boost, 1.0)

    def _calculate_completeness_score(
        self,
        data_list: List[ExtractedData],
        aggregated_data: Dict[str, Any]
    ) -> float:
        """Calculate completeness score based on data richness."""
        if not data_list:
            return 0.0

        completeness_factors = []

        # Entity completeness
        entity_completeness = self._assess_entity_completeness(data_list)
        completeness_factors.append(entity_completeness)

        # Quantity completeness
        quantity_completeness = self._assess_quantity_completeness(data_list)
        completeness_factors.append(quantity_completeness)

        # Property completeness
        property_completeness = self._assess_property_completeness(data_list)
        completeness_factors.append(property_completeness)

        # Relationship completeness
        relationship_completeness = self._assess_relationship_completeness(data_list)
        completeness_factors.append(relationship_completeness)

        # Overall completeness
        base_completeness = sum(completeness_factors) / len(completeness_factors)

        # Boost for comprehensive aggregated data
        aggregation_boost = 0.0
        if aggregated_data:
            categories_present = sum(1 for category in [
                'quantitative', 'entities', 'properties', 'relationships'
            ] if category in aggregated_data and aggregated_data[category])
            aggregation_boost = categories_present * 0.05

        return min(base_completeness + aggregation_boost, 1.0)

    def _assess_entity_completeness(self, data_list: List[ExtractedData]) -> float:
        """Assess completeness of entity data."""
        if not data_list:
            return 0.0

        entity_counts = [len(d.entities) for d in data_list]

        # Sources with entities
        sources_with_entities = len([count for count in entity_counts if count > 0])
        entity_presence_ratio = sources_with_entities / len(data_list)

        # Average entity richness
        avg_entities = sum(entity_counts) / len(entity_counts)
        entity_richness = min(avg_entities / 5.0, 1.0)  # Normalize to 5 entities

        return (entity_presence_ratio * 0.6 + entity_richness * 0.4)

    def _assess_quantity_completeness(self, data_list: List[ExtractedData]) -> float:
        """Assess completeness of quantitative data."""
        if not data_list:
            return 0.0

        quantity_counts = [len(d.quantities) for d in data_list]

        # Sources with quantities
        sources_with_quantities = len([count for count in quantity_counts if count > 0])
        quantity_presence_ratio = sources_with_quantities / len(data_list)

        # Average quantity richness
        avg_quantities = sum(quantity_counts) / len(quantity_counts)
        quantity_richness = min(avg_quantities / 3.0, 1.0)  # Normalize to 3 quantities

        return (quantity_presence_ratio * 0.7 + quantity_richness * 0.3)

    def _assess_property_completeness(self, data_list: List[ExtractedData]) -> float:
        """Assess completeness of property data."""
        if not data_list:
            return 0.0

        property_counts = [len(d.properties) for d in data_list]

        # Sources with properties
        sources_with_properties = len([count for count in property_counts if count > 0])
        property_presence_ratio = sources_with_properties / len(data_list)

        return property_presence_ratio

    def _assess_relationship_completeness(self, data_list: List[ExtractedData]) -> float:
        """Assess completeness of relationship data."""
        if not data_list:
            return 0.0

        relationship_counts = [len(d.relationships) for d in data_list]

        # Sources with relationships
        sources_with_relationships = len([count for count in relationship_counts if count > 0])

        if len(data_list) == 0:
            return 0.0

        relationship_presence_ratio = sources_with_relationships / len(data_list)

        return relationship_presence_ratio

    def _calculate_consistency_score(
        self,
        data_list: List[ExtractedData],
        conflicts: List[Conflict],
        resolutions: List[ConflictResolution]
    ) -> float:
        """Calculate consistency score based on conflicts and resolutions."""
        if not data_list:
            return 0.0

        # Base consistency (no conflicts = perfect consistency)
        base_consistency = 1.0

        # Reduce consistency based on unresolved conflicts
        unresolved_conflicts = len(conflicts) - len(resolutions)
        conflict_penalty = min(unresolved_conflicts * 0.1, 0.6)

        consistency_score = base_consistency - conflict_penalty

        # Adjust for conflict severity
        high_severity_conflicts = len([
            c for c in conflicts if c.severity > 0.7
        ])
        severity_penalty = min(high_severity_conflicts * 0.05, 0.2)

        final_consistency = max(consistency_score - severity_penalty, 0.0)

        return final_consistency

    def _calculate_reliability_score(self, data_list: List[ExtractedData]) -> float:
        """Calculate reliability score based on data quality indicators."""
        if not data_list:
            return 0.0

        reliability_factors = []

        # Quality distribution
        quality_scores = {
            'high': 1.0,
            'medium': 0.7,
            'low': 0.3
        }

        for data in data_list:
            quality_score = quality_scores.get(data.data_quality, 0.5)
            reliability_factors.append(quality_score)

        # Average reliability
        avg_reliability = sum(reliability_factors) / len(reliability_factors)

        # Boost for processing success
        processing_success_rate = len([
            d for d in data_list if not d.processing_errors
        ]) / len(data_list)

        return min(avg_reliability * processing_success_rate + 0.1, 1.0)

    def _calculate_extraction_quality(self, data_list: List[ExtractedData]) -> float:
        """Calculate extraction quality score."""
        if not data_list:
            return 0.0

        # Average extraction confidence
        extraction_scores = [
            d.extraction_confidence for d in data_list if d.extraction_confidence > 0
        ]

        if not extraction_scores:
            return 0.0

        return sum(extraction_scores) / len(extraction_scores)

    def _calculate_data_coverage(self, data_list: List[ExtractedData]) -> float:
        """Calculate data coverage score."""
        if not data_list:
            return 0.0

        # Calculate how many sources provide useful data
        useful_sources = len([
            d for d in data_list
            if (d.entities or d.quantities or d.properties)
            and d.extraction_confidence > 0.3
        ])

        return useful_sources / len(data_list)

    def _calculate_uncertainty_level(
        self,
        conflicts: List[Conflict],
        resolutions: List[ConflictResolution]
    ) -> float:
        """Calculate uncertainty level based on conflicts."""
        unresolved_conflicts = len(conflicts) - len(resolutions)

        # Base uncertainty from unresolved conflicts
        base_uncertainty = min(unresolved_conflicts * 0.05, 0.3)

        # Add uncertainty from high-severity conflicts
        high_severity_conflicts = len([
            c for c in conflicts if c.severity > 0.8
        ])
        severity_uncertainty = min(high_severity_conflicts * 0.1, 0.2)

        return min(base_uncertainty + severity_uncertainty, 0.5)

    def _determine_validation_status(
        self,
        confidence: float,
        completeness: float,
        consistency: float,
        reliability: float,
        conflicts: List[Conflict]
    ) -> bool:
        """Determine if results pass validation criteria."""
        # Minimum thresholds
        min_confidence = 0.5
        min_completeness = 0.4
        min_consistency = 0.6
        min_reliability = 0.5
        max_critical_conflicts = 1

        # Count critical conflicts
        critical_conflicts = len([
            c for c in conflicts if c.severity > 0.9
        ])

        return (
            confidence >= min_confidence and
            completeness >= min_completeness and
            consistency >= min_consistency and
            reliability >= min_reliability and
            critical_conflicts <= max_critical_conflicts
        )

    def _calculate_overall_quality(
        self,
        confidence: float,
        completeness: float,
        consistency: float,
        reliability: float,
        extraction: float
    ) -> float:
        """Calculate weighted overall quality score."""
        return (
            confidence * self.weights.CONFIDENCE +
            completeness * self.weights.COMPLETENESS +
            consistency * self.weights.CONSISTENCY +
            reliability * self.weights.RELIABILITY +
            extraction * self.weights.EXTRACTION
        )

    def generate_quality_report(
        self,
        quality_metrics: QualityMetrics,
        extracted_data_list: List[ExtractedData],
        conflicts: List[Conflict]
    ) -> Dict[str, Any]:
        """
        Generate comprehensive quality assessment report.
        
        Args:
            quality_metrics: Calculated quality metrics
            extracted_data_list: Source data
            conflicts: Detected conflicts
            
        Returns:
            Detailed quality report
        """
        report = {
            'overall_assessment': self._assess_overall_quality(quality_metrics),
            'score_breakdown': {
                'confidence': quality_metrics.confidence_score,
                'completeness': quality_metrics.completeness_score,
                'consistency': quality_metrics.consistency_score,
                'reliability': quality_metrics.reliability_score,
                'extraction_quality': quality_metrics.extraction_quality
            },
            'data_summary': {
                'total_sources': len(extracted_data_list),
                'high_quality_sources': len([
                    d for d in extracted_data_list if d.data_quality == 'high'
                ]),
                'data_coverage': quality_metrics.data_coverage,
                'conflicts_detected': len(conflicts),
                'validation_passed': quality_metrics.validation_passed
            },
            'recommendations': self._generate_quality_recommendations(
                quality_metrics, conflicts
            )
        }

        return report

    def _assess_overall_quality(self, metrics: QualityMetrics) -> str:
        """Assess overall quality level."""
        overall_score = metrics.overall_quality

        if overall_score >= 0.8:
            return "excellent"
        elif overall_score >= 0.6:
            return "good"
        elif overall_score >= 0.4:
            return "fair"
        else:
            return "poor"

    def _generate_quality_recommendations(
        self,
        metrics: QualityMetrics,
        conflicts: List[Conflict]
    ) -> List[str]:
        """Generate recommendations for quality improvement."""
        recommendations = []

        if metrics.confidence_score < 0.6:
            recommendations.append(
                "Consider additional data sources to improve confidence"
            )

        if metrics.completeness_score < 0.5:
            recommendations.append(
                "Enhance data extraction to capture more information"
            )

        if metrics.consistency_score < 0.7:
            recommendations.append(
                "Review and resolve data conflicts for better consistency"
            )

        if metrics.reliability_score < 0.6:
            recommendations.append(
                "Improve data quality control measures"
            )

        if len(conflicts) > 3:
            recommendations.append(
                "Investigate root causes of data conflicts"
            )

        if not metrics.validation_passed:
            recommendations.append(
                "Address validation failures before using results"
            )

        return recommendations
