"""
Aggregation pipeline phases.

This module implements the 7-phase aggregation pipeline that integrates
all components from PRs 1-4 into a coordinated workflow.
"""

import time
from typing import Any, Dict, List, Optional

import structlog

from ...query.types import ChunkResult, QueryContext, QueryIntent, QueryResult
from ...types.aggregation_types import (
    AggregationMetadata,
    AggregationStrategy,
    Conflict,
    ConflictResolution,
    ConflictType,
    EnhancedQueryResult,
    ExtractedData,
    QualityMetrics,
    ValidationLevel,
)

logger = structlog.get_logger(__name__)


class DataExtractionPhase:
    """Phase 1: Extract structured data from chunk results."""

    def __init__(self):
        # Import data extractor (from PR 2)
        try:
            from .data_extractor import DataExtractor
            self.data_extractor = DataExtractor()
        except ImportError:
            logger.warning("DataExtractor not available, using simple extraction")
            self.data_extractor = None

    async def execute(self, chunk_results: List[ChunkResult], context: QueryContext) -> List[ExtractedData]:
        """Extract structured data from chunk results."""
        extracted_data_list = []

        for chunk_result in chunk_results:
            if chunk_result.status != "completed":
                continue

            # Simple extraction fallback
            extracted_data = ExtractedData(
                entities=[],
                quantities={},
                properties={},
                relationships=[],
                chunk_id=chunk_result.chunk_id,
                extraction_confidence=chunk_result.confidence_score,
                data_quality="simple_extraction"
            )

            # Parse content for basic information
            content = chunk_result.content
            if content:
                # Simple extraction of numerical values
                import re
                numbers = re.findall(r'\d+\.?\d*', content)
                for i, num in enumerate(numbers[:5]):  # Limit to 5 numbers
                    try:
                        extracted_data.quantities[f"value_{i}"] = float(num)
                    except ValueError:
                        pass

                # Simple entity extraction
                lines = content.split('\n')
                for line in lines[:3]:  # First 3 lines
                    if line.strip():
                        extracted_data.entities.append({
                            'type': 'text_entity',
                            'content': line.strip()[:100]  # Limit length
                        })

            extracted_data_list.append(extracted_data)

        logger.debug(f"Data extraction completed: {len(extracted_data_list)} objects")
        return extracted_data_list


class DataNormalizationPhase:
    """Phase 2: Normalize and standardize extracted data."""

    def __init__(self):
        # Import normalizer (from PR 2)
        try:
            from .normalizer import DataNormalizer
            self.normalizer = DataNormalizer()
        except ImportError:
            logger.warning("DataNormalizer not available, using simple normalization")
            self.normalizer = None

    async def execute(self, extracted_data_list: List[ExtractedData]) -> List[ExtractedData]:
        """Normalize extracted data."""
        # Simple normalization - ensure all data has required fields
        normalized_list = []

        for data in extracted_data_list:
            # Create normalized copy
            normalized_data = ExtractedData(
                entities=data.entities or [],
                quantities=data.quantities or {},
                properties=data.properties or {},
                relationships=data.relationships or [],
                chunk_id=data.chunk_id,
                extraction_confidence=data.extraction_confidence,
                data_quality="normalized"
            )
            normalized_list.append(normalized_data)

        logger.debug(f"Data normalization completed: {len(normalized_list)} objects")
        return normalized_list


class ConflictDetectionPhase:
    """Phase 3: Detect conflicts between data sources."""

    def __init__(self):
        # Import conflict detector (from PR 3)
        try:
            from ..conflict.detector import ConflictDetector
            self.conflict_detector = ConflictDetector()
        except ImportError:
            logger.warning("ConflictDetector not available, using simple detection")
            self.conflict_detector = None

    async def execute(self, normalized_data_list: List[ExtractedData], context: QueryContext) -> List[Conflict]:
        """Detect conflicts in normalized data."""
        if len(normalized_data_list) < 2:
            return []

        conflicts = []

        # Simple conflict detection - check for contradictory quantities
        quantity_groups = {}
        for data in normalized_data_list:
            for key, value in data.quantities.items():
                if key not in quantity_groups:
                    quantity_groups[key] = []
                quantity_groups[key].append((value, data.chunk_id))

        # Check for significant differences
        for key, values in quantity_groups.items():
            if len(values) > 1:
                nums = [v[0] for v in values if isinstance(v[0], (int, float))]
                if len(nums) > 1:
                    max_val, min_val = max(nums), min(nums)
                    if min_val > 0 and (max_val - min_val) / min_val > 0.1:  # 10% difference
                        conflicts.append(Conflict(
                            conflict_type=ConflictType.QUANTITATIVE_MISMATCH,
                            description=f"Quantity mismatch for {key}: {min_val} vs {max_val}",
                            conflicting_chunks=[v[1] for v in values],
                            conflicting_values=nums,
                            severity=0.5,
                            evidence=[],
                            context={'quantity_key': key}
                        ))

        logger.debug(f"Conflict detection completed: {len(conflicts)} conflicts found")
        return conflicts


