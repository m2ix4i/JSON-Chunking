"""
Tests for the core ChunkingEngine functionality.
"""

import pytest
from pathlib import Path
from typing import Dict, Any

from ifc_json_chunking.core import ChunkingEngine
from ifc_json_chunking.config import Config
from ifc_json_chunking.exceptions import IFCChunkingError

from .conftest import assert_valid_metadata


class TestChunkingEngine:
    """Test cases for ChunkingEngine class."""

    @pytest.mark.unit
    def test_init_with_config(self, test_config: Config):
        """Test ChunkingEngine initialization with configuration."""
        engine = ChunkingEngine(test_config)
        assert engine.config == test_config

    @pytest.mark.unit
    def test_init_without_config(self):
        """Test ChunkingEngine initialization without configuration."""
        engine = ChunkingEngine()
        assert engine.config is not None
        assert isinstance(engine.config, Config)

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_process_file_success(self, chunking_engine: ChunkingEngine, sample_ifc_file: Path):
        """Test successful file processing."""
        metadata = await chunking_engine.process_file(sample_ifc_file)
        
        assert_valid_metadata(metadata)
        assert metadata["file_path"] == str(sample_ifc_file)
        assert metadata["status"] == "processed"
        assert isinstance(metadata["chunks_created"], int)
        assert isinstance(metadata["processing_time_ms"], (int, float))

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_process_file_not_found(self, chunking_engine: ChunkingEngine, non_existent_file: Path):
        """Test processing non-existent file raises error."""
        with pytest.raises(IFCChunkingError, match="File not found"):
            await chunking_engine.process_file(non_existent_file)

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_process_empty_file(self, chunking_engine: ChunkingEngine, empty_file: Path):
        """Test processing empty file."""
        metadata = await chunking_engine.process_file(empty_file)
        assert_valid_metadata(metadata)
        assert metadata["status"] == "processed"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_create_chunks_empty_data(self, chunking_engine: ChunkingEngine):
        """Test creating chunks from empty data."""
        chunks = await chunking_engine.create_chunks({})
        assert isinstance(chunks, list)
        assert len(chunks) == 0

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_create_chunks_with_data(self, chunking_engine: ChunkingEngine, sample_ifc_data: Dict[str, Any]):
        """Test creating chunks from sample data."""
        chunks = await chunking_engine.create_chunks(sample_ifc_data)
        assert isinstance(chunks, list)
        # Current implementation returns empty list - this will be expanded

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_process_large_file(self, chunking_engine: ChunkingEngine, large_ifc_file: Path):
        """Test processing a large file that should create multiple chunks."""
        metadata = await chunking_engine.process_file(large_ifc_file)
        
        assert_valid_metadata(metadata)
        assert metadata["status"] == "processed"
        # This test will be more meaningful when chunking is fully implemented

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_process_file_with_custom_config(self, sample_ifc_file: Path):
        """Test processing with custom configuration."""
        custom_config = Config(
            chunk_size_mb=5,
            max_chunks=20,
            max_workers=2
        )
        engine = ChunkingEngine(custom_config)
        
        metadata = await engine.process_file(sample_ifc_file)
        assert_valid_metadata(metadata)

    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_concurrent_processing(self, test_config: Config, sample_ifc_file: Path, large_ifc_file: Path):
        """Test concurrent file processing."""
        import asyncio
        
        engine = ChunkingEngine(test_config)
        
        # Process multiple files concurrently
        tasks = [
            engine.process_file(sample_ifc_file),
            engine.process_file(large_ifc_file)
        ]
        
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 2
        for metadata in results:
            assert_valid_metadata(metadata)
            assert metadata["status"] == "processed"

    @pytest.mark.unit
    def test_engine_string_representation(self, chunking_engine: ChunkingEngine):
        """Test string representation of ChunkingEngine."""
        # This test verifies the engine can be converted to string without error
        str_repr = str(chunking_engine)
        assert isinstance(str_repr, str)
        # Could add more specific assertions about the string format