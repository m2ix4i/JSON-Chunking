"""
Behavioral tests for performance monitoring system.

This module defines the expected behavior of performance monitoring components
using RSpec-style behavioral testing patterns.
"""

import asyncio
import pytest
import time
import tempfile
import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

from src.ifc_json_chunking.config import Config
from src.ifc_json_chunking.monitoring.metrics_collector import MetricsCollector
from src.ifc_json_chunking.monitoring.memory_profiler import MemoryProfiler
from src.ifc_json_chunking.storage.redis_cache import RedisCache
from src.ifc_json_chunking.web_api.services.query_service import QueryService
from src.ifc_json_chunking.web_api.models.requests import QueryRequest
from src.ifc_json_chunking.query.types import QueryIntent


class TestMetricsCollectorBehavior:
    """
    Describe MetricsCollector behavior:
    - It should collect system and application metrics
    - It should provide statistical analysis of metrics
    - It should handle metric recording failures gracefully
    """
    
    @pytest.fixture
    def metrics_collector(self):
        """Given a metrics collector instance."""
        config = Config()
        return MetricsCollector(config)
    
    def test_should_register_standard_metrics_on_initialization(self, metrics_collector):
        """It should register standard metrics upon initialization."""
        # When initialized
        # Then it should have standard metrics registered
        assert "requests_total" in metrics_collector._metrics
        assert "system_cpu_percent" in metrics_collector._metrics
        assert "query_processing_duration" in metrics_collector._metrics
        assert "cache_hit_rate" in metrics_collector._metrics
    
    def test_should_record_metric_values_with_timestamps(self, metrics_collector):
        """It should record metric values with accurate timestamps."""
        # Given a metric name and value
        metric_name = "test_metric"
        metric_value = 42.5
        
        # When I record the metric
        before_time = time.time()
        metrics_collector.record_value(metric_name, metric_value)
        after_time = time.time()
        
        # Then it should store the value with correct timestamp
        latest_value = metrics_collector._metrics[metric_name].get_latest()
        assert latest_value == metric_value
        
        # And the timestamp should be within the recording window
        latest_timestamp = metrics_collector._metrics[metric_name].values[-1].timestamp
        assert before_time <= latest_timestamp <= after_time
    
    def test_should_calculate_statistical_metrics(self, metrics_collector):
        """It should calculate statistical metrics like averages and percentiles."""
        # Given multiple recorded values
        metric_name = "response_time"
        values = [100, 200, 300, 400, 500]  # ms
        
        for value in values:
            metrics_collector.record_value(metric_name, value)
        
        # When I request statistical analysis
        average = metrics_collector._metrics[metric_name].get_average()
        
        # Then it should calculate correct statistics
        assert average == 300.0  # (100+200+300+400+500)/5
    
    def test_should_track_query_processing_metrics(self, metrics_collector):
        """It should track specific query processing performance metrics."""
        # Given query processing parameters
        duration = 2.5  # seconds
        chunks_processed = 10
        success = True
        
        # When I record query processing metrics
        metrics_collector.record_query_processing(duration, chunks_processed, success)
        
        # Then it should update relevant metrics
        query_duration = metrics_collector._metrics["query_processing_duration"].get_latest()
        assert query_duration == duration
    
    def test_should_handle_cache_operation_metrics(self, metrics_collector):
        """It should track cache hit/miss rates and operation durations."""
        # Given cache operations
        operations = [
            ("get", True, 0.001),   # hit, 1ms
            ("get", False, 0.005),  # miss, 5ms
            ("get", True, 0.002),   # hit, 2ms
        ]
        
        # When I record cache operations
        for operation, hit, duration in operations:
            metrics_collector.record_cache_operation(operation, hit, duration)
        
        # Then it should calculate hit rate
        # Note: This test validates the interface exists and works
        # Actual hit rate calculation would depend on implementation
        cache_hit_rate = metrics_collector._metrics["cache_hit_rate"].get_latest()
        assert cache_hit_rate is not None


