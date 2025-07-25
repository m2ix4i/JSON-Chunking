"""
Memory profiling and optimization for IFC JSON Chunking system.

This module provides comprehensive memory monitoring, leak detection,
and memory optimization recommendations.
"""

import gc
import time
import threading
import tracemalloc
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
import psutil
import structlog

from ..config import Config

logger = structlog.get_logger(__name__)


@dataclass
class MemorySnapshot:
    """Memory usage snapshot at a point in time."""
    timestamp: float
    total_memory_mb: float
    available_memory_mb: float
    used_memory_mb: float
    memory_percent: float
    process_memory_mb: float
    gc_generation_0: int
    gc_generation_1: int
    gc_generation_2: int
    tracked_objects: int = 0
    top_allocations: List[Tuple[str, int]] = field(default_factory=list)


@dataclass
class MemoryAlert:
    """Memory alert information."""
    timestamp: float
    alert_type: str  # 'warning', 'critical', 'leak_detected'
    memory_usage_mb: float
    threshold_mb: float
    message: str
    recommendations: List[str] = field(default_factory=list)


class MemoryProfiler:
    """
    Comprehensive memory profiling and monitoring system.
    
    Features:
    - Real-time memory usage monitoring
    - Memory leak detection
    - Garbage collection optimization
    - Memory pressure alerts
    - Memory usage recommendations
    """
    
    def __init__(self, config: Config):
        """
        Initialize memory profiler.
        
        Args:
            config: System configuration
        """
        self.config = config
        self._monitoring_enabled = config.memory_profiling_enabled
        self._monitoring_interval = config.memory_monitoring_interval_seconds
        self._warning_threshold_mb = config.memory_threshold_warning_mb
        self._critical_threshold_mb = config.memory_threshold_critical_mb
        
        # Memory tracking
        self._snapshots: List[MemorySnapshot] = []
        self._max_snapshots = 288  # 24 hours at 5-minute intervals
        self._alerts: List[MemoryAlert] = []
        self._max_alerts = 100
        
        # Threading for background monitoring
        self._monitoring_thread: Optional[threading.Thread] = None
        self._stop_monitoring = threading.Event()
        
        # Tracemalloc for detailed tracking
        self._tracemalloc_enabled = False
        
        # Memory optimization
        self._last_gc_time = time.time()
        self._gc_frequency_seconds = 300  # Run GC every 5 minutes
        
        # Baseline memory usage
        self._baseline_memory_mb: Optional[float] = None
        
        if self._monitoring_enabled:
            self.start_monitoring()
    
    def start_monitoring(self) -> None:
        """Start memory monitoring."""
        if self._monitoring_thread is None or not self._monitoring_thread.is_alive():
            self._stop_monitoring.clear()
            
            # Start tracemalloc if enabled
            if not tracemalloc.is_tracing():
                tracemalloc.start(25)  # Keep 25 frames for detailed tracebacks
                self._tracemalloc_enabled = True
                logger.info("Memory tracing enabled")
            
            # Take baseline snapshot
            self._baseline_memory_mb = self._get_process_memory_mb()
            
            self._monitoring_thread = threading.Thread(target=self._monitoring_worker, daemon=True)
            self._monitoring_thread.start()
            logger.info("Memory monitoring started", 
                       interval=self._monitoring_interval,
                       warning_threshold=self._warning_threshold_mb,
                       critical_threshold=self._critical_threshold_mb)
    
    def stop_monitoring(self) -> None:
        """Stop memory monitoring."""
        if self._monitoring_thread and self._monitoring_thread.is_alive():
            self._stop_monitoring.set()
            self._monitoring_thread.join(timeout=5)
            logger.info("Memory monitoring stopped")
        
        if self._tracemalloc_enabled and tracemalloc.is_tracing():
            tracemalloc.stop()
            self._tracemalloc_enabled = False
            logger.info("Memory tracing disabled")
    
    def _monitoring_worker(self) -> None:
        """Background worker for memory monitoring."""
        logger.info("Memory monitoring worker started")
        
        while not self._stop_monitoring.is_set():
            try:
                # Take memory snapshot
                snapshot = self._take_snapshot()
                self._snapshots.append(snapshot)
                
                # Limit snapshot history
                if len(self._snapshots) > self._max_snapshots:
                    self._snapshots = self._snapshots[-self._max_snapshots:]
                
                # Check for alerts
                self._check_memory_alerts(snapshot)
                
                # Check for memory leaks
                self._check_memory_leaks()
                
                # Automatic garbage collection
                self._maybe_run_gc()
                
                time.sleep(self._monitoring_interval)
                
            except Exception as e:
                logger.error("Error in memory monitoring worker", error=str(e))
                time.sleep(self._monitoring_interval)
    
    def _take_snapshot(self) -> MemorySnapshot:
        """Take a memory usage snapshot."""
        # System memory info
        memory = psutil.virtual_memory()
        
        # Process memory info
        process = psutil.Process()
        process_memory = process.memory_info()
        
        # Garbage collection info
        gc_stats = gc.get_stats()
        
        # Tracemalloc info if available
        tracked_objects = 0
        top_allocations = []
        
        if self._tracemalloc_enabled and tracemalloc.is_tracing():
            current, peak = tracemalloc.get_traced_memory()
            tracked_objects = current // 1024  # Convert to KB
            
            # Get top allocations
            snapshot = tracemalloc.take_snapshot()
            top_stats = snapshot.statistics('filename')[:10]
            
            for stat in top_stats:
                # Format: "filename:line_number size_mb"
                location = f"{stat.traceback.format()[-1].strip()}"
                size_kb = stat.size // 1024
                top_allocations.append((location, size_kb))
        
        return MemorySnapshot(
            timestamp=time.time(),
            total_memory_mb=memory.total // (1024 * 1024),
            available_memory_mb=memory.available // (1024 * 1024),
            used_memory_mb=memory.used // (1024 * 1024),
            memory_percent=memory.percent,
            process_memory_mb=process_memory.rss // (1024 * 1024),
            gc_generation_0=gc_stats[0]['collections'] if gc_stats else 0,
            gc_generation_1=gc_stats[1]['collections'] if len(gc_stats) > 1 else 0,
            gc_generation_2=gc_stats[2]['collections'] if len(gc_stats) > 2 else 0,
            tracked_objects=tracked_objects,
            top_allocations=top_allocations
        )
    
    def _check_memory_alerts(self, snapshot: MemorySnapshot) -> None:
        """Check for memory usage alerts."""
        process_memory = snapshot.process_memory_mb
        
        # Critical threshold
        if process_memory >= self._critical_threshold_mb:
            alert = MemoryAlert(
                timestamp=snapshot.timestamp,
                alert_type="critical",
                memory_usage_mb=process_memory,
                threshold_mb=self._critical_threshold_mb,
                message=f"Critical memory usage: {process_memory:.1f}MB (threshold: {self._critical_threshold_mb}MB)",
                recommendations=[
                    "Consider restarting the application",
                    "Review memory-intensive operations",
                    "Enable aggressive garbage collection",
                    "Check for memory leaks"
                ]
            )
            self._add_alert(alert)
            logger.error("Critical memory usage detected", 
                        memory_mb=process_memory,
                        threshold_mb=self._critical_threshold_mb)
        
        # Warning threshold
        elif process_memory >= self._warning_threshold_mb:
            alert = MemoryAlert(
                timestamp=snapshot.timestamp,
                alert_type="warning",
                memory_usage_mb=process_memory,
                threshold_mb=self._warning_threshold_mb,
                message=f"High memory usage: {process_memory:.1f}MB (threshold: {self._warning_threshold_mb}MB)",
                recommendations=[
                    "Monitor memory usage closely",
                    "Consider running garbage collection",
                    "Review active queries and cache usage"
                ]
            )
            self._add_alert(alert)
            logger.warning("High memory usage detected", 
                          memory_mb=process_memory,
                          threshold_mb=self._warning_threshold_mb)
    
    def _check_memory_leaks(self) -> None:
        """Check for potential memory leaks."""
        if len(self._snapshots) < 10:  # Need enough samples
            return
        
        # Check for consistent memory growth over time
        recent_snapshots = self._snapshots[-10:]  # Last 10 snapshots
        memory_values = [s.process_memory_mb for s in recent_snapshots]
        
        # Simple leak detection: consistent upward trend
        if self._is_increasing_trend(memory_values, threshold=0.8):
            # Calculate growth rate
            start_memory = memory_values[0]
            end_memory = memory_values[-1]
            growth_rate = (end_memory - start_memory) / start_memory
            
            if growth_rate > 0.1:  # 10% growth
                alert = MemoryAlert(
                    timestamp=time.time(),
                    alert_type="leak_detected",
                    memory_usage_mb=end_memory,
                    threshold_mb=0,
                    message=f"Potential memory leak detected: {growth_rate:.1%} growth over recent samples",
                    recommendations=[
                        "Review recent code changes",
                        "Check for unclosed resources",
                        "Monitor object references",
                        "Consider heap dump analysis"
                    ]
                )
                self._add_alert(alert)
                logger.warning("Potential memory leak detected", 
                              growth_rate=f"{growth_rate:.1%}",
                              start_memory=start_memory,
                              end_memory=end_memory)
    
    def _is_increasing_trend(self, values: List[float], threshold: float = 0.7) -> bool:
        """Check if values show an increasing trend."""
        if len(values) < 3:
            return False
        
        increasing_count = 0
        for i in range(1, len(values)):
            if values[i] > values[i-1]:
                increasing_count += 1
        
        return (increasing_count / (len(values) - 1)) >= threshold
    
    def _add_alert(self, alert: MemoryAlert) -> None:
        """Add memory alert to history."""
        self._alerts.append(alert)
        
        # Limit alert history
        if len(self._alerts) > self._max_alerts:
            self._alerts = self._alerts[-self._max_alerts:]
    
    def _maybe_run_gc(self) -> None:
        """Run garbage collection if needed."""
        current_time = time.time()
        
        if current_time - self._last_gc_time >= self._gc_frequency_seconds:
            collected = gc.collect()
            self._last_gc_time = current_time
            
            if collected > 0:
                logger.debug("Garbage collection completed", objects_collected=collected)
    
    def force_gc(self) -> int:
        """
        Force garbage collection.
        
        Returns:
            Number of objects collected
        """
        collected = gc.collect()
        self._last_gc_time = time.time()
        logger.info("Forced garbage collection", objects_collected=collected)
        return collected
    
    def _get_process_memory_mb(self) -> float:
        """Get current process memory usage in MB."""
        try:
            process = psutil.Process()
            return process.memory_info().rss / (1024 * 1024)
        except Exception:
            return 0.0
    
    def get_current_memory_usage(self) -> Dict[str, Any]:
        """
        Get current memory usage information.
        
        Returns:
            Current memory usage details
        """
        snapshot = self._take_snapshot()
        
        baseline_growth = None
        if self._baseline_memory_mb:
            baseline_growth = snapshot.process_memory_mb - self._baseline_memory_mb
        
        return {
            "timestamp": snapshot.timestamp,
            "system": {
                "total_mb": snapshot.total_memory_mb,
                "available_mb": snapshot.available_memory_mb,
                "used_mb": snapshot.used_memory_mb,
                "percent": snapshot.memory_percent
            },
            "process": {
                "memory_mb": snapshot.process_memory_mb,
                "baseline_mb": self._baseline_memory_mb,
                "growth_from_baseline_mb": baseline_growth
            },
            "gc": {
                "generation_0": snapshot.gc_generation_0,
                "generation_1": snapshot.gc_generation_1,
                "generation_2": snapshot.gc_generation_2
            },
            "tracking": {
                "traced_memory_kb": snapshot.tracked_objects,
                "top_allocations": snapshot.top_allocations[:5]  # Top 5 allocations
            },
            "thresholds": {
                "warning_mb": self._warning_threshold_mb,
                "critical_mb": self._critical_threshold_mb
            }
        }
    
    def get_memory_trends(self, window_minutes: int = 60) -> Dict[str, Any]:
        """
        Get memory usage trends over time window.
        
        Args:
            window_minutes: Time window in minutes
            
        Returns:
            Memory trend analysis
        """
        cutoff_time = time.time() - (window_minutes * 60)
        recent_snapshots = [s for s in self._snapshots if s.timestamp >= cutoff_time]
        
        if not recent_snapshots:
            return {"error": "No recent snapshots available"}
        
        memory_values = [s.process_memory_mb for s in recent_snapshots]
        timestamps = [s.timestamp for s in recent_snapshots]
        
        # Calculate statistics
        min_memory = min(memory_values)
        max_memory = max(memory_values)
        avg_memory = sum(memory_values) / len(memory_values)
        
        # Growth rate
        growth_rate = 0.0
        if len(memory_values) >= 2:
            start_memory = memory_values[0]
            end_memory = memory_values[-1]
            if start_memory > 0:
                growth_rate = (end_memory - start_memory) / start_memory
        
        return {
            "window_minutes": window_minutes,
            "snapshot_count": len(recent_snapshots),
            "memory_stats": {
                "min_mb": min_memory,
                "max_mb": max_memory,
                "avg_mb": avg_memory,
                "current_mb": memory_values[-1] if memory_values else 0,
                "growth_rate": growth_rate
            },
            "trend_analysis": {
                "is_increasing": self._is_increasing_trend(memory_values),
                "stability": "stable" if max_memory - min_memory < 50 else "variable"
            }
        }
    
    def get_recent_alerts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent memory alerts.
        
        Args:
            limit: Maximum number of alerts to return
            
        Returns:
            List of recent alerts
        """
        recent_alerts = self._alerts[-limit:] if self._alerts else []
        
        return [
            {
                "timestamp": alert.timestamp,
                "type": alert.alert_type,
                "memory_usage_mb": alert.memory_usage_mb,
                "threshold_mb": alert.threshold_mb,
                "message": alert.message,
                "recommendations": alert.recommendations
            }
            for alert in reversed(recent_alerts)  # Most recent first
        ]
    
    def get_optimization_recommendations(self) -> List[str]:
        """
        Get memory optimization recommendations.
        
        Returns:
            List of optimization recommendations
        """
        recommendations = []
        
        if not self._snapshots:
            return ["Start memory monitoring to get recommendations"]
        
        latest = self._snapshots[-1]
        current_memory = latest.process_memory_mb
        
        # General recommendations based on current usage
        if current_memory > self._critical_threshold_mb * 0.8:
            recommendations.extend([
                "Consider implementing memory-efficient algorithms",
                "Review cache size limits and TTL settings",
                "Enable automatic garbage collection",
                "Monitor for memory leaks in long-running operations"
            ])
        
        # Garbage collection recommendations
        if len(self._snapshots) >= 2:
            prev_snapshot = self._snapshots[-2]
            gc_0_increase = latest.gc_generation_0 - prev_snapshot.gc_generation_0
            
            if gc_0_increase > 10:  # High GC activity
                recommendations.append("High garbage collection activity detected - review object lifecycle")
        
        # Tracemalloc recommendations
        if latest.top_allocations:
            top_allocation = latest.top_allocations[0]
            recommendations.append(f"Top memory allocation: {top_allocation[0]} ({top_allocation[1]} KB)")
        
        # Cache-specific recommendations
        if hasattr(self.config, 'cache_max_memory_mb'):
            cache_memory = self.config.cache_max_memory_mb
            if current_memory > cache_memory * 2:
                recommendations.append("Consider reducing cache memory limits")
        
        return recommendations or ["Memory usage appears normal"]
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform memory health check.
        
        Returns:
            Memory health status
        """
        current_usage = self.get_current_memory_usage()
        recent_alerts = self.get_recent_alerts(5)
        trends = self.get_memory_trends(30)  # 30-minute window
        
        # Determine health status
        current_memory = current_usage["process"]["memory_mb"]
        
        if current_memory >= self._critical_threshold_mb:
            status = "critical"
        elif current_memory >= self._warning_threshold_mb:
            status = "warning"
        elif any(alert["type"] == "leak_detected" for alert in recent_alerts):
            status = "leak_detected"
        else:
            status = "healthy"
        
        return {
            "status": status,
            "current_memory_mb": current_memory,
            "memory_percent": current_usage["system"]["percent"],
            "baseline_growth_mb": current_usage["process"]["growth_from_baseline_mb"],
            "recent_alerts_count": len(recent_alerts),
            "monitoring_enabled": self._monitoring_enabled,
            "tracemalloc_enabled": self._tracemalloc_enabled,
            "trends": trends,
            "recommendations": self.get_optimization_recommendations()
        }
    
    def __enter__(self):
        """Context manager entry."""
        self.start_monitoring()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop_monitoring()