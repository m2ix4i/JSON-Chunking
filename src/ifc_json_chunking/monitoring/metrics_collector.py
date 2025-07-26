"""
Metrics collection and performance monitoring system.

This module provides comprehensive metrics collection for monitoring
application performance, resource usage, and operational health.
"""

import statistics
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import psutil
import structlog

from ..config import Config

logger = structlog.get_logger(__name__)


@dataclass
class MetricValue:
    """Single metric value with timestamp."""
    value: float
    timestamp: float = field(default_factory=time.time)
    labels: Dict[str, str] = field(default_factory=dict)


@dataclass
class MetricSeries:
    """Time series of metric values."""
    name: str
    description: str
    unit: str
    values: deque = field(default_factory=lambda: deque(maxlen=1000))

    def add_value(self, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """Add a value to the metric series."""
        self.values.append(MetricValue(value, labels=labels or {}))

    def get_latest(self) -> Optional[float]:
        """Get the most recent value."""
        return self.values[-1].value if self.values else None

    def get_average(self, window_seconds: float = 300) -> Optional[float]:
        """Get average value over time window."""
        cutoff_time = time.time() - window_seconds
        recent_values = [v.value for v in self.values if v.timestamp >= cutoff_time]
        return statistics.mean(recent_values) if recent_values else None

    def get_percentile(self, percentile: float, window_seconds: float = 300) -> Optional[float]:
        """Get percentile value over time window."""
        cutoff_time = time.time() - window_seconds
        recent_values = [v.value for v in self.values if v.timestamp >= cutoff_time]
        if not recent_values:
            return None

        # Use statistics.quantiles for percentiles
        if len(recent_values) == 1:
            return recent_values[0]

        try:
            quantiles = statistics.quantiles(recent_values, n=100)
            index = max(0, min(len(quantiles) - 1, int(percentile)))
            return quantiles[index]
        except statistics.StatisticsError:
            return statistics.mean(recent_values)


class MetricsCollector:
    """
    Comprehensive metrics collection system.
    
    Collects and tracks various performance metrics including:
    - Request/response metrics
    - Resource usage (CPU, memory, disk)
    - Custom application metrics
    - Error rates and performance indicators
    """

    def __init__(self, config: Config):
        """
        Initialize metrics collector.
        
        Args:
            config: System configuration
        """
        self.config = config
        self._metrics: Dict[str, MetricSeries] = {}
        self._counters: Dict[str, int] = defaultdict(int)
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, List[float]] = defaultdict(list)

        self._collection_interval = config.metrics_collection_interval_seconds
        self._monitoring_enabled = config.performance_monitoring_enabled

        # Threading for background collection
        self._collection_thread: Optional[threading.Thread] = None
        self._stop_collection = threading.Event()

        # Request tracking
        self._active_requests: Dict[str, float] = {}
        self._request_count = 0
        self._error_count = 0

        # Initialize standard metrics
        self._initialize_standard_metrics()

        if self._monitoring_enabled:
            self.start_collection()

    def _initialize_standard_metrics(self) -> None:
        """Initialize standard system metrics."""
        # Request metrics
        self.register_metric("requests_total", "Total number of requests", "count")
        self.register_metric("requests_duration_seconds", "Request duration", "seconds")
        self.register_metric("requests_errors_total", "Total number of request errors", "count")

        # System metrics
        self.register_metric("system_cpu_percent", "CPU usage percentage", "percent")
        self.register_metric("system_memory_bytes", "Memory usage in bytes", "bytes")
        self.register_metric("system_memory_percent", "Memory usage percentage", "percent")
        self.register_metric("system_disk_usage_bytes", "Disk usage in bytes", "bytes")

        # Application metrics
        self.register_metric("query_processing_duration", "Query processing duration", "seconds")
        self.register_metric("chunk_processing_duration", "Chunk processing duration", "seconds")
        self.register_metric("cache_hit_rate", "Cache hit rate", "ratio")
        self.register_metric("active_connections", "Number of active connections", "count")

        logger.info("Standard metrics initialized")

    def register_metric(self, name: str, description: str, unit: str) -> None:
        """
        Register a new metric.
        
        Args:
            name: Metric name
            description: Metric description
            unit: Metric unit (e.g., 'seconds', 'bytes', 'count')
        """
        if name not in self._metrics:
            self._metrics[name] = MetricSeries(name, description, unit)
            logger.debug("Metric registered", name=name, description=description, unit=unit)

    def record_value(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """
        Record a metric value.
        
        Args:
            name: Metric name
            value: Metric value
            labels: Optional labels for the metric
        """
        if name in self._metrics:
            self._metrics[name].add_value(value, labels)
        else:
            logger.warning("Attempt to record unknown metric", name=name)

    def increment_counter(self, name: str, value: float = 1.0, labels: Optional[Dict[str, str]] = None) -> None:
        """
        Increment a counter metric.
        
        Args:
            name: Counter name
            value: Increment value
            labels: Optional labels
        """
        self._counters[name] += value
        self.record_value(name, self._counters[name], labels)

    def set_gauge(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """
        Set a gauge metric value.
        
        Args:
            name: Gauge name
            value: Gauge value
            labels: Optional labels
        """
        self._gauges[name] = value
        self.record_value(name, value, labels)

    def record_histogram(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """
        Record a histogram value.
        
        Args:
            name: Histogram name
            value: Value to record
            labels: Optional labels
        """
        self._histograms[name].append(value)
        # Keep only recent values (last 1000)
        if len(self._histograms[name]) > 1000:
            self._histograms[name] = self._histograms[name][-1000:]

        self.record_value(name, value, labels)

    def start_request(self, request_id: str) -> None:
        """
        Start tracking a request.
        
        Args:
            request_id: Unique request identifier
        """
        self._active_requests[request_id] = time.time()
        self._request_count += 1
        self.increment_counter("requests_total")

    def end_request(self, request_id: str, success: bool = True) -> Optional[float]:
        """
        End tracking a request.
        
        Args:
            request_id: Request identifier
            success: Whether request was successful
            
        Returns:
            Request duration in seconds
        """
        if request_id in self._active_requests:
            start_time = self._active_requests.pop(request_id)
            duration = time.time() - start_time

            self.record_histogram("requests_duration_seconds", duration)

            if not success:
                self._error_count += 1
                self.increment_counter("requests_errors_total")

            return duration

        return None

    def record_query_processing(self, duration: float, chunks_processed: int, success: bool = True) -> None:
        """
        Record query processing metrics.
        
        Args:
            duration: Processing duration in seconds
            chunks_processed: Number of chunks processed
            success: Whether processing was successful
        """
        labels = {"success": str(success)}
        self.record_histogram("query_processing_duration", duration, labels)
        self.record_value("chunks_processed", chunks_processed, labels)

    def record_chunk_processing(self, duration: float, chunk_size_bytes: int, success: bool = True) -> None:
        """
        Record chunk processing metrics.
        
        Args:
            duration: Processing duration in seconds
            chunk_size_bytes: Size of processed chunk
            success: Whether processing was successful
        """
        labels = {"success": str(success)}
        self.record_histogram("chunk_processing_duration", duration, labels)
        self.record_value("chunk_size_bytes", chunk_size_bytes, labels)

    def record_cache_operation(self, operation: str, hit: bool, duration: float) -> None:
        """
        Record cache operation metrics.
        
        Args:
            operation: Cache operation type (get, set, delete)
            hit: Whether operation was a cache hit
            duration: Operation duration in seconds
        """
        labels = {"operation": operation, "hit": str(hit)}
        self.record_histogram("cache_operation_duration", duration, labels)

        # Update cache hit rate
        if operation == "get":
            current_hits = self._counters.get("cache_hits", 0)
            current_misses = self._counters.get("cache_misses", 0)

            if hit:
                self.increment_counter("cache_hits")
                current_hits += 1
            else:
                self.increment_counter("cache_misses")
                current_misses += 1

            total_operations = current_hits + current_misses
            hit_rate = current_hits / total_operations if total_operations > 0 else 0
            self.set_gauge("cache_hit_rate", hit_rate)

    def _collect_system_metrics(self) -> None:
        """Collect system resource metrics."""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            self.set_gauge("system_cpu_percent", cpu_percent)

            # Memory metrics
            memory = psutil.virtual_memory()
            self.set_gauge("system_memory_bytes", memory.used)
            self.set_gauge("system_memory_percent", memory.percent)

            # Disk metrics
            disk = psutil.disk_usage('/')
            self.set_gauge("system_disk_usage_bytes", disk.used)
            self.set_gauge("system_disk_usage_percent", (disk.used / disk.total) * 100)

            # Process-specific metrics
            process = psutil.Process()
            self.set_gauge("process_memory_bytes", process.memory_info().rss)
            self.set_gauge("process_cpu_percent", process.cpu_percent())

            # Active connections
            self.set_gauge("active_connections", len(self._active_requests))

        except Exception as e:
            logger.error("Error collecting system metrics", error=str(e))

    def _collection_worker(self) -> None:
        """Background worker for metric collection."""
        logger.info("Metrics collection started", interval=self._collection_interval)

        while not self._stop_collection.is_set():
            try:
                self._collect_system_metrics()
                time.sleep(self._collection_interval)
            except Exception as e:
                logger.error("Error in metrics collection worker", error=str(e))
                time.sleep(self._collection_interval)

    def start_collection(self) -> None:
        """Start background metrics collection."""
        if self._collection_thread is None or not self._collection_thread.is_alive():
            self._stop_collection.clear()
            self._collection_thread = threading.Thread(target=self._collection_worker, daemon=True)
            self._collection_thread.start()
            logger.info("Metrics collection thread started")

    def stop_collection(self) -> None:
        """Stop background metrics collection."""
        if self._collection_thread and self._collection_thread.is_alive():
            self._stop_collection.set()
            self._collection_thread.join(timeout=5)
            logger.info("Metrics collection stopped")

    def get_metric(self, name: str) -> Optional[MetricSeries]:
        """
        Get metric series by name.
        
        Args:
            name: Metric name
            
        Returns:
            Metric series or None if not found
        """
        return self._metrics.get(name)

    def get_all_metrics(self) -> Dict[str, Any]:
        """
        Get all current metrics.
        
        Returns:
            Dictionary of all metrics with current values
        """
        result = {
            "timestamp": time.time(),
            "metrics": {},
            "counters": dict(self._counters),
            "gauges": dict(self._gauges),
            "system": {}
        }

        # Current metric values
        for name, metric in self._metrics.items():
            latest = metric.get_latest()
            avg_5min = metric.get_average(300)
            p95_5min = metric.get_percentile(95, 300)

            result["metrics"][name] = {
                "description": metric.description,
                "unit": metric.unit,
                "latest": latest,
                "avg_5min": avg_5min,
                "p95_5min": p95_5min,
                "sample_count": len(metric.values)
            }

        # System summary
        result["system"] = {
            "active_requests": len(self._active_requests),
            "total_requests": self._request_count,
            "error_count": self._error_count,
            "error_rate": self._error_count / max(1, self._request_count),
            "uptime_seconds": time.time() - getattr(self, '_start_time', time.time())
        }

        return result

    def get_health_summary(self) -> Dict[str, Any]:
        """
        Get health summary for monitoring.
        
        Returns:
            Health status summary
        """
        # Calculate health indicators
        cpu_usage = self._gauges.get("system_cpu_percent", 0)
        memory_usage = self._gauges.get("system_memory_percent", 0)
        error_rate = self._error_count / max(1, self._request_count)
        cache_hit_rate = self._gauges.get("cache_hit_rate", 0)

        # Determine health status
        health_issues = []
        if cpu_usage > 80:
            health_issues.append(f"High CPU usage: {cpu_usage:.1f}%")
        if memory_usage > 85:
            health_issues.append(f"High memory usage: {memory_usage:.1f}%")
        if error_rate > 0.05:  # 5% error rate
            health_issues.append(f"High error rate: {error_rate:.2%}")
        if cache_hit_rate < 0.5:  # 50% cache hit rate
            health_issues.append(f"Low cache hit rate: {cache_hit_rate:.2%}")

        status = "healthy" if not health_issues else "degraded" if len(health_issues) < 3 else "unhealthy"

        return {
            "status": status,
            "issues": health_issues,
            "metrics": {
                "cpu_usage_percent": cpu_usage,
                "memory_usage_percent": memory_usage,
                "error_rate": error_rate,
                "cache_hit_rate": cache_hit_rate,
                "active_requests": len(self._active_requests),
                "requests_per_minute": self._get_requests_per_minute()
            }
        }

    def _get_requests_per_minute(self) -> float:
        """Calculate requests per minute from recent data."""
        if "requests_total" not in self._metrics:
            return 0.0

        metric = self._metrics["requests_total"]
        if len(metric.values) < 2:
            return 0.0

        # Count requests in the last minute
        one_minute_ago = time.time() - 60
        recent_requests = sum(1 for v in metric.values if v.timestamp >= one_minute_ago)

        return recent_requests

    def __enter__(self):
        """Context manager entry."""
        self.start_collection()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop_collection()


# Global metrics collector instance
_metrics_collector: Optional[MetricsCollector] = None


def get_metrics_collector() -> Optional[MetricsCollector]:
    """Get the global metrics collector instance."""
    return _metrics_collector


def initialize_metrics_collector(config: Config) -> MetricsCollector:
    """
    Initialize the global metrics collector.
    
    Args:
        config: System configuration
        
    Returns:
        Initialized metrics collector
    """
    global _metrics_collector
    _metrics_collector = MetricsCollector(config)
    return _metrics_collector
