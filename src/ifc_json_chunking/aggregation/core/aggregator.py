"""
Advanced Result Aggregation & Synthesis Engine - Main Orchestrator.

This module implements the main orchestrator that coordinates all aggregation
components from PRs 1-4 into a unified system for QueryProcessor integration.
"""

import time
from typing import List, Optional
import structlog

from ...query.types import QueryContext, ChunkResult, QueryResult
from ...types.aggregation_types import (
    EnhancedQueryResult, ExtractedData, Conflict, ConflictResolution, 
    QualityMetrics, AggregationMetadata, AggregationStrategy
)

# Import phase classes from the aggregation system
from .phases import (
    DataExtractionPhase, DataNormalizationPhase, ConflictDetectionPhase,
    ConflictResolutionPhase, AggregationPhase, QualityAssessmentPhase,
    ResultGenerationPhase
)

logger = structlog.get_logger(__name__)


class AdvancedAggregator:
    """
    Main orchestrator for the advanced result aggregation system.
    
    Coordinates all phases of the aggregation pipeline from data extraction
    through conflict resolution to final result generation with quality metrics.
    """
    
    def __init__(self):
        """Initialize the aggregator with all required phase components."""
        # Initialize phase components (these would be imported from other PRs)
        self.extraction_phase = DataExtractionPhase()
        self.normalization_phase = DataNormalizationPhase()
        self.conflict_detection_phase = ConflictDetectionPhase()
        self.conflict_resolution_phase = ConflictResolutionPhase()
        self.aggregation_phase = AggregationPhase()
        self.quality_assessment_phase = QualityAssessmentPhase()
        self.result_generation_phase = ResultGenerationPhase()
        
        logger.info("AdvancedAggregator initialized with all phases")
    
    async def aggregate_results(
        self,
        context: QueryContext,
        chunk_results: List[ChunkResult],
        original_query_result: Optional[QueryResult] = None
    ) -> EnhancedQueryResult:
        """
        Execute the complete 7-phase aggregation pipeline.
        
        Args:
            context: Query context with intent and parameters
            chunk_results: Results from individual chunk processing
            original_query_result: Original simple aggregation result
            
        Returns:
            Enhanced query result with advanced aggregation features
        """
        start_time = time.time()
        
        logger.info(
            "Starting advanced aggregation pipeline",
            query_id=context.query_id,
            intent=context.intent.value,
            chunk_count=len(chunk_results)
        )
        
        try:
            # Phase 1: Data Extraction
            extracted_data_list = await self.extraction_phase.execute(chunk_results, context)
            logger.debug(f"Phase 1 completed: {len(extracted_data_list)} data objects extracted")
            
            # Phase 2: Data Normalization  
            normalized_data_list = await self.normalization_phase.execute(extracted_data_list)
            logger.debug(f"Phase 2 completed: {len(normalized_data_list)} data objects normalized")
            
            # Phase 3: Conflict Detection
            conflicts = await self.conflict_detection_phase.execute(normalized_data_list, context)
            logger.debug(f"Phase 3 completed: {len(conflicts)} conflicts detected")
            
            # Phase 4: Conflict Resolution
            resolutions = await self.conflict_resolution_phase.execute(conflicts, normalized_data_list, context)
            logger.debug(f"Phase 4 completed: {len(resolutions)} conflicts resolved")
            
            # Phase 5: Statistical Aggregation
            aggregated_data = await self.aggregation_phase.execute(normalized_data_list, context, resolutions)
            logger.debug(f"Phase 5 completed: aggregation using {aggregated_data.get('strategy', 'unknown')} strategy")
            
            # Phase 6: Quality Assessment
            quality_metrics = await self.quality_assessment_phase.execute(
                normalized_data_list, conflicts, resolutions, aggregated_data, context
            )
            logger.debug(f"Phase 6 completed: overall quality {quality_metrics.overall_quality:.3f}")
            
            # Phase 7: Result Generation
            enhanced_result = await self.result_generation_phase.execute(
                context, chunk_results, extracted_data_list, normalized_data_list,
                conflicts, resolutions, aggregated_data, quality_metrics,
                original_query_result, start_time
            )
            
            processing_time = time.time() - start_time
            logger.info(
                "Advanced aggregation pipeline completed",
                query_id=context.query_id,
                processing_time=processing_time,
                conflicts_detected=len(conflicts),
                conflicts_resolved=len(resolutions),
                overall_quality=quality_metrics.overall_quality
            )
            
            return enhanced_result
            
        except Exception as e:
            logger.error(
                "Advanced aggregation pipeline failed",
                query_id=context.query_id,
                error=str(e),
                processing_time=time.time() - start_time
            )
            raise
    
    async def health_check(self) -> dict:
        """Perform health check on all aggregation components."""
        health_status = {"aggregator": True}
        
        try:
            # Check each phase
            phases = [
                ("extraction", self.extraction_phase),
                ("normalization", self.normalization_phase),
                ("conflict_detection", self.conflict_detection_phase),
                ("conflict_resolution", self.conflict_resolution_phase),
                ("aggregation", self.aggregation_phase),
                ("quality_assessment", self.quality_assessment_phase),
                ("result_generation", self.result_generation_phase)
            ]
            
            for phase_name, phase in phases:
                if hasattr(phase, 'health_check'):
                    health_status[phase_name] = await phase.health_check()
                else:
                    health_status[phase_name] = True
                    
        except Exception as e:
            logger.error("Health check failed", error=str(e))
            health_status["overall"] = False
            
        return health_status