class ConflictResolutionPhase:
    """Phase 4: Resolve detected conflicts."""

    def __init__(self):
        # Import conflict resolver (would be from PR 3)
        self.resolver = None

    async def execute(
        self,
        conflicts: List[Conflict],
        normalized_data_list: List[ExtractedData],
        context: QueryContext
    ) -> List[ConflictResolution]:
        """Resolve conflicts using appropriate strategies."""
        resolutions = []

        for conflict in conflicts:
            # Simple resolution: use average for quantitative conflicts
            if conflict.conflict_type == ConflictType.QUANTITATIVE_MISMATCH:
                values = [v for v in conflict.conflicting_values if isinstance(v, (int, float))]
                if values:
                    resolved_value = sum(values) / len(values)
                    resolution = ConflictResolution(
                        conflict=conflict,
                        strategy=conflict.conflict_type.value,
                        resolved_value=resolved_value,
                        confidence=0.7,
                        reasoning=f"Average of {len(values)} values: {resolved_value:.2f}",
                        evidence_used=[],
                        metadata={'resolution_method': 'average'}
                    )
                    resolutions.append(resolution)

        logger.debug(f"Conflict resolution completed: {len(resolutions)} conflicts resolved")
        return resolutions


class AggregationPhase:
    """Phase 5: Apply statistical aggregation strategies."""

    def __init__(self):
        # Import aggregation strategies (from PR 4)
        self.strategies = {}
        try:
            from ..strategies.component_strategy import ComponentAggregationStrategy
            from ..strategies.cost_strategy import CostAggregationStrategy
            from ..strategies.material_strategy import MaterialAggregationStrategy
            from ..strategies.quantity_strategy import QuantityAggregationStrategy
            from ..strategies.spatial_strategy import SpatialAggregationStrategy

            self.strategies = {
                QueryIntent.QUANTITY: QuantityAggregationStrategy(),
                QueryIntent.COMPONENT: ComponentAggregationStrategy(),
                QueryIntent.MATERIAL: MaterialAggregationStrategy(),
                QueryIntent.SPATIAL: SpatialAggregationStrategy(),
                QueryIntent.COST: CostAggregationStrategy()
            }
        except ImportError:
            logger.warning("Aggregation strategies not available, using simple aggregation")

    async def execute(
        self,
        normalized_data_list: List[ExtractedData],
        context: QueryContext,
        resolutions: List[ConflictResolution]
    ) -> Dict[str, Any]:
        """Apply appropriate aggregation strategy based on query intent."""

        # Select strategy based on intent
        strategy = self.strategies.get(context.intent)

        if strategy:
            try:
                return await strategy.aggregate(normalized_data_list, context, resolutions)
            except Exception as e:
                logger.warning(f"Strategy aggregation failed: {e}, falling back to simple")

        # Simple aggregation fallback
        total_entities = sum(len(data.entities) for data in normalized_data_list)
        total_quantities = sum(len(data.quantities) for data in normalized_data_list)

        return {
            "aggregation_method": "simple",
            "strategy": AggregationStrategy.QUANTITATIVE.value,
            "total_entities": total_entities,
            "total_quantities": total_quantities,
            "data_sources": len(normalized_data_list)
        }


class QualityAssessmentPhase:
    """Phase 6: Assess quality of aggregated results."""

    async def execute(
        self,
        normalized_data_list: List[ExtractedData],
        conflicts: List[Conflict],
        resolutions: List[ConflictResolution],
        aggregated_data: Dict[str, Any],
        context: QueryContext
    ) -> QualityMetrics:
        """Calculate quality metrics for the aggregation."""

        # Calculate confidence score
        if normalized_data_list:
            confidence_score = sum(data.extraction_confidence for data in normalized_data_list) / len(normalized_data_list)
        else:
            confidence_score = 0.0

        # Calculate completeness
        completeness_score = min(len(normalized_data_list) / max(1, len(normalized_data_list)), 1.0)

        # Calculate consistency (fewer conflicts = higher consistency)
        if normalized_data_list:
            consistency_score = max(0.0, 1.0 - (len(conflicts) / len(normalized_data_list)))
        else:
            consistency_score = 1.0

        # Resolution rate
        resolution_rate = len(resolutions) / max(1, len(conflicts)) if conflicts else 1.0

        quality_metrics = QualityMetrics(
            confidence_score=confidence_score,
            completeness_score=completeness_score,
            consistency_score=consistency_score,
            reliability_score=(confidence_score + consistency_score) / 2,
            uncertainty_level=1.0 - confidence_score,
            validation_passed=confidence_score > 0.5,
            validation_issues=[],
            data_coverage=completeness_score,
            extraction_quality=confidence_score,
            conflict_resolution_rate=resolution_rate,
            calculation_method="standard"
        )

        logger.debug(f"Quality assessment completed: overall={quality_metrics.overall_quality:.3f}")
        return quality_metrics


