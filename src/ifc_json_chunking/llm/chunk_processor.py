"""
Parallel chunk processing for LLM integration.

This module provides intelligent parallel processing of semantic chunks
with progress tracking, result aggregation, and performance optimization.
"""

import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional, Callable

import structlog

from ..models import Chunk
from .types import (
    ProcessingRequest,
    ProcessingResponse,
    ProcessingResult,
    ProcessingStatus,
    LLMConfig,
    RateLimitConfig,
    MetricsData
)
from .gemini_client import GeminiClient
from .rate_limiter import RateLimiter

logger = structlog.get_logger(__name__)


class ChunkProcessorError(Exception):
    """Exception raised by chunk processor."""
    pass


class ProgressTracker:
    """Tracks processing progress and provides callbacks."""
    
    def __init__(
        self,
        total_chunks: int,
        callback: Optional[Callable[[int, int, float], None]] = None
    ):
        """
        Initialize progress tracker.
        
        Args:
            total_chunks: Total number of chunks to process
            callback: Optional callback function (completed, total, percentage)
        """
        self.total_chunks = total_chunks
        self.completed_chunks = 0
        self.failed_chunks = 0
        self.callback = callback
        self.start_time = time.time()
    
    def update(self, success: bool = True) -> None:
        """Update progress and call callback if provided."""
        if success:
            self.completed_chunks += 1
        else:
            self.failed_chunks += 1
        
        total_processed = self.completed_chunks + self.failed_chunks
        percentage = (total_processed / self.total_chunks) * 100
        
        if self.callback:
            self.callback(total_processed, self.total_chunks, percentage)
    
    @property
    def elapsed_time(self) -> float:
        """Get elapsed processing time."""
        return time.time() - self.start_time
    
    @property
    def is_complete(self) -> bool:
        """Check if all chunks have been processed."""
        return (self.completed_chunks + self.failed_chunks) >= self.total_chunks
    
    @property
    def success_rate(self) -> float:
        """Get success rate as percentage."""
        total = self.completed_chunks + self.failed_chunks
        return (self.completed_chunks / total * 100) if total > 0 else 0.0


