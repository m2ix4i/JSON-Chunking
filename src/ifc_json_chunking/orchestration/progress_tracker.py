"""
Progress tracking system for query processing.

This module provides real-time progress tracking with WebSocket support
and event-driven updates for query processing pipelines.
"""

import asyncio
import time
from typing import Any, Dict, List, Optional, Callable, Set
from dataclasses import dataclass, field
from collections import defaultdict

import structlog

from ..query.types import (
    ProgressEvent,
    ProgressEventType,
    QueryStatus,
    ProgressCallback
)

logger = structlog.get_logger(__name__)


@dataclass
class ProgressState:
    """Current state of progress tracking."""
    
    query_id: str
    total_steps: int
    current_step: int = 0
    status: QueryStatus = QueryStatus.PENDING
    start_time: float = field(default_factory=time.time)
    last_update: float = field(default_factory=time.time)
    
    # Step details
    step_details: Dict[int, str] = field(default_factory=dict)
    step_times: Dict[int, float] = field(default_factory=dict)
    
    # Error tracking
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    
    @property
    def progress_percentage(self) -> float:
        """Calculate progress percentage."""
        if self.total_steps <= 0:
            return 0.0
        return min((self.current_step / self.total_steps) * 100, 100.0)
    
    @property
    def elapsed_time(self) -> float:
        """Get elapsed time since start."""
        return time.time() - self.start_time
    
    @property
    def estimated_remaining_time(self) -> Optional[float]:
        """Estimate remaining time based on current progress."""
        if self.current_step <= 0 or self.progress_percentage >= 100:
            return None
        
        avg_step_time = self.elapsed_time / self.current_step
        remaining_steps = self.total_steps - self.current_step
        return avg_step_time * remaining_steps
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "query_id": self.query_id,
            "total_steps": self.total_steps,
            "current_step": self.current_step,
            "status": self.status.value,
            "progress_percentage": self.progress_percentage,
            "elapsed_time": self.elapsed_time,
            "estimated_remaining_time": self.estimated_remaining_time,
            "step_details": self.step_details,
            "errors": self.errors,
            "warnings": self.warnings,
            "start_time": self.start_time,
            "last_update": self.last_update
        }


