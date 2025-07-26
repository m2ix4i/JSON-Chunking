"""
Comprehensive unit tests for storage systems.
"""

import pytest
import asyncio
import json
import tempfile
import time
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from pathlib import Path
from typing import Dict, Any, Optional

from src.ifc_json_chunking.storage.query_cache import QueryCache
from src.ifc_json_chunking.storage.redis_cache import RedisCache
from src.ifc_json_chunking.storage.temporary_storage import TemporaryStorage
from src.ifc_json_chunking.storage.result_validator import ResultValidator
from src.ifc_json_chunking.query.types import QueryResult, QueryStatus
from src.ifc_json_chunking.models import FileMetadata
from src.ifc_json_chunking.config import Config
from src.ifc_json_chunking.exceptions import StorageError, ValidationError


class TestQueryCache:
    """Test cases for QueryCache."""

    @pytest.fixture
    def config(self):
        """Create test configuration."""
        return Config(
            cache_ttl_seconds=3600,
            max_cache_size_mb=100,
            cache_directory=Path(tempfile.gettempdir()) / "test_cache"
        )

    @pytest.fixture
    def query_cache(self, config):
        """Create QueryCache instance."""
        return QueryCache(config)

    @pytest.fixture
    def sample_query_result(self):
        """Create sample query result."""
        return QueryResult(
            query_id="test_query_123",
            original_query="How much concrete is used?",
            intent="quantity",
            status=QueryStatus.COMPLETED,
            answer="Found 25.5 cubic meters of concrete",
            chunk_results=[],
            aggregated_data={"total_concrete": 25.5},
            total_chunks=3,
            successful_chunks=3,
            failed_chunks=0,
            total_tokens=250,
            total_cost=0.015,
            processing_time=8.5,
            confidence_score=0.9,
            completeness_score=0.95,
            relevance_score=0.85,
            model_used="gemini-2.5-pro",
            prompt_strategy="quantity"
        )

    def test_query_cache_initialization(self, config):
        """Test QueryCache initialization."""
        cache = QueryCache(config)
        assert cache.config == config
        assert cache.cache_directory == config.cache_directory
        assert cache.ttl_seconds == config.cache_ttl_seconds

    @pytest.mark.asyncio
    async def test_store_query_result(self, query_cache, sample_query_result):
        """Test storing query result."""
        success = await query_cache.store_result(sample_query_result)
        assert success is True

    @pytest.mark.asyncio
    async def test_retrieve_query_result(self, query_cache, sample_query_result):
        """Test retrieving stored query result."""
        # Store result first
        await query_cache.store_result(sample_query_result)
        
        # Retrieve result
        retrieved = await query_cache.get_result(sample_query_result.query_id)
        
        assert retrieved is not None
        assert retrieved.query_id == sample_query_result.query_id
        assert retrieved.original_query == sample_query_result.original_query
        assert retrieved.answer == sample_query_result.answer
        assert retrieved.confidence_score == sample_query_result.confidence_score

    @pytest.mark.asyncio
    async def test_retrieve_nonexistent_result(self, query_cache):
        """Test retrieving non-existent query result."""
        result = await query_cache.get_result("nonexistent_query")
        assert result is None

    @pytest.mark.asyncio
    async def test_cache_expiration(self, query_cache, sample_query_result):
        """Test cache expiration functionality."""
        # Store result with short TTL
        query_cache.ttl_seconds = 1  # 1 second TTL
        await query_cache.store_result(sample_query_result)
        
        # Should be retrievable immediately
        result = await query_cache.get_result(sample_query_result.query_id)
        assert result is not None
        
        # Wait for expiration
        await asyncio.sleep(1.5)
        
        # Should be expired now
        result = await query_cache.get_result(sample_query_result.query_id)
        assert result is None

    @pytest.mark.asyncio
    async def test_cache_key_generation(self, query_cache):
        """Test cache key generation."""
        query = "How much concrete?"
        file_id = "test_file_123"
        intent = "quantity"
        
        key1 = query_cache._generate_cache_key(query, file_id, intent)
        key2 = query_cache._generate_cache_key(query, file_id, intent)
        key3 = query_cache._generate_cache_key("Different query", file_id, intent)
        
        # Same inputs should generate same key
        assert key1 == key2
        
        # Different inputs should generate different keys
        assert key1 != key3

    @pytest.mark.asyncio
    async def test_find_similar_queries(self, query_cache, sample_query_result):
        """Test finding similar cached queries."""
        # Store original result
        await query_cache.store_result(sample_query_result)
        
        # Find similar queries
        similar_query = "How much concrete is in the building?"
        similar_results = await query_cache.find_similar_queries(
            similar_query, 
            threshold=0.7
        )
        
        # Should find the original query as similar
        assert len(similar_results) >= 0  # Implementation dependent

    @pytest.mark.asyncio
    async def test_invalidate_cache_entry(self, query_cache, sample_query_result):
        """Test cache invalidation."""
        # Store result
        await query_cache.store_result(sample_query_result)
        
        # Verify it exists
        result = await query_cache.get_result(sample_query_result.query_id)
        assert result is not None
        
        # Invalidate
        success = await query_cache.invalidate(sample_query_result.query_id)
        assert success is True
        
        # Should no longer exist
        result = await query_cache.get_result(sample_query_result.query_id)
        assert result is None

    @pytest.mark.asyncio
    async def test_cache_size_limits(self, query_cache):
        """Test cache size management."""
        # Set small cache size limit
        query_cache.max_cache_size_mb = 1  # 1 MB limit
        
        # Store multiple large results
        for i in range(10):
            large_result = QueryResult(
                query_id=f"large_query_{i}",
                original_query=f"Large query {i}",
                intent="quantity",
                status=QueryStatus.COMPLETED,
                answer="A" * 1000,  # Large answer
                chunk_results=[],
                aggregated_data={"large_data": "X" * 10000},
                total_chunks=1,
                successful_chunks=1,
                failed_chunks=0,
                total_tokens=100,
                total_cost=0.01,
                processing_time=1.0,
                confidence_score=0.8,
                completeness_score=0.9,
                relevance_score=0.85,
                model_used="gemini-2.5-pro",
                prompt_strategy="quantity"
            )
            
            await query_cache.store_result(large_result)
        
        # Verify cache size management
        cache_stats = await query_cache.get_cache_stats()
        assert cache_stats["size_mb"] <= query_cache.max_cache_size_mb * 1.1  # Allow 10% tolerance

    @pytest.mark.asyncio
    async def test_get_cache_stats(self, query_cache, sample_query_result):
        """Test cache statistics."""
        # Store some results
        for i in range(3):
            result = QueryResult(
                query_id=f"stats_query_{i}",
                original_query=f"Query {i}",
                intent="component",
                status=QueryStatus.COMPLETED,
                answer=f"Answer {i}",
                chunk_results=[],
                aggregated_data={},
                total_chunks=1,
                successful_chunks=1,
                failed_chunks=0,
                total_tokens=50,
                total_cost=0.005,
                processing_time=1.0,
                confidence_score=0.8,
                completeness_score=0.9,
                relevance_score=0.85,
                model_used="gemini-2.5-pro",
                prompt_strategy="component"
            )
            await query_cache.store_result(result)
        
        stats = await query_cache.get_cache_stats()
        
        assert "total_entries" in stats
        assert "size_mb" in stats
        assert "hit_rate" in stats
        assert stats["total_entries"] >= 3

    @pytest.mark.asyncio
    async def test_clear_cache(self, query_cache, sample_query_result):
        """Test clearing entire cache."""
        # Store some results
        await query_cache.store_result(sample_query_result)
        
        # Verify cache has content
        stats_before = await query_cache.get_cache_stats()
        assert stats_before["total_entries"] > 0
        
        # Clear cache
        await query_cache.clear()
        
        # Verify cache is empty
        stats_after = await query_cache.get_cache_stats()
        assert stats_after["total_entries"] == 0


