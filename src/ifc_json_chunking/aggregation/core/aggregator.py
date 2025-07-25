"""
Advanced aggregation orchestrator.

This module coordinates the entire aggregation pipeline through
specialized phase classes for maintainability and single responsibility.
"""

import time
from typing import Any, Dict, List, Optional
import structlog

from ...query.types import QueryResult, ChunkResult, QueryContext, QueryIntent
from ...types.aggregation_types import (
    ExtractedData, EnhancedQueryResult, QualityMetrics, AggregationMetadata,
    AggregationStrategy, ValidationLevel, Conflict, ConflictResolution
)

from .data_extractor import DataExtractor
from .normalizer import DataNormalizer
from ..conflict.detector import ConflictDetector
from ..strategies.quantity_strategy import QuantityAggregationStrategy
from .phases import (
    DataExtractionPhase, DataNormalizationPhase, ConflictDetectionPhase,
    ConflictResolutionPhase, DataAggregationPhase, QualityAssessmentPhase,
    ResultGenerationPhase
)

logger = structlog.get_logger(__name__)


class AdvancedAggregator:
    """
    Main orchestrator for advanced result aggregation and synthesis.
    
    Coordinates the 7-phase aggregation pipeline through specialized
    phase objects for maintainability and single responsibility.
    """
    
    def __init__(
        self,
        validation_level: ValidationLevel = ValidationLevel.STANDARD,
        enable_conflict_resolution: bool = True,
        quality_threshold: float = 0.5
    ):
        """Initialize aggregator with phase objects."""
        self.validation_level = validation_level
        self.enable_conflict_resolution = enable_conflict_resolution
        self.quality_threshold = quality_threshold
        
        # Initialize phase objects
        self._init_phases()
        
        logger.info(
            "AdvancedAggregator initialized with 7-phase pipeline",
            validation_level=validation_level.value,
            conflict_resolution=enable_conflict_resolution,
            quality_threshold=quality_threshold
        )
    
    def _init_phases(self) -> None:
        """Initialize all phase objects."""
        # Initialize core components
        data_extractor = DataExtractor()
        data_normalizer = DataNormalizer()
        conflict_detector = ConflictDetector()
        
        # Initialize aggregation strategies
        strategies = {AggregationStrategy.QUANTITATIVE: QuantityAggregationStrategy()}
        
        # Create phase objects
        self.extraction_phase = DataExtractionPhase(data_extractor)
        self.normalization_phase = DataNormalizationPhase(data_normalizer)
        self.conflict_detection_phase = ConflictDetectionPhase(conflict_detector)
        self.conflict_resolution_phase = ConflictResolutionPhase(self.enable_conflict_resolution)
        self.aggregation_phase = DataAggregationPhase(strategies)
        self.quality_assessment_phase = QualityAssessmentPhase(self.quality_threshold)
        self.result_generation_phase = ResultGenerationPhase()
    
    async def aggregate_results(
        self,
        context: QueryContext,
        chunk_results: List[ChunkResult],
        original_query_result: Optional[QueryResult] = None
    ) -> EnhancedQueryResult:
        """Execute 7-phase aggregation pipeline through specialized phase objects."""
        start_time = time.time()
        
        logger.info(
            "Starting 7-phase aggregation pipeline",
            query_id=context.query_id,
            intent=context.intent.value,
            chunk_count=len(chunk_results)
        )
        
        try:
            # Execute all 7 phases in sequence
            extracted_data_list = await self.extraction_phase.execute(chunk_results, context)
            normalized_data_list = await self.normalization_phase.execute(extracted_data_list)
            conflicts = await self.conflict_detection_phase.execute(normalized_data_list, context)
            resolutions = await self.conflict_resolution_phase.execute(conflicts, normalized_data_list, context)
            aggregated_data = await self.aggregation_phase.execute(normalized_data_list, context, resolutions)
            quality_metrics = await self.quality_assessment_phase.execute(
                normalized_data_list, conflicts, resolutions, aggregated_data, context
            )
            enhanced_result = await self.result_generation_phase.execute(
                context, chunk_results, extracted_data_list, normalized_data_list,
                conflicts, resolutions, aggregated_data, quality_metrics,
                original_query_result, start_time
            )
            
            logger.info(
                "7-phase aggregation completed",
                query_id=context.query_id,
                processing_time=time.time() - start_time,
                conflicts_detected=len(conflicts),
                conflicts_resolved=len(resolutions),
                overall_quality=quality_metrics.overall_quality
            )
            
            return enhanced_result
            
        except Exception as e:
            logger.error("Aggregation pipeline failed", query_id=context.query_id, error=str(e))
            raise