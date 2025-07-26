"""
Real-time metrics dashboard for monitoring system performance and health.

This module provides a comprehensive dashboard for visualizing performance metrics,
alerts, and system health indicators in real-time.
"""

import asyncio
import logging
import statistics
import threading
import time
from collections import defaultdict, deque
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from .apm_integration import APMCollector, MetricData, PerformanceAlert
from .metrics_collector import MetricsCollector

logger = logging.getLogger(__name__)


@dataclass
class DashboardMetric:
    """Dashboard-specific metric with visualization metadata."""
    name: str
    current_value: float
    unit: str
    trend: str  # up, down, stable
    trend_percentage: float
    status: str  # healthy, warning, critical
    last_updated: float
    history: List[Tuple[float, float]] = field(default_factory=list)  # (timestamp, value)
    alerts: List[PerformanceAlert] = field(default_factory=list)


@dataclass
class SystemHealthStatus:
    """Overall system health status."""
    overall_status: str  # healthy, degraded, critical
    uptime: float
    error_rate: float
    average_response_time: float
    cache_hit_rate: float
    memory_usage: float
    active_connections: int
    last_updated: float
    component_statuses: Dict[str, str] = field(default_factory=dict)


@dataclass
class PerformanceInsight:
    """Performance insight with recommendations."""
    insight_id: str
    category: str  # performance, reliability, cost
    severity: str  # info, warning, critical
    title: str
    description: str
    recommendation: str
    impact: str  # high, medium, low
    effort: str  # high, medium, low
    metrics_supporting: List[str] = field(default_factory=list)
    timestamp: float = field(default_factory=time.time)


class MetricAggregator:
    """High-performance metric aggregation with sliding windows."""

    def __init__(self, window_size: int = 1000):
        """Initialize metric aggregator."""
        self.window_size = window_size
        self._metric_windows: Dict[str, deque] = defaultdict(lambda: deque(maxlen=window_size))
        self._lock = threading.Lock()

        logger.debug("Metric aggregator initialized", extra={
            "window_size": window_size
        })

    def add_metric(self, metric: MetricData) -> None:
        """Add metric to aggregation window."""
        with self._lock:
            key = f"{metric.name}:{':'.join(f'{k}={v}' for k, v in sorted(metric.tags.items()))}"
            self._metric_windows[key].append((metric.timestamp, metric.value))

    def get_aggregated_metrics(self,
                              metric_name: str,
                              tags: Optional[Dict[str, str]] = None,
                              time_range: Optional[float] = None) -> Dict[str, float]:
        """Get aggregated statistics for a metric."""
        with self._lock:
            tags = tags or {}
            key = f"{metric_name}:{':'.join(f'{k}={v}' for k, v in sorted(tags.items()))}"

            data_points = list(self._metric_windows.get(key, []))
            if not data_points:
                return {}

            # Filter by time range if specified
            if time_range:
                cutoff_time = time.time() - time_range
                data_points = [(ts, val) for ts, val in data_points if ts >= cutoff_time]

            if not data_points:
                return {}

            values = [val for _, val in data_points]

            return {
                "count": len(values),
                "min": min(values),
                "max": max(values),
                "mean": statistics.mean(values),
                "median": statistics.median(values),
                "std_dev": statistics.stdev(values) if len(values) > 1 else 0.0,
                "p95": self._percentile(values, 0.95),
                "p99": self._percentile(values, 0.99),
                "current": values[-1],
                "trend": self._calculate_trend(values)
            }

    def _percentile(self, values: List[float], p: float) -> float:
        """Calculate percentile value."""
        if not values:
            return 0.0
        sorted_values = sorted(values)
        index = int(len(sorted_values) * p)
        return sorted_values[min(index, len(sorted_values) - 1)]

    def _calculate_trend(self, values: List[float]) -> float:
        """Calculate trend percentage (positive = increasing)."""
        if len(values) < 2:
            return 0.0

        # Simple trend calculation using first and last quartiles
        quarter_size = len(values) // 4
        if quarter_size == 0:
            return 0.0

        first_quarter_avg = statistics.mean(values[:quarter_size])
        last_quarter_avg = statistics.mean(values[-quarter_size:])

        if first_quarter_avg == 0:
            return 0.0

        return ((last_quarter_avg - first_quarter_avg) / first_quarter_avg) * 100