class ChunkProcessor:
    """
    Processes chunks in parallel using LLM with intelligent coordination.
    
    Provides batch processing, progress tracking, result aggregation,
    and performance optimization for semantic chunk processing.
    """
    
    def __init__(
        self,
        llm_config: LLMConfig,
        rate_limit_config: Optional[RateLimitConfig] = None,
        client: Optional[GeminiClient] = None
    ):
        """
        Initialize chunk processor.
        
        Args:
            llm_config: LLM configuration
            rate_limit_config: Rate limiting configuration
            client: Optional pre-configured client
        """
        self.llm_config = llm_config
        self.rate_limit_config = rate_limit_config or RateLimitConfig()
        
        # Initialize rate limiter
        self.rate_limiter = RateLimiter(self.rate_limit_config)
        
        # Initialize client
        self.client = client or GeminiClient(
            config=llm_config,
            rate_limiter=self.rate_limiter
        )
        
        # Metrics tracking
        self.metrics = MetricsData()
        
        logger.info(
            "ChunkProcessor initialized",
            model=llm_config.model,
            max_concurrent=rate_limit_config.max_concurrent
        )
    
    async def process_chunks(
        self,
        chunks: List[Chunk],
        prompt: str,
        progress_callback: Optional[Callable[[int, int, float], None]] = None,
        batch_size: Optional[int] = None,
        **kwargs
    ) -> ProcessingResult:
        """
        Process multiple chunks with the same prompt.
        
        Args:
            chunks: List of chunks to process
            prompt: Processing prompt/instruction
            progress_callback: Optional progress callback
            batch_size: Optional batch size for processing
            **kwargs: Additional request parameters
            
        Returns:
            Aggregated processing result
        """
        if not chunks:
            raise ChunkProcessorError("No chunks provided for processing")
        
        start_time = time.time()
        
        # Initialize progress tracker
        progress_tracker = ProgressTracker(
            total_chunks=len(chunks),
            callback=progress_callback
        )
        
        logger.info(
            "Starting chunk processing",
            total_chunks=len(chunks),
            prompt_length=len(prompt),
            batch_size=batch_size
        )
        
        try:
            # Create processing requests
            requests = self._create_requests(chunks, prompt, **kwargs)
            
            # Process in batches if specified
            if batch_size and len(requests) > batch_size:
                responses = await self._process_in_batches(
                    requests, batch_size, progress_tracker
                )
            else:
                responses = await self._process_batch(requests, progress_tracker)
            
            # Create aggregated result
            result = self._create_result(requests, responses, start_time)
            
            logger.info(
                "Chunk processing completed",
                total_chunks=len(chunks),
                successful=result.success_count,
                failed=result.error_count,
                cache_hits=result.cache_hits,
                total_time=result.processing_time,
                success_rate=result.success_rate
            )
            
            return result
            
        except Exception as e:
            logger.error(
                "Chunk processing failed",
                error=str(e),
                total_chunks=len(chunks)
            )
            raise ChunkProcessorError(f"Processing failed: {e}") from e
    
    async def process_single_chunk(
        self,
        chunk: Chunk,
        prompt: str,
        **kwargs
    ) -> ProcessingResponse:
        """
        Process a single chunk.
        
        Args:
            chunk: Chunk to process
            prompt: Processing prompt/instruction
            **kwargs: Additional request parameters
            
        Returns:
            Processing response
        """
        request = ProcessingRequest(
            chunk=chunk,
            prompt=prompt,
            request_id=f"single_{uuid.uuid4().hex[:8]}",
            **kwargs
        )
        
        logger.debug(
            "Processing single chunk",
            chunk_id=chunk.chunk_id,
            request_id=request.request_id
        )
        
        response = await self.client.process_request(request)
        
        # Update metrics
        self.metrics.update_from_response(response)
        
        return response
    
    def _create_requests(
        self,
        chunks: List[Chunk],
        prompt: str,
        **kwargs
    ) -> List[ProcessingRequest]:
        """Create processing requests for chunks."""
        requests = []
        
        for i, chunk in enumerate(chunks):
            request = ProcessingRequest(
                chunk=chunk,
                prompt=prompt,
                request_id=f"chunk_{i:04d}_{uuid.uuid4().hex[:8]}",
                priority=kwargs.get('priority', 0),
                max_tokens=kwargs.get('max_tokens'),
                temperature=kwargs.get('temperature', self.llm_config.temperature),
                metadata={
                    'chunk_index': i,
                    'chunk_id': chunk.chunk_id,
                    **kwargs.get('metadata', {})
                }
            )
            requests.append(request)
        
        return requests
    
    async def _process_batch(
        self,
        requests: List[ProcessingRequest],
        progress_tracker: ProgressTracker
    ) -> List[ProcessingResponse]:
        """Process a batch of requests concurrently."""
        semaphore = asyncio.Semaphore(self.rate_limit_config.max_concurrent)
        
        async def process_with_tracking(request: ProcessingRequest) -> ProcessingResponse:
            async with semaphore:
                try:
                    response = await self.client.process_request(request)
                    success = response.status == ProcessingStatus.COMPLETED
                    progress_tracker.update(success=success)
                    
                    # Update metrics
                    self.metrics.update_from_response(response)
                    
                    return response
                    
                except Exception as e:
                    logger.error(
                        "Request processing failed",
                        request_id=request.request_id,
                        error=str(e)
                    )
                    progress_tracker.update(success=False)
                    
                    # Create error response
                    error_response = ProcessingResponse(
                        request_id=request.request_id,
                        content="",
                        status=ProcessingStatus.FAILED,
                        tokens_used=0,
                        processing_time=0.0,
                        model=self.llm_config.model,
                        error=str(e)
                    )
                    
                    self.metrics.update_from_response(error_response)
                    return error_response
        
        # Process all requests concurrently
        tasks = [process_with_tracking(req) for req in requests]
        responses = await asyncio.gather(*tasks, return_exceptions=False)
        
        return responses
    
    async def _process_in_batches(
        self,
        requests: List[ProcessingRequest],
        batch_size: int,
        progress_tracker: ProgressTracker
    ) -> List[ProcessingResponse]:
        """Process requests in smaller batches."""
        all_responses = []
        
        for i in range(0, len(requests), batch_size):
            batch = requests[i:i + batch_size]
            
            logger.debug(
                "Processing batch",
                batch_number=i // batch_size + 1,
                batch_size=len(batch),
                total_batches=(len(requests) + batch_size - 1) // batch_size
            )
            
            batch_responses = await self._process_batch(batch, progress_tracker)
            all_responses.extend(batch_responses)
            
            # Add small delay between batches to avoid overwhelming the API
            if i + batch_size < len(requests):
                await asyncio.sleep(0.5)
        
        return all_responses
    
    def _create_result(
        self,
        requests: List[ProcessingRequest],
        responses: List[ProcessingResponse],
        start_time: float
    ) -> ProcessingResult:
        """Create aggregated processing result."""
        processing_time = time.time() - start_time
        
        # Count successes, errors, and cache hits
        success_count = sum(
            1 for r in responses 
            if r.status == ProcessingStatus.COMPLETED
        )
        error_count = len(responses) - success_count
        cache_hits = sum(1 for r in responses if r.cached)
        
        # Calculate total tokens and estimated cost
        total_tokens = sum(r.tokens_used for r in responses)
        # Simple cost estimation (actual costs depend on specific pricing)
        estimated_cost = total_tokens * 0.000002  # Example: $0.000002 per token
        
        return ProcessingResult(
            request_ids=[req.request_id for req in requests],
            responses=responses,
            total_tokens=total_tokens,
            total_cost=estimated_cost,
            processing_time=processing_time,
            success_count=success_count,
            error_count=error_count,
            cache_hits=cache_hits,
            metadata={
                'model': self.llm_config.model,
                'total_chunks': len(requests),
                'rate_limit_config': self.rate_limit_config.to_dict(),
                'processing_start': start_time
            }
        )
    
    async def health_check(self) -> Dict[str, bool]:
        """
        Perform comprehensive health check.
        
        Returns:
            Health status for each component
        """
        health_status = {}
        
        try:
            # Check client health
            health_status['client'] = await self.client.health_check()
        except Exception as e:
            logger.error("Client health check failed", error=str(e))
            health_status['client'] = False
        
        try:
            # Check rate limiter health
            health_status['rate_limiter'] = await self.rate_limiter.health_check()
        except Exception as e:
            logger.error("Rate limiter health check failed", error=str(e))
            health_status['rate_limiter'] = False
        
        # Overall health
        health_status['overall'] = all(health_status.values())
        
        return health_status
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current processing metrics."""
        rate_limiter_stats = self.rate_limiter.get_stats()
        
        return {
            'processing': self.metrics.to_dict(),
            'rate_limiter': rate_limiter_stats,
            'config': {
                'llm': self.llm_config.to_dict(),
                'rate_limit': self.rate_limit_config.to_dict()
            }
        }
    
    async def close(self) -> None:
        """Close the processor and cleanup resources."""
        if self.client:
            await self.client.close()
        
        logger.info("ChunkProcessor closed")