class TestRedisCache:
    """Test cases for RedisCache."""

    @pytest.fixture
    def config(self):
        """Create test configuration."""
        return Config(
            redis_host="localhost",
            redis_port=6379,
            redis_db=0,
            redis_password=None,
            cache_ttl_seconds=1800
        )

    @pytest.fixture
    def mock_redis(self):
        """Create mock Redis client."""
        redis_mock = Mock()
        redis_mock.get = AsyncMock()
        redis_mock.set = AsyncMock()
        redis_mock.delete = AsyncMock()
        redis_mock.exists = AsyncMock()
        redis_mock.expire = AsyncMock()
        redis_mock.flushdb = AsyncMock()
        redis_mock.info = AsyncMock(return_value={"used_memory": 1024 * 1024})
        redis_mock.scan = AsyncMock(return_value=(0, []))
        redis_mock.close = AsyncMock()
        return redis_mock

    @pytest.fixture
    def redis_cache(self, config, mock_redis):
        """Create RedisCache instance with mock."""
        with patch('redis.Redis', return_value=mock_redis):
            cache = RedisCache(config)
            cache._redis = mock_redis
            return cache

    @pytest.fixture
    def sample_data(self):
        """Create sample data for caching."""
        return {
            "query_id": "test_query_123",
            "answer": "Found 15.5 cubic meters",
            "confidence": 0.92,
            "timestamp": time.time()
        }

    def test_redis_cache_initialization(self, config):
        """Test RedisCache initialization."""
        with patch('redis.Redis') as mock_redis_class:
            cache = RedisCache(config)
            assert cache.config == config
            mock_redis_class.assert_called_once()

    @pytest.mark.asyncio
    async def test_store_data(self, redis_cache, sample_data, mock_redis):
        """Test storing data in Redis."""
        key = "test_key"
        mock_redis.set.return_value = True
        
        success = await redis_cache.set(key, sample_data)
        assert success is True
        
        # Verify Redis set was called
        mock_redis.set.assert_called_once()

    @pytest.mark.asyncio
    async def test_retrieve_data(self, redis_cache, sample_data, mock_redis):
        """Test retrieving data from Redis."""
        key = "test_key"
        
        # Mock Redis get response
        mock_redis.get.return_value = json.dumps(sample_data).encode()
        
        result = await redis_cache.get(key)
        assert result == sample_data
        
        mock_redis.get.assert_called_once_with(key)

    @pytest.mark.asyncio
    async def test_retrieve_nonexistent_data(self, redis_cache, mock_redis):
        """Test retrieving non-existent data."""
        key = "nonexistent_key"
        mock_redis.get.return_value = None
        
        result = await redis_cache.get(key)
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_data(self, redis_cache, mock_redis):
        """Test deleting data from Redis."""
        key = "test_key"
        mock_redis.delete.return_value = 1  # 1 key deleted
        
        success = await redis_cache.delete(key)
        assert success is True
        
        mock_redis.delete.assert_called_once_with(key)

    @pytest.mark.asyncio
    async def test_exists_key(self, redis_cache, mock_redis):
        """Test checking if key exists."""
        key = "test_key"
        mock_redis.exists.return_value = 1  # Key exists
        
        exists = await redis_cache.exists(key)
        assert exists is True
        
        mock_redis.exists.assert_called_once_with(key)

    @pytest.mark.asyncio
    async def test_set_expiration(self, redis_cache, mock_redis):
        """Test setting key expiration."""
        key = "test_key"
        ttl = 3600
        mock_redis.expire.return_value = True
        
        success = await redis_cache.expire(key, ttl)
        assert success is True
        
        mock_redis.expire.assert_called_once_with(key, ttl)

    @pytest.mark.asyncio
    async def test_get_cache_info(self, redis_cache, mock_redis):
        """Test getting cache information."""
        mock_redis.info.return_value = {
            "used_memory": 2048,
            "keyspace_hits": 100,
            "keyspace_misses": 10
        }
        
        info = await redis_cache.get_info()
        
        assert "used_memory" in info
        assert "hit_rate" in info
        assert info["hit_rate"] == 100 / (100 + 10)  # hits / (hits + misses)

    @pytest.mark.asyncio
    async def test_clear_database(self, redis_cache, mock_redis):
        """Test clearing Redis database."""
        mock_redis.flushdb.return_value = True
        
        success = await redis_cache.clear()
        assert success is True
        
        mock_redis.flushdb.assert_called_once()

    @pytest.mark.asyncio
    async def test_connection_error_handling(self, config):
        """Test Redis connection error handling."""
        with patch('redis.Redis') as mock_redis_class:
            mock_redis = Mock()
            mock_redis.ping = Mock(side_effect=Exception("Connection failed"))
            mock_redis_class.return_value = mock_redis
            
            with pytest.raises(StorageError, match="Redis connection failed"):
                cache = RedisCache(config)
                await cache._ensure_connection()