class PerformanceAnalyzer:
    """Intelligent performance analysis and insight generation."""

    def __init__(self, metric_aggregator: MetricAggregator):
        """Initialize performance analyzer."""
        self.metric_aggregator = metric_aggregator
        self._insight_cache: Dict[str, PerformanceInsight] = {}
        self._analysis_history: deque = deque(maxlen=100)

        # Performance baseline thresholds
        self._thresholds = {
            "query_response_time": {"good": 1.0, "warning": 3.0, "critical": 5.0},
            "memory_usage": {"good": 0.6, "warning": 0.8, "critical": 0.9},
            "cache_hit_rate": {"good": 0.8, "warning": 0.6, "critical": 0.4},
            "error_rate": {"good": 0.01, "warning": 0.05, "critical": 0.1},
            "cpu_usage": {"good": 0.7, "warning": 0.85, "critical": 0.95}
        }

        logger.info("Performance analyzer initialized")

    def analyze_system_performance(self) -> Tuple[SystemHealthStatus, List[PerformanceInsight]]:
        """Comprehensive system performance analysis."""
        insights = []
        component_statuses = {}

        # Analyze key metrics
        query_metrics = self.metric_aggregator.get_aggregated_metrics("query_response_time", time_range=300)
        memory_metrics = self.metric_aggregator.get_aggregated_metrics("memory_usage", time_range=300)
        cache_metrics = self.metric_aggregator.get_aggregated_metrics("cache_hit_rate", time_range=300)
        error_metrics = self.metric_aggregator.get_aggregated_metrics("error_rate", time_range=300)

        # Query Performance Analysis
        if query_metrics:
            query_status, query_insights = self._analyze_query_performance(query_metrics)
            component_statuses["query_processing"] = query_status
            insights.extend(query_insights)

        # Memory Analysis
        if memory_metrics:
            memory_status, memory_insights = self._analyze_memory_usage(memory_metrics)
            component_statuses["memory"] = memory_status
            insights.extend(memory_insights)

        # Cache Analysis
        if cache_metrics:
            cache_status, cache_insights = self._analyze_cache_performance(cache_metrics)
            component_statuses["caching"] = cache_status
            insights.extend(cache_insights)

        # Error Rate Analysis
        if error_metrics:
            error_status, error_insights = self._analyze_error_patterns(error_metrics)
            component_statuses["reliability"] = error_status
            insights.extend(error_insights)

        # Determine overall health
        overall_status = self._determine_overall_health(component_statuses)

        health_status = SystemHealthStatus(
            overall_status=overall_status,
            uptime=self._get_system_uptime(),
            error_rate=error_metrics.get("current", 0.0) if error_metrics else 0.0,
            average_response_time=query_metrics.get("mean", 0.0) if query_metrics else 0.0,
            cache_hit_rate=cache_metrics.get("current", 0.0) if cache_metrics else 0.0,
            memory_usage=memory_metrics.get("current", 0.0) if memory_metrics else 0.0,
            active_connections=self._get_active_connections(),
            last_updated=time.time(),
            component_statuses=component_statuses
        )

        return health_status, insights

    def _analyze_query_performance(self, metrics: Dict[str, float]) -> Tuple[str, List[PerformanceInsight]]:
        """Analyze query performance patterns."""
        insights = []

        mean_time = metrics.get("mean", 0)
        p95_time = metrics.get("p95", 0)
        trend = metrics.get("trend", 0)

        # Determine status
        if p95_time > self._thresholds["query_response_time"]["critical"]:
            status = "critical"
        elif p95_time > self._thresholds["query_response_time"]["warning"]:
            status = "warning"
        else:
            status = "healthy"

        # Generate insights
        if p95_time > self._thresholds["query_response_time"]["warning"]:
            insights.append(PerformanceInsight(
                insight_id="query_performance_slow",
                category="performance",
                severity="warning" if status == "warning" else "critical",
                title="Slow Query Performance Detected",
                description=f"95th percentile query response time is {p95_time:.2f}s, exceeding recommended thresholds.",
                recommendation="Consider query optimization, index tuning, or scaling compute resources.",
                impact="high",
                effort="medium",
                metrics_supporting=["query_response_time"]
            ))

        if trend > 20:  # 20% increase
            insights.append(PerformanceInsight(
                insight_id="query_performance_degrading",
                category="performance",
                severity="warning",
                title="Query Performance Degradation",
                description=f"Query response times have increased by {trend:.1f}% recently.",
                recommendation="Investigate recent changes, check for resource constraints, or consider optimization.",
                impact="medium",
                effort="low",
                metrics_supporting=["query_response_time"]
            ))

        return status, insights

    def _analyze_memory_usage(self, metrics: Dict[str, float]) -> Tuple[str, List[PerformanceInsight]]:
        """Analyze memory usage patterns."""
        insights = []

        current_usage = metrics.get("current", 0)
        max_usage = metrics.get("max", 0)
        trend = metrics.get("trend", 0)

        # Determine status
        if current_usage > self._thresholds["memory_usage"]["critical"]:
            status = "critical"
        elif current_usage > self._thresholds["memory_usage"]["warning"]:
            status = "warning"
        else:
            status = "healthy"

        # Generate insights
        if current_usage > self._thresholds["memory_usage"]["warning"]:
            insights.append(PerformanceInsight(
                insight_id="high_memory_usage",
                category="performance",
                severity="warning" if status == "warning" else "critical",
                title="High Memory Usage",
                description=f"Memory usage is at {current_usage*100:.1f}%, approaching system limits.",
                recommendation="Monitor for memory leaks, optimize data structures, or increase available memory.",
                impact="high",
                effort="medium",
                metrics_supporting=["memory_usage"]
            ))

        if trend > 15 and current_usage > 0.5:  # Growing memory usage
            insights.append(PerformanceInsight(
                insight_id="memory_leak_suspected",
                category="reliability",
                severity="warning",
                title="Potential Memory Leak",
                description=f"Memory usage trending upward by {trend:.1f}% with high baseline usage.",
                recommendation="Investigate memory allocation patterns and potential leaks in long-running processes.",
                impact="high",
                effort="high",
                metrics_supporting=["memory_usage"]
            ))

        return status, insights

    def _analyze_cache_performance(self, metrics: Dict[str, float]) -> Tuple[str, List[PerformanceInsight]]:
        """Analyze cache performance patterns."""
        insights = []

        hit_rate = metrics.get("current", 0)
        trend = metrics.get("trend", 0)

        # Determine status
        if hit_rate < self._thresholds["cache_hit_rate"]["critical"]:
            status = "critical"
        elif hit_rate < self._thresholds["cache_hit_rate"]["warning"]:
            status = "warning"
        else:
            status = "healthy"

        # Generate insights
        if hit_rate < self._thresholds["cache_hit_rate"]["warning"]:
            insights.append(PerformanceInsight(
                insight_id="low_cache_hit_rate",
                category="performance",
                severity="warning" if status == "warning" else "critical",
                title="Low Cache Hit Rate",
                description=f"Cache hit rate is {hit_rate*100:.1f}%, below optimal performance levels.",
                recommendation="Review cache strategy, increase cache size, or optimize cache key patterns.",
                impact="medium",
                effort="medium",
                metrics_supporting=["cache_hit_rate"]
            ))

        if trend < -10:  # Declining hit rate
            insights.append(PerformanceInsight(
                insight_id="declining_cache_performance",
                category="performance",
                severity="warning",
                title="Declining Cache Performance",
                description=f"Cache hit rate has declined by {abs(trend):.1f}% recently.",
                recommendation="Investigate cache eviction patterns or changing query patterns affecting cache effectiveness.",
                impact="medium",
                effort="low",
                metrics_supporting=["cache_hit_rate"]
            ))

        return status, insights

    def _analyze_error_patterns(self, metrics: Dict[str, float]) -> Tuple[str, List[PerformanceInsight]]:
        """Analyze error rate patterns."""
        insights = []

        error_rate = metrics.get("current", 0)
        trend = metrics.get("trend", 0)

        # Determine status
        if error_rate > self._thresholds["error_rate"]["critical"]:
            status = "critical"
        elif error_rate > self._thresholds["error_rate"]["warning"]:
            status = "warning"
        else:
            status = "healthy"

        # Generate insights
        if error_rate > self._thresholds["error_rate"]["warning"]:
            insights.append(PerformanceInsight(
                insight_id="high_error_rate",
                category="reliability",
                severity="warning" if status == "warning" else "critical",
                title="High Error Rate",
                description=f"Error rate is {error_rate*100:.2f}%, above acceptable thresholds.",
                recommendation="Investigate error patterns, check system health, and implement error handling improvements.",
                impact="high",
                effort="medium",
                metrics_supporting=["error_rate"]
            ))

        if trend > 50:  # Significant increase in errors
            insights.append(PerformanceInsight(
                insight_id="error_rate_spike",
                category="reliability",
                severity="critical",
                title="Error Rate Spike",
                description=f"Error rate has increased by {trend:.1f}% recently, indicating potential system issues.",
                recommendation="Immediate investigation required - check recent deployments, system resources, and dependencies.",
                impact="high",
                effort="low",
                metrics_supporting=["error_rate"]
            ))

        return status, insights

    def _determine_overall_health(self, component_statuses: Dict[str, str]) -> str:
        """Determine overall system health from component statuses."""
        if not component_statuses:
            return "unknown"

        statuses = list(component_statuses.values())

        if "critical" in statuses:
            return "critical"
        elif "warning" in statuses:
            return "degraded"
        else:
            return "healthy"

    def _get_system_uptime(self) -> float:
        """Get system uptime in seconds."""
        # This would typically read from system metrics or process start time
        # For now, return a placeholder
        return 86400.0  # 24 hours

    def _get_active_connections(self) -> int:
        """Get number of active connections."""
        # This would typically read from connection pool metrics
        return 10  # Placeholder


