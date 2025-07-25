"""
Async Gemini API client for processing IFC chunk data.

This module provides a robust, production-ready client for Google's Gemini 2.5 Pro
with advanced features including rate limiting, error handling, and response validation.
"""

import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional

import aiohttp
import structlog
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

try:
    import google.generativeai as genai
    from google.generativeai.types import GenerateContentResponse
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None
    GenerateContentResponse = None

from .types import (
    ProcessingRequest,
    ProcessingResponse,
    ProcessingStatus,
    ErrorType,
    LLMConfig
)
from .rate_limiter import RateLimiter

logger = structlog.get_logger(__name__)


class GeminiClientError(Exception):
    """Base exception for Gemini client errors."""
    pass


class GeminiClient:
    """
    Async client for Google Gemini 2.5 Pro API.
    
    Provides robust integration with Gemini including rate limiting,
    error handling, retry logic, and response validation.
    """
    
    def __init__(
        self,
        config: LLMConfig,
        rate_limiter: Optional[RateLimiter] = None,
        session: Optional[aiohttp.ClientSession] = None
    ):
        """
        Initialize Gemini client.
        
        Args:
            config: LLM configuration
            rate_limiter: Optional rate limiter instance
            session: Optional aiohttp session
        """
        if not GEMINI_AVAILABLE:
            raise GeminiClientError(
                "google-generativeai package not installed. "
                "Install with: pip install google-generativeai"
            )
        
        self.config = config
        self.rate_limiter = rate_limiter
        self.session = session
        self._model = None
        self._initialized = False
        
        logger.info(
            "GeminiClient initialized",
            model=config.model,
            max_tokens=config.max_tokens,
            timeout=config.timeout
        )
    
    async def initialize(self) -> None:
        """Initialize the Gemini client and model."""
        if self._initialized:
            return
        
        try:
            # Configure the API
            genai.configure(api_key=self.config.api_key)
            
            # Initialize the model
            self._model = genai.GenerativeModel(self.config.model)
            
            # Create session if not provided
            if self.session is None:
                timeout = aiohttp.ClientTimeout(total=self.config.timeout)
                self.session = aiohttp.ClientSession(timeout=timeout)
            
            self._initialized = True
            
            logger.info(
                "Gemini client initialized successfully",
                model=self.config.model
            )
            
        except Exception as e:
            logger.error(
                "Failed to initialize Gemini client",
                error=str(e),
                model=self.config.model
            )
            raise GeminiClientError(f"Initialization failed: {e}") from e
    
    async def close(self) -> None:
        """Close the client and cleanup resources."""
        if self.session and not self.session.closed:
            await self.session.close()
        
        self._initialized = False
        logger.info("Gemini client closed")
    
    async def process_request(self, request: ProcessingRequest) -> ProcessingResponse:
        """
        Process a single request with the Gemini API.
        
        Args:
            request: Processing request to handle
            
        Returns:
            Processing response with result or error
        """
        if not self._initialized:
            await self.initialize()
        
        start_time = time.time()
        
        try:
            # Apply rate limiting if configured
            if self.rate_limiter:
                await self.rate_limiter.acquire(request.request_id)
            
            # Make the API request
            response = await self._make_api_request(request)
            processing_time = time.time() - start_time
            
            logger.info(
                "Request processed successfully",
                request_id=request.request_id,
                processing_time=processing_time,
                tokens_used=response.tokens_used
            )
            
            return response
            
        except Exception as e:
            processing_time = time.time() - start_time
            
            logger.error(
                "Request processing failed",
                request_id=request.request_id,
                error=str(e),
                processing_time=processing_time
            )
            
            return ProcessingResponse(
                request_id=request.request_id,
                content="",
                status=ProcessingStatus.FAILED,
                tokens_used=0,
                processing_time=processing_time,
                model=self.config.model,
                error=str(e),
                error_type=self._classify_error(e)
            )
        
        finally:
            # Release rate limit if configured
            if self.rate_limiter:
                self.rate_limiter.release(request.request_id)
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=60),
        retry=retry_if_exception_type((aiohttp.ClientError, asyncio.TimeoutError))
    )
    async def _make_api_request(self, request: ProcessingRequest) -> ProcessingResponse:
        """Make the actual API request with retry logic."""
        try:
            # Prepare the prompt
            full_prompt = self._prepare_prompt(request)
            
            # Generate content using Gemini
            response = await self._generate_content(full_prompt, request)
            
            # Extract response content
            content = self._extract_content(response)
            tokens_used = self._count_tokens(content, request.prompt)
            
            return ProcessingResponse(
                request_id=request.request_id,
                content=content,
                status=ProcessingStatus.COMPLETED,
                tokens_used=tokens_used,
                processing_time=0.0,  # Will be set by caller
                model=self.config.model
            )
            
        except Exception as e:
            logger.error(
                "API request failed",
                request_id=request.request_id,
                error=str(e),
                prompt_length=len(request.prompt)
            )
            raise
    
    def _prepare_prompt(self, request: ProcessingRequest) -> str:
        """Prepare the full prompt for the API request."""
        chunk_data = request.chunk.to_dict()
        
        # Create context-aware prompt
        prompt_parts = [
            "You are an expert in analyzing IFC (Industry Foundation Classes) building data.",
            f"Please analyze the following IFC JSON chunk:\n\n{chunk_data}\n",
            f"Task: {request.prompt}",
        ]
        
        if request.chunk.chunk_type:
            prompt_parts.insert(1, f"This chunk contains {request.chunk.chunk_type.value} data.")
        
        return "\n\n".join(prompt_parts)
    
    async def _generate_content(self, prompt: str, request: ProcessingRequest) -> Any:
        """Generate content using the Gemini model."""
        try:
            # Configure generation parameters
            generation_config = {
                "temperature": request.temperature,
                "max_output_tokens": request.max_tokens or self.config.max_tokens,
            }
            
            # Generate content
            response = await asyncio.to_thread(
                self._model.generate_content,
                prompt,
                generation_config=generation_config
            )
            
            return response
            
        except Exception as e:
            logger.error(
                "Content generation failed",
                request_id=request.request_id,
                error=str(e)
            )
            raise
    
    def _extract_content(self, response: Any) -> str:
        """Extract text content from Gemini response."""
        try:
            if hasattr(response, 'text'):
                return response.text
            elif hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                    parts = candidate.content.parts
                    return ''.join(part.text for part in parts if hasattr(part, 'text'))
            
            # Fallback to string representation
            return str(response)
            
        except Exception as e:
            logger.warning(
                "Failed to extract content from response",
                error=str(e),
                response_type=type(response).__name__
            )
            return ""
    
    def _count_tokens(self, content: str, prompt: str) -> int:
        """Estimate token usage for the request and response."""
        # Simple estimation based on character count
        # In production, you might want to use the actual Gemini token counting API
        total_chars = len(prompt) + len(content)
        estimated_tokens = total_chars // 4  # Rough estimate: 4 chars per token
        
        return estimated_tokens
    
    def _classify_error(self, error: Exception) -> ErrorType:
        """Classify the type of error for better handling."""
        error_str = str(error).lower()
        
        if "rate limit" in error_str or "quota" in error_str:
            return ErrorType.RATE_LIMIT
        elif "timeout" in error_str:
            return ErrorType.TIMEOUT
        elif "api" in error_str or "http" in error_str:
            return ErrorType.API_ERROR
        elif "validation" in error_str or "invalid" in error_str:
            return ErrorType.VALIDATION_ERROR
        else:
            return ErrorType.UNKNOWN
    
    async def process_batch(
        self,
        requests: List[ProcessingRequest],
        max_concurrent: Optional[int] = None
    ) -> List[ProcessingResponse]:
        """
        Process multiple requests concurrently.
        
        Args:
            requests: List of processing requests
            max_concurrent: Maximum concurrent requests (uses config if None)
            
        Returns:
            List of processing responses
        """
        if not self._initialized:
            await self.initialize()
        
        max_concurrent = max_concurrent or self.config.max_concurrent
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_with_semaphore(request: ProcessingRequest) -> ProcessingResponse:
            async with semaphore:
                return await self.process_request(request)
        
        logger.info(
            "Processing batch requests",
            total_requests=len(requests),
            max_concurrent=max_concurrent
        )
        
        tasks = [process_with_semaphore(req) for req in requests]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Convert exceptions to error responses
        processed_responses = []
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                error_response = ProcessingResponse(
                    request_id=requests[i].request_id,
                    content="",
                    status=ProcessingStatus.FAILED,
                    tokens_used=0,
                    processing_time=0.0,
                    model=self.config.model,
                    error=str(response),
                    error_type=self._classify_error(response)
                )
                processed_responses.append(error_response)
            else:
                processed_responses.append(response)
        
        success_count = sum(1 for r in processed_responses if r.status == ProcessingStatus.COMPLETED)
        
        logger.info(
            "Batch processing completed",
            total_requests=len(requests),
            successful=success_count,
            failed=len(requests) - success_count
        )
        
        return processed_responses
    
    async def health_check(self) -> bool:
        """
        Perform a health check on the Gemini API.
        
        Returns:
            True if the API is accessible, False otherwise
        """
        try:
            if not self._initialized:
                await self.initialize()
            
            # Create a simple test request
            test_request = ProcessingRequest(
                chunk=None,  # Will use a simple test prompt instead
                prompt="Hello, respond with 'OK' to confirm you're working.",
                request_id=f"health_check_{uuid.uuid4().hex[:8]}"
            )
            
            # Override the prompt preparation for health check
            original_prepare = self._prepare_prompt
            self._prepare_prompt = lambda req: req.prompt
            
            try:
                response = await self._make_api_request(test_request)
                return response.status == ProcessingStatus.COMPLETED
            finally:
                # Restore original method
                self._prepare_prompt = original_prepare
            
        except Exception as e:
            logger.warning(
                "Health check failed",
                error=str(e)
            )
            return False