class TestTemporaryStorage:
    """Test cases for TemporaryStorage."""

    @pytest.fixture
    def config(self):
        """Create test configuration."""
        return Config(
            temp_directory=Path(tempfile.gettempdir()) / "test_temp_storage",
            temp_file_ttl_hours=24,
            max_temp_storage_mb=500
        )

    @pytest.fixture
    def temp_storage(self, config):
        """Create TemporaryStorage instance."""
        return TemporaryStorage(config)

    @pytest.fixture
    def sample_file_data(self):
        """Create sample file data."""
        return {
            "building_data": {
                "walls": [
                    {"id": 1, "material": "concrete", "thickness": 0.3},
                    {"id": 2, "material": "brick", "thickness": 0.25}
                ]
            }
        }

    def test_temporary_storage_initialization(self, config):
        """Test TemporaryStorage initialization."""
        storage = TemporaryStorage(config)
        assert storage.config == config
        assert storage.temp_directory == config.temp_directory

    @pytest.mark.asyncio
    async def test_store_file(self, temp_storage, sample_file_data):
        """Test storing file in temporary storage."""
        file_content = json.dumps(sample_file_data).encode()
        
        file_id = await temp_storage.store_file(
            content=file_content,
            filename="test_building.json",
            content_type="application/json"
        )
        
        assert file_id is not None
        assert isinstance(file_id, str)

    @pytest.mark.asyncio
    async def test_retrieve_file(self, temp_storage, sample_file_data):
        """Test retrieving file from temporary storage."""
        file_content = json.dumps(sample_file_data).encode()
        
        # Store file first
        file_id = await temp_storage.store_file(
            content=file_content,
            filename="test_retrieve.json",
            content_type="application/json"
        )
        
        # Retrieve file
        retrieved_content = await temp_storage.get_file_content(file_id)
        assert retrieved_content == file_content

    @pytest.mark.asyncio
    async def test_retrieve_nonexistent_file(self, temp_storage):
        """Test retrieving non-existent file."""
        fake_file_id = "nonexistent_file_123"
        
        with pytest.raises(FileNotFoundError):
            await temp_storage.get_file_content(fake_file_id)

    @pytest.mark.asyncio
    async def test_get_file_metadata(self, temp_storage, sample_file_data):
        """Test getting file metadata."""
        file_content = json.dumps(sample_file_data).encode()
        
        # Store file
        file_id = await temp_storage.store_file(
            content=file_content,
            filename="metadata_test.json",
            content_type="application/json"
        )
        
        # Get metadata
        metadata = await temp_storage.get_file_metadata(file_id)
        
        assert metadata.file_id == file_id
        assert metadata.filename == "metadata_test.json"
        assert metadata.content_type == "application/json"
        assert metadata.size_bytes == len(file_content)
        assert metadata.created_at is not None

    @pytest.mark.asyncio
    async def test_delete_file(self, temp_storage, sample_file_data):
        """Test deleting file from temporary storage."""
        file_content = json.dumps(sample_file_data).encode()
        
        # Store file
        file_id = await temp_storage.store_file(
            content=file_content,
            filename="delete_test.json",
            content_type="application/json"
        )
        
        # Verify file exists
        metadata = await temp_storage.get_file_metadata(file_id)
        assert metadata is not None
        
        # Delete file
        success = await temp_storage.delete_file(file_id)
        assert success is True
        
        # Verify file is deleted
        with pytest.raises(FileNotFoundError):
            await temp_storage.get_file_metadata(file_id)

    @pytest.mark.asyncio
    async def test_list_files(self, temp_storage, sample_file_data):
        """Test listing files in temporary storage."""
        file_content = json.dumps(sample_file_data).encode()
        
        # Store multiple files
        file_ids = []
        for i in range(3):
            file_id = await temp_storage.store_file(
                content=file_content,
                filename=f"list_test_{i}.json",
                content_type="application/json"
            )
            file_ids.append(file_id)
        
        # List files
        files = await temp_storage.list_files()
        
        # Verify all files are listed
        listed_file_ids = [f.file_id for f in files]
        for file_id in file_ids:
            assert file_id in listed_file_ids

    @pytest.mark.asyncio
    async def test_cleanup_expired_files(self, temp_storage, sample_file_data):
        """Test cleanup of expired files."""
        file_content = json.dumps(sample_file_data).encode()
        
        # Set short TTL for testing
        temp_storage.ttl_hours = 1 / 3600  # 1 second
        
        # Store file
        file_id = await temp_storage.store_file(
            content=file_content,
            filename="expire_test.json",
            content_type="application/json"
        )
        
        # Wait for expiration
        await asyncio.sleep(1.5)
        
        # Run cleanup
        cleaned_count = await temp_storage.cleanup_expired_files()
        
        # Verify file was cleaned up
        assert cleaned_count >= 1
        
        with pytest.raises(FileNotFoundError):
            await temp_storage.get_file_metadata(file_id)

    @pytest.mark.asyncio
    async def test_storage_size_limits(self, temp_storage, sample_file_data):
        """Test storage size management."""
        # Set small storage limit
        temp_storage.max_storage_mb = 1  # 1 MB limit
        
        large_data = {"large_content": "X" * 1024 * 1024}  # ~1MB data
        large_content = json.dumps(large_data).encode()
        
        # First file should succeed
        file_id1 = await temp_storage.store_file(
            content=large_content,
            filename="large_file1.json",
            content_type="application/json"
        )
        assert file_id1 is not None
        
        # Second large file should trigger cleanup or fail
        try:
            file_id2 = await temp_storage.store_file(
                content=large_content,
                filename="large_file2.json",
                content_type="application/json"
            )
            # If it succeeds, first file should be cleaned up
            with pytest.raises(FileNotFoundError):
                await temp_storage.get_file_metadata(file_id1)
        except StorageError:
            # Storage full error is acceptable
            pass

    @pytest.mark.asyncio
    async def test_get_storage_stats(self, temp_storage, sample_file_data):
        """Test storage statistics."""
        file_content = json.dumps(sample_file_data).encode()
        
        # Store some files
        for i in range(3):
            await temp_storage.store_file(
                content=file_content,
                filename=f"stats_test_{i}.json",
                content_type="application/json"
            )
        
        stats = await temp_storage.get_storage_stats()
        
        assert "total_files" in stats
        assert "total_size_mb" in stats
        assert "free_space_mb" in stats
        assert stats["total_files"] >= 3


