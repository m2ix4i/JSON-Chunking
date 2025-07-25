"""
Adaptive rate limiting for LLM API requests.

This module provides intelligent rate limiting with exponential backoff,
quota management, and adaptive throttling based on API response patterns.
"""

import asyncio
import time
from collections import defaultdict, deque
from typing import Dict, Optional

import structlog

from .types import RateLimitConfig

logger = structlog.get_logger(__name__)


class RateLimitError(Exception):
    """Exception raised when rate limits are exceeded."""
    pass


class RateLimiter:
    """
    Adaptive rate limiter for API requests.
    
    Implements intelligent throttling with exponential backoff,
    quota management, and adaptive limits based on API responses.
    """
    
    def __init__(self, config: RateLimitConfig):
        """
        Initialize rate limiter.
        
        Args:
            config: Rate limiting configuration
        """
        self.config = config
        self._request_times = deque()
        self._token_usage = deque()
        self._active_requests = set()
        self._queue = asyncio.Queue(maxsize=config.queue_size)
        self._request_locks: Dict[str, asyncio.Lock] = {}
        self._failure_count = 0
        self._last_failure_time = 0.0
        self._adaptive_multiplier = 1.0
        
        logger.info(
            "RateLimiter initialized",
            requests_per_minute=config.requests_per_minute,
            tokens_per_minute=config.tokens_per_minute,
            max_concurrent=config.max_concurrent,
            adaptive=config.adaptive
        )
    
    async def acquire(self, request_id: str, estimated_tokens: int = 0) -> None:
        """
        Acquire permission to make a request.
        
        Args:
            request_id: Unique identifier for the request
            estimated_tokens: Estimated token usage for the request
            
        Raises:
            RateLimitError: If rate limits cannot be satisfied
        """
        if request_id in self._active_requests:
            logger.warning(
                "Duplicate request ID detected",
                request_id=request_id
            )
            return
        
        # Check concurrent request limit
        if len(self._active_requests) >= self.config.max_concurrent:
            logger.debug(
                "Concurrent limit reached, waiting",
                active_requests=len(self._active_requests),
                max_concurrent=self.config.max_concurrent
            )
            await self._wait_for_slot()
        
        # Check rate limits
        await self._check_rate_limits(estimated_tokens)
        
        # Apply adaptive delays if needed
        await self._apply_adaptive_delay()
        
        # Add to active requests
        self._active_requests.add(request_id)
        self._request_locks[request_id] = asyncio.Lock()
        
        # Record request time
        current_time = time.time()
        self._request_times.append(current_time)
        
        logger.debug(
            "Request acquired",
            request_id=request_id,
            active_requests=len(self._active_requests),
            estimated_tokens=estimated_tokens
        )
    
    def release(self, request_id: str, actual_tokens: int = 0, success: bool = True) -> None:
        """
        Release a request and update tracking.
        
        Args:
            request_id: Request identifier to release
            actual_tokens: Actual tokens used by the request
            success: Whether the request was successful
        """
        if request_id not in self._active_requests:
            logger.warning(
                "Attempt to release unknown request",
                request_id=request_id
            )
            return
        
        # Remove from active requests
        self._active_requests.discard(request_id)
        self._request_locks.pop(request_id, None)
        
        # Update token usage tracking
        if actual_tokens > 0:
            current_time = time.time()
            self._token_usage.append((current_time, actual_tokens))
        
        # Update failure tracking for adaptive behavior
        if not success and self.config.adaptive:
            self._failure_count += 1
            self._last_failure_time = time.time()
            self._adjust_adaptive_multiplier(increase=True)
        elif success and self.config.adaptive:
            self._adjust_adaptive_multiplier(increase=False)
        
        logger.debug(
            "Request released",
            request_id=request_id,
            actual_tokens=actual_tokens,
            success=success,
            active_requests=len(self._active_requests)
        )
    
    async def _wait_for_slot(self) -> None:
        """Wait for an available concurrent slot."""
        while len(self._active_requests) >= self.config.max_concurrent:
            await asyncio.sleep(0.1)
    
    async def _check_rate_limits(self, estimated_tokens: int) -> None:
        """Check and enforce rate limits."""
        current_time = time.time()
        
        # Clean old request times (older than 1 minute)
        cutoff_time = current_time - 60.0
        while self._request_times and self._request_times[0] < cutoff_time:
            self._request_times.popleft()
        
        # Clean old token usage (older than 1 minute)
        while self._token_usage and self._token_usage[0][0] < cutoff_time:
            self._token_usage.popleft()
        
        # Check request rate limit
        effective_rpm = self._get_effective_rate_limit()
        if len(self._request_times) >= effective_rpm:
            wait_time = 60.0 - (current_time - self._request_times[0])
            if wait_time > 0:
                logger.debug(
                    "Request rate limit reached, waiting",
                    current_requests=len(self._request_times),
                    effective_rpm=effective_rpm,
                    wait_time=wait_time
                )
                await asyncio.sleep(wait_time)
        
        # Check token rate limit
        current_token_usage = sum(tokens for _, tokens in self._token_usage)
        if current_token_usage + estimated_tokens > self.config.tokens_per_minute:
            # Calculate wait time based on oldest token usage
            if self._token_usage:
                wait_time = 60.0 - (current_time - self._token_usage[0][0])
                if wait_time > 0:
                    logger.debug(
                        "Token rate limit reached, waiting",
                        current_tokens=current_token_usage,
                        estimated_tokens=estimated_tokens,
                        limit=self.config.tokens_per_minute,
                        wait_time=wait_time
                    )
                    await asyncio.sleep(wait_time)
    
    def _get_effective_rate_limit(self) -> int:
        """Get effective rate limit considering adaptive adjustments."""
        base_limit = self.config.requests_per_minute
        
        if not self.config.adaptive:
            return base_limit
        
        # Apply adaptive multiplier (reduce rate when failures occur)
        effective_limit = int(base_limit / self._adaptive_multiplier)
        
        # Apply burst allowance for good performance
        if self._failure_count == 0:
            effective_limit = int(effective_limit * self.config.burst_multiplier)
        
        return max(1, effective_limit)  # Ensure at least 1 request per minute
    
    async def _apply_adaptive_delay(self) -> None:
        """Apply adaptive delays based on recent failures."""
        if not self.config.adaptive or self._failure_count == 0:
            return
        
        # Calculate delay based on recent failures
        time_since_failure = time.time() - self._last_failure_time
        
        # Apply exponential backoff for recent failures
        if time_since_failure < 300:  # 5 minutes
            delay = min(2 ** min(self._failure_count, 6), 30)  # Max 30 seconds
            
            logger.debug(
                "Applying adaptive delay",
                failure_count=self._failure_count,
                delay=delay,
                time_since_failure=time_since_failure
            )
            
            await asyncio.sleep(delay)
    
    def _adjust_adaptive_multiplier(self, increase: bool) -> None:
        """Adjust the adaptive rate limiting multiplier."""
        if increase:
            # Increase multiplier (reduce effective rate) on failure
            self._adaptive_multiplier = min(self._adaptive_multiplier * 1.5, 10.0)
        else:
            # Gradually decrease multiplier (increase effective rate) on success
            self._adaptive_multiplier = max(self._adaptive_multiplier * 0.95, 1.0)
    
    def get_stats(self) -> Dict[str, any]:
        """Get current rate limiter statistics."""
        current_time = time.time()
        
        # Count recent requests (last minute)
        cutoff_time = current_time - 60.0
        recent_requests = sum(1 for t in self._request_times if t > cutoff_time)
        recent_tokens = sum(tokens for t, tokens in self._token_usage if t > cutoff_time)
        
        return {
            "active_requests": len(self._active_requests),
            "recent_requests": recent_requests,
            "recent_tokens": recent_tokens,
            "failure_count": self._failure_count,
            "adaptive_multiplier": self._adaptive_multiplier,
            "effective_rpm": self._get_effective_rate_limit(),
            "queue_size": self._queue.qsize() if hasattr(self._queue, 'qsize') else 0
        }
    
    def reset_failures(self) -> None:
        """Reset failure tracking (useful for testing or manual recovery)."""
        self._failure_count = 0
        self._last_failure_time = 0.0
        self._adaptive_multiplier = 1.0
        
        logger.info("Rate limiter failure tracking reset")
    
    async def health_check(self) -> bool:
        """
        Perform a health check on the rate limiter.
        
        Returns:
            True if the rate limiter is functioning normally
        """
        try:
            stats = self.get_stats()
            
            # Check if rate limiter is not severely constrained
            if stats["adaptive_multiplier"] > 5.0:
                logger.warning(
                    "Rate limiter heavily constrained",
                    adaptive_multiplier=stats["adaptive_multiplier"],
                    failure_count=stats["failure_count"]
                )
                return False
            
            # Check if not overwhelmed with active requests
            if stats["active_requests"] >= self.config.max_concurrent:
                logger.warning(
                    "Rate limiter at maximum capacity",
                    active_requests=stats["active_requests"],
                    max_concurrent=self.config.max_concurrent
                )
                return False
            
            return True
            
        except Exception as e:
            logger.error(
                "Rate limiter health check failed",
                error=str(e)
            )
            return False