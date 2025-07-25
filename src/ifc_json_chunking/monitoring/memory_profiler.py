"""
Advanced memory profiler with leak detection, garbage collection optimization, and proactive memory management.

This module provides comprehensive memory monitoring and optimization capabilities
for production-ready performance and reliability.
"""

import asyncio
import gc
import logging
import os
import psutil
import sys
import threading
import time
import tracemalloc
import weakref
from collections import defaultdict, deque
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union
import functools
from contextlib import contextmanager
import linecache

logger = logging.getLogger(__name__)


@dataclass
class MemorySnapshot:
    """Memory usage snapshot with detailed metrics."""
    timestamp: float
    process_memory_mb: float
    available_memory_mb: float
    memory_percent: float
    gc_counts: Tuple[int, int, int]
    tracemalloc_current_mb: float
    tracemalloc_peak_mb: float
    object_counts: Dict[str, int] = field(default_factory=dict)
    top_allocations: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class MemoryLeak:
    """Memory leak detection result."""
    leak_id: str
    location: str
    size_mb: float
    growth_rate_mb_per_min: float
    first_detected: float
    last_updated: float
    severity: str  # low, medium, high, critical
    stack_trace: List[str] = field(default_factory=list)
    allocation_patterns: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GCOptimizationResult:
    """Garbage collection optimization result."""
    optimization_type: str
    before_memory_mb: float
    after_memory_mb: float
    memory_freed_mb: float
    gc_time_ms: float
    objects_collected: int
    timestamp: float
    effectiveness_score: float


class MemoryTracker:
    """High-performance memory allocation tracker."""
    
    def __init__(self, max_traces: int = 100):
        """Initialize memory tracker."""
        self.max_traces = max_traces
        self._allocation_history: deque = deque(maxlen=max_traces * 10)
        self._top_allocations: Dict[str, Dict[str, Any]] = {}
        self._tracking_enabled = False
        self._lock = threading.Lock()
        
        logger.debug("Memory tracker initialized", extra={
            "max_traces": max_traces
        })
    
    def start_tracking(self) -> None:
        """Start memory allocation tracking."""
        if self._tracking_enabled:
            return
        
        try:
            tracemalloc.start(nframe=10)
            self._tracking_enabled = True
            logger.info("Memory allocation tracking started")
        except RuntimeError as e:
            logger.warning("Failed to start tracemalloc", extra={"error": str(e)})
    
    def stop_tracking(self) -> None:
        """Stop memory allocation tracking."""
        if not self._tracking_enabled:
            return
        
        try:
            tracemalloc.stop()
            self._tracking_enabled = False
            logger.info("Memory allocation tracking stopped")
        except RuntimeError as e:
            logger.warning("Failed to stop tracemalloc", extra={"error": str(e)})
    
    def get_current_snapshot(self) -> Optional[MemorySnapshot]:
        """Get current memory usage snapshot."""
        try:
            # Process memory info
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_percent = process.memory_percent()
            
            # System memory info
            system_memory = psutil.virtual_memory()
            
            # Garbage collection stats
            gc_counts = gc.get_count()
            
            # Tracemalloc stats
            tracemalloc_current = 0.0
            tracemalloc_peak = 0.0
            top_allocations = []
            
            if self._tracking_enabled and tracemalloc.is_tracing():
                current, peak = tracemalloc.get_traced_memory()
                tracemalloc_current = current / (1024 * 1024)  # Convert to MB
                tracemalloc_peak = peak / (1024 * 1024)
                
                # Get top allocations
                snapshot = tracemalloc.take_snapshot()
                top_stats = snapshot.statistics('lineno')
                top_allocations = self._format_top_allocations(top_stats[:10])
            
            # Object counts
            object_counts = self._get_object_counts()
            
            return MemorySnapshot(
                timestamp=time.time(),
                process_memory_mb=memory_info.rss / (1024 * 1024),
                available_memory_mb=system_memory.available / (1024 * 1024),
                memory_percent=memory_percent,
                gc_counts=gc_counts,
                tracemalloc_current_mb=tracemalloc_current,
                tracemalloc_peak_mb=tracemalloc_peak,
                object_counts=object_counts,
                top_allocations=top_allocations
            )
            
        except Exception as e:
            logger.error("Failed to get memory snapshot", extra={"error": str(e)})
            return None
    
    def _format_top_allocations(self, top_stats) -> List[Dict[str, Any]]:
        """Format top memory allocations for analysis."""
        allocations = []
        
        for stat in top_stats:
            filename = stat.traceback.format()[0].split('"')[1] if stat.traceback.format() else "unknown"
            line_number = stat.traceback[0].lineno if stat.traceback else 0
            
            allocations.append({
                "size_mb": stat.size / (1024 * 1024),
                "count": stat.count,
                "filename": filename,
                "line_number": line_number,
                "code_line": self._get_code_line(filename, line_number)
            })
        
        return allocations
    
    def _get_code_line(self, filename: str, line_number: int) -> str:
        """Get the actual code line for context."""
        try:
            return linecache.getline(filename, line_number).strip()
        except:
            return ""
    
    def _get_object_counts(self) -> Dict[str, int]:
        """Get counts of different object types."""
        try:
            import gc
            object_counts = defaultdict(int)
            
            for obj in gc.get_objects():
                obj_type = type(obj).__name__
                object_counts[obj_type] += 1
            
            # Return top 20 object types
            sorted_counts = sorted(object_counts.items(), key=lambda x: x[1], reverse=True)
            return dict(sorted_counts[:20])
        except Exception as e:
            logger.warning("Failed to get object counts", extra={"error": str(e)})
            return {}