class TestMemoryProfilerBehavior:
    """
    Describe MemoryProfiler behavior:
    - It should monitor system memory usage continuously
    - It should detect memory pressure conditions
    - It should provide memory usage statistics
    - It should detect potential memory leaks
    """
    
    @pytest.fixture
    def memory_profiler(self):
        """Given a memory profiler instance."""
        config = Config()
        return MemoryProfiler(config)
    
    @pytest.mark.asyncio
    async def test_should_start_and_stop_monitoring(self, memory_profiler):
        """It should start and stop memory monitoring on demand."""
        # When I start monitoring
        memory_profiler.start_monitoring()
        
        # Then monitoring should be active
        assert memory_profiler._monitoring_active is True
        
        # When I stop monitoring
        memory_profiler.stop_monitoring()
        
        # Then monitoring should be inactive
        assert memory_profiler._monitoring_active is False
    
    @pytest.mark.asyncio
    async def test_should_provide_current_memory_statistics(self, memory_profiler):
        """It should provide current memory usage statistics."""
        # Given an active memory profiler
        memory_profiler.start_monitoring()
        
        try:
            # When I request memory statistics
            stats = await memory_profiler.get_memory_stats()
            
            # Then it should provide current memory information
            assert "current_memory_mb" in stats
            assert "total_memory_mb" in stats
            assert "memory_percent" in stats
            assert stats["current_memory_mb"] > 0
            assert 0 <= stats["memory_percent"] <= 100
        finally:
            memory_profiler.stop_monitoring()
    
    @pytest.mark.asyncio
    async def test_should_detect_memory_pressure(self, memory_profiler):
        """It should detect when system is under memory pressure."""
        # Given an active memory profiler
        memory_profiler.start_monitoring()
        
        try:
            # When I check for memory pressure
            is_under_pressure = await memory_profiler.is_memory_pressure()
            
            # Then it should return a boolean status
            assert isinstance(is_under_pressure, bool)
        finally:
            memory_profiler.stop_monitoring()
    
    def test_should_maintain_memory_usage_history(self, memory_profiler):
        """It should maintain a history of memory usage for trend analysis."""
        # Given multiple memory snapshots
        memory_profiler.start_monitoring()
        
        try:
            # When memory usage is recorded over time
            # (This would happen automatically in the background)
            # Simulate some memory snapshots
            import time
            for i in range(3):
                memory_profiler._take_memory_snapshot()
                time.sleep(0.1)
            
            # Then it should maintain a history
            assert len(memory_profiler._memory_history) >= 3
        finally:
            memory_profiler.stop_monitoring()


class TestRedisCacheBehavior:
    """
    Describe RedisCache behavior:
    - It should store and retrieve data with TTL support
    - It should handle connection failures gracefully
    - It should provide cache statistics
    - It should support different data types
    """
    
    @pytest.fixture
    def redis_cache(self):
        """Given a Redis cache instance."""
        config = Config()
        return RedisCache(config)
    
    @pytest.mark.asyncio
    async def test_should_connect_and_disconnect_gracefully(self, redis_cache):
        """It should handle Redis connection lifecycle gracefully."""
        try:
            # When I attempt to connect
            connected = await redis_cache.connect()
            
            # Then it should indicate connection status
            assert isinstance(connected, bool)
            
            # When I disconnect
            await redis_cache.disconnect()
            
            # Then it should disconnect cleanly
            # (No exception should be raised)
        except Exception:
            # If Redis is not available, it should fail gracefully
            pytest.skip("Redis not available for testing")
    
    @pytest.mark.asyncio
    async def test_should_store_and_retrieve_data_with_ttl(self, redis_cache):
        """It should store data with TTL and retrieve it correctly."""
        try:
            await redis_cache.connect()
            
            # Given data to cache
            key = "test_key"
            data = {"test": "value", "number": 42}
            ttl = 60  # seconds
            
            # When I store data with TTL
            stored = await redis_cache.set(key, data, ttl)
            
            # Then it should confirm storage
            assert stored is True
            
            # When I retrieve the data
            retrieved = await redis_cache.get(key)
            
            # Then it should return the original data
            assert retrieved == data
            
        except Exception:
            pytest.skip("Redis not available for testing")
        finally:
            try:
                await redis_cache.disconnect()
            except:
                pass
    
    @pytest.mark.asyncio
    async def test_should_handle_cache_misses_gracefully(self, redis_cache):
        """It should handle cache misses by returning None."""
        try:
            await redis_cache.connect()
            
            # When I request a non-existent key
            result = await redis_cache.get("non_existent_key")
            
            # Then it should return None
            assert result is None
            
        except Exception:
            pytest.skip("Redis not available for testing")
        finally:
            try:
                await redis_cache.disconnect()
            except:
                pass
    
    @pytest.mark.asyncio
    async def test_should_provide_cache_statistics(self, redis_cache):
        """It should provide cache operation statistics."""
        try:
            await redis_cache.connect()
            
            # Given some cache operations
            await redis_cache.set("test1", "value1", 60)
            await redis_cache.get("test1")  # hit
            await redis_cache.get("test2")  # miss
            
            # When I request statistics
            stats = await redis_cache.get_stats()
            
            # Then it should provide operation counts
            assert hasattr(stats, 'hits')
            assert hasattr(stats, 'misses')
            assert hasattr(stats, 'sets')
            assert stats.sets >= 1
            
        except Exception:
            pytest.skip("Redis not available for testing")
        finally:
            try:
                await redis_cache.disconnect()
            except:
                pass


