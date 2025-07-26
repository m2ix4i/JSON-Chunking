"""
Pytest configuration and shared fixtures for IFC JSON Chunking tests.
"""

import asyncio
import tempfile
from pathlib import Path
from typing import Dict, Any, Generator
import pytest
from unittest.mock import AsyncMock, MagicMock

from src.ifc_json_chunking.config import Config
from src.ifc_json_chunking.core import ChunkingEngine
from src.ifc_json_chunking.logging import configure_logging


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_config() -> Config:
    """Create a test configuration with safe defaults."""
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        config = Config(
            chunk_size_mb=1,  # Small chunks for testing
            max_chunks=10,
            overlap_percentage=0.1,
            max_workers=1,  # Single worker for predictable tests
            timeout_seconds=30,
            output_directory=temp_path / "output",
            temp_directory=temp_path / "temp",
            log_level="DEBUG",
            log_format="console",
            environment="testing",
            debug=True
        )
        # Ensure directories exist
        config.output_directory.mkdir(parents=True, exist_ok=True)
        config.temp_directory.mkdir(parents=True, exist_ok=True)
        yield config


@pytest.fixture
def chunking_engine(test_config: Config) -> ChunkingEngine:
    """Create a ChunkingEngine instance for testing."""
    return ChunkingEngine(test_config)


@pytest.fixture
def sample_ifc_data() -> Dict[str, Any]:
    """Create sample IFC JSON data for testing."""
    return {
        "header": {
            "file_description": ["ViewDefinition [CoordinationView]"],
            "file_name": "test_building.ifc",
            "time_stamp": "2023-01-01T00:00:00",
            "author": ["Test Author"],
            "organization": ["Test Organization"],
            "application": "Test Application",
            "schema": "IFC4"
        },
        "data": [
            {
                "id": 1,
                "type": "IfcProject",
                "attributes": {
                    "GlobalId": "2O2Fr$t4X7Zf8NOew3FNr2",
                    "Name": "Test Project",
                    "Description": "A test IFC project"
                }
            },
            {
                "id": 2,
                "type": "IfcSite",
                "attributes": {
                    "GlobalId": "2O2Fr$t4X7Zf8NOew3FNr3",
                    "Name": "Test Site",
                    "Description": "A test site"
                }
            },
            {
                "id": 3,
                "type": "IfcBuilding",
                "attributes": {
                    "GlobalId": "2O2Fr$t4X7Zf8NOew3FNr4",
                    "Name": "Test Building",
                    "Description": "A test building"
                }
            }
        ]
    }


@pytest.fixture
def sample_ifc_file(tmp_path: Path, sample_ifc_data: Dict[str, Any]) -> Path:
    """Create a temporary IFC JSON file for testing."""
    import json
    
    file_path = tmp_path / "test_sample.json"
    with open(file_path, "w") as f:
        json.dump(sample_ifc_data, f, indent=2)
    
    return file_path


@pytest.fixture
def large_ifc_data() -> Dict[str, Any]:
    """Create large IFC JSON data for testing chunking behavior."""
    # Generate a larger dataset for chunking tests
    data_entries = []
    for i in range(100):  # Create 100 entities
        data_entries.append({
            "id": i + 1,
            "type": f"IfcTestEntity{i % 10}",
            "attributes": {
                "GlobalId": f"2O2Fr$t4X7Zf8NOew3FN{i:03d}",
                "Name": f"Test Entity {i}",
                "Description": f"Test entity number {i}",
                "Properties": [f"Property_{j}" for j in range(10)]
            }
        })
    
    return {
        "header": {
            "file_description": ["Large test file"],
            "file_name": "large_test.ifc",
            "time_stamp": "2023-01-01T00:00:00",
            "author": ["Test Author"],
            "organization": ["Test Organization"],
            "application": "Test Application",
            "schema": "IFC4"
        },
        "data": data_entries
    }


@pytest.fixture
def large_ifc_file(tmp_path: Path, large_ifc_data: Dict[str, Any]) -> Path:
    """Create a large temporary IFC JSON file for testing."""
    import json
    
    file_path = tmp_path / "large_test_sample.json"
    with open(file_path, "w") as f:
        json.dump(large_ifc_data, f, indent=2)
    
    return file_path


@pytest.fixture
def mock_logger():
    """Create a mock logger for testing."""
    return MagicMock()


@pytest.fixture
def mock_async_logger():
    """Create a mock async logger for testing."""
    return AsyncMock()


@pytest.fixture(autouse=True)
def configure_test_logging(test_config: Config):
    """Configure logging for tests."""
    configure_logging(test_config)


@pytest.fixture
def invalid_json_file(tmp_path: Path) -> Path:
    """Create an invalid JSON file for error testing."""
    file_path = tmp_path / "invalid.json"
    with open(file_path, "w") as f:
        f.write("{ invalid json content")
    
    return file_path


@pytest.fixture
def empty_file(tmp_path: Path) -> Path:
    """Create an empty file for testing."""
    file_path = tmp_path / "empty.json"
    file_path.touch()
    return file_path


@pytest.fixture
def non_existent_file(tmp_path: Path) -> Path:
    """Return path to a non-existent file for testing."""
    return tmp_path / "does_not_exist.json"


class MockResponse:
    """Mock HTTP response for testing."""
    
    def __init__(self, status_code: int = 200, json_data: Dict[str, Any] = None):
        self.status_code = status_code
        self._json_data = json_data or {}
    
    def json(self):
        return self._json_data


@pytest.fixture
def mock_http_response():
    """Create a mock HTTP response."""
    return MockResponse


# Test markers for different test categories
pytest.mark.unit = pytest.mark.unit
pytest.mark.integration = pytest.mark.integration
pytest.mark.slow = pytest.mark.slow


# Custom assertions
def assert_valid_chunk(chunk: Dict[str, Any]) -> None:
    """Assert that a chunk has valid structure."""
    assert isinstance(chunk, dict)
    assert "id" in chunk
    assert "data" in chunk
    assert isinstance(chunk["data"], (list, dict))


def assert_valid_metadata(metadata: Dict[str, Any]) -> None:
    """Assert that processing metadata has valid structure."""
    assert isinstance(metadata, dict)
    assert "file_path" in metadata
    assert "status" in metadata
    assert "chunks_created" in metadata
    assert "processing_time_ms" in metadata


# Test utilities
def create_test_chunks(count: int = 3) -> list:
    """Create test chunks for testing."""
    return [
        {
            "id": f"chunk_{i}",
            "data": [{"id": j, "type": "TestEntity", "value": f"test_{j}"}
                    for j in range(i * 10, (i + 1) * 10)]
        }
        for i in range(count)
    ]