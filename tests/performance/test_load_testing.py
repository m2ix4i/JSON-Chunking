"""
Load testing for concurrent user scenarios and stress testing.

This module provides comprehensive load testing to validate
the system's ability to handle production-level traffic.
"""

import asyncio
import time
import json
import tempfile
import statistics
import pytest
from pathlib import Path
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass
from unittest.mock import AsyncMock

from src.ifc_json_chunking.config import Config
from src.ifc_json_chunking.web_api.services.query_service import QueryService
from src.ifc_json_chunking.web_api.models.requests import QueryRequest
from src.ifc_json_chunking.monitoring.metrics_collector import MetricsCollector
from src.ifc_json_chunking.monitoring.memory_profiler import MemoryProfiler
from src.ifc_json_chunking.storage.redis_cache import RedisCache
from src.ifc_json_chunking.query.types import QueryIntent


@dataclass
class LoadTestResult:
    """Results from a load test execution."""
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    p95_response_time: float
    p99_response_time: float
    requests_per_second: float
    total_duration: float
    success_rate: float


class LoadTester:
    """Load testing framework for query processing."""
    
    def __init__(self):
        """Initialize load tester."""
        self.config = Config()
        self.metrics_collector = MetricsCollector(self.config)
        self.memory_profiler = MemoryProfiler(self.config)
        self.redis_cache = RedisCache(self.config)
        
        # Create query service with monitoring
        self.query_service = QueryService(
            config=self.config,
            metrics_collector=self.metrics_collector,
            memory_profiler=self.memory_profiler,
            redis_cache=self.redis_cache
        )
    
    async def setup(self):
        """Initialize monitoring components."""
        await self.redis_cache.connect()
        self.metrics_collector.start_collection()
        self.memory_profiler.start_monitoring()
    
    async def cleanup(self):
        """Clean up monitoring components."""
        self.memory_profiler.stop_monitoring()
        self.metrics_collector.stop_collection()
        await self.redis_cache.disconnect()
    
    def create_test_queries(self, count: int) -> List[QueryRequest]:
        """Create a list of diverse test query requests."""
        query_templates = [
            ("Wie viel Kubikmeter Beton sind verbaut?", QueryIntent.QUANTITY),
            ("Welche Türen sind im 2. Stock?", QueryIntent.COMPONENT),
            ("Material der Stützen analysieren", QueryIntent.MATERIAL),
            ("Was ist in Raum R101?", QueryIntent.SPATIAL),
            ("Kosten für Stahlträger berechnen", QueryIntent.COST),
            ("Analysiere die Gebäudestruktur", QueryIntent.RELATIONSHIP),
            ("Finde alle Fenster im Erdgeschoss", QueryIntent.COMPONENT),
            ("Berechne die Wandflächen", QueryIntent.QUANTITY),
        ]
        
        queries = []
        for i in range(count):
            template_idx = i % len(query_templates)
            query_text, intent = query_templates[template_idx]
            
            queries.append(QueryRequest(
                query=f"{query_text} (Request {i+1})",
                file_id=f"load_test_file_{i % 5}",  # Simulate 5 different files
                intent_hint=intent,
                cache_results=True,
                max_concurrent=5
            ))
        
        return queries
    
    async def execute_single_query(self, query_request: QueryRequest, query_id_suffix: str) -> Tuple[bool, float]:
        """Execute a single query and return success status and response time."""
        start_time = time.time()
        
        try:
            query_id = await self.query_service.create_query(query_request)
            await self.query_service.process_query_background(f"{query_id}_{query_id_suffix}", query_request)
            response_time = time.time() - start_time
            return True, response_time
        except Exception as e:
            response_time = time.time() - start_time
            print(f"Query failed after {response_time:.2f}s: {e}")
            return False, response_time
    
    async def run_concurrent_load_test(
        self,
        concurrent_users: int,
        queries_per_user: int,
        ramp_up_time: float = 0.0
    ) -> LoadTestResult:
        """Run a concurrent load test with specified parameters."""
        print(f"\\n🔥 Starting load test: {concurrent_users} users, {queries_per_user} queries each")
        
        # Create test queries
        all_queries = self.create_test_queries(concurrent_users * queries_per_user)
        
        # Results tracking
        results = []
        start_time = time.time()
        
        # Create semaphore to limit concurrent connections
        semaphore = asyncio.Semaphore(concurrent_users)
        
        async def user_session(user_id: int, user_queries: List[QueryRequest]):
            """Simulate a single user's session."""
            async with semaphore:
                # Ramp up delay
                if ramp_up_time > 0:
                    delay = (user_id * ramp_up_time) / concurrent_users
                    await asyncio.sleep(delay)
                
                # Execute user's queries
                user_results = []
                for i, query in enumerate(user_queries):
                    success, response_time = await self.execute_single_query(
                        query, f"user_{user_id}_query_{i}"
                    )
                    user_results.append((success, response_time))
                
                return user_results
        
        # Create user session tasks
        user_tasks = []
        for user_id in range(concurrent_users):
            user_start_idx = user_id * queries_per_user
            user_end_idx = user_start_idx + queries_per_user
            user_queries = all_queries[user_start_idx:user_end_idx]
            
            task = asyncio.create_task(user_session(user_id, user_queries))
            user_tasks.append(task)
        
        # Execute all user sessions
        user_results = await asyncio.gather(*user_tasks, return_exceptions=True)
        
        total_duration = time.time() - start_time
        
        # Aggregate results
        all_response_times = []
        successful_requests = 0
        total_requests = 0
        
        for user_result in user_results:
            if isinstance(user_result, Exception):
                print(f"User session failed: {user_result}")
                continue
            
            for success, response_time in user_result:
                total_requests += 1
                all_response_times.append(response_time)
                if success:
                    successful_requests += 1
        
        failed_requests = total_requests - successful_requests
        
        # Calculate statistics
        if all_response_times:
            avg_response_time = statistics.mean(all_response_times)
            all_response_times.sort()
            p95_response_time = all_response_times[int(0.95 * len(all_response_times))]
            p99_response_time = all_response_times[int(0.99 * len(all_response_times))]
        else:
            avg_response_time = p95_response_time = p99_response_time = 0.0
        
        requests_per_second = total_requests / total_duration if total_duration > 0 else 0.0
        success_rate = (successful_requests / total_requests * 100) if total_requests > 0 else 0.0
        
        return LoadTestResult(
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time=avg_response_time,
            p95_response_time=p95_response_time,
            p99_response_time=p99_response_time,
            requests_per_second=requests_per_second,
            total_duration=total_duration,
            success_rate=success_rate
        )
    
    def print_load_test_results(self, result: LoadTestResult, test_name: str):
        """Print formatted load test results."""
        print(f"\\n📊 {test_name} Results:")
        print(f"├── Total Requests: {result.total_requests}")
        print(f"├── Successful: {result.successful_requests}")
        print(f"├── Failed: {result.failed_requests}")
        print(f"├── Success Rate: {result.success_rate:.1f}%")
        print(f"├── Duration: {result.total_duration:.2f}s")
        print(f"├── Requests/sec: {result.requests_per_second:.2f}")
        print(f"├── Avg Response Time: {result.avg_response_time:.2f}s")
        print(f"├── P95 Response Time: {result.p95_response_time:.2f}s")
        print(f"└── P99 Response Time: {result.p99_response_time:.2f}s")


