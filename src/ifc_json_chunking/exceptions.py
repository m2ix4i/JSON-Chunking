"""
Custom exceptions for IFC JSON Chunking system.
"""

from typing import Any, Dict, Optional


class IFCChunkingError(Exception):
    """
    Base exception class for IFC JSON Chunking system.
    
    All custom exceptions in the system should inherit from this class.
    """

    def __init__(self, message: str, error_code: Optional[str] = None, context: Optional[Dict[str, Any]] = None):
        """
        Initialize the exception.
        
        Args:
            message: Human-readable error message
            error_code: Optional error code for programmatic handling
            context: Optional dictionary with additional error context
        """
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.context = context or {}

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert exception to dictionary for logging/serialization.
        
        Returns:
            Dictionary representation of the exception
        """
        return {
            "error_type": self.__class__.__name__,
            "message": self.message,
            "error_code": self.error_code,
            "context": self.context
        }


class ConfigurationError(IFCChunkingError):
    """Exception raised for configuration-related errors."""

    def __init__(self, message: str, config_key: Optional[str] = None, **kwargs):
        """
        Initialize configuration error.
        
        Args:
            message: Error message
            config_key: Configuration key that caused the error
            **kwargs: Additional arguments passed to parent
        """
        super().__init__(message, error_code="CONFIG_ERROR", **kwargs)
        self.config_key = config_key
        if config_key:
            self.context["config_key"] = config_key


class ProcessingError(IFCChunkingError):
    """Exception raised during file processing operations."""

    def __init__(self, message: str, file_path: Optional[str] = None, **kwargs):
        """
        Initialize processing error.
        
        Args:
            message: Error message
            file_path: Path of file being processed when error occurred
            **kwargs: Additional arguments passed to parent
        """
        super().__init__(message, error_code="PROCESSING_ERROR", **kwargs)
        self.file_path = file_path
        if file_path:
            self.context["file_path"] = file_path


class ChunkingError(IFCChunkingError):
    """Exception raised during data chunking operations."""

    def __init__(self, message: str, chunk_id: Optional[str] = None, **kwargs):
        """
        Initialize chunking error.
        
        Args:
            message: Error message
            chunk_id: ID of chunk being processed when error occurred
            **kwargs: Additional arguments passed to parent
        """
        super().__init__(message, error_code="CHUNKING_ERROR", **kwargs)
        self.chunk_id = chunk_id
        if chunk_id:
            self.context["chunk_id"] = chunk_id


class ValidationError(IFCChunkingError):
    """Exception raised for data validation errors."""

    def __init__(self, message: str, field_name: Optional[str] = None, **kwargs):
        """
        Initialize validation error.
        
        Args:
            message: Error message
            field_name: Name of field that failed validation
            **kwargs: Additional arguments passed to parent
        """
        super().__init__(message, error_code="VALIDATION_ERROR", **kwargs)
        self.field_name = field_name
        if field_name:
            self.context["field_name"] = field_name


class StorageError(IFCChunkingError):
    """Exception raised for storage-related operations."""

    def __init__(self, message: str, storage_path: Optional[str] = None, **kwargs):
        """
        Initialize storage error.
        
        Args:
            message: Error message
            storage_path: Storage path related to the error
            **kwargs: Additional arguments passed to parent
        """
        super().__init__(message, error_code="STORAGE_ERROR", **kwargs)
        self.storage_path = storage_path
        if storage_path:
            self.context["storage_path"] = storage_path


class TimeoutError(IFCChunkingError):
    """Exception raised when operations exceed timeout limits."""

    def __init__(self, message: str, timeout_seconds: Optional[int] = None, **kwargs):
        """
        Initialize timeout error.
        
        Args:
            message: Error message
            timeout_seconds: Timeout value that was exceeded
            **kwargs: Additional arguments passed to parent
        """
        super().__init__(message, error_code="TIMEOUT_ERROR", **kwargs)
        self.timeout_seconds = timeout_seconds
        if timeout_seconds:
            self.context["timeout_seconds"] = timeout_seconds
