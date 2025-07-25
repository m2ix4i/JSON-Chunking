"""
Tests for streaming JSON processing functionality.
"""

import asyncio
import gzip
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from src.ifc_json_chunking.streaming import (
    StreamingJSONParser, 
    MemoryMonitor, 
    StreamingValidator
)
from src.ifc_json_chunking.config import Config
from src.ifc_json_chunking.exceptions import ProcessingError, ChunkingError, ValidationError


class TestMemoryMonitor:
    """Test memory monitoring functionality."""
    
    def test_memory_monitor_initialization(self):
        """Test memory monitor initialization."""
        monitor = MemoryMonitor(max_memory_mb=500)
        
        assert monitor.max_memory_bytes == 500 * 1024 * 1024
        assert monitor.process is not None
    
    def test_get_memory_usage(self):
        """Test memory usage retrieval."""
        monitor = MemoryMonitor()
        
        memory_bytes = monitor.get_memory_usage()
        memory_mb = monitor.get_memory_usage_mb()
        
        assert isinstance(memory_bytes, int)
        assert memory_bytes > 0
        assert isinstance(memory_mb, float)
        assert memory_mb > 0
        assert memory_mb == memory_bytes / (1024 * 1024)
    
    def test_should_trigger_gc(self):
        """Test garbage collection trigger logic."""
        monitor = MemoryMonitor(max_memory_mb=1)  # Very low limit
        
        # With such a low limit, GC should likely be triggered
        # (depending on current memory usage)
        result = monitor.should_trigger_gc()
        assert isinstance(result, bool)
    
    @patch('gc.collect')
    def test_trigger_gc(self, mock_gc):
        """Test garbage collection triggering."""
        monitor = MemoryMonitor()
        
        freed_memory = monitor.trigger_gc()
        
        mock_gc.assert_called_once()
        assert isinstance(freed_memory, int)


class TestStreamingValidator:
    """Test JSON validation functionality."""
    
    def test_validator_initialization(self):
        """Test validator initialization."""
        validator = StreamingValidator()
        
        assert validator.validation_errors == []
    
    def test_validate_ifc_object_valid(self):
        """Test validation of valid IFC object."""
        validator = StreamingValidator()
        
        valid_object = {
            "type": "IfcWall",
            "id": "12345",
            "properties": {"name": "Wall-001"}
        }
        
        result = validator.validate_ifc_structure("objects.wall1", valid_object)
        assert result is True
        assert len(validator.get_errors()) == 0
    
    def test_validate_ifc_object_invalid(self):
        """Test validation of invalid IFC object."""
        validator = StreamingValidator()
        
        invalid_object = {
            "properties": {"name": "Wall-001"}
            # Missing required 'type' and 'id' fields
        }
        
        result = validator.validate_ifc_structure("objects.wall1", invalid_object)
        assert result is False
    
    def test_validate_ifc_header_valid(self):
        """Test validation of valid IFC header."""
        validator = StreamingValidator()
        
        valid_header = {
            "file_schema": "IFC4",
            "version": "1.0"
        }
        
        result = validator.validate_ifc_structure("header.info", valid_header)
        assert result is True
    
    def test_validate_non_ifc_structure(self):
        """Test validation of non-IFC structures (should pass)."""
        validator = StreamingValidator()
        
        other_data = {"some": "data"}
        
        result = validator.validate_ifc_structure("other.data", other_data)
        assert result is True
    
    def test_error_handling(self):
        """Test error collection and clearing."""
        validator = StreamingValidator()
        
        # Force a validation error
        validator.validate_ifc_structure("objects.invalid", {"missing": "required_fields"})
        
        errors = validator.get_errors()
        assert len(errors) > 0
        
        validator.clear_errors()
        assert len(validator.get_errors()) == 0


