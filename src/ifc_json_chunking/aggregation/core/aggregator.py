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


class PhaseRegistry:
    """Registry for managing aggregation phases with execution coordination."""
    
    def __init__(self):
        """Initialize phase registry with all phases."""
        self.phases = [
            ("extraction", DataExtractionPhase(), self._execute_extraction_phase),
            ("normalization", DataNormalizationPhase(), self._execute_normalization_phase),
            ("conflict_detection", ConflictDetectionPhase(), self._execute_conflict_detection_phase),
            ("conflict_resolution", ConflictResolutionPhase(), self._execute_conflict_resolution_phase),
            ("aggregation", AggregationPhase(), self._execute_aggregation_phase),
            ("quality_assessment", QualityAssessmentPhase(), self._execute_quality_assessment_phase),
            ("result_generation", ResultGenerationPhase(), self._execute_result_generation_phase)
        ]
        
        # Create lookup maps for individual phase access
        self.phase_map = {name: phase for name, phase, _ in self.phases}
        self.executor_map = {name: executor for name, _, executor in self.phases}
    
    async def execute_phases(self, context, chunk_results, original_query_result, start_time):
        """Execute all phases in sequence with state management."""
        state = PhaseExecutionState()
        
        for phase_name, phase, executor in self.phases:
            logger.debug(f"Starting phase: {phase_name}")
            result = await executor(phase, state, context, chunk_results, original_query_result, start_time)
            state.set_phase_result(phase_name, result)
            logger.debug(f"Phase {phase_name} completed")
        
        return state.get_final_result()
    
    # Phase execution methods
    async def _execute_extraction_phase(self, phase, state, context, chunk_results, *args):
        extracted_data_list = await phase.execute(chunk_results, context)
        logger.debug(f"Phase 1 completed: {len(extracted_data_list)} data objects extracted")
        return extracted_data_list
    
    async def _execute_normalization_phase(self, phase, state, context, chunk_results, *args):
        extracted_data_list = state.get_phase_result("extraction")
        normalized_data_list = await phase.execute(extracted_data_list)
        logger.debug(f"Phase 2 completed: {len(normalized_data_list)} data objects normalized")
        return normalized_data_list
    
    async def _execute_conflict_detection_phase(self, phase, state, context, chunk_results, *args):
        normalized_data_list = state.get_phase_result("normalization")
        conflicts = await phase.execute(normalized_data_list, context)
        logger.debug(f"Phase 3 completed: {len(conflicts)} conflicts detected")
        return conflicts
    
    async def _execute_conflict_resolution_phase(self, phase, state, context, chunk_results, *args):
        conflicts = state.get_phase_result("conflict_detection")
        normalized_data_list = state.get_phase_result("normalization")
        resolutions = await phase.execute(conflicts, normalized_data_list, context)
        logger.debug(f"Phase 4 completed: {len(resolutions)} conflicts resolved")
        return resolutions
    
    async def _execute_aggregation_phase(self, phase, state, context, chunk_results, *args):
        normalized_data_list = state.get_phase_result("normalization")
        resolutions = state.get_phase_result("conflict_resolution")
        aggregated_data = await phase.execute(normalized_data_list, context, resolutions)
        logger.debug(f"Phase 5 completed: aggregation using {aggregated_data.get('strategy', 'unknown')} strategy")
        return aggregated_data
    
    async def _execute_quality_assessment_phase(self, phase, state, context, chunk_results, *args):
        normalized_data_list = state.get_phase_result("normalization")
        conflicts = state.get_phase_result("conflict_detection")
        resolutions = state.get_phase_result("conflict_resolution")
        aggregated_data = state.get_phase_result("aggregation")
        quality_metrics = await phase.execute(normalized_data_list, conflicts, resolutions, aggregated_data, context)
        logger.debug(f"Phase 6 completed: overall quality {quality_metrics.overall_quality:.3f}")
        return quality_metrics
    
    async def _execute_result_generation_phase(self, phase, state, context, chunk_results, original_query_result, start_time):
        extracted_data_list = state.get_phase_result("extraction")
        normalized_data_list = state.get_phase_result("normalization")
        conflicts = state.get_phase_result("conflict_detection")
        resolutions = state.get_phase_result("conflict_resolution")
        aggregated_data = state.get_phase_result("aggregation")
        quality_metrics = state.get_phase_result("quality_assessment")
        
        enhanced_result = await phase.execute(
            context, chunk_results, extracted_data_list, normalized_data_list,
            conflicts, resolutions, aggregated_data, quality_metrics,
            original_query_result, start_time
        )
        return enhanced_result


class PhaseExecutionState:
    """Manages state between phase executions."""
    
    def __init__(self):
        self.phase_results = {}
    
    def set_phase_result(self, phase_name: str, result):
        """Store result from a phase."""
        self.phase_results[phase_name] = result
    
    def get_phase_result(self, phase_name: str):
        """Get result from a previous phase."""
        return self.phase_results.get(phase_name)
    
    def get_final_result(self):
        """Get the final enhanced result."""
        return self.phase_results.get("result_generation")


class AdvancedAggregator:
    """
    Main orchestrator for the advanced result aggregation system.
    
    Coordinates all phases of the aggregation pipeline from data extraction
    through conflict resolution to final result generation with quality metrics.
    """
    
    def __init__(self):
        """Initialize the aggregator with phase registry."""
        self.phase_registry = PhaseRegistry()
        logger.info("AdvancedAggregator initialized with phase registry")
    
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
            # Execute all phases through the registry
            enhanced_result = await self.phase_registry.execute_phases(
                context, chunk_results, original_query_result, start_time
            )
            
            # Log completion metrics
            processing_time = time.time() - start_time
            self._log_completion_metrics(context, processing_time, enhanced_result)
            
            return enhanced_result
            
        except Exception as e:
            logger.error(
                "Advanced aggregation pipeline failed",
                query_id=context.query_id,
                error=str(e),
                processing_time=time.time() - start_time
            )
            raise
    
    def _log_completion_metrics(self, context, processing_time: float, enhanced_result) -> None:
        """Log aggregation completion metrics."""
        logger.info(
            "Advanced aggregation pipeline completed",
            query_id=context.query_id,
            processing_time=processing_time,
            conflicts_detected=len(enhanced_result.conflicts_detected),
            conflicts_resolved=len(enhanced_result.conflicts_resolved),
            overall_quality=enhanced_result.quality_metrics.overall_quality if enhanced_result.quality_metrics else 0.0
        )
    
    async def health_check(self) -> dict:
        """Perform health check on all aggregation components."""
        health_status = {"aggregator": True}
        
        try:
            for phase_name, phase in self.phase_registry.phase_map.items():
                if hasattr(phase, 'health_check'):
                    health_status[phase_name] = await phase.health_check()
                else:
                    health_status[phase_name] = True
                    
        except Exception as e:
            logger.error("Health check failed", error=str(e))
            health_status["overall"] = False
            
        return health_status