class MemoryLeakDetector:
    """Advanced memory leak detection using pattern analysis."""
    
    def __init__(self, 
                 analysis_window: int = 3600,  # 1 hour
                 min_growth_rate: float = 1.0,  # 1MB/min
                 confidence_threshold: float = 0.8):
        """Initialize memory leak detector."""
        self.analysis_window = analysis_window
        self.min_growth_rate = min_growth_rate
        self.confidence_threshold = confidence_threshold
        
        self._memory_history: deque = deque(maxlen=1000)
        self._detected_leaks: Dict[str, MemoryLeak] = {}
        self._allocation_patterns: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        
        logger.info("Memory leak detector initialized", extra={
            "analysis_window": analysis_window,
            "min_growth_rate": min_growth_rate
        })
    
    def add_memory_snapshot(self, snapshot: MemorySnapshot) -> None:
        """Add memory snapshot for leak analysis."""
        self._memory_history.append(snapshot)
        
        # Update allocation patterns
        for allocation in snapshot.top_allocations:
            location = f"{allocation['filename']}:{allocation['line_number']}"
            self._allocation_patterns[location].append({
                "timestamp": snapshot.timestamp,
                "size_mb": allocation["size_mb"],
                "count": allocation["count"]
            })
    
    def detect_leaks(self) -> List[MemoryLeak]:
        """Detect memory leaks using statistical analysis."""
        current_time = time.time()
        detected_leaks = []
        
        # Analyze overall memory growth
        overall_leak = self._analyze_overall_memory_growth(current_time)
        if overall_leak:
            detected_leaks.append(overall_leak)
        
        # Analyze allocation patterns
        pattern_leaks = self._analyze_allocation_patterns(current_time)
        detected_leaks.extend(pattern_leaks)
        
        # Update detected leaks database
        for leak in detected_leaks:
            self._detected_leaks[leak.leak_id] = leak
        
        return detected_leaks
    
    def _analyze_overall_memory_growth(self, current_time: float) -> Optional[MemoryLeak]:
        """Analyze overall memory growth for system-wide leaks."""
        if len(self._memory_history) < 10:
            return None
        
        # Get memory data within analysis window
        cutoff_time = current_time - self.analysis_window
        recent_snapshots = [s for s in self._memory_history if s.timestamp >= cutoff_time]
        
        if len(recent_snapshots) < 5:
            return None
        
        # Calculate memory growth rate
        memory_values = [s.process_memory_mb for s in recent_snapshots]
        timestamps = [s.timestamp for s in recent_snapshots]
        
        growth_rate = self._calculate_growth_rate(timestamps, memory_values)
        
        if growth_rate >= self.min_growth_rate:
            leak_id = "system_memory_growth"
            severity = self._calculate_leak_severity(growth_rate)
            
            return MemoryLeak(
                leak_id=leak_id,
                location="system_wide",
                size_mb=memory_values[-1] - memory_values[0],
                growth_rate_mb_per_min=growth_rate,
                first_detected=timestamps[0],
                last_updated=current_time,
                severity=severity,
                allocation_patterns={
                    "analysis_window": self.analysis_window,
                    "data_points": len(recent_snapshots),
                    "confidence": min(growth_rate / self.min_growth_rate, 1.0)
                }
            )
        
        return None
    
    def _analyze_allocation_patterns(self, current_time: float) -> List[MemoryLeak]:
        """Analyze specific allocation patterns for localized leaks."""
        leaks = []
        cutoff_time = current_time - self.analysis_window
        
        for location, pattern_history in self._allocation_patterns.items():
            if len(pattern_history) < 5:
                continue
            
            # Filter to analysis window
            recent_patterns = [p for p in pattern_history if p["timestamp"] >= cutoff_time]
            if len(recent_patterns) < 3:
                continue
            
            # Analyze size growth
            sizes = [p["size_mb"] for p in recent_patterns]
            timestamps = [p["timestamp"] for p in recent_patterns]
            
            growth_rate = self._calculate_growth_rate(timestamps, sizes)
            
            if growth_rate >= self.min_growth_rate * 0.5:  # Lower threshold for specific locations
                leak_id = f"allocation_leak_{hash(location) % 10000}"
                severity = self._calculate_leak_severity(growth_rate)
                
                leak = MemoryLeak(
                    leak_id=leak_id,
                    location=location,
                    size_mb=sizes[-1] - sizes[0],
                    growth_rate_mb_per_min=growth_rate,
                    first_detected=timestamps[0],
                    last_updated=current_time,
                    severity=severity,
                    allocation_patterns={
                        "allocation_count_growth": recent_patterns[-1]["count"] - recent_patterns[0]["count"],
                        "data_points": len(recent_patterns),
                        "location": location
                    }
                )
                
                leaks.append(leak)
        
        return leaks
    
    def _calculate_growth_rate(self, timestamps: List[float], values: List[float]) -> float:
        """Calculate growth rate in MB per minute using linear regression."""
        if len(timestamps) < 2:
            return 0.0
        
        try:
            # Simple linear regression
            n = len(timestamps)
            sum_t = sum(timestamps)
            sum_v = sum(values)
            sum_tv = sum(t * v for t, v in zip(timestamps, values))
            sum_t2 = sum(t * t for t in timestamps)
            
            # Slope calculation (growth rate per second)
            slope = (n * sum_tv - sum_t * sum_v) / (n * sum_t2 - sum_t * sum_t)
            
            # Convert to MB per minute
            return slope * 60
        except (ZeroDivisionError, ValueError):
            return 0.0
    
    def _calculate_leak_severity(self, growth_rate: float) -> str:
        """Calculate leak severity based on growth rate."""
        if growth_rate >= 10.0:  # 10MB/min
            return "critical"
        elif growth_rate >= 5.0:  # 5MB/min
            return "high"
        elif growth_rate >= 2.0:  # 2MB/min
            return "medium"
        else:
            return "low"
    
    def get_active_leaks(self) -> List[MemoryLeak]:
        """Get currently active memory leaks."""
        current_time = time.time()
        active_leaks = []
        
        for leak in self._detected_leaks.values():
            # Consider leak active if detected within last hour
            if current_time - leak.last_updated < 3600:
                active_leaks.append(leak)
        
        return active_leaks


