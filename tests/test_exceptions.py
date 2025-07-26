"""
Tests for custom exception classes.
"""

import pytest

from src.ifc_json_chunking.exceptions import (
    IFCChunkingError,
    ConfigurationError,
    ProcessingError,
    ChunkingError,
    ValidationError,
    StorageError,
    TimeoutError,
)


class TestIFCChunkingError:
    """Test cases for base IFCChunkingError class."""

    @pytest.mark.unit
    def test_basic_exception(self):
        """Test basic exception creation."""
        error = IFCChunkingError("Test error message")
        
        assert str(error) == "Test error message"
        assert error.message == "Test error message"
        assert error.error_code is None
        assert error.context == {}

    @pytest.mark.unit
    def test_exception_with_error_code(self):
        """Test exception with error code."""
        error = IFCChunkingError("Test error", error_code="TEST_ERROR")
        
        assert error.error_code == "TEST_ERROR"

    @pytest.mark.unit
    def test_exception_with_context(self):
        """Test exception with context."""
        context = {"file_path": "/test/path", "line_number": 42}
        error = IFCChunkingError("Test error", context=context)
        
        assert error.context == context

    @pytest.mark.unit
    def test_exception_to_dict(self):
        """Test exception conversion to dictionary."""
        context = {"key": "value"}
        error = IFCChunkingError("Test message", error_code="TEST", context=context)
        
        error_dict = error.to_dict()
        
        assert error_dict == {
            "error_type": "IFCChunkingError",
            "message": "Test message",
            "error_code": "TEST",
            "context": context
        }


class TestConfigurationError:
    """Test cases for ConfigurationError class."""

    @pytest.mark.unit
    def test_configuration_error_basic(self):
        """Test basic configuration error."""
        error = ConfigurationError("Invalid configuration")
        
        assert str(error) == "Invalid configuration"
        assert error.error_code == "CONFIG_ERROR"
        assert error.config_key is None

    @pytest.mark.unit
    def test_configuration_error_with_key(self):
        """Test configuration error with config key."""
        error = ConfigurationError("Invalid chunk size", config_key="chunk_size_mb")
        
        assert error.config_key == "chunk_size_mb"
        assert error.context["config_key"] == "chunk_size_mb"

    @pytest.mark.unit
    def test_configuration_error_inheritance(self):
        """Test that ConfigurationError inherits from IFCChunkingError."""
        error = ConfigurationError("Test error")
        assert isinstance(error, IFCChunkingError)


class TestProcessingError:
    """Test cases for ProcessingError class."""

    @pytest.mark.unit
    def test_processing_error_basic(self):
        """Test basic processing error."""
        error = ProcessingError("Processing failed")
        
        assert str(error) == "Processing failed"
        assert error.error_code == "PROCESSING_ERROR"
        assert error.file_path is None

    @pytest.mark.unit
    def test_processing_error_with_file_path(self):
        """Test processing error with file path."""
        file_path = "/test/file.json"
        error = ProcessingError("File processing failed", file_path=file_path)
        
        assert error.file_path == file_path
        assert error.context["file_path"] == file_path

    @pytest.mark.unit
    def test_processing_error_inheritance(self):
        """Test that ProcessingError inherits from IFCChunkingError."""
        error = ProcessingError("Test error")
        assert isinstance(error, IFCChunkingError)


class TestChunkingError:
    """Test cases for ChunkingError class."""

    @pytest.mark.unit
    def test_chunking_error_basic(self):
        """Test basic chunking error."""
        error = ChunkingError("Chunking failed")
        
        assert str(error) == "Chunking failed"
        assert error.error_code == "CHUNKING_ERROR"
        assert error.chunk_id is None

    @pytest.mark.unit
    def test_chunking_error_with_chunk_id(self):
        """Test chunking error with chunk ID."""
        chunk_id = "chunk_123"
        error = ChunkingError("Failed to create chunk", chunk_id=chunk_id)
        
        assert error.chunk_id == chunk_id
        assert error.context["chunk_id"] == chunk_id

    @pytest.mark.unit
    def test_chunking_error_inheritance(self):
        """Test that ChunkingError inherits from IFCChunkingError."""
        error = ChunkingError("Test error")
        assert isinstance(error, IFCChunkingError)


