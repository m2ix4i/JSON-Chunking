"""
Advanced aggregation orchestrator.

This module coordinates the entire aggregation pipeline including
data extraction, normalization, conflict detection and resolution,
quality assessment, and structured output generation.
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
from ..quality.confidence import ConfidenceCalculator
from ..quality.scorer import QualityScorer
from ..quality.uncertainty import UncertaintyHandler

logger = structlog.get_logger(__name__)


class AdvancedAggregator:
    """
    Main orchestrator for advanced result aggregation and synthesis.
    
    Coordinates the entire pipeline from chunk results to enhanced
    query results with conflict resolution and quality assurance.
    """
    
    def __init__(
        self,
        validation_level: ValidationLevel = ValidationLevel.STANDARD,
        enable_conflict_resolution: bool = True,
        quality_threshold: float = 0.5
    ):
        """
        Initialize advanced aggregator.
        
        Args:
            validation_level: Level of validation to perform
            enable_conflict_resolution: Whether to perform conflict resolution
            quality_threshold: Minimum quality threshold for results
        """
        self.validation_level = validation_level
        self.enable_conflict_resolution = enable_conflict_resolution
        self.quality_threshold = quality_threshold
        
        # Initialize components
        self.data_extractor = DataExtractor()
        self.data_normalizer = DataNormalizer()
        self.conflict_detector = ConflictDetector()
        
        # Initialize quality assessment components
        self.confidence_calculator = ConfidenceCalculator()
        self.quality_scorer = QualityScorer()
        self.uncertainty_handler = UncertaintyHandler()
        
        # Initialize aggregation strategies
        self.strategies = {
            AggregationStrategy.QUANTITATIVE: QuantityAggregationStrategy()
        }
        
        logger.info(
            "AdvancedAggregator initialized",
            validation_level=validation_level.value,
            conflict_resolution=enable_conflict_resolution,
            quality_threshold=quality_threshold
        )
    
    async def aggregate_results(
        self,
        context: QueryContext,
        chunk_results: List[ChunkResult],
        original_query_result: Optional[QueryResult] = None
    ) -> EnhancedQueryResult:
        """
        Perform advanced aggregation of chunk results.
        
        Args:
            context: Query context with intent and parameters
            chunk_results: List of chunk processing results
            original_query_result: Original query result to enhance (optional)
            
        Returns:
            Enhanced query result with advanced aggregation
        """
        start_time = time.time()
        
        logger.info(
            "Starting advanced aggregation",
            query_id=context.query_id,
            intent=context.intent.value,
            chunk_count=len(chunk_results)
        )
        
        try:
            # Phase 1: Data Extraction
            logger.debug("Phase 1: Data extraction")
            extracted_data_list = await self._extract_data_phase(chunk_results, context)
            
            # Phase 2: Data Normalization  
            logger.debug("Phase 2: Data normalization")
            normalized_data_list = await self._normalize_data_phase(extracted_data_list)
            
            # Phase 3: Conflict Detection
            logger.debug("Phase 3: Conflict detection")
            conflicts = await self._detect_conflicts_phase(normalized_data_list, context)
            
            # Phase 4: Conflict Resolution (if enabled)
            resolutions = []
            if self.enable_conflict_resolution and conflicts:
                logger.debug("Phase 4: Conflict resolution")
                resolutions = await self._resolve_conflicts_phase(conflicts, normalized_data_list, context)
            
            # Phase 5: Data Aggregation
            logger.debug("Phase 5: Data aggregation")
            aggregated_data = await self._aggregate_data_phase(normalized_data_list, context, resolutions)
            
            # Phase 6: Quality Assessment
            logger.debug("Phase 6: Quality assessment")
            quality_metrics = await self._assess_quality_phase(
                normalized_data_list, conflicts, resolutions, aggregated_data, context
            )
            
            # Phase 7: Generate Enhanced Result
            logger.debug("Phase 7: Generate enhanced result")
            enhanced_result = await self._generate_enhanced_result(
                context, chunk_results, extracted_data_list, normalized_data_list,
                conflicts, resolutions, aggregated_data, quality_metrics,
                original_query_result, start_time
            )
            
            processing_time = time.time() - start_time
            
            logger.info(
                "Advanced aggregation completed",
                query_id=context.query_id,
                processing_time=processing_time,
                conflicts_detected=len(conflicts),
                conflicts_resolved=len(resolutions),
                overall_quality=quality_metrics.overall_quality if quality_metrics else 0.0
            )
            
            return enhanced_result
            
        except Exception as e:
            logger.error(
                "Advanced aggregation failed",
                query_id=context.query_id,
                error=str(e)
            )
            
            # Return basic result on failure
            return await self._create_fallback_result(context, chunk_results, original_query_result, str(e))
    
    async def _extract_data_phase(
        self,
        chunk_results: List[ChunkResult],
        context: QueryContext
    ) -> List[ExtractedData]:
        """Phase 1: Extract structured data from chunk results."""
        
        extracted_data_list = await self.data_extractor.extract_batch(
            chunk_results, context.intent, {'query_context': context.to_dict()}
        )
        
        logger.debug(
            "Data extraction completed",
            total_chunks=len(chunk_results),
            successful_extractions=len([d for d in extracted_data_list if d.extraction_confidence > 0])
        )
        
        return extracted_data_list
    
    async def _normalize_data_phase(
        self,
        extracted_data_list: List[ExtractedData]
    ) -> List[ExtractedData]:
        """Phase 2: Normalize extracted data."""
        
        normalized_data_list = await self.data_normalizer.normalize_batch(extracted_data_list)
        
        logger.debug(
            "Data normalization completed",
            total_items=len(extracted_data_list),
            normalization_errors=sum(1 for d in normalized_data_list if d.processing_errors)
        )
        
        return normalized_data_list
    
    async def _detect_conflicts_phase(
        self,
        normalized_data_list: List[ExtractedData],
        context: QueryContext
    ) -> List[Conflict]:
        """Phase 3: Detect conflicts in normalized data."""
        
        conflicts = await self.conflict_detector.detect_conflicts(normalized_data_list, context)
        
        logger.debug(
            "Conflict detection completed",
            conflicts_detected=len(conflicts),
            conflict_types=[c.conflict_type.value for c in conflicts]
        )
        
        return conflicts
    
    async def _resolve_conflicts_phase(
        self,
        conflicts: List[Conflict],
        normalized_data_list: List[ExtractedData],
        context: QueryContext
    ) -> List[ConflictResolution]:
        """Phase 4: Resolve detected conflicts."""
        
        # For now, implement basic resolution strategies
        # This would be expanded with sophisticated conflict resolvers
        resolutions = []
        
        for conflict in conflicts:
            resolution = await self._simple_conflict_resolution(conflict, normalized_data_list, context)
            if resolution:
                resolutions.append(resolution)
        
        logger.debug(
            "Conflict resolution completed",
            conflicts_processed=len(conflicts),
            resolutions_generated=len(resolutions)
        )
        
        return resolutions
    
    async def _simple_conflict_resolution(
        self,
        conflict: Conflict,
        normalized_data_list: List[ExtractedData],
        context: QueryContext
    ) -> Optional[ConflictResolution]:
        """Simple conflict resolution using majority rule or confidence weighting."""
        
        from ...types.aggregation_types import ConflictStrategy
        
        # For quantitative conflicts, use statistical analysis
        if conflict.conflict_type.value == 'quantitative_mismatch':
            # Use confidence-weighted average
            values = conflict.conflicting_values
            evidence = conflict.evidence
            
            if values and evidence:
                weighted_sum = sum(val * ev.confidence for val, ev in zip(values, evidence))
                total_weight = sum(ev.confidence for ev in evidence)
                
                if total_weight > 0:
                    resolved_value = weighted_sum / total_weight
                    
                    return ConflictResolution(
                        conflict=conflict,
                        strategy=ConflictStrategy.CONFIDENCE_WEIGHTED,
                        resolved_value=resolved_value,
                        confidence=min(total_weight / len(evidence), 1.0),
                        reasoning=f"Confidence-weighted average of {len(values)} values",
                        evidence_used=evidence
                    )
        
        # For qualitative conflicts, use majority rule
        elif conflict.conflict_type.value == 'qualitative_contradiction':
            from collections import Counter
            value_counts = Counter(conflict.conflicting_values)
            most_common = value_counts.most_common(1)[0]
            
            if most_common[1] > 1:  # Has majority
                return ConflictResolution(
                    conflict=conflict,
                    strategy=ConflictStrategy.MAJORITY_RULE,
                    resolved_value=most_common[0],
                    confidence=most_common[1] / len(conflict.conflicting_values),
                    reasoning=f"Majority rule: {most_common[0]} appears {most_common[1]} times",
                    evidence_used=[ev for ev in conflict.evidence if most_common[0] in ev.content]
                )
        
        return None
    
    async def _aggregate_data_phase(
        self,
        normalized_data_list: List[ExtractedData],
        context: QueryContext,
        resolutions: List[ConflictResolution]
    ) -> Dict[str, Any]:
        """Phase 5: Aggregate normalized data."""
        
        aggregated_data = {}
        
        # Select appropriate aggregation strategy based on query intent
        strategy = None
        if context.intent in [QueryIntent.QUANTITY, QueryIntent.COST]:
            strategy = self.strategies.get(AggregationStrategy.QUANTITATIVE)
        
        if strategy:
            strategy_result = await strategy.aggregate(normalized_data_list, context)
            aggregated_data['quantitative'] = strategy_result
            
            # Handle conflicts if strategy supports it
            if hasattr(strategy, 'handle_conflicts'):
                conflict_handling = await strategy.handle_conflicts(
                    [res.conflict for res in resolutions], resolutions
                )
                aggregated_data['conflict_handling'] = conflict_handling
        
        # Add basic aggregation for other data types
        aggregated_data['entities'] = await self._aggregate_entities(normalized_data_list)
        aggregated_data['properties'] = await self._aggregate_properties(normalized_data_list)
        aggregated_data['relationships'] = await self._aggregate_relationships(normalized_data_list)
        
        logger.debug(
            "Data aggregation completed",
            strategies_used=list(aggregated_data.keys()),
            has_quantitative=bool(aggregated_data.get('quantitative'))
        )
        
        return aggregated_data
    
    async def _aggregate_entities(self, data_list: List[ExtractedData]) -> Dict[str, Any]:
        """Aggregate entity information."""
        all_entities = []
        entity_counts = {}
        
        for data in data_list:
            for entity in data.entities:
                all_entities.append(entity)
                entity_type = entity.get('type', 'unknown')
                entity_counts[entity_type] = entity_counts.get(entity_type, 0) + 1
        
        return {
            'total_entities': len(all_entities),
            'entity_types': entity_counts,
            'unique_entities': len(set(e.get('entity_id') for e in all_entities if e.get('entity_id')))
        }
    
    async def _aggregate_properties(self, data_list: List[ExtractedData]) -> Dict[str, Any]:
        """Aggregate property information."""
        all_properties = {}
        
        for data in data_list:
            for prop_key, prop_value in data.properties.items():
                if prop_key not in all_properties:
                    all_properties[prop_key] = []
                all_properties[prop_key].append(prop_value)
        
        # Deduplicate and count
        property_summary = {}
        for prop_key, prop_values in all_properties.items():
            unique_values = list(set(str(v) for v in prop_values))
            property_summary[prop_key] = {
                'unique_values': unique_values,
                'occurrence_count': len(prop_values),
                'most_common': max(set(prop_values), key=prop_values.count) if prop_values else None
            }
        
        return property_summary
    
    async def _aggregate_relationships(self, data_list: List[ExtractedData]) -> Dict[str, Any]:
        """Aggregate relationship information."""
        all_relationships = []
        relationship_types = {}
        
        for data in data_list:
            for relationship in data.relationships:
                all_relationships.append(relationship)
                rel_type = relationship.get('type', 'unknown')
                relationship_types[rel_type] = relationship_types.get(rel_type, 0) + 1
        
        return {
            'total_relationships': len(all_relationships),
            'relationship_types': relationship_types
        }
    
    async def _assess_quality_phase(
        self,
        normalized_data_list: List[ExtractedData],
        conflicts: List[Conflict],
        resolutions: List[ConflictResolution],
        aggregated_data: Dict[str, Any],
        context: QueryContext
    ) -> QualityMetrics:
        """Phase 6: Assess overall quality of aggregated results."""
        
        # Calculate basic quality metrics
        total_sources = len(normalized_data_list)
        high_confidence_sources = len([d for d in normalized_data_list if d.extraction_confidence >= 0.7])
        
        confidence_score = high_confidence_sources / total_sources if total_sources > 0 else 0.0
        
        # Completeness based on data richness
        completeness_score = 0.0
        if normalized_data_list:
            avg_entities = sum(len(d.entities) for d in normalized_data_list) / len(normalized_data_list)
            avg_quantities = sum(len(d.quantities) for d in normalized_data_list) / len(normalized_data_list)
            avg_properties = sum(len(d.properties) for d in normalized_data_list) / len(normalized_data_list)
            
            # Normalize to 0-1 scale (heuristic)
            completeness_score = min((avg_entities + avg_quantities + avg_properties) / 10, 1.0)
        
        # Consistency based on conflicts
        unresolved_conflicts = len(conflicts) - len(resolutions)
        consistency_score = max(0.0, 1.0 - (unresolved_conflicts * 0.1))
        
        # Reliability based on extraction quality
        high_quality_data = len([d for d in normalized_data_list if d.data_quality == 'high'])
        reliability_score = high_quality_data / total_sources if total_sources > 0 else 0.0
        
        # Calculate uncertainty
        uncertainty_level = min(unresolved_conflicts * 0.05, 0.5)  # Max 50% uncertainty
        
        # Determine if validation passed
        validation_passed = (
            confidence_score >= self.quality_threshold and
            consistency_score >= 0.7 and
            unresolved_conflicts <= 2
        )
        
        quality_metrics = QualityMetrics(
            confidence_score=confidence_score,
            completeness_score=completeness_score,
            consistency_score=consistency_score,
            reliability_score=reliability_score,
            uncertainty_level=uncertainty_level,
            validation_passed=validation_passed,
            data_coverage=high_confidence_sources / total_sources if total_sources > 0 else 0.0,
            extraction_quality=sum(d.extraction_confidence for d in normalized_data_list) / len(normalized_data_list) if normalized_data_list else 0.0,
            conflict_resolution_rate=len(resolutions) / len(conflicts) if conflicts else 1.0,
            calculation_method="advanced_aggregation"
        )
        
        return quality_metrics
    
    async def _generate_enhanced_result(
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
        """Generate enhanced query result with all aggregation information."""
        
        processing_time = time.time() - start_time
        
        # Create aggregation metadata
        aggregation_metadata = AggregationMetadata(
            strategy_used=AggregationStrategy.QUANTITATIVE,  # Main strategy used
            chunks_processed=len(chunk_results),
            chunks_successful=len([cr for cr in chunk_results if cr.status == "completed"]),
            conflicts_detected=len(conflicts),
            conflicts_resolved=len(resolutions),
            processing_time=processing_time,
            algorithms_used=["data_extraction", "normalization", "conflict_detection", "quantitative_aggregation"],
            validation_level=self.validation_level,
            quality_checks_performed=["confidence_validation", "consistency_checking", "completeness_assessment"]
        )
        
        # Generate answer based on aggregated data
        answer = await self._generate_final_answer(aggregated_data, context, quality_metrics)
        
        # Create enhanced result
        if original_query_result:
            # Enhance existing result
            enhanced_result = EnhancedQueryResult(
                # Copy base fields
                query_id=original_query_result.query_id,
                original_query=original_query_result.original_query,
                intent=original_query_result.intent,
                status=original_query_result.status,
                answer=answer,
                chunk_results=original_query_result.chunk_results,
                aggregated_data=aggregated_data,
                total_chunks=original_query_result.total_chunks,
                successful_chunks=original_query_result.successful_chunks,
                failed_chunks=original_query_result.failed_chunks,
                total_tokens=original_query_result.total_tokens,
                total_cost=original_query_result.total_cost,
                processing_time=processing_time,
                confidence_score=quality_metrics.confidence_score,
                completeness_score=quality_metrics.completeness_score,
                relevance_score=original_query_result.relevance_score,
                model_used=original_query_result.model_used,
                prompt_strategy=original_query_result.prompt_strategy,
                # Enhanced fields
                extracted_data=extracted_data_list,
                conflicts_detected=conflicts,
                conflicts_resolved=resolutions,
                quality_metrics=quality_metrics,
                structured_output=aggregated_data,
                aggregation_metadata=aggregation_metadata
            )
        else:
            # Create new enhanced result
            enhanced_result = EnhancedQueryResult(
                query_id=context.query_id,
                original_query=context.original_query,
                intent=context.intent,
                status=context.status if hasattr(context, 'status') else "completed",
                answer=answer,
                chunk_results=chunk_results,
                aggregated_data=aggregated_data,
                total_chunks=len(chunk_results),
                successful_chunks=len([cr for cr in chunk_results if cr.status == "completed"]),
                failed_chunks=len([cr for cr in chunk_results if cr.status != "completed"]),
                total_tokens=sum(cr.tokens_used for cr in chunk_results),
                total_cost=0.0,  # Would be calculated based on tokens
                processing_time=processing_time,
                confidence_score=quality_metrics.confidence_score,
                completeness_score=quality_metrics.completeness_score,
                relevance_score=quality_metrics.reliability_score,
                model_used="advanced_aggregation",
                prompt_strategy=context.intent.value,
                # Enhanced fields
                extracted_data=extracted_data_list,
                conflicts_detected=conflicts,
                conflicts_resolved=resolutions,
                quality_metrics=quality_metrics,
                structured_output=aggregated_data,
                aggregation_metadata=aggregation_metadata
            )
        
        return enhanced_result
    
    async def _generate_final_answer(
        self,
        aggregated_data: Dict[str, Any],
        context: QueryContext,
        quality_metrics: QualityMetrics
    ) -> str:
        """Generate final answer from aggregated data."""
        
        answer_parts = []
        
        # Add quantitative results if available
        if 'quantitative' in aggregated_data:
            quant_data = aggregated_data['quantitative']
            for qty_type, qty_info in quant_data.items():
                if qty_type.startswith('_'):  # Skip metadata
                    continue
                    
                if isinstance(qty_info, dict) and 'value' in qty_info:
                    unit = qty_info.get('unit', '')
                    confidence = qty_info.get('confidence', 0.0)
                    operation = qty_info.get('operation', 'calculated')
                    
                    answer_parts.append(
                        f"{qty_type.title()}: {qty_info['value']:.2f} {unit} "
                        f"({operation}, confidence: {confidence:.2f})"
                    )
        
        # Add entity summary
        if 'entities' in aggregated_data:
            entity_data = aggregated_data['entities']
            total_entities = entity_data.get('total_entities', 0)
            if total_entities > 0:
                answer_parts.append(f"Total entities found: {total_entities}")
                
                entity_types = entity_data.get('entity_types', {})
                if entity_types:
                    type_summary = ", ".join(f"{count} {etype}" for etype, count in entity_types.items())
                    answer_parts.append(f"Entity breakdown: {type_summary}")
        
        # Add quality information
        answer_parts.append(
            f"\\nResult quality: {quality_metrics.overall_quality:.2f} "
            f"(confidence: {quality_metrics.confidence_score:.2f}, "
            f"completeness: {quality_metrics.completeness_score:.2f})"
        )
        
        # Add conflict information if any
        if 'conflict_handling' in aggregated_data:
            conflict_info = aggregated_data['conflict_handling']
            conflicts_addressed = conflict_info.get('conflicts_addressed', 0)
            if conflicts_addressed > 0:
                answer_parts.append(f"\\nNote: {conflicts_addressed} data conflicts were detected and resolved.")
        
        return "\\n".join(answer_parts) if answer_parts else "No significant quantitative data found."
    
    async def _create_fallback_result(
        self,
        context: QueryContext,
        chunk_results: List[ChunkResult],
        original_query_result: Optional[QueryResult],
        error_message: str
    ) -> EnhancedQueryResult:
        """Create fallback result when aggregation fails."""
        
        from ...query.types import QueryStatus
        
        fallback_result = EnhancedQueryResult(
            query_id=context.query_id,
            original_query=context.original_query,
            intent=context.intent,
            status=QueryStatus.COMPLETED,
            answer=f"Advanced aggregation failed: {error_message}. Using basic result.",
            chunk_results=chunk_results,
            aggregated_data={},
            total_chunks=len(chunk_results),
            successful_chunks=len([cr for cr in chunk_results if cr.status == "completed"]),
            failed_chunks=len([cr for cr in chunk_results if cr.status != "completed"]),
            total_tokens=sum(cr.tokens_used for cr in chunk_results),
            total_cost=0.0,
            processing_time=0.0,
            confidence_score=0.3,
            completeness_score=0.3,
            relevance_score=0.3,
            model_used="fallback",
            prompt_strategy="error_fallback",
            # Enhanced fields
            extracted_data=[],
            conflicts_detected=[],
            conflicts_resolved=[],
            quality_metrics=None,
            structured_output={},
            aggregation_metadata=None
        )
        
        return fallback_result