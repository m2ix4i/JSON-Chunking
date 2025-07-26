"""
Comprehensive unit tests for LLM integration components.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from typing import List, Dict, Any
import json

from src.ifc_json_chunking.llm.gemini_client import GeminiClient
from src.ifc_json_chunking.llm.chunk_processor import ChunkProcessor
from src.ifc_json_chunking.llm.rate_limiter import RateLimiter
from src.ifc_json_chunking.llm.types import (
    ProcessingRequest,
    ProcessingResponse,
    ProcessingStatus,
    LLMConfig,
    ErrorType
)
from src.ifc_json_chunking.models import Chunk, ChunkType
from src.ifc_json_chunking.config import Config
from src.ifc_json_chunking.exceptions import LLMError, RateLimitError


class TestGeminiClient:
    """Test cases for GeminiClient."""

    @pytest.fixture
    def config(self):
        """Create test configuration."""
        return Config(
            gemini_api_key="test_api_key",
            target_llm_model="gemini-2.5-pro",
            max_concurrent_requests=5,
            request_timeout_seconds=30,
            max_retries=3
        )

    @pytest.fixture
    def gemini_client(self, config):
        """Create GeminiClient instance."""
        return GeminiClient(config)

    @pytest.fixture
    def sample_processing_request(self):
        """Create sample processing request."""
        chunk = Chunk(
            chunk_id="test_chunk_001",
            sequence_number=0,
            json_path="building.elements[0]",
            chunk_type=ChunkType.SEMANTIC,
            data={"walls": [{"material": "concrete", "area": 25.5}]},
            size_bytes=100,
            created_timestamp=1640995200.0
        )
        
        return ProcessingRequest(
            request_id="req_001",
            chunk=chunk,
            query="How much concrete is used?",
            intent="quantity",
            context={"building_type": "office"},
            max_tokens=1000,
            temperature=0.1
        )

    def test_gemini_client_initialization(self, config):
        """Test GeminiClient initialization."""
        client = GeminiClient(config)
        assert client.config == config
        assert client.api_key == "test_api_key"
        assert client.model_name == "gemini-2.5-pro"
        assert client.max_concurrent_requests == 5

    def test_gemini_client_without_api_key(self):
        """Test GeminiClient initialization without API key."""
        config = Config()  # No API key set
        with pytest.raises(LLMError, match="API key.*required"):
            GeminiClient(config)

    @pytest.mark.asyncio
    async def test_process_request_success(self, gemini_client, sample_processing_request):
        """Test successful request processing."""
        # Mock the Google Generative AI client
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_model_class.return_value = mock_model
            
            # Mock response
            mock_response = Mock()
            mock_response.text = "Found 25.5 square meters of concrete walls."
            mock_response.usage_metadata.prompt_token_count = 150
            mock_response.usage_metadata.candidates_token_count = 20
            
            mock_model.generate_content_async = AsyncMock(return_value=mock_response)
            
            # Process request
            response = await gemini_client.process_request(sample_processing_request)
            
            # Verify response
            assert response.request_id == "req_001"
            assert response.status == ProcessingStatus.COMPLETED
            assert "25.5" in response.content
            assert "concrete" in response.content.lower()
            assert response.tokens_used == 170  # prompt + candidates
            assert response.model == "gemini-2.5-pro"
            assert response.processing_time > 0

    @pytest.mark.asyncio
    async def test_process_request_api_error(self, gemini_client, sample_processing_request):
        """Test request processing with API error."""
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_model_class.return_value = mock_model
            
            # Mock API error
            mock_model.generate_content_async = AsyncMock(
                side_effect=Exception("API quota exceeded")
            )
            
            response = await gemini_client.process_request(sample_processing_request)
            
            # Verify error response
            assert response.request_id == "req_001"
            assert response.status == ProcessingStatus.FAILED
            assert "API quota exceeded" in response.error_message
            assert response.error_type == ErrorType.API_ERROR

    @pytest.mark.asyncio
    async def test_process_request_timeout(self, gemini_client, sample_processing_request):
        """Test request processing with timeout."""
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_model_class.return_value = mock_model
            
            # Mock timeout
            mock_model.generate_content_async = AsyncMock(
                side_effect=asyncio.TimeoutError("Request timed out")
            )
            
            response = await gemini_client.process_request(sample_processing_request)
            
            # Verify timeout response
            assert response.status == ProcessingStatus.FAILED
            assert response.error_type == ErrorType.TIMEOUT
            assert "timeout" in response.error_message.lower()

    @pytest.mark.asyncio
    async def test_process_batch_requests(self, gemini_client):
        """Test batch processing of multiple requests."""
        # Create multiple requests
        requests = []
        for i in range(3):
            chunk = Chunk(
                chunk_id=f"chunk_{i:03d}",
                sequence_number=i,
                json_path=f"elements[{i}]",
                chunk_type=ChunkType.GENERAL,
                data={"element": f"test_{i}"},
                size_bytes=50,
                created_timestamp=1640995200.0
            )
            
            request = ProcessingRequest(
                request_id=f"req_{i:03d}",
                chunk=chunk,
                query="Test query",
                intent="component"
            )
            requests.append(request)
        
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_model_class.return_value = mock_model
            
            # Mock successful responses
            mock_model.generate_content_async = AsyncMock(
                return_value=Mock(
                    text="Test response",
                    usage_metadata=Mock(
                        prompt_token_count=100,
                        candidates_token_count=20
                    )
                )
            )
            
            responses = await gemini_client.process_batch(requests)
            
            # Verify batch processing
            assert len(responses) == 3
            for i, response in enumerate(responses):
                assert response.request_id == f"req_{i:03d}"
                assert response.status == ProcessingStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_health_check_success(self, gemini_client):
        """Test successful health check."""
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_model_class.return_value = mock_model
            
            mock_model.generate_content_async = AsyncMock(
                return_value=Mock(text="Health check successful")
            )
            
            health = await gemini_client.health_check()
            
            assert health["overall"] is True
            assert health["api_accessible"] is True
            assert "response_time_ms" in health

    @pytest.mark.asyncio
    async def test_health_check_failure(self, gemini_client):
        """Test health check failure."""
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_model_class.return_value = mock_model
            
            mock_model.generate_content_async = AsyncMock(
                side_effect=Exception("API unavailable")
            )
            
            health = await gemini_client.health_check()
            
            assert health["overall"] is False
            assert health["api_accessible"] is False
            assert "API unavailable" in health["error"]


class TestChunkProcessor:
    """Test cases for ChunkProcessor."""

    @pytest.fixture
    def config(self):
        """Create test configuration."""
        return Config(
            gemini_api_key="test_api_key",
            max_concurrent_requests=3,
            chunk_batch_size=5
        )

    @pytest.fixture
    def mock_gemini_client(self):
        """Create mock Gemini client."""
        client = Mock()
        client.process_request = AsyncMock()
        client.process_batch = AsyncMock()
        client.health_check = AsyncMock(return_value={"overall": True})
        client.close = AsyncMock()
        return client

    @pytest.fixture
    def chunk_processor(self, config, mock_gemini_client):
        """Create ChunkProcessor instance."""
        return ChunkProcessor(config, llm_client=mock_gemini_client)

    @pytest.fixture
    def sample_chunks(self):
        """Create sample chunks."""
        return [
            Chunk(
                chunk_id=f"chunk_{i:03d}",
                sequence_number=i,
                json_path=f"building.floor_{i}",
                chunk_type=ChunkType.SEMANTIC,
                data={"rooms": [f"room_{j}" for j in range(3)]},
                size_bytes=200,
                created_timestamp=1640995200.0 + i
            )
            for i in range(5)
        ]

    def test_chunk_processor_initialization(self, config, mock_gemini_client):
        """Test ChunkProcessor initialization."""
        processor = ChunkProcessor(config, llm_client=mock_gemini_client)
        assert processor.config == config
        assert processor.llm_client == mock_gemini_client
        assert processor.max_concurrent_requests == 3

    @pytest.mark.asyncio
    async def test_process_chunks_success(self, chunk_processor, sample_chunks, mock_gemini_client):
        """Test successful chunk processing."""
        # Mock successful responses
        mock_responses = [
            ProcessingResponse(
                request_id=f"req_{i:03d}",
                content=f"Processed chunk {i}",
                status=ProcessingStatus.COMPLETED,
                tokens_used=100,
                processing_time=1.0,
                model="gemini-2.5-pro"
            )
            for i in range(5)
        ]
        
        mock_gemini_client.process_batch.return_value = mock_responses
        
        # Process chunks
        result = await chunk_processor.process_chunks(
            chunks=sample_chunks,
            query="Count the rooms",
            intent="quantity"
        )
        
        # Verify result
        assert len(result.responses) == 5
        assert all(r.status == ProcessingStatus.COMPLETED for r in result.responses)
        assert result.total_tokens_used == 500  # 5 * 100
        assert result.total_processing_time >= 0
        assert result.success_rate == 1.0

    @pytest.mark.asyncio
    async def test_process_chunks_with_failures(self, chunk_processor, sample_chunks, mock_gemini_client):
        """Test chunk processing with some failures."""
        # Mix of successful and failed responses
        mock_responses = [
            ProcessingResponse(
                request_id="req_000",
                content="Success",
                status=ProcessingStatus.COMPLETED,
                tokens_used=100,
                processing_time=1.0,
                model="gemini-2.5-pro"
            ),
            ProcessingResponse(
                request_id="req_001",
                content="",
                status=ProcessingStatus.FAILED,
                error_message="Processing failed",
                error_type=ErrorType.PROCESSING_ERROR,
                tokens_used=0,
                processing_time=0.5,
                model="gemini-2.5-pro"
            ),
            ProcessingResponse(
                request_id="req_002",
                content="Success",
                status=ProcessingStatus.COMPLETED,
                tokens_used=100,
                processing_time=1.0,
                model="gemini-2.5-pro"
            )
        ]
        
        mock_gemini_client.process_batch.return_value = mock_responses
        
        result = await chunk_processor.process_chunks(
            chunks=sample_chunks[:3],
            query="Test query",
            intent="component"
        )
        
        # Verify mixed results
        assert len(result.responses) == 3
        assert result.success_rate == 2/3  # 2 successful out of 3
        assert result.total_tokens_used == 200  # Only successful requests

    @pytest.mark.asyncio
    async def test_process_chunks_with_progress_callback(self, chunk_processor, sample_chunks, mock_gemini_client):
        """Test chunk processing with progress callback."""
        progress_events = []
        
        def progress_callback(event):
            progress_events.append(event)
        
        # Mock successful responses
        mock_responses = [
            ProcessingResponse(
                request_id=f"req_{i:03d}",
                content=f"Response {i}",
                status=ProcessingStatus.COMPLETED,
                tokens_used=50,
                processing_time=0.5,
                model="gemini-2.5-pro"
            )
            for i in range(3)
        ]
        
        mock_gemini_client.process_batch.return_value = mock_responses
        
        await chunk_processor.process_chunks(
            chunks=sample_chunks[:3],
            query="Test query",
            intent="material",
            progress_callback=progress_callback
        )
        
        # Verify progress callbacks
        assert len(progress_events) >= 2  # At least start and completion
        assert progress_events[0]["type"] == "started"
        assert progress_events[-1]["type"] == "completed"

    @pytest.mark.asyncio
    async def test_health_check(self, chunk_processor, mock_gemini_client):
        """Test health check."""
        mock_gemini_client.health_check.return_value = {
            "overall": True,
            "api_accessible": True,
            "response_time_ms": 150
        }
        
        health = await chunk_processor.health_check()
        
        assert health["overall"] is True
        assert "llm_client" in health
        assert health["llm_client"]["overall"] is True

    @pytest.mark.asyncio
    async def test_close(self, chunk_processor, mock_gemini_client):
        """Test cleanup."""
        await chunk_processor.close()
        mock_gemini_client.close.assert_called_once()


class TestRateLimiter:
    """Test cases for RateLimiter."""

    @pytest.fixture
    def rate_limiter(self):
        """Create RateLimiter instance."""
        return RateLimiter(
            requests_per_minute=60,
            requests_per_hour=1000,
            tokens_per_minute=50000
        )

    def test_rate_limiter_initialization(self):
        """Test RateLimiter initialization."""
        limiter = RateLimiter(
            requests_per_minute=100,
            requests_per_hour=2000,
            tokens_per_minute=100000
        )
        
        assert limiter.requests_per_minute == 100
        assert limiter.requests_per_hour == 2000
        assert limiter.tokens_per_minute == 100000

    @pytest.mark.asyncio
    async def test_acquire_request_permission_success(self, rate_limiter):
        """Test successful request permission acquisition."""
        # Should succeed for first request
        result = await rate_limiter.acquire_request_permission(tokens=1000)
        assert result is True

    @pytest.mark.asyncio
    async def test_acquire_request_permission_rate_limit(self, rate_limiter):
        """Test request permission with rate limiting."""
        # Fill up the rate limit
        for _ in range(60):  # requests_per_minute limit
            await rate_limiter.acquire_request_permission(tokens=100)
        
        # Next request should be rate limited
        with pytest.raises(RateLimitError):
            await rate_limiter.acquire_request_permission(tokens=100)

    @pytest.mark.asyncio
    async def test_acquire_request_permission_token_limit(self, rate_limiter):
        """Test request permission with token limits."""
        # Try to exceed token limit
        with pytest.raises(RateLimitError, match="token.*limit"):
            await rate_limiter.acquire_request_permission(tokens=60000)  # Exceeds 50000 limit

    def test_check_limits_within_bounds(self, rate_limiter):
        """Test limit checking within bounds."""
        # Should not raise for reasonable request
        rate_limiter.check_limits(tokens=1000)

    def test_check_limits_exceeds_tokens(self, rate_limiter):
        """Test limit checking when exceeding token limits."""
        with pytest.raises(RateLimitError, match="token.*limit"):
            rate_limiter.check_limits(tokens=60000)

    def test_reset_counters(self, rate_limiter):
        """Test counter reset functionality."""
        # Simulate some usage
        rate_limiter._request_count_minute = 30
        rate_limiter._token_count_minute = 25000
        
        # Reset counters
        rate_limiter.reset_counters()
        
        assert rate_limiter._request_count_minute == 0
        assert rate_limiter._token_count_minute == 0

    def test_get_usage_stats(self, rate_limiter):
        """Test usage statistics."""
        # Simulate some usage
        rate_limiter._request_count_minute = 25
        rate_limiter._request_count_hour = 150
        rate_limiter._token_count_minute = 12500
        
        stats = rate_limiter.get_usage_stats()
        
        assert stats["requests_per_minute"]["current"] == 25
        assert stats["requests_per_minute"]["limit"] == 60
        assert stats["requests_per_hour"]["current"] == 150
        assert stats["requests_per_hour"]["limit"] == 1000
        assert stats["tokens_per_minute"]["current"] == 12500
        assert stats["tokens_per_minute"]["limit"] == 50000

    @pytest.mark.asyncio
    async def test_wait_for_availability(self, rate_limiter):
        """Test waiting for availability."""
        # This test verifies the wait mechanism without actually waiting
        # In a real scenario, this would test timing behavior
        
        # Fill up minute limit
        rate_limiter._request_count_minute = 60
        
        # Should wait and then succeed
        # For testing, we'll mock the time to avoid actual waiting
        with patch('time.time') as mock_time:
            mock_time.side_effect = [1000, 1000, 1061]  # Second call shows minute passed
            
            result = await rate_limiter.acquire_request_permission(tokens=100)
            assert result is True

    def test_calculate_wait_time(self, rate_limiter):
        """Test wait time calculation."""
        # Simulate being at request limit
        rate_limiter._request_count_minute = 60
        rate_limiter._last_minute_reset = 1000
        
        with patch('time.time', return_value=1030):  # 30 seconds later
            wait_time = rate_limiter._calculate_wait_time()
            assert wait_time == 30  # Should wait 30 more seconds for minute reset


class TestLLMIntegration:
    """Integration tests for LLM components."""

    @pytest.mark.asyncio
    async def test_end_to_end_processing(self):
        """Test end-to-end LLM processing pipeline."""
        config = Config(
            gemini_api_key="test_key",
            max_concurrent_requests=2,
            chunk_batch_size=3
        )
        
        # Create sample chunks
        chunks = [
            Chunk(
                chunk_id=f"integration_chunk_{i}",
                sequence_number=i,
                json_path=f"building.floor_{i}",
                chunk_type=ChunkType.SEMANTIC,
                data={"elements": [{"type": "wall", "material": "concrete"}]},
                size_bytes=150,
                created_timestamp=1640995200.0
            )
            for i in range(2)
        ]
        
        # Mock the entire processing chain
        with patch('src.ifc_json_chunking.llm.chunk_processor.GeminiClient') as mock_client_class:
            mock_client = Mock()
            mock_client_class.return_value = mock_client
            
            # Mock successful processing
            mock_client.process_batch = AsyncMock(return_value=[
                ProcessingResponse(
                    request_id="integration_req_0",
                    content="Found concrete wall elements",
                    status=ProcessingStatus.COMPLETED,
                    tokens_used=200,
                    processing_time=1.5,
                    model="gemini-2.5-pro"
                ),
                ProcessingResponse(
                    request_id="integration_req_1",
                    content="Additional concrete elements detected",
                    status=ProcessingStatus.COMPLETED,
                    tokens_used=180,
                    processing_time=1.3,
                    model="gemini-2.5-pro"
                )
            ])
            
            mock_client.health_check = AsyncMock(return_value={"overall": True})
            mock_client.close = AsyncMock()
            
            # Process through ChunkProcessor
            processor = ChunkProcessor(config)
            result = await processor.process_chunks(
                chunks=chunks,
                query="How much concrete is used?",
                intent="quantity"
            )
            
            # Verify integration
            assert len(result.responses) == 2
            assert all(r.status == ProcessingStatus.COMPLETED for r in result.responses)
            assert result.total_tokens_used == 380
            assert result.success_rate == 1.0
            assert "concrete" in " ".join(r.content for r in result.responses).lower()
            
            # Cleanup
            await processor.close()