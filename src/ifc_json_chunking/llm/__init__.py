"""
LLM Integration Module for IFC JSON Chunking.

This module provides comprehensive integration with Large Language Models,
starting with Google's Gemini 2.5 Pro, for processing chunked IFC JSON data.

Key Components:
- GeminiClient: Async API client with rate limiting and error handling
- ChunkProcessor: Parallel processing of semantic chunks
- CacheManager: Multi-tiered caching for cost optimization
- RateLimiter: Adaptive throttling and quota management
- CostTracker: Usage monitoring and budget management
"""

from .chunk_processor import ChunkProcessor
from .gemini_client import GeminiClient
from .rate_limiter import RateLimiter
from .types import (
    CacheConfig,
    LLMConfig,
    ProcessingRequest,
    ProcessingResponse,
    ProcessingResult,
    RateLimitConfig,
)

__all__ = [
    "GeminiClient",
    "RateLimiter",
    "ChunkProcessor",
    "ProcessingRequest",
    "ProcessingResponse",
    "ProcessingResult",
    "LLMConfig",
    "CacheConfig",
    "RateLimitConfig"
]