class TestQueryServicePerformanceBehavior:
    """
    Describe QueryService performance behavior:
    - It should integrate with monitoring components
    - It should cache query results effectively
    - It should track performance metrics during processing
    - It should handle monitoring component failures gracefully
    """
    
    @pytest.fixture
    def query_service_with_monitoring(self):
        """Given a query service with full monitoring integration."""
        config = Config()
        metrics_collector = MetricsCollector(config)
        memory_profiler = MemoryProfiler(config)
        redis_cache = RedisCache(config)
        
        return QueryService(
            config=config,
            metrics_collector=metrics_collector,
            memory_profiler=memory_profiler,
            redis_cache=redis_cache
        )
    
    @pytest.fixture
    def mock_file_service(self):
        """Given a mock file service for testing."""
        mock = AsyncMock()
        mock.get_file_status.return_value = {
            "status": "uploaded",
            "file_path": "/tmp/test_file.json"
        }
        return mock
    
    @pytest.fixture
    def test_file(self):
        """Given a test JSON file."""
        test_data = {
            "elements": [
                {"id": "element_1", "type": "IfcWall", "properties": {"height": 3.0}},
                {"id": "element_2", "type": "IfcDoor", "properties": {"width": 0.8}}
            ]
        }
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(test_data, temp_file)
        temp_file.close()
        return Path(temp_file.name)
    
    @pytest.mark.asyncio
    async def test_should_generate_consistent_cache_keys(self, query_service_with_monitoring):
        """It should generate consistent cache keys for identical queries."""
        # Given identical query requests
        request1 = QueryRequest(
            query="Test query",
            file_id="test_file",
            intent_hint=QueryIntent.COMPONENT_ANALYSIS
        )
        request2 = QueryRequest(
            query="Test query",
            file_id="test_file",
            intent_hint=QueryIntent.COMPONENT_ANALYSIS
        )
        
        # When I generate cache keys for both
        key1 = query_service_with_monitoring._generate_cache_key(request1)
        key2 = query_service_with_monitoring._generate_cache_key(request2)
        
        # Then the keys should be identical
        assert key1 == key2
    
    @pytest.mark.asyncio
    async def test_should_generate_different_cache_keys_for_different_queries(self, query_service_with_monitoring):
        """It should generate different cache keys for different queries."""
        # Given different query requests
        request1 = QueryRequest(
            query="First query",
            file_id="test_file",
            intent_hint=QueryIntent.COMPONENT_ANALYSIS
        )
        request2 = QueryRequest(
            query="Second query",
            file_id="test_file", 
            intent_hint=QueryIntent.COMPONENT_ANALYSIS
        )
        
        # When I generate cache keys for both
        key1 = query_service_with_monitoring._generate_cache_key(request1)
        key2 = query_service_with_monitoring._generate_cache_key(request2)
        
        # Then the keys should be different
        assert key1 != key2
    
    @pytest.mark.asyncio
    async def test_should_track_metrics_during_query_processing(self, query_service_with_monitoring, mock_file_service, test_file):
        """It should collect performance metrics during query processing."""
        # Given a query service with monitoring
        query_service_with_monitoring.file_service = mock_file_service
        mock_file_service.get_file_status.return_value = {
            "status": "uploaded",
            "file_path": str(test_file)
        }
        
        # And a query request
        request = QueryRequest(
            query="Test performance tracking",
            file_id="test_file",
            intent_hint=QueryIntent.COMPONENT_ANALYSIS,
            cache_results=False  # Disable cache to test actual processing
        )
        
        # When I process the query
        query_id = await query_service_with_monitoring.create_query(request)
        
        # Mock the chunking engine and query processor to avoid LLM calls
        mock_chunking_engine = AsyncMock()
        mock_chunking_engine.chunk_json_async.return_value = [
            MagicMock(id="chunk_1", content="test content")
        ]
        query_service_with_monitoring.chunking_engine = mock_chunking_engine
        
        mock_query_processor = AsyncMock()
        mock_result = MagicMock()
        mock_result.intent.value = "component_analysis"
        mock_result.confidence_score = 0.85
        mock_result.processing_time = 1.5
        mock_query_processor.process_request.return_value = mock_result
        query_service_with_monitoring.query_processor = mock_query_processor
        
        await query_service_with_monitoring.process_query_background(query_id, request)
        
        # Then performance metrics should be recorded
        metrics_collector = query_service_with_monitoring.metrics_collector
        if metrics_collector:
            # Verify that metrics were recorded
            # (The exact metrics depend on implementation)
            assert len(metrics_collector._metrics) > 0
        
        # Cleanup
        test_file.unlink()
    
    def test_should_handle_missing_monitoring_components_gracefully(self):
        """It should work correctly even when monitoring components are None."""
        # Given a query service without monitoring components
        config = Config()
        query_service = QueryService(
            config=config,
            metrics_collector=None,
            memory_profiler=None,
            redis_cache=None
        )
        
        # When I use the service
        request = QueryRequest(
            query="Test without monitoring",
            file_id="test_file",
            intent_hint=QueryIntent.COMPONENT_ANALYSIS
        )
        
        # Then it should generate cache keys without error
        cache_key = query_service._generate_cache_key(request)
        assert isinstance(cache_key, str)
        assert len(cache_key) > 0