class ProgressTracker:
    """
    Advanced progress tracking system with WebSocket support.
    
    Provides real-time progress updates, event broadcasting,
    and detailed tracking of query processing stages.
    """
    
    def __init__(self):
        """Initialize progress tracker."""
        self._active_queries: Dict[str, ProgressState] = {}
        self._callbacks: Dict[str, List[ProgressCallback]] = defaultdict(list)
        self._global_callbacks: List[ProgressCallback] = []
        
        # WebSocket connections (would be implemented with FastAPI WebSocket)
        self._websocket_connections: Set[Any] = set()
        
        # Performance metrics
        self._step_performance: Dict[str, List[float]] = defaultdict(list)
        
        logger.info("ProgressTracker initialized")
    
    def start_tracking(
        self,
        query_id: str,
        total_steps: int,
        callback: Optional[ProgressCallback] = None
    ) -> ProgressState:
        """
        Start tracking progress for a query.
        
        Args:
            query_id: Unique query identifier
            total_steps: Total number of processing steps
            callback: Optional callback for progress updates
            
        Returns:
            ProgressState for the query
        """
        state = ProgressState(
            query_id=query_id,
            total_steps=total_steps,
            status=QueryStatus.PENDING
        )
        
        self._active_queries[query_id] = state
        
        if callback:
            self._callbacks[query_id].append(callback)
        
        logger.info(
            "Started progress tracking",
            query_id=query_id,
            total_steps=total_steps
        )
        
        # Emit start event
        self._emit_event(
            query_id,
            ProgressEventType.STARTED,
            "Query processing started",
            current_step=0
        )
        
        return state
    
    def update_progress(
        self,
        query_id: str,
        current_step: int,
        message: str,
        event_type: ProgressEventType = ProgressEventType.CHUNK_COMPLETED,
        **kwargs
    ) -> None:
        """
        Update progress for a query.
        
        Args:
            query_id: Query identifier
            current_step: Current step number
            message: Progress message
            event_type: Type of progress event
            **kwargs: Additional event data
        """
        if query_id not in self._active_queries:
            logger.warning("Progress update for unknown query", query_id=query_id)
            return
        
        state = self._active_queries[query_id]
        
        # Update state
        prev_step = state.current_step
        state.current_step = current_step
        state.last_update = time.time()
        state.step_details[current_step] = message
        
        # Record step timing
        if prev_step < current_step:
            step_time = time.time() - state.start_time
            state.step_times[current_step] = step_time
            
            # Update performance metrics
            step_name = f"step_{current_step}"
            self._step_performance[step_name].append(step_time)
        
        logger.debug(
            "Progress updated",
            query_id=query_id,
            current_step=current_step,
            progress=state.progress_percentage,
            message=message
        )
        
        # Emit progress event
        self._emit_event(
            query_id,
            event_type,
            message,
            current_step=current_step,
            **kwargs
        )
    
    def add_error(self, query_id: str, error_message: str) -> None:
        """Add error to query tracking."""
        if query_id not in self._active_queries:
            return
        
        state = self._active_queries[query_id]
        state.errors.append(error_message)
        state.status = QueryStatus.FAILED
        
        logger.warning(
            "Error added to query tracking",
            query_id=query_id,
            error=error_message
        )
        
        self._emit_event(
            query_id,
            ProgressEventType.FAILED,
            f"Error: {error_message}",
            error_message=error_message
        )
    
    def add_warning(self, query_id: str, warning_message: str) -> None:
        """Add warning to query tracking."""
        if query_id not in self._active_queries:
            return
        
        state = self._active_queries[query_id]
        state.warnings.append(warning_message)
        
        logger.info(
            "Warning added to query tracking",
            query_id=query_id,
            warning=warning_message
        )
    
    def complete_tracking(
        self,
        query_id: str,
        success: bool = True,
        final_message: Optional[str] = None
    ) -> None:
        """
        Complete progress tracking for a query.
        
        Args:
            query_id: Query identifier
            success: Whether processing completed successfully
            final_message: Optional final status message
        """
        if query_id not in self._active_queries:
            return
        
        state = self._active_queries[query_id]
        
        if success:
            state.status = QueryStatus.COMPLETED
            state.current_step = state.total_steps
            event_type = ProgressEventType.COMPLETED
            message = final_message or "Query processing completed successfully"
        else:
            state.status = QueryStatus.FAILED
            event_type = ProgressEventType.FAILED
            message = final_message or "Query processing failed"
        
        state.last_update = time.time()
        
        logger.info(
            "Progress tracking completed",
            query_id=query_id,
            success=success,
            total_time=state.elapsed_time,
            progress=state.progress_percentage
        )
        
        # Emit completion event
        self._emit_event(
            query_id,
            event_type,
            message,
            current_step=state.current_step
        )
        
        # Clean up after a delay (keep for short-term status queries)
        asyncio.create_task(self._cleanup_query(query_id, delay=300))  # 5 minutes
    
    def cancel_tracking(self, query_id: str) -> bool:
        """
        Cancel progress tracking for a query.
        
        Args:
            query_id: Query identifier
            
        Returns:
            True if query was cancelled, False if not found
        """
        if query_id not in self._active_queries:
            return False
        
        state = self._active_queries[query_id]
        state.status = QueryStatus.CANCELLED
        state.last_update = time.time()
        
        logger.info("Progress tracking cancelled", query_id=query_id)
        
        self._emit_event(
            query_id,
            ProgressEventType.CANCELLED,
            "Query processing cancelled"
        )
        
        return True
    
    def get_progress(self, query_id: str) -> Optional[ProgressState]:
        """Get current progress state for a query."""
        return self._active_queries.get(query_id)
    
    def get_all_active_queries(self) -> Dict[str, ProgressState]:
        """Get all active query progress states."""
        return self._active_queries.copy()
    
    def add_callback(self, query_id: str, callback: ProgressCallback) -> None:
        """Add callback for specific query progress updates."""
        self._callbacks[query_id].append(callback)
    
    def add_global_callback(self, callback: ProgressCallback) -> None:
        """Add callback for all query progress updates."""
        self._global_callbacks.append(callback)
    
    def remove_callback(self, query_id: str, callback: ProgressCallback) -> bool:
        """Remove callback for specific query."""
        if query_id in self._callbacks:
            try:
                self._callbacks[query_id].remove(callback)
                return True
            except ValueError:
                pass
        return False
    
    def _emit_event(
        self,
        query_id: str,
        event_type: ProgressEventType,
        message: str,
        current_step: Optional[int] = None,
        **kwargs
    ) -> None:
        """Emit progress event to all registered callbacks."""
        if query_id not in self._active_queries:
            return
        
        state = self._active_queries[query_id]
        
        event = ProgressEvent(
            event_type=event_type,
            query_id=query_id,
            current_step=current_step or state.current_step,
            total_steps=state.total_steps,
            message=message,
            progress_percentage=state.progress_percentage,
            **kwargs
        )
        
        # Call query-specific callbacks
        for callback in self._callbacks[query_id]:
            try:
                callback(event)
            except Exception as e:
                logger.warning(
                    "Progress callback failed",
                    query_id=query_id,
                    error=str(e)
                )
        
        # Call global callbacks
        for callback in self._global_callbacks:
            try:
                callback(event)
            except Exception as e:
                logger.warning(
                    "Global progress callback failed",
                    query_id=query_id,
                    error=str(e)
                )
        
        # Broadcast to WebSocket connections
        asyncio.create_task(self._broadcast_websocket(event))
    
    async def _broadcast_websocket(self, event: ProgressEvent) -> None:
        """Broadcast progress event to WebSocket connections."""
        if not self._websocket_connections:
            return
        
        event_data = event.to_dict()
        disconnected = set()
        
        for websocket in self._websocket_connections:
            try:
                # This would be implemented with actual WebSocket library
                # await websocket.send_json(event_data)
                pass
            except Exception as e:
                logger.warning(
                    "WebSocket broadcast failed",
                    error=str(e)
                )
                disconnected.add(websocket)
        
        # Clean up disconnected WebSockets
        self._websocket_connections -= disconnected
    
    def add_websocket(self, websocket: Any) -> None:
        """Add WebSocket connection for progress updates."""
        self._websocket_connections.add(websocket)
        logger.debug("WebSocket connection added", total_connections=len(self._websocket_connections))
    
    def remove_websocket(self, websocket: Any) -> None:
        """Remove WebSocket connection."""
        self._websocket_connections.discard(websocket)
        logger.debug("WebSocket connection removed", total_connections=len(self._websocket_connections))
    
    async def _cleanup_query(self, query_id: str, delay: float = 300) -> None:
        """Clean up query tracking after delay."""
        await asyncio.sleep(delay)
        
        if query_id in self._active_queries:
            state = self._active_queries[query_id]
            
            # Only clean up completed or failed queries
            if state.status in [QueryStatus.COMPLETED, QueryStatus.FAILED, QueryStatus.CANCELLED]:
                self._active_queries.pop(query_id, None)
                self._callbacks.pop(query_id, None)
                
                logger.debug("Query tracking cleaned up", query_id=query_id)
    
    def get_performance_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Get performance metrics for step processing."""
        metrics = {}
        
        for step_name, times in self._step_performance.items():
            if times:
                metrics[step_name] = {
                    "count": len(times),
                    "avg_time": sum(times) / len(times),
                    "min_time": min(times),
                    "max_time": max(times),
                    "total_time": sum(times)
                }
        
        return metrics
    
    def reset_performance_metrics(self) -> None:
        """Reset performance metrics."""
        self._step_performance.clear()
        logger.info("Performance metrics reset")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get current tracker statistics."""
        active_by_status = defaultdict(int)
        for state in self._active_queries.values():
            active_by_status[state.status.value] += 1
        
        return {
            "active_queries": len(self._active_queries),
            "queries_by_status": dict(active_by_status),
            "websocket_connections": len(self._websocket_connections),
            "registered_callbacks": sum(len(callbacks) for callbacks in self._callbacks.values()),
            "global_callbacks": len(self._global_callbacks),
            "performance_metrics": len(self._step_performance)
        }