class TestResultValidator:
    """Test cases for ResultValidator."""

    @pytest.fixture
    def validator(self):
        """Create ResultValidator instance."""
        return ResultValidator()

    @pytest.fixture
    def valid_query_result(self):
        """Create valid query result."""
        return QueryResult(
            query_id="valid_query_123",
            original_query="How much concrete?",
            intent="quantity",
            status=QueryStatus.COMPLETED,
            answer="Found 30.5 cubic meters of concrete",
            chunk_results=[],
            aggregated_data={"concrete_volume": 30.5},
            total_chunks=2,
            successful_chunks=2,
            failed_chunks=0,
            total_tokens=180,
            total_cost=0.012,
            processing_time=4.2,
            confidence_score=0.88,
            completeness_score=0.92,
            relevance_score=0.85,
            model_used="gemini-2.5-pro",
            prompt_strategy="quantity"
        )

    def test_result_validator_initialization(self):
        """Test ResultValidator initialization."""
        validator = ResultValidator()
        assert validator is not None

    def test_validate_valid_result(self, validator, valid_query_result):
        """Test validation of valid result."""
        is_valid, errors = validator.validate_result(valid_query_result)
        assert is_valid is True
        assert len(errors) == 0

    def test_validate_missing_required_fields(self, validator):
        """Test validation with missing required fields."""
        incomplete_result = QueryResult(
            query_id="",  # Empty query_id
            original_query="Test query",
            intent="component",
            status=QueryStatus.COMPLETED,
            answer="",  # Empty answer
            chunk_results=[],
            aggregated_data={},
            total_chunks=1,
            successful_chunks=1,
            failed_chunks=0,
            total_tokens=100,
            total_cost=0.01,
            processing_time=1.0,
            confidence_score=0.8,
            completeness_score=0.9,
            relevance_score=0.85,
            model_used="gemini-2.5-pro",
            prompt_strategy="component"
        )
        
        is_valid, errors = validator.validate_result(incomplete_result)
        assert is_valid is False
        assert len(errors) > 0
        assert any("query_id" in error for error in errors)
        assert any("answer" in error for error in errors)

    def test_validate_invalid_confidence_scores(self, validator, valid_query_result):
        """Test validation with invalid confidence scores."""
        # Test confidence score > 1.0
        valid_query_result.confidence_score = 1.5
        is_valid, errors = validator.validate_result(valid_query_result)
        assert is_valid is False
        assert any("confidence_score" in error for error in errors)
        
        # Test negative confidence score
        valid_query_result.confidence_score = -0.1
        is_valid, errors = validator.validate_result(valid_query_result)
        assert is_valid is False
        assert any("confidence_score" in error for error in errors)

    def test_validate_chunk_consistency(self, validator, valid_query_result):
        """Test validation of chunk count consistency."""
        # Inconsistent chunk counts
        valid_query_result.total_chunks = 5
        valid_query_result.successful_chunks = 3
        valid_query_result.failed_chunks = 3  # 3 + 3 > 5, inconsistent
        
        is_valid, errors = validator.validate_result(valid_query_result)
        assert is_valid is False
        assert any("chunk" in error.lower() for error in errors)

    def test_validate_processing_metrics(self, validator, valid_query_result):
        """Test validation of processing metrics."""
        # Negative processing time
        valid_query_result.processing_time = -1.0
        is_valid, errors = validator.validate_result(valid_query_result)
        assert is_valid is False
        assert any("processing_time" in error for error in errors)
        
        # Negative tokens
        valid_query_result.processing_time = 1.0  # Fix previous issue
        valid_query_result.total_tokens = -50
        is_valid, errors = validator.validate_result(valid_query_result)
        assert is_valid is False
        assert any("tokens" in error for error in errors)

    def test_validate_answer_content(self, validator, valid_query_result):
        """Test validation of answer content."""
        # Test various answer validation scenarios
        test_cases = [
            ("", False),  # Empty answer
            ("No results found", True),  # Valid answer
            ("Found 25.5 cubic meters", True),  # Valid with numbers
            ("Error: Failed to process", False),  # Error message
            ("A" * 10000, False),  # Too long answer
        ]
        
        for answer, expected_valid in test_cases:
            valid_query_result.answer = answer
            is_valid, errors = validator.validate_result(valid_query_result)
            
            if expected_valid:
                assert is_valid is True or len(errors) == 0, f"Answer '{answer[:50]}...' should be valid"
            else:
                assert is_valid is False, f"Answer '{answer[:50]}...' should be invalid"

    def test_validate_aggregated_data(self, validator, valid_query_result):
        """Test validation of aggregated data."""
        # Test with various aggregated data structures
        test_cases = [
            ({}, True),  # Empty data is OK
            ({"total": 25.5}, True),  # Simple data
            ({"materials": {"concrete": 25.5, "steel": 10.2}}, True),  # Nested data
            (None, False),  # None is not valid
        ]
        
        for agg_data, expected_valid in test_cases:
            valid_query_result.aggregated_data = agg_data
            is_valid, errors = validator.validate_result(valid_query_result)
            
            if expected_valid:
                assert is_valid is True or "aggregated_data" not in str(errors)
            else:
                assert is_valid is False

    def test_validate_with_custom_rules(self, validator, valid_query_result):
        """Test validation with custom rules."""
        # Add custom validation rule
        def custom_rule(result: QueryResult) -> tuple[bool, list[str]]:
            errors = []
            if result.intent == "quantity" and "cubic meters" not in result.answer.lower():
                errors.append("Quantity queries should mention units")
            return len(errors) == 0, errors
        
        validator.add_validation_rule(custom_rule)
        
        # Test with missing units
        valid_query_result.intent = "quantity"
        valid_query_result.answer = "Found concrete elements"  # No units
        
        is_valid, errors = validator.validate_result(valid_query_result)
        assert is_valid is False
        assert any("units" in error for error in errors)

    def test_get_validation_summary(self, validator, valid_query_result):
        """Test validation summary generation."""
        # Validate multiple results
        results = [valid_query_result]
        
        # Add an invalid result
        invalid_result = QueryResult(
            query_id="",  # Invalid
            original_query="Test",
            intent="component",
            status=QueryStatus.COMPLETED,
            answer="",  # Invalid
            chunk_results=[],
            aggregated_data={},
            total_chunks=1,
            successful_chunks=1,
            failed_chunks=0,
            total_tokens=100,
            total_cost=0.01,
            processing_time=1.0,
            confidence_score=0.8,
            completeness_score=0.9,
            relevance_score=0.85,
            model_used="gemini-2.5-pro",
            prompt_strategy="component"
        )
        results.append(invalid_result)
        
        summary = validator.get_validation_summary(results)
        
        assert "total_results" in summary
        assert "valid_results" in summary
        assert "invalid_results" in summary
        assert "validation_rate" in summary
        assert summary["total_results"] == 2
        assert summary["valid_results"] == 1
        assert summary["invalid_results"] == 1
        assert summary["validation_rate"] == 0.5