class TestValidationError:
    """Test cases for ValidationError class."""

    @pytest.mark.unit
    def test_validation_error_basic(self):
        """Test basic validation error."""
        error = ValidationError("Validation failed")
        
        assert str(error) == "Validation failed"
        assert error.error_code == "VALIDATION_ERROR"
        assert error.field_name is None

    @pytest.mark.unit
    def test_validation_error_with_field(self):
        """Test validation error with field name."""
        field_name = "chunk_size"
        error = ValidationError("Invalid field value", field_name=field_name)
        
        assert error.field_name == field_name
        assert error.context["field_name"] == field_name

    @pytest.mark.unit
    def test_validation_error_inheritance(self):
        """Test that ValidationError inherits from IFCChunkingError."""
        error = ValidationError("Test error")
        assert isinstance(error, IFCChunkingError)


class TestStorageError:
    """Test cases for StorageError class."""

    @pytest.mark.unit
    def test_storage_error_basic(self):
        """Test basic storage error."""
        error = StorageError("Storage operation failed")
        
        assert str(error) == "Storage operation failed"
        assert error.error_code == "STORAGE_ERROR"
        assert error.storage_path is None

    @pytest.mark.unit
    def test_storage_error_with_path(self):
        """Test storage error with storage path."""
        storage_path = "/storage/path"
        error = StorageError("Failed to write to storage", storage_path=storage_path)
        
        assert error.storage_path == storage_path
        assert error.context["storage_path"] == storage_path

    @pytest.mark.unit
    def test_storage_error_inheritance(self):
        """Test that StorageError inherits from IFCChunkingError."""
        error = StorageError("Test error")
        assert isinstance(error, IFCChunkingError)


class TestTimeoutError:
    """Test cases for TimeoutError class."""

    @pytest.mark.unit
    def test_timeout_error_basic(self):
        """Test basic timeout error."""
        error = TimeoutError("Operation timed out")
        
        assert str(error) == "Operation timed out"
        assert error.error_code == "TIMEOUT_ERROR"
        assert error.timeout_seconds is None

    @pytest.mark.unit
    def test_timeout_error_with_timeout(self):
        """Test timeout error with timeout value."""
        timeout_seconds = 30
        error = TimeoutError("Operation exceeded timeout", timeout_seconds=timeout_seconds)
        
        assert error.timeout_seconds == timeout_seconds
        assert error.context["timeout_seconds"] == timeout_seconds

    @pytest.mark.unit
    def test_timeout_error_inheritance(self):
        """Test that TimeoutError inherits from IFCChunkingError."""
        error = TimeoutError("Test error")
        assert isinstance(error, IFCChunkingError)


class TestExceptionChaining:
    """Test cases for exception chaining and inheritance."""

    @pytest.mark.unit
    def test_all_exceptions_inherit_from_base(self):
        """Test that all custom exceptions inherit from IFCChunkingError."""
        exceptions = [
            ConfigurationError("test"),
            ProcessingError("test"),
            ChunkingError("test"),
            ValidationError("test"),
            StorageError("test"),
            TimeoutError("test"),
        ]
        
        for exception in exceptions:
            assert isinstance(exception, IFCChunkingError)
            assert isinstance(exception, Exception)

    @pytest.mark.unit
    def test_exception_context_merging(self):
        """Test that exception context is properly merged."""
        initial_context = {"initial": "value"}
        error = ProcessingError(
            "Test error",
            file_path="/test/path",
            context=initial_context
        )
        
        # Context should include both initial context and file_path
        assert error.context["initial"] == "value"
        assert error.context["file_path"] == "/test/path"

    @pytest.mark.unit
    def test_exception_error_codes(self):
        """Test that all exceptions have correct error codes."""
        error_codes = {
            ConfigurationError("test").error_code: "CONFIG_ERROR",
            ProcessingError("test").error_code: "PROCESSING_ERROR",
            ChunkingError("test").error_code: "CHUNKING_ERROR",
            ValidationError("test").error_code: "VALIDATION_ERROR",
            StorageError("test").error_code: "STORAGE_ERROR",
            TimeoutError("test").error_code: "TIMEOUT_ERROR",
        }
        
        for actual, expected in error_codes.items():
            assert actual == expected