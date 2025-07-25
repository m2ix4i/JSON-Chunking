"""
Core query processing orchestration engine.

This module provides the main QueryProcessor class that coordinates
the entire pipeline from user input to final response.
"""

import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional, Callable

import structlog

from ..models import Chunk
from ..llm.chunk_processor import ChunkProcessor
from ..llm.types import LLMConfig, RateLimitConfig
from ..config import Config
from ..query.types import (
    QueryRequest,
    QueryResult,
    QueryContext,
    QueryStatus,
    QueryIntent,
    ProgressEvent,
    ProgressEventType,
    ChunkResult,
    ProgressCallback
)
from .intent_classifier import IntentClassifier
from ..aggregation.core.aggregator import AdvancedAggregator
from ..types.aggregation_types import EnhancedQueryResult, ValidationLevel

logger = structlog.get_logger(__name__)


class QueryProcessorError(Exception):
    """Exception raised by query processor."""
    pass


class QueryProcessor:
    """
    Main orchestration engine for query processing.
    
    Coordinates the entire pipeline from user query to final response,
    including intent classification, prompt generation, chunk processing,
    and result aggregation.
    """
    
    def __init__(
        self,
        config: Config,
        llm_config: Optional[LLMConfig] = None,
        rate_limit_config: Optional[RateLimitConfig] = None,
        chunk_processor: Optional[ChunkProcessor] = None,
        enable_advanced_aggregation: bool = True
    ):
        """
        Initialize query processor.
        
        Args:
            config: System configuration
            llm_config: LLM configuration (created from config if not provided)
            rate_limit_config: Rate limiting configuration
            chunk_processor: Pre-configured chunk processor
            enable_advanced_aggregation: Enable advanced aggregation with conflict resolution
        """
        self.config = config
        
        # Initialize LLM configuration
        if llm_config is None:
            llm_config = LLMConfig(
                api_key=config.gemini_api_key,
                model=config.target_llm_model,
                max_tokens=8000,
                timeout=config.request_timeout
            )
        self.llm_config = llm_config
        
        # Initialize rate limiting
        if rate_limit_config is None:
            rate_limit_config = RateLimitConfig(
                requests_per_minute=config.rate_limit_rpm,
                max_concurrent=config.max_concurrent_requests
            )
        self.rate_limit_config = rate_limit_config
        
        # Initialize components
        self.intent_classifier = IntentClassifier()
        
        # Initialize chunk processor
        self.chunk_processor = chunk_processor or ChunkProcessor(
            llm_config=llm_config,
            rate_limit_config=rate_limit_config
        )
        
        # Initialize advanced aggregation if enabled
        self.enable_advanced_aggregation = enable_advanced_aggregation
        self.advanced_aggregator = None
        if enable_advanced_aggregation:
            try:
                self.advanced_aggregator = AdvancedAggregator(
                    validation_level=ValidationLevel.STANDARD,
                    enable_conflict_resolution=True,
                    quality_threshold=0.5
                )
            except Exception as e:
                logger.warning(
                    "Failed to initialize advanced aggregator, falling back to simple aggregation",
                    error=str(e)
                )
                self.enable_advanced_aggregation = False
        
        # Active queries tracking
        self._active_queries: Dict[str, QueryContext] = {}
        
        logger.info(
            "QueryProcessor initialized",
            model=llm_config.model,
            max_concurrent=rate_limit_config.max_concurrent,
            advanced_aggregation=self.enable_advanced_aggregation
        )
    
    async def process_query(
        self,
        query: str,
        chunks: List[Chunk],
        progress_callback: Optional[ProgressCallback] = None,
        **kwargs
    ) -> QueryResult:
        """
        Process a user query against the provided chunks.
        
        Args:
            query: User query string
            chunks: List of chunks to process
            progress_callback: Optional progress callback function
            **kwargs: Additional processing options
            
        Returns:
            QueryResult with answer and processing details
        """
        # Create query request
        request = QueryRequest(
            query=query,
            chunks=chunks,
            progress_callback=progress_callback,
            **kwargs
        )
        
        return await self.process_request(request)
    
    async def process_request(self, request: QueryRequest) -> QueryResult:
        """
        Process a complete query request.
        
        Args:
            request: Query request with all parameters
            
        Returns:
            QueryResult with answer and processing details
        """
        start_time = time.time()
        query_id = request.query_id
        
        logger.info(
            "Starting query processing",
            query_id=query_id,
            query=request.query,
            total_chunks=len(request.chunks)
        )
        
        try:
            # Phase 1: Preprocessing
            await self._emit_progress(
                request,
                ProgressEventType.STARTED,
                0, 4,
                "Starting query processing"
            )
            
            context = await self._preprocess_query(request)
            self._active_queries[query_id] = context
            
            await self._emit_progress(
                request,
                ProgressEventType.PREPROCESSING_COMPLETE,
                1, 4,
                f"Intent classified as '{context.intent.value}' with {context.confidence_score:.2f} confidence"
            )
            
            # Phase 2: Generate prompts for chunks
            chunk_prompts = await self._generate_chunk_prompts(context, request.chunks)
            
            # Phase 3: Process chunks
            await self._emit_progress(
                request,
                ProgressEventType.AGGREGATION_STARTED,
                2, 4,
                "Processing chunks with LLM"
            )
            
            chunk_results = await self._process_chunks(
                context, request.chunks, chunk_prompts, request
            )
            
            # Phase 4: Aggregate results
            await self._emit_progress(
                request,
                ProgressEventType.AGGREGATION_STARTED,
                3, 4,
                "Aggregating results and generating final answer"
            )
            
            final_result = await self._aggregate_results(
                context, request, chunk_results, start_time
            )
            
            await self._emit_progress(
                request,
                ProgressEventType.COMPLETED,
                4, 4,
                "Query processing completed successfully"
            )
            
            logger.info(
                "Query processing completed",
                query_id=query_id,
                intent=context.intent.value,
                total_chunks=len(request.chunks),
                successful_chunks=final_result.successful_chunks,
                processing_time=final_result.processing_time,
                confidence=final_result.confidence_score
            )
            
            return final_result
            
        except Exception as e:
            logger.error(
                "Query processing failed",
                query_id=query_id,
                error=str(e),
                processing_time=time.time() - start_time
            )
            
            await self._emit_progress(
                request,
                ProgressEventType.FAILED,
                0, 4,
                f"Processing failed: {str(e)}"
            )
            
            # Create error result
            return QueryResult(
                query_id=query_id,
                original_query=request.query,
                intent=QueryIntent.UNKNOWN,
                status=QueryStatus.FAILED,
                answer=f"Processing failed: {str(e)}",
                chunk_results=[],
                aggregated_data={},
                total_chunks=len(request.chunks),
                successful_chunks=0,
                failed_chunks=len(request.chunks),
                total_tokens=0,
                total_cost=0.0,
                processing_time=time.time() - start_time,
                confidence_score=0.0,
                completeness_score=0.0,
                relevance_score=0.0,
                model_used=self.llm_config.model,
                prompt_strategy="error"
            )
        
        finally:
            # Clean up active query tracking
            self._active_queries.pop(query_id, None)
    
    async def _preprocess_query(self, request: QueryRequest) -> QueryContext:
        """Preprocess query and create context."""
        # Classify intent
        intent_match = self.intent_classifier.classify_intent(request.query)
        
        # Override with hint if provided and confidence is low
        if request.intent_hint and intent_match.confidence < 0.7:
            intent_match.intent = request.intent_hint
            intent_match.confidence = max(intent_match.confidence, 0.6)
        
        # Create context
        context = QueryContext(
            query_id=request.query_id,
            original_query=request.query,
            intent=intent_match.intent,
            parameters=intent_match.extracted_parameters,
            confidence_score=intent_match.confidence
        )
        
        logger.debug(
            "Query preprocessing completed",
            query_id=request.query_id,
            intent=intent_match.intent.value,
            confidence=intent_match.confidence,
            reasoning=intent_match.reasoning
        )
        
        return context
    
    async def _generate_chunk_prompts(
        self,
        context: QueryContext,
        chunks: List[Chunk]
    ) -> Dict[str, str]:
        """Generate specialized prompts for each chunk based on intent."""
        base_prompt = self._create_base_prompt(context)
        
        # For now, use the same prompt for all chunks
        # In the future, this could be specialized per chunk type
        prompts = {}
        for chunk in chunks:
            prompts[chunk.chunk_id] = base_prompt
        
        logger.debug(
            "Generated chunk prompts",
            query_id=context.query_id,
            intent=context.intent.value,
            total_chunks=len(chunks)
        )
        
        return prompts
    
    def _create_base_prompt(self, context: QueryContext) -> str:
        """Create base prompt based on query intent and parameters."""
        intent = context.intent
        query = context.original_query
        params = context.parameters
        
        # Base instruction
        base_instruction = (
            "You are an expert in analyzing IFC (Industry Foundation Classes) building data. "
            "Analyze the provided IFC JSON chunk data carefully and extract relevant information."
        )
        
        # Intent-specific instructions
        if intent == QueryIntent.QUANTITY:
            specific_instruction = (
                "Focus on quantitative analysis. Extract numerical values, measurements, "
                "volumes, areas, counts, and quantities. Provide precise calculations where possible."
            )
        elif intent == QueryIntent.COMPONENT:
            specific_instruction = (
                "Focus on component identification. List all building components, elements, "
                "and systems found in the data. Include component types, names, and identifiers."
            )
        elif intent == QueryIntent.MATERIAL:
            specific_instruction = (
                "Focus on material analysis. Identify all materials, material properties, "
                "compositions, and material specifications mentioned in the data."
            )
        elif intent == QueryIntent.SPATIAL:
            specific_instruction = (
                "Focus on spatial analysis. Identify locations, rooms, floors, zones, "
                "and spatial relationships between elements."
            )
        elif intent == QueryIntent.COST:
            specific_instruction = (
                "Focus on cost-related information. Extract any pricing, cost estimates, "
                "budget information, or economic data related to materials and components."
            )
        else:
            specific_instruction = (
                "Extract all relevant information that might help answer the user's query."
            )
        
        # Add query context
        query_context = f"\\n\\nUser Query: {query}"
        
        # Add parameter constraints
        constraint_parts = []
        if params.entity_types:
            constraint_parts.append(f"Focus on these entity types: {', '.join(params.entity_types)}")
        if params.spatial_constraints:
            constraint_parts.append(f"Apply spatial constraints: {params.spatial_constraints}")
        if params.material_filters:
            constraint_parts.append(f"Filter for materials: {', '.join(params.material_filters)}")
        
        constraints = ""
        if constraint_parts:
            constraints = "\\n\\nConstraints:\\n" + "\\n".join(f"- {part}" for part in constraint_parts)
        
        # Output format instruction
        output_format = (
            "\\n\\nProvide your response in a structured format:\\n"
            "1. Direct answer to the query (if possible)\\n"
            "2. Relevant entities and their properties\\n"
            "3. Quantitative data (numbers, measurements)\\n"
            "4. Supporting details and context\\n\\n"
            "Be precise, factual, and cite specific data from the IFC chunk."
        )
        
        return (
            base_instruction + "\\n\\n" +
            specific_instruction +
            query_context +
            constraints +
            output_format
        )
    
    async def _process_chunks(
        self,
        context: QueryContext,
        chunks: List[Chunk],
        prompts: Dict[str, str],
        request: QueryRequest
    ) -> List[ChunkResult]:
        """Process chunks with specialized prompts."""
        chunk_results = []
        
        # Create progress callback for chunk processing
        def chunk_progress_callback(completed: int, total: int, percentage: float):
            asyncio.create_task(self._emit_progress(
                request,
                ProgressEventType.CHUNK_COMPLETED,
                completed, total,
                f"Processed {completed}/{total} chunks ({percentage:.1f}%)"
            ))
        
        # Process chunks using the chunk processor
        processing_result = await self.chunk_processor.process_chunks(
            chunks=chunks,
            prompt=prompts[chunks[0].chunk_id],  # Use first prompt as base
            progress_callback=chunk_progress_callback,
            batch_size=request.max_concurrent
        )
        
        # Convert processing responses to chunk results
        for i, response in enumerate(processing_result.responses):
            chunk = chunks[i] if i < len(chunks) else None
            
            chunk_result = ChunkResult(
                chunk_id=chunk.chunk_id if chunk else f"unknown_{i}",
                content=response.content,
                status=response.status.value,
                tokens_used=response.tokens_used,
                processing_time=response.processing_time,
                confidence_score=0.8 if response.status.value == "completed" else 0.0,
                extraction_quality="high" if response.status.value == "completed" else "low",
                model_used=response.model,
                error_message=response.error
            )
            
            # Update context with chunk result
            context.update_context(chunk_result.chunk_id, {
                "content": chunk_result.content,
                "status": chunk_result.status,
                "tokens": chunk_result.tokens_used
            })
            
            chunk_results.append(chunk_result)
        
        return chunk_results
    
    async def _aggregate_results(
        self,
        context: QueryContext,
        request: QueryRequest,
        chunk_results: List[ChunkResult],
        start_time: float
    ) -> QueryResult:
        """Aggregate chunk results into final answer."""
        
        # Try advanced aggregation first if enabled
        if self.enable_advanced_aggregation and self.advanced_aggregator:
            try:
                logger.debug("Using advanced aggregation system")
                enhanced_result = await self.advanced_aggregator.aggregate_results(
                    context, chunk_results
                )
                
                # Convert EnhancedQueryResult to QueryResult for backward compatibility
                # The enhanced result contains all the original fields plus additional ones
                return QueryResult(
                    query_id=enhanced_result.query_id,
                    original_query=enhanced_result.original_query,
                    intent=enhanced_result.intent,
                    status=enhanced_result.status,
                    answer=enhanced_result.answer,
                    chunk_results=enhanced_result.chunk_results,
                    aggregated_data=enhanced_result.structured_output,
                    total_chunks=enhanced_result.total_chunks,
                    successful_chunks=enhanced_result.successful_chunks,
                    failed_chunks=enhanced_result.failed_chunks,
                    total_tokens=enhanced_result.total_tokens,
                    total_cost=enhanced_result.total_cost,
                    processing_time=enhanced_result.processing_time,
                    confidence_score=enhanced_result.confidence_score,
                    completeness_score=enhanced_result.completeness_score,
                    relevance_score=enhanced_result.relevance_score,
                    model_used=enhanced_result.model_used,
                    prompt_strategy=enhanced_result.prompt_strategy
                )
                
            except Exception as e:
                logger.warning(
                    "Advanced aggregation failed, falling back to simple aggregation",
                    error=str(e)
                )
                # Fall through to simple aggregation
        
        # Simple aggregation fallback
        logger.debug("Using simple aggregation system")
        return await self._simple_aggregate_results(context, request, chunk_results, start_time)
    
    async def _simple_aggregate_results(
        self,
        context: QueryContext,
        request: QueryRequest,
        chunk_results: List[ChunkResult],
        start_time: float
    ) -> QueryResult:
        """Simple aggregation fallback method."""
        successful_results = [r for r in chunk_results if r.status == "completed"]
        failed_results = [r for r in chunk_results if r.status != "completed"]
        
        # Simple aggregation - combine all successful content
        combined_content = []
        for result in successful_results:
            if result.content.strip():
                combined_content.append(result.content)
        
        # Generate final answer
        if combined_content:
            answer = self._generate_final_answer(context, combined_content)
        else:
            answer = "No relevant information found in the provided data."
        
        # Calculate metrics
        total_tokens = sum(r.tokens_used for r in chunk_results)
        total_cost = total_tokens * 0.000002  # Simple cost estimation
        processing_time = time.time() - start_time
        
        # Calculate quality scores
        confidence_score = sum(r.confidence_score for r in successful_results) / len(successful_results) if successful_results else 0.0
        completeness_score = min(len(successful_results) / len(chunk_results), 1.0) if chunk_results else 0.0
        relevance_score = confidence_score * 0.8  # Simple relevance estimation
        
        # Create aggregated data
        aggregated_data = {
            "intent": context.intent.value,
            "parameters": context.parameters.to_dict(),
            "successful_chunks": len(successful_results),
            "failed_chunks": len(failed_results),
            "avg_confidence": confidence_score,
            "aggregation_method": "simple"
        }
        
        return QueryResult(
            query_id=context.query_id,
            original_query=context.original_query,
            intent=context.intent,
            status=QueryStatus.COMPLETED,
            answer=answer,
            chunk_results=chunk_results,
            aggregated_data=aggregated_data,
            total_chunks=len(chunk_results),
            successful_chunks=len(successful_results),
            failed_chunks=len(failed_results),
            total_tokens=total_tokens,
            total_cost=total_cost,
            processing_time=processing_time,
            confidence_score=confidence_score,
            completeness_score=completeness_score,
            relevance_score=relevance_score,
            model_used=self.llm_config.model,
            prompt_strategy=context.intent.value
        )
    
    def _generate_final_answer(
        self,
        context: QueryContext,
        content_pieces: List[str]
    ) -> str:
        """Generate final answer from aggregated content."""
        intent = context.intent
        
        if intent == QueryIntent.QUANTITY:
            return self._aggregate_quantity_answer(content_pieces)
        elif intent == QueryIntent.COMPONENT:
            return self._aggregate_component_answer(content_pieces)
        elif intent == QueryIntent.MATERIAL:
            return self._aggregate_material_answer(content_pieces)
        elif intent == QueryIntent.SPATIAL:
            return self._aggregate_spatial_answer(content_pieces)
        elif intent == QueryIntent.COST:
            return self._aggregate_cost_answer(content_pieces)
        else:
            # Generic aggregation
            return "\\n\\n".join(content_pieces)
    
    def _aggregate_quantity_answer(self, content_pieces: List[str]) -> str:
        """Aggregate quantity-focused answers."""
        # Simple aggregation for now - in the future, could parse numbers and sum them
        return "Quantitative Analysis Results:\\n\\n" + "\\n\\n".join(content_pieces)
    
    def _aggregate_component_answer(self, content_pieces: List[str]) -> str:
        """Aggregate component-focused answers."""
        return "Component Analysis Results:\\n\\n" + "\\n\\n".join(content_pieces)
    
    def _aggregate_material_answer(self, content_pieces: List[str]) -> str:
        """Aggregate material-focused answers."""
        return "Material Analysis Results:\\n\\n" + "\\n\\n".join(content_pieces)
    
    def _aggregate_spatial_answer(self, content_pieces: List[str]) -> str:
        """Aggregate spatial-focused answers."""
        return "Spatial Analysis Results:\\n\\n" + "\\n\\n".join(content_pieces)
    
    def _aggregate_cost_answer(self, content_pieces: List[str]) -> str:
        """Aggregate cost-focused answers."""
        return "Cost Analysis Results:\\n\\n" + "\\n\\n".join(content_pieces)
    
    async def _emit_progress(
        self,
        request: QueryRequest,
        event_type: ProgressEventType,
        current: int,
        total: int,
        message: str,
        chunk_id: Optional[str] = None,
        error: Optional[str] = None
    ) -> None:
        """Emit progress event to callback if provided."""
        if not request.progress_callback:
            return
        
        progress_percentage = (current / total * 100) if total > 0 else 0.0
        
        event = ProgressEvent(
            event_type=event_type,
            query_id=request.query_id,
            current_step=current,
            total_steps=total,
            message=message,
            progress_percentage=progress_percentage,
            chunk_id=chunk_id,
            error_message=error
        )
        
        try:
            request.progress_callback(event)
        except Exception as e:
            logger.warning(
                "Progress callback failed",
                query_id=request.query_id,
                error=str(e)
            )
    
    async def get_query_status(self, query_id: str) -> Optional[QueryContext]:
        """Get status of an active query."""
        return self._active_queries.get(query_id)
    
    async def cancel_query(self, query_id: str) -> bool:
        """Cancel an active query."""
        if query_id in self._active_queries:
            # In a full implementation, this would cancel ongoing processing
            self._active_queries.pop(query_id)
            logger.info("Query cancelled", query_id=query_id)
            return True
        return False
    
    async def health_check(self) -> Dict[str, bool]:
        """Perform health check on all components."""
        health_status = {}
        
        try:
            # Check chunk processor health
            health_status.update(await self.chunk_processor.health_check())
        except Exception as e:
            logger.error("Health check failed", error=str(e))
            health_status["overall"] = False
        
        return health_status
    
    async def close(self) -> None:
        """Close the processor and cleanup resources."""
        if self.chunk_processor:
            await self.chunk_processor.close()
        
        self._active_queries.clear()
        logger.info("QueryProcessor closed")