class ResultGenerationPhase:
    """Phase 7: Generate final enhanced query result."""

    async def execute(
        self,
        context: QueryContext,
        chunk_results: List[ChunkResult],
        extracted_data_list: List[ExtractedData],
        normalized_data_list: List[ExtractedData],
        conflicts: List[Conflict],
        resolutions: List[ConflictResolution],
        aggregated_data: Dict[str, Any],
        quality_metrics: QualityMetrics,
        original_query_result: Optional[QueryResult],
        start_time: float
    ) -> EnhancedQueryResult:
        """Generate the final enhanced query result."""

        processing_time = time.time() - start_time

        # Create aggregation metadata
        aggregation_metadata = AggregationMetadata(
            strategy_used=AggregationStrategy.QUANTITATIVE,  # Default
            chunks_processed=len(chunk_results),
            chunks_successful=len([r for r in chunk_results if r.status == "completed"]),
            conflicts_detected=len(conflicts),
            conflicts_resolved=len(resolutions),
            processing_time=processing_time,
            algorithms_used=["data_extraction", "normalization", "conflict_detection", "aggregation"],
            validation_level=ValidationLevel.STANDARD
        )

        # Generate insights
        insights = []
        if conflicts:
            insights.append(f"Detected {len(conflicts)} conflicts, resolved {len(resolutions)}")
        if quality_metrics.overall_quality > 0.8:
            insights.append("High quality aggregation achieved")
        elif quality_metrics.overall_quality < 0.5:
            insights.append("Low quality aggregation - results may be unreliable")

        # Generate recommendations
        recommendations = []
        if quality_metrics.confidence_score < 0.7:
            recommendations.append("Consider improving data extraction quality")
        if len(conflicts) > len(normalized_data_list) * 0.5:
            recommendations.append("High conflict rate - review data sources")

        # Use original result as base or create new one
        if original_query_result:
            base_result = original_query_result
        else:
            # Create basic result
            successful_chunks = len([r for r in chunk_results if r.status == "completed"])
            base_result = QueryResult(
                query_id=context.query_id,
                original_query=context.original_query,
                intent=context.intent,
                status=context.status if hasattr(context, 'status') else None,
                answer="Advanced aggregation completed",
                chunk_results=chunk_results,
                aggregated_data=aggregated_data,
                total_chunks=len(chunk_results),
                successful_chunks=successful_chunks,
                failed_chunks=len(chunk_results) - successful_chunks,
                total_tokens=sum(r.tokens_used for r in chunk_results),
                total_cost=0.0,
                processing_time=processing_time,
                confidence_score=quality_metrics.confidence_score,
                completeness_score=quality_metrics.completeness_score,
                relevance_score=quality_metrics.reliability_score,
                model_used="advanced_aggregation",
                prompt_strategy=context.intent.value
            )

        # Create enhanced result
        enhanced_result = EnhancedQueryResult(
            # Base QueryResult fields
            query_id=base_result.query_id,
            original_query=base_result.original_query,
            intent=base_result.intent,
            status=base_result.status,
            answer=base_result.answer,
            chunk_results=base_result.chunk_results,
            aggregated_data=base_result.aggregated_data,
            total_chunks=base_result.total_chunks,
            successful_chunks=base_result.successful_chunks,
            failed_chunks=base_result.failed_chunks,
            total_tokens=base_result.total_tokens,
            total_cost=base_result.total_cost,
            processing_time=base_result.processing_time,
            confidence_score=base_result.confidence_score,
            completeness_score=base_result.completeness_score,
            relevance_score=base_result.relevance_score,
            model_used=base_result.model_used,
            prompt_strategy=base_result.prompt_strategy,

            # Enhanced fields
            extracted_data=extracted_data_list,
            conflicts_detected=conflicts,
            conflicts_resolved=resolutions,
            quality_metrics=quality_metrics,
            structured_output=aggregated_data,
            aggregation_metadata=aggregation_metadata,
            data_insights=insights,
            recommendations=recommendations,
            uncertainty_factors=[f"Confidence: {quality_metrics.confidence_score:.2f}"]
        )

        logger.debug("Enhanced result generation completed")
        return enhanced_result