class MetricsDashboard:
    """Real-time metrics dashboard with performance insights."""

    def __init__(self,
                 apm_collector: APMCollector,
                 metrics_collector: MetricsCollector,
                 update_interval: float = 5.0):
        """Initialize metrics dashboard."""
        self.apm_collector = apm_collector
        self.metrics_collector = metrics_collector
        self.update_interval = update_interval

        # Dashboard components
        self.metric_aggregator = MetricAggregator()
        self.performance_analyzer = PerformanceAnalyzer(self.metric_aggregator)

        # Dashboard state
        self._dashboard_metrics: Dict[str, DashboardMetric] = {}
        self._system_health: Optional[SystemHealthStatus] = None
        self._performance_insights: List[PerformanceInsight] = []
        self._alerts: List[PerformanceAlert] = []

        # Background updates
        self._update_task: Optional[asyncio.Task] = None
        self._running = False

        logger.info("Metrics dashboard initialized", extra={
            "update_interval": update_interval
        })

    async def start(self) -> None:
        """Start dashboard background updates."""
        if self._running:
            return

        self._running = True
        self._update_task = asyncio.create_task(self._background_update())

        logger.info("Metrics dashboard started")

    async def stop(self) -> None:
        """Stop dashboard updates."""
        if not self._running:
            return

        self._running = False
        if self._update_task:
            self._update_task.cancel()
            try:
                await self._update_task
            except asyncio.CancelledError:
                pass

        logger.info("Metrics dashboard stopped")

    async def _background_update(self) -> None:
        """Background task for updating dashboard data."""
        while self._running:
            try:
                await self._update_dashboard_data()
                await asyncio.sleep(self.update_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Dashboard update failed", extra={"error": str(e)})
                await asyncio.sleep(self.update_interval)

    async def _update_dashboard_data(self) -> None:
        """Update all dashboard data from collectors."""
        # Get latest metrics from collectors
        current_metrics = self.metrics_collector.get_all_metrics()

        # Add metrics to aggregator
        for metric_name, metric_value in current_metrics.items():
            metric_data = MetricData(
                name=metric_name,
                value=metric_value,
                timestamp=time.time()
            )
            self.metric_aggregator.add_metric(metric_data)

        # Update dashboard metrics
        await self._update_dashboard_metrics()

        # Analyze performance and generate insights
        self._system_health, self._performance_insights = self.performance_analyzer.analyze_system_performance()

        logger.debug("Dashboard data updated", extra={
            "metrics_count": len(self._dashboard_metrics),
            "insights_count": len(self._performance_insights),
            "system_health": self._system_health.overall_status if self._system_health else "unknown"
        })

    async def _update_dashboard_metrics(self) -> None:
        """Update dashboard-specific metrics with visualization data."""
        # Key metrics to display on dashboard
        key_metrics = [
            "query_response_time",
            "memory_usage",
            "cache_hit_rate",
            "error_rate",
            "requests_per_second",
            "active_connections"
        ]

        for metric_name in key_metrics:
            aggregated = self.metric_aggregator.get_aggregated_metrics(metric_name, time_range=3600)

            if aggregated:
                # Determine status
                status = self._determine_metric_status(metric_name, aggregated["current"])

                # Create dashboard metric
                dashboard_metric = DashboardMetric(
                    name=metric_name,
                    current_value=aggregated["current"],
                    unit=self._get_metric_unit(metric_name),
                    trend="up" if aggregated["trend"] > 5 else "down" if aggregated["trend"] < -5 else "stable",
                    trend_percentage=aggregated["trend"],
                    status=status,
                    last_updated=time.time(),
                    history=[(time.time() - i * 60, aggregated["current"] + (i * 0.1)) for i in range(60, 0, -1)],  # Placeholder history
                    alerts=[]  # Would be populated from alert system
                )

                self._dashboard_metrics[metric_name] = dashboard_metric

    def _determine_metric_status(self, metric_name: str, value: float) -> str:
        """Determine status (healthy/warning/critical) for a metric."""
        thresholds = self.performance_analyzer._thresholds.get(metric_name)
        if not thresholds:
            return "healthy"

        if value > thresholds.get("critical", float('inf')):
            return "critical"
        elif value > thresholds.get("warning", float('inf')):
            return "warning"
        else:
            return "healthy"

    def _get_metric_unit(self, metric_name: str) -> str:
        """Get display unit for metric."""
        unit_map = {
            "query_response_time": "seconds",
            "memory_usage": "percent",
            "cache_hit_rate": "percent",
            "error_rate": "percent",
            "requests_per_second": "req/s",
            "active_connections": "connections"
        }
        return unit_map.get(metric_name, "")

    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get complete dashboard data for UI rendering."""
        return {
            "system_health": asdict(self._system_health) if self._system_health else None,
            "metrics": {name: asdict(metric) for name, metric in self._dashboard_metrics.items()},
            "insights": [asdict(insight) for insight in self._performance_insights],
            "alerts": [asdict(alert) for alert in self._alerts],
            "last_updated": time.time(),
            "collector_stats": self.apm_collector.get_stats()
        }

    def get_metric_history(self, metric_name: str, time_range: int = 3600) -> List[Tuple[float, float]]:
        """Get historical data for a specific metric."""
        dashboard_metric = self._dashboard_metrics.get(metric_name)
        if dashboard_metric:
            return dashboard_metric.history
        return []

    def get_system_health(self) -> Optional[SystemHealthStatus]:
        """Get current system health status."""
        return self._system_health

    def get_performance_insights(self) -> List[PerformanceInsight]:
        """Get current performance insights."""
        return self._performance_insights