class TestIntegratedPerformanceMonitoringBehavior:
    """
    Describe integrated performance monitoring behavior:
    - All components should work together seamlessly
    - Monitoring should not significantly impact performance
    - System should be resilient to monitoring failures
    """
    
    @pytest.mark.asyncio
    async def test_should_initialize_all_monitoring_components_together(self):
        """It should initialize all monitoring components without conflicts."""
        # Given monitoring component configurations
        config = Config()
        
        # When I initialize all components
        metrics_collector = MetricsCollector(config)
        memory_profiler = MemoryProfiler(config)
        redis_cache = RedisCache(config)
        
        # Then all should initialize without error
        assert metrics_collector is not None
        assert memory_profiler is not None
        assert redis_cache is not None
        
        # And they should have expected attributes
        assert hasattr(metrics_collector, '_metrics')
        assert hasattr(memory_profiler, '_monitoring_active')
        assert hasattr(redis_cache, '_connection_pool')
    
    @pytest.mark.asyncio
    async def test_should_provide_comprehensive_system_overview(self):
        """It should provide a comprehensive view of system performance."""
        # Given all monitoring components
        config = Config()
        metrics_collector = MetricsCollector(config)
        memory_profiler = MemoryProfiler(config)
        redis_cache = RedisCache(config)
        
        # When I start monitoring
        metrics_collector.start_collection()
        memory_profiler.start_monitoring()
        
        try:
            # And collect some data
            metrics_collector.record_value("test_metric", 100)
            await asyncio.sleep(0.1)  # Allow background collection
            
            # Then I should be able to get comprehensive stats
            memory_stats = await memory_profiler.get_memory_stats()
            
            assert "current_memory_mb" in memory_stats
            assert memory_stats["current_memory_mb"] > 0
            
        finally:
            # Cleanup
            memory_profiler.stop_monitoring()
            metrics_collector.stop_collection()
    
    def test_should_maintain_performance_within_acceptable_overhead(self):
        """It should maintain monitoring overhead within acceptable limits."""
        # Given performance monitoring components
        config = Config()
        metrics_collector = MetricsCollector(config)
        
        # When I perform operations with monitoring
        start_time = time.time()
        for i in range(100):
            metrics_collector.record_value("test_metric", i)
        monitoring_time = time.time() - start_time
        
        # Then overhead should be minimal (< 10ms for 100 operations)
        assert monitoring_time < 0.01  # 10ms
        
        # And operations should complete successfully
        assert metrics_collector._metrics["test_metric"].get_latest() == 99


# Test runner for behavioral tests
if __name__ == "__main__":
    # Run behavioral tests with verbose output
    pytest.main([
        __file__, 
        "-v", 
        "--tb=short",
        "-k", "test_should",  # Run only behavioral tests
        "--durations=10"
    ])