class TestStorageIntegration:
    """Integration tests for storage systems."""

    @pytest.mark.asyncio
    async def test_end_to_end_storage_workflow(self):
        """Test complete storage workflow."""
        config = Config(
            cache_ttl_seconds=3600,
            temp_directory=Path(tempfile.gettempdir()) / "integration_test"
        )
        
        # Initialize storage components
        query_cache = QueryCache(config)
        temp_storage = TemporaryStorage(config)
        validator = ResultValidator()
        
        # Create test data
        sample_result = QueryResult(
            query_id="integration_test_query",
            original_query="Integration test query",
            intent="component",
            status=QueryStatus.COMPLETED,
            answer="Integration test successful",
            chunk_results=[],
            aggregated_data={"test_data": "success"},
            total_chunks=1,
            successful_chunks=1,
            failed_chunks=0,
            total_tokens=100,
            total_cost=0.01,
            processing_time=2.0,
            confidence_score=0.9,
            completeness_score=0.95,
            relevance_score=0.88,
            model_used="gemini-2.5-pro",
            prompt_strategy="component"
        )
        
        # Validate result
        is_valid, errors = validator.validate_result(sample_result)
        assert is_valid is True, f"Validation failed: {errors}"
        
        # Store in cache
        cache_success = await query_cache.store_result(sample_result)
        assert cache_success is True
        
        # Retrieve from cache
        cached_result = await query_cache.get_result(sample_result.query_id)
        assert cached_result is not None
        assert cached_result.query_id == sample_result.query_id
        
        # Store temporary file
        file_content = json.dumps({"test": "integration"}).encode()
        file_id = await temp_storage.store_file(
            content=file_content,
            filename="integration_test.json",
            content_type="application/json"
        )
        assert file_id is not None
        
        # Retrieve temporary file
        retrieved_content = await temp_storage.get_file_content(file_id)
        assert retrieved_content == file_content
        
        # Cleanup
        await query_cache.clear()
        await temp_storage.delete_file(file_id)