class GarbageCollectionOptimizer:
    """Intelligent garbage collection optimization and tuning."""
    
    def __init__(self):
        """Initialize GC optimizer."""
        self._gc_stats_history: deque = deque(maxlen=1000)
        self._optimization_history: deque = deque(maxlen=100)
        self._thresholds = list(gc.get_threshold())
        self._original_thresholds = self._thresholds.copy()
        
        logger.info("GC optimizer initialized", extra={
            "original_thresholds": self._original_thresholds
        })
    
    def optimize_gc_settings(self, memory_pressure: float = 0.0) -> GCOptimizationResult:
        """Optimize garbage collection settings based on current conditions."""
        start_time = time.time()
        before_memory = self._get_memory_usage()
        
        # Record pre-optimization GC stats
        before_counts = gc.get_count()
        
        # Perform optimization based on memory pressure
        if memory_pressure > 0.8:
            # High memory pressure: aggressive collection
            result = self._aggressive_gc_optimization()
        elif memory_pressure > 0.6:
            # Medium memory pressure: balanced optimization
            result = self._balanced_gc_optimization()
        else:
            # Low memory pressure: gentle optimization
            result = self._gentle_gc_optimization()
        
        # Measure results
        after_memory = self._get_memory_usage()
        after_counts = gc.get_count()
        gc_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        objects_collected = sum(before_counts) - sum(after_counts)
        memory_freed = max(0, before_memory - after_memory)
        effectiveness_score = self._calculate_effectiveness_score(memory_freed, gc_time)
        
        optimization_result = GCOptimizationResult(
            optimization_type=result["type"],
            before_memory_mb=before_memory,
            after_memory_mb=after_memory,
            memory_freed_mb=memory_freed,
            gc_time_ms=gc_time,
            objects_collected=objects_collected,
            timestamp=time.time(),
            effectiveness_score=effectiveness_score
        )
        
        self._optimization_history.append(optimization_result)
        
        logger.info("GC optimization completed", extra=asdict(optimization_result))
        
        return optimization_result
    
    def _aggressive_gc_optimization(self) -> Dict[str, Any]:
        """Aggressive GC optimization for high memory pressure."""
        # Force full garbage collection
        collected = [gc.collect(generation) for generation in range(3)]
        
        # Temporarily lower thresholds for more frequent collection
        aggressive_thresholds = [t // 2 for t in self._original_thresholds]
        gc.set_threshold(*aggressive_thresholds)
        
        return {
            "type": "aggressive",
            "collected_by_generation": collected,
            "new_thresholds": aggressive_thresholds
        }
    
    def _balanced_gc_optimization(self) -> Dict[str, Any]:
        """Balanced GC optimization for medium memory pressure."""
        # Collect younger generations more frequently
        collected = [gc.collect(0), gc.collect(1)]
        
        # Slightly adjust thresholds
        balanced_thresholds = [int(t * 0.8) for t in self._original_thresholds]
        gc.set_threshold(*balanced_thresholds)
        
        return {
            "type": "balanced",
            "collected_by_generation": collected,
            "new_thresholds": balanced_thresholds
        }
    
    def _gentle_gc_optimization(self) -> Dict[str, Any]:
        """Gentle GC optimization for low memory pressure."""
        # Only collect generation 0 (youngest objects)
        collected = gc.collect(0)
        
        # Use standard or relaxed thresholds
        gentle_thresholds = [int(t * 1.2) for t in self._original_thresholds]
        gc.set_threshold(*gentle_thresholds)
        
        return {
            "type": "gentle",
            "collected_generation_0": collected,
            "new_thresholds": gentle_thresholds
        }
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB."""
        try:
            process = psutil.Process()
            return process.memory_info().rss / (1024 * 1024)
        except:
            return 0.0
    
    def _calculate_effectiveness_score(self, memory_freed: float, gc_time: float) -> float:
        """Calculate GC optimization effectiveness score (0-1)."""
        if gc_time == 0:
            return 0.0
        
        # Score based on memory freed per millisecond of GC time
        efficiency = memory_freed / gc_time if gc_time > 0 else 0.0
        
        # Normalize to 0-1 scale (1MB freed per 1ms GC time = perfect score)
        return min(efficiency, 1.0)
    
    def reset_gc_settings(self) -> None:
        """Reset GC settings to original values."""
        gc.set_threshold(*self._original_thresholds)
        logger.info("GC settings reset to original", extra={
            "thresholds": self._original_thresholds
        })


class MemoryProfiler:
    """Comprehensive memory profiler with leak detection and optimization."""
    
    def __init__(self, 
                 monitoring_interval: float = 30.0,
                 enable_leak_detection: bool = True,
                 enable_gc_optimization: bool = True):
        """Initialize memory profiler."""
        self.monitoring_interval = monitoring_interval
        self.enable_leak_detection = enable_leak_detection
        self.enable_gc_optimization = enable_gc_optimization
        
        # Core components
        self.memory_tracker = MemoryTracker()
        self.leak_detector = MemoryLeakDetector() if enable_leak_detection else None
        self.gc_optimizer = GarbageCollectionOptimizer() if enable_gc_optimization else None
        
        # State management
        self._monitoring_task: Optional[asyncio.Task] = None
        self._running = False
        self._snapshots: deque = deque(maxlen=1000)
        self._alerts_generated: List[Dict[str, Any]] = []
        
        # Performance tracking
        self._profiler_stats = {
            "snapshots_taken": 0,
            "leaks_detected": 0,
            "gc_optimizations": 0,
            "alerts_generated": 0
        }
        
        logger.info("Memory profiler initialized", extra={
            "monitoring_interval": monitoring_interval,
            "leak_detection": enable_leak_detection,
            "gc_optimization": enable_gc_optimization
        })
    
    async def start(self) -> None:
        """Start memory profiling."""
        if self._running:
            return
        
        self._running = True
        self.memory_tracker.start_tracking()
        self._monitoring_task = asyncio.create_task(self._monitoring_loop())
        
        logger.info("Memory profiler started")
    
    async def stop(self) -> None:
        """Stop memory profiling."""
        if not self._running:
            return
        
        self._running = False
        self.memory_tracker.stop_tracking()
        
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Memory profiler stopped", extra=self._profiler_stats)
    
    async def _monitoring_loop(self) -> None:
        """Main monitoring loop."""
        while self._running:
            try:
                await self._perform_monitoring_cycle()
                await asyncio.sleep(self.monitoring_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Memory monitoring cycle failed", extra={"error": str(e)})
                await asyncio.sleep(self.monitoring_interval)
    
    async def _perform_monitoring_cycle(self) -> None:
        """Perform single monitoring cycle."""
        # Take memory snapshot
        snapshot = self.memory_tracker.get_current_snapshot()
        if not snapshot:
            return
        
        self._snapshots.append(snapshot)
        self._profiler_stats["snapshots_taken"] += 1
        
        # Detect memory leaks
        if self.leak_detector:
            self.leak_detector.add_memory_snapshot(snapshot)
            leaks = self.leak_detector.detect_leaks()
            
            for leak in leaks:
                self._handle_memory_leak(leak)
                self._profiler_stats["leaks_detected"] += 1
        
        # Optimize garbage collection if needed
        if self.gc_optimizer and self._should_optimize_gc(snapshot):
            memory_pressure = snapshot.memory_percent / 100.0
            result = self.gc_optimizer.optimize_gc_settings(memory_pressure)
            self._profiler_stats["gc_optimizations"] += 1
        
        # Generate alerts for critical conditions
        await self._check_critical_conditions(snapshot)
    
    def _should_optimize_gc(self, snapshot: MemorySnapshot) -> bool:
        """Determine if GC optimization is needed."""
        # Optimize if memory usage is high or growing rapidly
        if snapshot.memory_percent > 80:
            return True
        
        # Check for rapid memory growth
        if len(self._snapshots) >= 3:
            recent_snapshots = list(self._snapshots)[-3:]
            memory_growth = (recent_snapshots[-1].process_memory_mb - 
                           recent_snapshots[0].process_memory_mb)
            
            # Optimize if memory grew by more than 100MB in recent cycles
            if memory_growth > 100:
                return True
        
        return False
    
    def _handle_memory_leak(self, leak: MemoryLeak) -> None:
        """Handle detected memory leak."""
        logger.warning("Memory leak detected", extra=asdict(leak))
        
        # Generate alert
        alert = {
            "type": "memory_leak",
            "severity": leak.severity,
            "leak_id": leak.leak_id,
            "location": leak.location,
            "growth_rate": leak.growth_rate_mb_per_min,
            "timestamp": time.time()
        }
        
        self._alerts_generated.append(alert)
        self._profiler_stats["alerts_generated"] += 1
    
    async def _check_critical_conditions(self, snapshot: MemorySnapshot) -> None:
        """Check for critical memory conditions."""
        # Critical memory usage
        if snapshot.memory_percent > 95:
            alert = {
                "type": "critical_memory_usage",
                "severity": "critical",
                "memory_percent": snapshot.memory_percent,
                "available_mb": snapshot.available_memory_mb,
                "timestamp": snapshot.timestamp
            }
            
            self._alerts_generated.append(alert)
            self._profiler_stats["alerts_generated"] += 1
            
            logger.critical("Critical memory usage detected", extra=alert)
        
        # Rapid memory growth
        if len(self._snapshots) >= 5:
            recent_snapshots = list(self._snapshots)[-5:]
            memory_growth_rate = self._calculate_memory_growth_rate(recent_snapshots)
            
            if memory_growth_rate > 10.0:  # 10MB/min
                alert = {
                    "type": "rapid_memory_growth",
                    "severity": "warning",
                    "growth_rate_mb_per_min": memory_growth_rate,
                    "timestamp": snapshot.timestamp
                }
                
                self._alerts_generated.append(alert)
                self._profiler_stats["alerts_generated"] += 1
                
                logger.warning("Rapid memory growth detected", extra=alert)
    
    def _calculate_memory_growth_rate(self, snapshots: List[MemorySnapshot]) -> float:
        """Calculate memory growth rate from snapshots."""
        if len(snapshots) < 2:
            return 0.0
        
        start_memory = snapshots[0].process_memory_mb
        end_memory = snapshots[-1].process_memory_mb
        time_diff = snapshots[-1].timestamp - snapshots[0].timestamp
        
        if time_diff == 0:
            return 0.0
        
        # Growth rate in MB per minute
        return ((end_memory - start_memory) / time_diff) * 60
    
    @contextmanager
    def profile_memory_usage(self, operation_name: str):
        """Context manager for profiling specific operations."""
        start_snapshot = self.memory_tracker.get_current_snapshot()
        start_time = time.time()
        
        try:
            yield
        finally:
            end_time = time.time()
            end_snapshot = self.memory_tracker.get_current_snapshot()
            
            if start_snapshot and end_snapshot:
                memory_delta = end_snapshot.process_memory_mb - start_snapshot.process_memory_mb
                duration = end_time - start_time
                
                logger.info("Operation memory profile", extra={
                    "operation": operation_name,
                    "duration_seconds": duration,
                    "memory_delta_mb": memory_delta,
                    "start_memory_mb": start_snapshot.process_memory_mb,
                    "end_memory_mb": end_snapshot.process_memory_mb
                })
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """Get comprehensive memory statistics."""
        current_snapshot = self.memory_tracker.get_current_snapshot()
        active_leaks = self.leak_detector.get_active_leaks() if self.leak_detector else []
        
        return {
            "current_snapshot": asdict(current_snapshot) if current_snapshot else None,
            "active_leaks": [asdict(leak) for leak in active_leaks],
            "recent_alerts": self._alerts_generated[-10:],  # Last 10 alerts
            "profiler_stats": self._profiler_stats,
            "monitoring_config": {
                "interval": self.monitoring_interval,
                "leak_detection": self.enable_leak_detection,
                "gc_optimization": self.enable_gc_optimization
            }
        }
    
    def force_gc_optimization(self) -> Optional[GCOptimizationResult]:
        """Force garbage collection optimization."""
        if not self.gc_optimizer:
            return None
        
        current_snapshot = self.memory_tracker.get_current_snapshot()
        memory_pressure = current_snapshot.memory_percent / 100.0 if current_snapshot else 0.5
        
        return self.gc_optimizer.optimize_gc_settings(memory_pressure)
    
    def get_leak_summary(self) -> Dict[str, Any]:
        """Get summary of detected memory leaks."""
        if not self.leak_detector:
            return {"leak_detection_disabled": True}
        
        active_leaks = self.leak_detector.get_active_leaks()
        
        summary = {
            "total_active_leaks": len(active_leaks),
            "severity_breakdown": defaultdict(int),
            "total_growth_rate": 0.0,
            "most_severe_leak": None
        }
        
        for leak in active_leaks:
            summary["severity_breakdown"][leak.severity] += 1
            summary["total_growth_rate"] += leak.growth_rate_mb_per_min
            
            if (summary["most_severe_leak"] is None or 
                leak.growth_rate_mb_per_min > summary["most_severe_leak"]["growth_rate_mb_per_min"]):
                summary["most_severe_leak"] = asdict(leak)
        
        return summary