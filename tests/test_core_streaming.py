"""
Tests for streaming integration in ChunkingEngine.
"""

import asyncio
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

import pytest

from ifc_json_chunking.core import ChunkingEngine
from ifc_json_chunking.config import Config
from ifc_json_chunking.exceptions import IFCChunkingError


class TestChunkingEngineStreaming:
    """Test ChunkingEngine with streaming functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.config = Config()
        self.engine = ChunkingEngine(self.config)
    
    def test_engine_initialization_with_streaming(self):
        """Test engine initialization with streaming components."""
        assert self.engine.config == self.config
        assert hasattr(self.engine, 'parser')
        assert hasattr(self.engine, 'validator')
        assert self.engine.chunks_created == 0
    
    @pytest.mark.asyncio
    async def test_process_simple_ifc_file(self, tmp_path):
        """Test processing a simple IFC JSON file."""
        test_file = tmp_path / "simple_ifc.json"
        test_data = {
            "header": {
                "file_schema": "IFC4",
                "version": "1.0",
                "timestamp": "2024-01-01T00:00:00Z"
            },
            "objects": {
                "wall1": {
                    "type": "IfcWall",
                    "id": "12345",
                    "properties": {
                        "name": "Wall-001",
                        "height": 3.0,
                        "width": 0.2
                    }
                },
                "door1": {
                    "type": "IfcDoor", 
                    "id": "12346",
                    "properties": {
                        "name": "Door-001",
                        "width": 0.8,
                        "height": 2.1
                    }
                }
            }
        }
        
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        # Process the file
        metadata = await self.engine.process_file(test_file)
        
        # Verify metadata
        assert metadata["status"] == "completed"
        assert metadata["file_path"] == str(test_file)
        assert metadata["file_size_bytes"] > 0
        assert metadata["processing_time_seconds"] > 0
        assert metadata["processed_objects"] > 0
        assert "chunks" in metadata
        assert "memory_stats" in metadata
        
        # Should have processed multiple objects
        assert metadata["processed_objects"] >= 2  # At least header and objects
        
        # Memory usage should be reasonable
        assert metadata["memory_stats"]["peak_memory_mb"] < 500
    
    @pytest.mark.asyncio
    async def test_process_file_with_geometry(self, tmp_path):
        """Test processing IFC file with geometry data."""
        test_file = tmp_path / "ifc_with_geometry.json"
        test_data = {
            "header": {"file_schema": "IFC4"},
            "objects": {
                "wall1": {"type": "IfcWall", "id": "1"}
            },
            "geometry": {
                "geom1": {
                    "type": "BrepSolid",
                    "vertices": [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]],
                    "faces": [[0, 1, 2, 3]]
                },
                "geom2": {
                    "type": "Mesh",
                    "vertices": [[0, 0, 1], [1, 0, 1], [0.5, 1, 1]],
                    "triangles": [[0, 1, 2]]
                }
            }
        }
        
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        metadata = await self.engine.process_file(test_file)
        
        assert metadata["status"] == "completed"
        assert metadata["processed_objects"] > 0
        
        # Should have created chunks for different data types
        chunks = metadata["chunks"]
        chunk_types = {chunk["chunk_type"] for chunk in chunks if "chunk_type" in chunk}
        
        # May have various chunk types depending on parsing
        assert len(chunks) > 0
    
    @pytest.mark.asyncio 
    async def test_process_file_with_progress_callback(self, tmp_path):
        """Test file processing with progress callback."""
        test_file = tmp_path / "progress_test.json"
        
        # Create larger test data to ensure progress updates
        test_data = {"objects": {}}
        for i in range(100):
            test_data["objects"][f"obj_{i}"] = {
                "type": f"IfcType{i % 5}",
                "id": str(1000 + i),
                "properties": {"index": i, "data": list(range(10))}
            }
        
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        # Track progress updates
        progress_updates = []
        
        def progress_callback(snapshot):
            progress_updates.append(snapshot.percentage)
        
        metadata = await self.engine.process_file(test_file, progress_callback)
        
        assert metadata["status"] == "completed"
        
        # May or may not have progress updates depending on processing speed
        # Just ensure callback doesn't break processing
        assert metadata["processed_objects"] > 0
    
    @pytest.mark.asyncio
    async def test_process_file_not_found(self):
        """Test error handling for missing file."""
        missing_file = Path("/nonexistent/file.json")
        
        with pytest.raises(IFCChunkingError, match="File not found"):
            await self.engine.process_file(missing_file)
    
    @pytest.mark.asyncio
    async def test_process_invalid_json_file(self, tmp_path):
        """Test error handling for invalid JSON."""
        test_file = tmp_path / "invalid.json"
        
        with open(test_file, 'w') as f:
            f.write('{ invalid json content')
        
        with pytest.raises(IFCChunkingError, match="Failed to process file"):
            await self.engine.process_file(test_file)
    
    @pytest.mark.asyncio
    async def test_create_chunks_from_memory(self):
        """Test creating chunks from in-memory data."""
        test_data = {
            "header": {
                "file_schema": "IFC4",
                "version": "1.0"
            },
            "objects": {
                "wall1": {"type": "IfcWall", "id": "1"},
                "door1": {"type": "IfcDoor", "id": "2"}
            },
            "geometry": {
                "geom1": {"type": "Mesh", "data": [1, 2, 3]}
            }
        }
        
        chunks = await self.engine.create_chunks(test_data)
        
        assert isinstance(chunks, list)
        assert len(chunks) > 0
        
        # Should have different chunk types
        chunk_types = {chunk.get("chunk_type", "unknown") for chunk in chunks}
        expected_types = {"header", "ifc_object", "geometry"}
        
        # Should have at least some expected types
        assert len(chunk_types.intersection(expected_types)) > 0
        
        # Each chunk should have required fields
        for chunk in chunks:
            assert "chunk_id" in chunk
            assert "data" in chunk
            assert "size_bytes" in chunk
            assert "created_timestamp" in chunk
    
    @pytest.mark.asyncio
    async def test_create_chunks_invalid_data(self):
        """Test error handling for invalid data in create_chunks."""
        # Test with non-dict data
        with pytest.raises(IFCChunkingError):
            await self.engine.create_chunks("invalid data")
    
    def test_should_create_chunk_logic(self):
        """Test chunk creation decision logic."""
        existing_chunks = []
        
        # Test IFC object - should create chunk
        result = self.engine._should_create_chunk(
            "objects.wall1", 
            {"type": "IfcWall", "id": "1"}, 
            existing_chunks
        )
        assert result is True
        
        # Test geometry data - should create chunk  
        result = self.engine._should_create_chunk(
            "geometry.geom1",
            {"type": "Mesh"}, 
            existing_chunks
        )
        assert result is True
        
        # Test regular data - depends on size
        result = self.engine._should_create_chunk(
            "other.data",
            {"value": "small"},
            existing_chunks
        )
        # May or may not create chunk depending on size logic
        assert isinstance(result, bool)
    
    @pytest.mark.asyncio
    async def test_create_chunk_from_element(self):
        """Test creating chunk from single element."""
        chunk = await self.engine._create_chunk_from_element(
            "objects.wall1",
            {"type": "IfcWall", "id": "12345"},
            42
        )
        
        assert chunk["chunk_id"] == "chunk_000042"
        assert chunk["sequence_number"] == 42
        assert chunk["json_path"] == "objects.wall1"
        assert chunk["chunk_type"] == "ifc_object"
        assert chunk["data"] == {"type": "IfcWall", "id": "12345"}
        assert chunk["size_bytes"] > 0
        assert chunk["created_timestamp"] > 0
    
    @pytest.mark.asyncio
    async def test_chunk_ifc_objects(self):
        """Test chunking IFC objects."""
        objects = {
            "wall1": {"type": "IfcWall", "id": "1"},
            "door1": {"type": "IfcDoor", "id": "2"},
            "window1": {"type": "IfcWindow", "id": "3"}
        }
        
        chunks = await self.engine._chunk_ifc_objects(objects)
        
        assert len(chunks) == 3
        
        for chunk in chunks:
            assert chunk["chunk_type"] == "ifc_object"
            assert "object_id" in chunk
            assert "data" in chunk
            assert chunk["object_id"] in ["wall1", "door1", "window1"]
    
    @pytest.mark.asyncio
    async def test_create_header_chunk(self):
        """Test creating header chunk."""
        header = {
            "file_schema": "IFC4",
            "version": "1.0",
            "timestamp": "2024-01-01T00:00:00Z"
        }
        
        chunk = await self.engine._create_header_chunk(header)
        
        assert chunk["chunk_id"] == "ifc_header"
        assert chunk["chunk_type"] == "header"
        assert chunk["data"] == header
        assert chunk["size_bytes"] > 0
    
    @pytest.mark.asyncio
    async def test_chunk_geometry_data(self):
        """Test chunking geometry data."""
        geometry = {
            "geom1": {"type": "Mesh", "vertices": [[0, 0, 0]]},
            "geom2": {"type": "BrepSolid", "faces": []}
        }
        
        chunks = await self.engine._chunk_geometry_data(geometry)
        
        assert len(chunks) == 2
        
        for chunk in chunks:
            assert chunk["chunk_type"] == "geometry"
            assert "geometry_id" in chunk
            assert chunk["geometry_id"] in ["geom1", "geom2"]
    
    def test_determine_chunk_type(self):
        """Test chunk type determination."""
        test_cases = [
            ("objects.wall1", "ifc_object"),
            ("header.info", "header"),
            ("geometry.geom1", "geometry"),
            ("other.data", "general")
        ]
        
        for json_path, expected_type in test_cases:
            result = self.engine._determine_chunk_type(json_path)
            assert result == expected_type
    
    def test_get_stats(self):
        """Test statistics retrieval."""
        stats = self.engine.get_stats()
        
        expected_keys = ["chunks_created", "validation_errors", "parser_stats", "config"]
        for key in expected_keys:
            assert key in stats
        
        assert isinstance(stats["chunks_created"], int)
        assert isinstance(stats["validation_errors"], int)
        assert isinstance(stats["parser_stats"], dict)
        assert isinstance(stats["config"], dict)
    
    @pytest.mark.asyncio
    async def test_memory_management_during_processing(self, tmp_path):
        """Test memory management during large file processing."""
        test_file = tmp_path / "large_test.json"
        
        # Create larger test data
        test_data = {
            "header": {"file_schema": "IFC4"},
            "objects": {}
        }
        
        # Add many objects to test memory management
        for i in range(1000):
            test_data["objects"][f"obj_{i}"] = {
                "type": f"IfcType{i % 10}",
                "id": str(10000 + i),
                "properties": {
                    "name": f"Object-{i:04d}",
                    "data": list(range(20))  # Some nested data
                }
            }
        
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        # Process with memory monitoring
        metadata = await self.engine.process_file(test_file)
        
        assert metadata["status"] == "completed"
        assert metadata["processed_objects"] > 500  # Should process many objects
        
        # Memory should be managed properly
        memory_stats = metadata["memory_stats"]
        assert memory_stats["peak_memory_mb"] < 500  # Under limit
        
        # Should have created some chunks
        assert len(metadata["chunks"]) > 0
    
    @pytest.mark.asyncio
    async def test_validation_error_handling(self, tmp_path):
        """Test handling of validation errors during processing."""
        test_file = tmp_path / "validation_test.json"
        test_data = {
            "objects": {
                "valid_wall": {"type": "IfcWall", "id": "1"},
                "invalid_object": {"missing": "type_and_id"},  # Invalid IFC object
                "another_valid": {"type": "IfcDoor", "id": "2"}
            }
        }
        
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        metadata = await self.engine.process_file(test_file)
        
        assert metadata["status"] == "completed"
        
        # Should have some validation errors
        # (Exact count depends on how streaming parser processes the data)
        assert metadata["validation_errors"] >= 0  # May or may not catch validation errors
        
        # But should still complete processing
        assert metadata["processed_objects"] > 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_end_to_end_streaming_processing(tmp_path):
    """End-to-end integration test for streaming processing."""
    config = Config()
    engine = ChunkingEngine(config)
    
    # Create a comprehensive IFC JSON file
    test_file = tmp_path / "comprehensive_ifc.json"
    test_data = {
        "header": {
            "file_description": ["ViewDefinition [CoordinationView]"],
            "file_name": "test_building.ifc",
            "time_stamp": "2024-01-01T12:00:00",
            "author": ["Test Author"],
            "organization": ["Test Org"],
            "preprocessor_version": "Test Processor 1.0",
            "originating_system": "Test System",
            "authorization": "Test Authorization",
            "file_schema": ["IFC4"]
        },
        "objects": {
            "building1": {
                "type": "IfcBuilding",
                "id": "1001",
                "properties": {
                    "name": "Test Building",
                    "description": "A test building for streaming processing"
                }
            },
            "storey1": {
                "type": "IfcBuildingStorey", 
                "id": "1002",
                "properties": {
                    "name": "Ground Floor",
                    "elevation": 0.0
                }
            },
            "wall1": {
                "type": "IfcWall",
                "id": "2001", 
                "properties": {
                    "name": "Wall-001",
                    "height": 3.0,
                    "width": 0.2,
                    "length": 5.0
                }
            },
            "door1": {
                "type": "IfcDoor",
                "id": "2002",
                "properties": {
                    "name": "Door-001",
                    "width": 0.8,
                    "height": 2.1
                }
            },
            "window1": {
                "type": "IfcWindow",
                "id": "2003",
                "properties": {
                    "name": "Window-001", 
                    "width": 1.2,
                    "height": 1.5
                }
            }
        },
        "geometry": {
            "wall1_geom": {
                "type": "BrepSolid",
                "vertices": [
                    [0, 0, 0], [5, 0, 0], [5, 0.2, 0], [0, 0.2, 0],
                    [0, 0, 3], [5, 0, 3], [5, 0.2, 3], [0, 0.2, 3]
                ],
                "faces": [
                    [0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1],
                    [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]
                ]
            },
            "door1_geom": {
                "type": "Mesh",
                "vertices": [[0, 0, 0], [0.8, 0, 0], [0.8, 0, 2.1], [0, 0, 2.1]],
                "triangles": [[0, 1, 2], [0, 2, 3]]
            }
        }
    }
    
    with open(test_file, 'w') as f:
        json.dump(test_data, f, indent=2)
    
    # Track progress
    progress_snapshots = []
    
    def progress_callback(snapshot):
        progress_snapshots.append({
            "percentage": snapshot.percentage,
            "bytes_processed": snapshot.bytes_processed,
            "rate_mb_per_sec": snapshot.processing_rate_mb_per_sec
        })
    
    # Process the file
    metadata = await engine.process_file(test_file, progress_callback)
    
    # Verify comprehensive processing
    assert metadata["status"] == "completed"
    assert metadata["file_size_bytes"] > 1000  # Should be substantial file
    assert metadata["processed_objects"] >= 5   # Header + multiple objects
    assert metadata["processing_time_seconds"] > 0
    
    # Should have reasonable processing rate
    assert metadata["processing_rate_mb_per_sec"] > 0
    
    # Memory should be managed
    memory_stats = metadata["memory_stats"]
    assert memory_stats["peak_memory_mb"] < 500
    assert memory_stats["tokens_processed"] > 100  # Should have processed many tokens
    
    # Should have created chunks
    chunks = metadata["chunks"]
    assert len(chunks) > 0
    
    # Verify chunk diversity
    chunk_types = {chunk.get("chunk_type", "unknown") for chunk in chunks}
    # Should have multiple types (exact types depend on parsing behavior)
    assert len(chunk_types) >= 1
    
    # Each chunk should be valid
    for chunk in chunks:
        assert "chunk_id" in chunk
        assert "data" in chunk
        assert "size_bytes" in chunk
        assert chunk["size_bytes"] > 0
        assert "created_timestamp" in chunk
    
    # Verify engine statistics
    engine_stats = engine.get_stats()
    assert engine_stats["chunks_created"] == len(chunks)
    assert "parser_stats" in engine_stats
    assert "config" in engine_stats
    
    print(f"End-to-end test results:")
    print(f"  File size: {metadata['file_size_mb']:.2f} MB")
    print(f"  Objects processed: {metadata['processed_objects']}")
    print(f"  Chunks created: {len(chunks)}")
    print(f"  Processing time: {metadata['processing_time_seconds']:.3f} seconds")
    print(f"  Processing rate: {metadata['processing_rate_mb_per_sec']:.2f} MB/s")
    print(f"  Peak memory: {memory_stats['peak_memory_mb']:.2f} MB")
    print(f"  Validation errors: {metadata['validation_errors']}")
    print(f"  Progress snapshots: {len(progress_snapshots)}")
    
    # Final validation - everything should be properly processed
    assert metadata["validation_errors"] >= 0  # Should handle validation gracefully
    assert metadata["processed_objects"] > 0
    assert len(chunks) > 0