"""
Application Performance Monitoring (APM) integration for comprehensive system monitoring.

This module provides integration with APM systems for real-time performance tracking,
alerting, and observability across the IFC JSON Chunking system.
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager, contextmanager
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Union
from functools import wraps
import traceback
import threading
from queue import Queue
import json
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@dataclass
class MetricData:
    """Structured metric data for APM systems."""
    name: str
    value: Union[float, int]
    timestamp: float
    tags: Dict[str, str] = field(default_factory=dict)
    unit: Optional[str] = None
    metric_type: str = "gauge"  # gauge, counter, histogram


@dataclass
class TraceData:
    """Structured trace data for distributed tracing."""
    trace_id: str
    span_id: str
    operation_name: str
    start_time: float
    duration: float
    status: str = "ok"  # ok, error, timeout
    tags: Dict[str, Any] = field(default_factory=dict)
    logs: List[Dict[str, Any]] = field(default_factory=list)
    parent_span_id: Optional[str] = None


@dataclass
class PerformanceAlert:
    """Performance alert definition and data."""
    alert_id: str
    severity: str  # critical, warning, info
    metric_name: str
    threshold_value: float
    current_value: float
    message: str
    timestamp: float
    resolved: bool = False
    tags: Dict[str, str] = field(default_factory=dict)


class APMCollector:
    """High-performance APM data collector with buffering and batching."""
    
    def __init__(self, 
                 buffer_size: int = 1000,
                 flush_interval: float = 10.0,
                 enable_async_processing: bool = True):
        """Initialize APM collector with performance optimizations."""
        self.buffer_size = buffer_size
        self.flush_interval = flush_interval
        self.enable_async_processing = enable_async_processing
        
        # Performance-optimized data structures
        self._metrics_buffer: Queue = Queue(maxsize=buffer_size)
        self._traces_buffer: Queue = Queue(maxsize=buffer_size)
        self._alerts_buffer: Queue = Queue(maxsize=buffer_size // 10)
        
        # Background processing
        self._flush_timer: Optional[threading.Timer] = None
        self._running = False
        self._lock = threading.Lock()
        
        # Performance tracking
        self._collection_stats = {
            "metrics_collected": 0,
            "traces_collected": 0,
            "alerts_generated": 0,
            "buffer_overflows": 0,
            "flush_cycles": 0
        }
        
        logger.info("APM Collector initialized", extra={
            "buffer_size": buffer_size,
            "flush_interval": flush_interval,
            "async_processing": enable_async_processing
        })
    
    def start(self) -> None:
        """Start background collection and processing."""
        with self._lock:
            if self._running:
                return
            
            self._running = True
            if self.enable_async_processing:
                self._schedule_flush()
            
            logger.info("APM Collector started")
    
    def stop(self) -> None:
        """Stop collection and flush remaining data."""
        with self._lock:
            if not self._running:
                return
            
            self._running = False
            if self._flush_timer:
                self._flush_timer.cancel()
            
            # Final flush
            self._flush_buffers()
            
            logger.info("APM Collector stopped", extra=self._collection_stats)
    
    def collect_metric(self, metric: MetricData) -> bool:
        """Collect metric data with overflow protection."""
        try:
            if not self._running:
                self.start()
            
            self._metrics_buffer.put_nowait(metric)
            self._collection_stats["metrics_collected"] += 1
            return True
            
        except Exception as e:
            self._collection_stats["buffer_overflows"] += 1
            logger.warning("Metrics buffer overflow", extra={
                "metric_name": metric.name,
                "error": str(e)
            })
            return False
    
    def collect_trace(self, trace: TraceData) -> bool:
        """Collect trace data with overflow protection."""
        try:
            if not self._running:
                self.start()
            
            self._traces_buffer.put_nowait(trace)
            self._collection_stats["traces_collected"] += 1
            return True
            
        except Exception as e:
            self._collection_stats["buffer_overflows"] += 1
            logger.warning("Traces buffer overflow", extra={
                "trace_id": trace.trace_id,
                "operation": trace.operation_name,
                "error": str(e)
            })
            return False
    
    def generate_alert(self, alert: PerformanceAlert) -> bool:
        """Generate performance alert."""
        try:
            if not self._running:
                self.start()
            
            self._alerts_buffer.put_nowait(alert)
            self._collection_stats["alerts_generated"] += 1
            
            # Log critical alerts immediately
            if alert.severity == "critical":
                logger.critical("Performance Alert", extra=asdict(alert))
            
            return True
            
        except Exception as e:
            logger.error("Failed to generate alert", extra={
                "alert_id": alert.alert_id,
                "error": str(e)
            })
            return False
    
    def _schedule_flush(self) -> None:
        """Schedule periodic buffer flush."""
        if self._running:
            self._flush_timer = threading.Timer(self.flush_interval, self._flush_and_reschedule)
            self._flush_timer.start()
    
    def _flush_and_reschedule(self) -> None:
        """Flush buffers and reschedule next flush."""
        self._flush_buffers()
        self._schedule_flush()
    
    def _flush_buffers(self) -> None:
        """Flush all buffers to APM backend."""
        try:
            # Collect metrics
            metrics = []
            while not self._metrics_buffer.empty():
                try:
                    metrics.append(self._metrics_buffer.get_nowait())
                except:
                    break
            
            # Collect traces
            traces = []
            while not self._traces_buffer.empty():
                try:
                    traces.append(self._traces_buffer.get_nowait())
                except:
                    break
            
            # Collect alerts
            alerts = []
            while not self._alerts_buffer.empty():
                try:
                    alerts.append(self._alerts_buffer.get_nowait())
                except:
                    break
            
            # Send to APM backend (stubbed for now)
            if metrics or traces or alerts:
                self._send_to_apm_backend(metrics, traces, alerts)
                self._collection_stats["flush_cycles"] += 1
                
                logger.debug("Buffers flushed", extra={
                    "metrics_count": len(metrics),
                    "traces_count": len(traces),
                    "alerts_count": len(alerts)
                })
            
        except Exception as e:
            logger.error("Buffer flush failed", extra={"error": str(e)})
    
    def _send_to_apm_backend(self, 
                           metrics: List[MetricData], 
                           traces: List[TraceData], 
                           alerts: List[PerformanceAlert]) -> None:
        """Send collected data to APM backend systems."""
        # This would integrate with real APM systems like:
        # - Datadog
        # - New Relic
        # - Elastic APM
        # - Prometheus + Grafana
        # - Custom metrics endpoints
        
        # For now, log structured data that can be collected by log aggregators
        if metrics:
            logger.info("APM Metrics Batch", extra={
                "type": "metrics",
                "count": len(metrics),
                "metrics": [asdict(m) for m in metrics]
            })
        
        if traces:
            logger.info("APM Traces Batch", extra={
                "type": "traces", 
                "count": len(traces),
                "traces": [asdict(t) for t in traces]
            })
        
        if alerts:
            logger.info("APM Alerts Batch", extra={
                "type": "alerts",
                "count": len(alerts), 
                "alerts": [asdict(a) for a in alerts]
            })
    
    def get_stats(self) -> Dict[str, Any]:
        """Get collector performance statistics."""
        return {
            **self._collection_stats,
            "buffer_utilization": {
                "metrics": self._metrics_buffer.qsize() / self.buffer_size,
                "traces": self._traces_buffer.qsize() / self.buffer_size,
                "alerts": self._alerts_buffer.qsize() / (self.buffer_size // 10)
            },
            "running": self._running
        }


class PerformanceTracker:
    """High-level performance tracking with automatic APM integration."""
    
    def __init__(self, apm_collector: APMCollector):
        """Initialize performance tracker."""
        self.apm_collector = apm_collector
        self._active_traces: Dict[str, TraceData] = {}
        self._performance_thresholds: Dict[str, Dict[str, float]] = {
            "query_processing": {
                "warning_threshold": 5.0,  # seconds
                "critical_threshold": 10.0
            },
            "chunk_creation": {
                "warning_threshold": 2.0,
                "critical_threshold": 5.0
            },
            "memory_usage": {
                "warning_threshold": 0.75,  # 75% of available
                "critical_threshold": 0.9   # 90% of available
            },
            "cache_hit_rate": {
                "warning_threshold": 0.7,   # Below 70%
                "critical_threshold": 0.5   # Below 50%
            }
        }
        
        logger.info("Performance Tracker initialized")
    
    @contextmanager
    def trace_operation(self, operation_name: str, **tags):
        """Context manager for tracing operations."""
        trace_id = self._generate_trace_id()
        span_id = self._generate_span_id()
        start_time = time.time()
        
        trace = TraceData(
            trace_id=trace_id,
            span_id=span_id,
            operation_name=operation_name,
            start_time=start_time,
            duration=0.0,
            tags=tags
        )
        
        self._active_traces[span_id] = trace
        
        try:
            yield trace
            trace.status = "ok"
        except Exception as e:
            trace.status = "error"
            trace.logs.append({
                "timestamp": time.time(),
                "level": "error",
                "message": str(e),
                "traceback": traceback.format_exc()
            })
            raise
        finally:
            end_time = time.time()
            trace.duration = end_time - start_time
            
            # Check for performance alerts
            self._check_performance_alerts(trace)
            
            # Collect trace
            self.apm_collector.collect_trace(trace)
            self._active_traces.pop(span_id, None)
    
    @asynccontextmanager
    async def trace_async_operation(self, operation_name: str, **tags):
        """Async context manager for tracing operations."""
        trace_id = self._generate_trace_id()
        span_id = self._generate_span_id()
        start_time = time.time()
        
        trace = TraceData(
            trace_id=trace_id,
            span_id=span_id,
            operation_name=operation_name,
            start_time=start_time,
            duration=0.0,
            tags=tags
        )
        
        self._active_traces[span_id] = trace
        
        try:
            yield trace
            trace.status = "ok"
        except Exception as e:
            trace.status = "error"
            trace.logs.append({
                "timestamp": time.time(),
                "level": "error",
                "message": str(e),
                "traceback": traceback.format_exc()
            })
            raise
        finally:
            end_time = time.time()
            trace.duration = end_time - start_time
            
            # Check for performance alerts
            self._check_performance_alerts(trace)
            
            # Collect trace
            self.apm_collector.collect_trace(trace)
            self._active_traces.pop(span_id, None)
    
    def record_metric(self, 
                     name: str, 
                     value: Union[float, int], 
                     unit: Optional[str] = None,
                     metric_type: str = "gauge",
                     **tags) -> None:
        """Record a metric value."""
        metric = MetricData(
            name=name,
            value=value,
            timestamp=time.time(),
            tags=tags,
            unit=unit,
            metric_type=metric_type
        )
        
        self.apm_collector.collect_metric(metric)
        
        # Check for metric-based alerts
        self._check_metric_alerts(metric)
    
    def _check_performance_alerts(self, trace: TraceData) -> None:
        """Check if trace performance triggers alerts."""
        operation_key = trace.operation_name.lower().replace(" ", "_")
        thresholds = self._performance_thresholds.get(operation_key, {})
        
        warning_threshold = thresholds.get("warning_threshold")
        critical_threshold = thresholds.get("critical_threshold")
        
        if critical_threshold and trace.duration > critical_threshold:
            alert = PerformanceAlert(
                alert_id=f"perf_critical_{trace.span_id}",
                severity="critical",
                metric_name="operation_duration",
                threshold_value=critical_threshold,
                current_value=trace.duration,
                message=f"Operation {trace.operation_name} exceeded critical threshold",
                timestamp=time.time(),
                tags={
                    "operation": trace.operation_name,
                    "trace_id": trace.trace_id,
                    **trace.tags
                }
            )
            self.apm_collector.generate_alert(alert)
            
        elif warning_threshold and trace.duration > warning_threshold:
            alert = PerformanceAlert(
                alert_id=f"perf_warning_{trace.span_id}",
                severity="warning",
                metric_name="operation_duration",
                threshold_value=warning_threshold,
                current_value=trace.duration,
                message=f"Operation {trace.operation_name} exceeded warning threshold",
                timestamp=time.time(),
                tags={
                    "operation": trace.operation_name,
                    "trace_id": trace.trace_id,
                    **trace.tags
                }
            )
            self.apm_collector.generate_alert(alert)
    
    def _check_metric_alerts(self, metric: MetricData) -> None:
        """Check if metric value triggers alerts."""
        metric_key = metric.name.lower().replace(".", "_")
        thresholds = self._performance_thresholds.get(metric_key, {})
        
        warning_threshold = thresholds.get("warning_threshold")
        critical_threshold = thresholds.get("critical_threshold")
        
        # Handle different threshold types
        if metric.name.endswith("_rate") or metric.name.endswith("_ratio"):
            # For rates/ratios, alert when below threshold
            if critical_threshold and metric.value < critical_threshold:
                self._generate_metric_alert(metric, "critical", critical_threshold, "below")
            elif warning_threshold and metric.value < warning_threshold:
                self._generate_metric_alert(metric, "warning", warning_threshold, "below")
        else:
            # For other metrics, alert when above threshold
            if critical_threshold and metric.value > critical_threshold:
                self._generate_metric_alert(metric, "critical", critical_threshold, "above")
            elif warning_threshold and metric.value > warning_threshold:
                self._generate_metric_alert(metric, "warning", warning_threshold, "above")
    
    def _generate_metric_alert(self, 
                              metric: MetricData, 
                              severity: str, 
                              threshold: float, 
                              condition: str) -> None:
        """Generate alert for metric threshold violation."""
        alert = PerformanceAlert(
            alert_id=f"metric_{severity}_{metric.name}_{int(metric.timestamp)}",
            severity=severity,
            metric_name=metric.name,
            threshold_value=threshold,
            current_value=metric.value,
            message=f"Metric {metric.name} is {condition} {severity} threshold",
            timestamp=metric.timestamp,
            tags=metric.tags
        )
        self.apm_collector.generate_alert(alert)
    
    def _generate_trace_id(self) -> str:
        """Generate unique trace ID."""
        import uuid
        return str(uuid.uuid4()).replace("-", "")
    
    def _generate_span_id(self) -> str:
        """Generate unique span ID."""
        import uuid
        return str(uuid.uuid4()).replace("-", "")[:16]


def performance_monitor(operation_name: str = None, **tags):
    """Decorator for automatic performance monitoring."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get tracker from config or create default
            from ..config import Config
            try:
                config = Config()
                # Would normally get from dependency injection
                apm_collector = APMCollector()
                tracker = PerformanceTracker(apm_collector)
            except:
                # Fallback to no-op if config fails
                class NoOpTracker:
                    @contextmanager
                    def trace_operation(self, *args, **kwargs):
                        yield None
                tracker = NoOpTracker()
            
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            with tracker.trace_operation(op_name, **tags):
                return func(*args, **kwargs)
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            from ..config import Config
            try:
                config = Config()
                apm_collector = APMCollector()
                tracker = PerformanceTracker(apm_collector)
            except:
                class NoOpTracker:
                    @asynccontextmanager
                    async def trace_async_operation(self, *args, **kwargs):
                        yield None
                tracker = NoOpTracker()
            
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            async with tracker.trace_async_operation(op_name, **tags):
                return await func(*args, **kwargs)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return wrapper
    
    return decorator


# Global APM instances (would normally be dependency injected)
_apm_collector: Optional[APMCollector] = None
_performance_tracker: Optional[PerformanceTracker] = None


def get_apm_collector() -> APMCollector:
    """Get global APM collector instance."""
    global _apm_collector
    if _apm_collector is None:
        _apm_collector = APMCollector()
        _apm_collector.start()
    return _apm_collector


def get_performance_tracker() -> PerformanceTracker:
    """Get global performance tracker instance."""
    global _performance_tracker
    if _performance_tracker is None:
        _performance_tracker = PerformanceTracker(get_apm_collector())
    return _performance_tracker