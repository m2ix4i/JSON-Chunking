"""
Type definitions for LLM integration module.

This module contains all type definitions and data structures used
throughout the LLM integration system for type safety and clarity.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union
from enum import Enum
import time

from ..models import Chunk


class ProcessingStatus(Enum):
    """Status of processing requests."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CACHED = "cached"


class ErrorType(Enum):
    """Types of errors that can occur during processing."""
    API_ERROR = "api_error"
    RATE_LIMIT = "rate_limit"
    TIMEOUT = "timeout"
    VALIDATION_ERROR = "validation_error"
    QUOTA_EXCEEDED = "quota_exceeded"
    UNKNOWN = "unknown"


@dataclass
class ProcessingRequest:
    """Request for processing a chunk with an LLM."""
    
    chunk: Chunk
    prompt: str
    request_id: str
    priority: int = 0
    max_tokens: Optional[int] = None
    temperature: float = 0.7
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "chunk": self.chunk.to_dict(),
            "prompt": self.prompt,
            "request_id": self.request_id,
            "priority": self.priority,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "metadata": self.metadata,
            "created_at": self.created_at
        }


@dataclass
class ProcessingResponse:
    """Response from LLM processing."""
    
    request_id: str
    content: str
    status: ProcessingStatus
    tokens_used: int
    processing_time: float
    model: str
    cached: bool = False
    error: Optional[str] = None
    error_type: Optional[ErrorType] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "request_id": self.request_id,
            "content": self.content,
            "status": self.status.value,
            "tokens_used": self.tokens_used,
            "processing_time": self.processing_time,
            "model": self.model,
            "cached": self.cached,
            "error": self.error,
            "error_type": self.error_type.value if self.error_type else None,
            "metadata": self.metadata,
            "created_at": self.created_at
        }


@dataclass
class ProcessingResult:
    """Result of processing multiple chunks."""
    
    request_ids: List[str]
    responses: List[ProcessingResponse]
    total_tokens: int
    total_cost: float
    processing_time: float
    success_count: int
    error_count: int
    cache_hits: int
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage."""
        total = self.success_count + self.error_count
        return (self.success_count / total * 100) if total > 0 else 0.0
    
    @property
    def cache_hit_rate(self) -> float:
        """Calculate cache hit rate as percentage."""
        total = len(self.responses)
        return (self.cache_hits / total * 100) if total > 0 else 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "request_ids": self.request_ids,
            "responses": [r.to_dict() for r in self.responses],
            "total_tokens": self.total_tokens,
            "total_cost": self.total_cost,
            "processing_time": self.processing_time,
            "success_count": self.success_count,
            "error_count": self.error_count,
            "cache_hits": self.cache_hits,
            "success_rate": self.success_rate,
            "cache_hit_rate": self.cache_hit_rate,
            "metadata": self.metadata
        }


@dataclass
class LLMConfig:
    """Configuration for LLM client."""
    
    api_key: str
    model: str = "gemini-2.5-pro"
    max_tokens: int = 8000
    temperature: float = 0.7
    timeout: int = 30
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    backoff_factor: float = 2.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "timeout": self.timeout,
            "max_retries": self.max_retries,
            "base_delay": self.base_delay,
            "max_delay": self.max_delay,
            "backoff_factor": self.backoff_factor
        }


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting."""
    
    requests_per_minute: int = 60
    tokens_per_minute: int = 1000000
    max_concurrent: int = 10
    queue_size: int = 1000
    adaptive: bool = True
    burst_multiplier: float = 1.5
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "requests_per_minute": self.requests_per_minute,
            "tokens_per_minute": self.tokens_per_minute,
            "max_concurrent": self.max_concurrent,
            "queue_size": self.queue_size,
            "adaptive": self.adaptive,
            "burst_multiplier": self.burst_multiplier
        }


@dataclass
class CacheConfig:
    """Configuration for caching system."""
    
    enabled: bool = True
    memory_ttl: int = 3600  # 1 hour
    redis_ttl: int = 86400  # 24 hours
    max_memory_size: int = 1000  # Max entries in memory cache
    similarity_threshold: float = 0.95
    redis_url: Optional[str] = None
    prefix: str = "ifc_llm_cache"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "enabled": self.enabled,
            "memory_ttl": self.memory_ttl,
            "redis_ttl": self.redis_ttl,
            "max_memory_size": self.max_memory_size,
            "similarity_threshold": self.similarity_threshold,
            "redis_url": self.redis_url,
            "prefix": self.prefix
        }


@dataclass
class MetricsData:
    """Metrics data for monitoring."""
    
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    cache_hits: int = 0
    total_tokens: int = 0
    total_cost: float = 0.0
    avg_response_time: float = 0.0
    error_rate: float = 0.0
    cache_hit_rate: float = 0.0
    
    def update_from_response(self, response: ProcessingResponse) -> None:
        """Update metrics from a processing response."""
        self.total_requests += 1
        
        if response.status == ProcessingStatus.COMPLETED:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
        
        if response.cached:
            self.cache_hits += 1
        
        self.total_tokens += response.tokens_used
        
        # Recalculate rates
        self.error_rate = (self.failed_requests / self.total_requests) * 100
        self.cache_hit_rate = (self.cache_hits / self.total_requests) * 100
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "cache_hits": self.cache_hits,
            "total_tokens": self.total_tokens,
            "total_cost": self.total_cost,
            "avg_response_time": self.avg_response_time,
            "error_rate": self.error_rate,
            "cache_hit_rate": self.cache_hit_rate
        }