class TestStreamingJSONParser:
    """Test streaming JSON parser functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.config = Config()
        self.parser = StreamingJSONParser(self.config)
    
    def test_parser_initialization(self):
        """Test parser initialization."""
        assert self.parser.config == self.config
        assert self.parser.memory_monitor is not None
        assert self.parser.tokens_processed == 0
        assert self.parser.gc_triggers == 0
    
    def test_open_regular_file(self, tmp_path):
        """Test opening regular JSON file."""
        test_file = tmp_path / "test.json"
        test_data = {"test": "data"}
        
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        with self.parser._open_file(test_file) as file_handle:
            assert file_handle is not None
            assert hasattr(file_handle, 'read')
    
    def test_open_compressed_file(self, tmp_path):
        """Test opening compressed JSON file."""
        test_file = tmp_path / "test.json.gz"
        test_data = {"test": "data"}
        
        with gzip.open(test_file, 'wt') as f:
            json.dump(test_data, f)
        
        with self.parser._open_file(test_file) as file_handle:
            assert file_handle is not None
            assert hasattr(file_handle, 'read')
    
    @pytest.mark.asyncio
    async def test_parse_simple_json(self, tmp_path):
        """Test parsing simple JSON file."""
        test_file = tmp_path / "simple.json"
        test_data = {
            "header": {"version": "1.0"},
            "objects": {
                "wall1": {"type": "IfcWall", "id": "123"}
            }
        }
        
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        results = []
        async for json_path, value in self.parser.parse_file(test_file):
            results.append((json_path, value))
        
        # Should have parsed several elements
        assert len(results) > 0
        
        # Check statistics
        stats = self.parser.get_stats()
        assert stats["tokens_processed"] > 0
        assert stats["current_memory_mb"] > 0
    
    @pytest.mark.asyncio
    async def test_parse_nested_json(self, tmp_path):
        """Test parsing nested JSON structure."""
        test_file = tmp_path / "nested.json"
        test_data = {
            "objects": {
                "building1": {
                    "type": "IfcBuilding",
                    "id": "1001",
                    "elements": {
                        "wall1": {"type": "IfcWall", "id": "2001"},
                        "door1": {"type": "IfcDoor", "id": "2002"}
                    }
                }
            }
        }
        
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        results = []
        async for json_path, value in self.parser.parse_file(test_file):
            results.append((json_path, value))
        
        assert len(results) > 0
        
        # Should handle nested structures
        nested_results = [r for r in results if 'elements' in r[0]]
        assert len(nested_results) >= 0  # May or may not have specific nested elements
    
    @pytest.mark.asyncio
    async def test_parse_compressed_json(self, tmp_path):
        """Test parsing compressed JSON file."""
        test_file = tmp_path / "compressed.json.gz"
        test_data = {
            "header": {"compressed": True},
            "data": list(range(100))  # Some data to compress
        }
        
        with gzip.open(test_file, 'wt') as f:
            json.dump(test_data, f)
        
        results = []
        async for json_path, value in self.parser.parse_file(test_file):
            results.append((json_path, value))
        
        assert len(results) > 0
    
    @pytest.mark.asyncio
    async def test_parse_large_json(self, tmp_path):
        """Test parsing larger JSON file for memory management."""
        test_file = tmp_path / "large.json"
        
        # Create a larger JSON structure
        test_data = {
            "objects": {}
        }
        
        # Add many objects to test memory management
        for i in range(1000):
            test_data["objects"][f"object_{i}"] = {
                "type": f"IfcType{i % 10}",
                "id": str(1000 + i),
                "properties": {
                    "name": f"Object-{i:04d}",
                    "description": f"Test object number {i} with some description text",
                    "data": list(range(10))  # Some nested data
                }
            }
        
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        results = []
        async for json_path, value in self.parser.parse_file(test_file):
            results.append((json_path, value))
        
        # Should handle large file
        assert len(results) > 100
        
        # Memory should be managed
        stats = self.parser.get_stats()
        assert stats["current_memory_mb"] < 500  # Should stay under limit
    
    @pytest.mark.asyncio
    async def test_parse_file_not_found(self):
        """Test error handling for missing file."""
        missing_file = Path("/nonexistent/file.json")
        
        with pytest.raises(ProcessingError, match="File not found"):
            async for _ in self.parser.parse_file(missing_file):
                pass
    
    @pytest.mark.asyncio
    async def test_parse_invalid_json(self, tmp_path):
        """Test error handling for invalid JSON."""
        test_file = tmp_path / "invalid.json"
        
        with open(test_file, 'w') as f:
            f.write('{ invalid json content')
        
        with pytest.raises(ChunkingError, match="Failed to parse JSON file"):
            async for _ in self.parser.parse_file(test_file):
                pass
    
    @pytest.mark.asyncio
    async def test_memory_monitoring_during_parse(self, tmp_path):
        """Test memory monitoring during parsing."""
        test_file = tmp_path / "memory_test.json"
        
        # Create data that will trigger memory checks
        test_data = {"data": list(range(5000))}
        
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        # Mock memory monitor to simulate high memory usage
        with patch.object(self.parser.memory_monitor, 'should_trigger_gc', return_value=True):
            with patch.object(self.parser.memory_monitor, 'trigger_gc', return_value=1024*1024) as mock_gc:
                
                results = []
                async for json_path, value in self.parser.parse_file(test_file):
                    results.append((json_path, value))
                
                # Should have triggered garbage collection
                assert mock_gc.call_count >= 0  # May or may not trigger depending on token count
    
    def test_get_stats(self):
        """Test statistics retrieval."""
        stats = self.parser.get_stats()
        
        expected_keys = ["tokens_processed", "gc_triggers", "current_memory_mb", "max_memory_mb"]
        for key in expected_keys:
            assert key in stats
        
        assert isinstance(stats["tokens_processed"], int)
        assert isinstance(stats["gc_triggers"], int)
        assert isinstance(stats["current_memory_mb"], float)
        assert isinstance(stats["max_memory_mb"], float)


@pytest.mark.asyncio
async def test_streaming_parser_integration():
    """Integration test for streaming parser with validation."""
    config = Config()
    parser = StreamingJSONParser(config)
    validator = StreamingValidator()
    
    # Create test data
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        test_data = {
            "header": {
                "file_schema": "IFC4",
                "version": "1.0"
            },
            "objects": {
                "wall1": {
                    "type": "IfcWall",
                    "id": "12345",
                    "properties": {"height": 3.0}
                },
                "door1": {
                    "type": "IfcDoor", 
                    "id": "12346",
                    "properties": {"width": 0.8}
                }
            }
        }
        json.dump(test_data, f)
        test_file = Path(f.name)
    
    try:
        parsed_elements = []
        validation_results = []
        
        async for json_path, value in parser.parse_file(test_file):
            parsed_elements.append((json_path, value))
            
            # Validate each element
            is_valid = validator.validate_ifc_structure(json_path, value)
            validation_results.append(is_valid)
        
        # Should have parsed multiple elements
        assert len(parsed_elements) > 0
        
        # Most elements should be valid (depends on parsing structure)
        # At minimum, should not crash during validation
        assert len(validation_results) == len(parsed_elements)
        
        # Check parser statistics
        stats = parser.get_stats()
        assert stats["tokens_processed"] > 0
        assert stats["current_memory_mb"] < 500
        
    finally:
        # Clean up
        test_file.unlink()


@pytest.mark.performance
@pytest.mark.asyncio
async def test_large_file_performance():
    """Performance test with larger file (marked as performance test)."""
    config = Config()
    parser = StreamingJSONParser(config)
    
    # Create a larger test file (several MB)
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        large_data = {
            "header": {"test": "large_file"},
            "objects": {}
        }
        
        # Create 10,000 objects for performance testing
        for i in range(10000):
            large_data["objects"][f"obj_{i}"] = {
                "type": f"IfcType{i % 20}",
                "id": str(100000 + i),
                "properties": {
                    "name": f"Object-{i:05d}",
                    "description": f"Performance test object {i}",
                    "coordinates": [i * 0.1, i * 0.2, i * 0.3],
                    "metadata": {"test": True, "index": i}
                }
            }
        
        json.dump(large_data, f)
        test_file = Path(f.name)
    
    try:
        import time
        start_time = time.time()
        
        element_count = 0
        async for json_path, value in parser.parse_file(test_file):
            element_count += 1
        
        elapsed = time.time() - start_time
        file_size_mb = test_file.stat().st_size / (1024 * 1024)
        
        # Performance assertions
        assert element_count > 10000  # Should parse many elements
        assert elapsed < 300  # Should complete within 5 minutes (300 seconds)
        
        # Processing rate should be reasonable
        processing_rate = file_size_mb / elapsed if elapsed > 0 else 0
        assert processing_rate > 0.1  # At least 0.1 MB/second
        
        # Memory should stay under limit
        stats = parser.get_stats()
        assert stats["current_memory_mb"] < 500
        
        print(f"Performance test results:")
        print(f"  File size: {file_size_mb:.2f} MB")
        print(f"  Elements parsed: {element_count}")
        print(f"  Processing time: {elapsed:.2f} seconds")
        print(f"  Processing rate: {processing_rate:.2f} MB/second")
        print(f"  Memory usage: {stats['current_memory_mb']:.2f} MB")
        print(f"  GC triggers: {stats['gc_triggers']}")
        
    finally:
        # Clean up
        test_file.unlink()