class TestLoadTesting:
    """Load testing test cases."""
    
    @pytest.fixture(autouse=True)
    async def setup_load_tester(self):
        """Set up load tester for each test."""
        self.load_tester = LoadTester()
        
        # Mock file service for all tests
        test_file_content = {
            "elements": [
                {
                    "id": f"element_{i}",
                    "type": "IfcWall",
                    "properties": {"height": 3.0, "material": "Concrete"}
                }
                for i in range(100)  # Small test file for faster processing
            ]
        }
        
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(test_file_content, temp_file)
        temp_file.close()
        self.test_file_path = temp_file.name
        
        mock_file_service = AsyncMock()
        mock_file_service.get_file_status.return_value = {
            "status": "uploaded",
            "file_path": self.test_file_path
        }
        self.load_tester.query_service.file_service = mock_file_service
        
        await self.load_tester.setup()
        
        yield
        
        # Cleanup
        await self.load_tester.cleanup()
        Path(self.test_file_path).unlink()
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_baseline_single_user(self):
        """Test baseline performance with single user."""
        result = await self.load_tester.run_concurrent_load_test(
            concurrent_users=1,
            queries_per_user=5
        )
        
        self.load_tester.print_load_test_results(result, "Baseline Single User")
        
        # Assertions for baseline performance
        assert result.success_rate >= 95.0, f"Success rate {result.success_rate}% below 95%"
        assert result.avg_response_time < 30.0, f"Average response time {result.avg_response_time}s above 30s"
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_moderate_concurrent_load(self):
        """Test moderate concurrent load (10 users)."""
        result = await self.load_tester.run_concurrent_load_test(
            concurrent_users=10,
            queries_per_user=3,
            ramp_up_time=2.0
        )
        
        self.load_tester.print_load_test_results(result, "Moderate Concurrent Load (10 Users)")
        
        # Assertions for moderate load
        assert result.success_rate >= 90.0, f"Success rate {result.success_rate}% below 90%"
        assert result.avg_response_time < 45.0, f"Average response time {result.avg_response_time}s above 45s"
        assert result.requests_per_second > 0.5, f"Throughput {result.requests_per_second} RPS too low"
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_high_concurrent_load(self):
        """Test high concurrent load (50 users) - Issue #8 requirement."""
        result = await self.load_tester.run_concurrent_load_test(
            concurrent_users=50,
            queries_per_user=2,
            ramp_up_time=10.0
        )
        
        self.load_tester.print_load_test_results(result, "High Concurrent Load (50 Users)")
        
        # Assertions for high load (Issue #8 requirements)
        assert result.success_rate >= 85.0, f"Success rate {result.success_rate}% below 85%"
        assert result.avg_response_time < 60.0, f"Average response time {result.avg_response_time}s above 60s"
        assert result.p95_response_time < 120.0, f"P95 response time {result.p95_response_time}s above 120s"
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_stress_load(self):
        """Test stress load beyond normal capacity (100 users)."""
        result = await self.load_tester.run_concurrent_load_test(
            concurrent_users=100,
            queries_per_user=1,
            ramp_up_time=15.0
        )
        
        self.load_tester.print_load_test_results(result, "Stress Load (100 Users)")
        
        # Assertions for stress testing (more lenient)
        assert result.success_rate >= 70.0, f"Success rate {result.success_rate}% below 70%"
        assert result.p99_response_time < 300.0, f"P99 response time {result.p99_response_time}s above 300s"
        
        # Print stress test insights
        if result.success_rate < 85.0:
            print(f"⚠️  Stress test showed degradation at 100 users (success rate: {result.success_rate:.1f}%)")
        else:
            print(f"✅ System handled stress load well (success rate: {result.success_rate:.1f}%)")
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_cache_effectiveness_under_load(self):
        """Test cache effectiveness under concurrent load."""
        # First, run a load test that should populate the cache
        print("\\n🔥 Phase 1: Populating cache with initial load")
        initial_result = await self.load_tester.run_concurrent_load_test(
            concurrent_users=20,
            queries_per_user=2,
            ramp_up_time=2.0
        )
        
        # Wait a moment for cache to settle
        await asyncio.sleep(1.0)
        
        # Run the same load test again (should hit cache)
        print("\\n🔥 Phase 2: Testing cached responses under load")
        cached_result = await self.load_tester.run_concurrent_load_test(
            concurrent_users=20,
            queries_per_user=2,
            ramp_up_time=2.0
        )
        
        self.load_tester.print_load_test_results(initial_result, "Initial Load (Cache Miss)")
        self.load_tester.print_load_test_results(cached_result, "Cached Load (Cache Hit)")
        
        # Calculate cache effectiveness
        cache_speedup = initial_result.avg_response_time / cached_result.avg_response_time if cached_result.avg_response_time > 0 else 1.0
        throughput_improvement = cached_result.requests_per_second / initial_result.requests_per_second if initial_result.requests_per_second > 0 else 1.0
        
        print(f"\\n📈 Cache Effectiveness:")
        print(f"├── Response Time Speedup: {cache_speedup:.2f}x")
        print(f"└── Throughput Improvement: {throughput_improvement:.2f}x")
        
        # Assertions for cache effectiveness
        assert cache_speedup > 2.0, f"Cache speedup only {cache_speedup:.2f}x, expected >2x"
        assert cached_result.success_rate >= initial_result.success_rate, "Cache should not reduce success rate"


# Standalone runner for load testing
async def run_comprehensive_load_tests():
    """Run all load tests comprehensively."""
    print("🚀 Starting Comprehensive Load Testing Suite\\n")
    
    load_tester = LoadTester()
    
    # Create test file
    test_file_content = {
        "elements": [
            {"id": f"element_{i}", "type": "IfcWall", "properties": {"height": 3.0}}
            for i in range(100)
        ]
    }
    
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(test_file_content, temp_file)
    temp_file.close()
    
    # Mock file service
    mock_file_service = AsyncMock()
    mock_file_service.get_file_status.return_value = {
        "status": "uploaded",
        "file_path": temp_file.name
    }
    load_tester.query_service.file_service = mock_file_service
    
    await load_tester.setup()
    
    try:
        # Run load test progression
        test_scenarios = [
            (1, 5, 0.0, "Baseline"),
            (5, 3, 1.0, "Light Load"),
            (10, 3, 2.0, "Moderate Load"),
            (25, 2, 5.0, "Heavy Load"),
            (50, 2, 10.0, "Peak Load (Issue #8)"),
            (75, 1, 15.0, "Stress Test")
        ]
        
        all_results = []
        
        for users, queries, ramp_up, name in test_scenarios:
            print(f"\\n{'='*60}")
            print(f"🔥 Running {name}: {users} users, {queries} queries each")
            print(f"{'='*60}")
            
            result = await load_tester.run_concurrent_load_test(
                concurrent_users=users,
                queries_per_user=queries,
                ramp_up_time=ramp_up
            )
            
            load_tester.print_load_test_results(result, name)
            all_results.append((name, result))
            
            # Brief pause between tests
            await asyncio.sleep(2.0)
        
        # Print summary
        print(f"\\n{'='*60}")
        print("📊 LOAD TESTING SUMMARY")
        print(f"{'='*60}")
        
        for name, result in all_results:
            status = "✅" if result.success_rate >= 85.0 else "⚠️" if result.success_rate >= 70.0 else "❌"
            print(f"{status} {name:<20} | Success: {result.success_rate:5.1f}% | Avg: {result.avg_response_time:6.2f}s | RPS: {result.requests_per_second:5.2f}")
        
        print(f"\\n🎯 Issue #8 Validation:")
        peak_load_result = next(result for name, result in all_results if "Peak Load" in name)
        if peak_load_result.success_rate >= 85.0:
            print("✅ System successfully handles 50+ concurrent users")
        else:
            print(f"⚠️  System shows degradation at 50 users ({peak_load_result.success_rate:.1f}% success rate)")
    
    finally:
        await load_tester.cleanup()
        Path(temp_file.name).unlink()


if __name__ == "__main__":
    # Run comprehensive load tests
    asyncio.run(run_comprehensive_load_tests())