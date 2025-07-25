"""
Configuration management for IFC JSON Chunking system.
"""

import os
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from pathlib import Path

from .exceptions import ConfigurationError

logger = logging.getLogger(__name__)


class ConfigurationParser:
    """Handles environment variable parsing with proper error handling."""
    
    @staticmethod
    def get_int_env(key: str, default: int) -> int:
        """Parse integer from environment variable."""
        try:
            return int(os.getenv(key, str(default)))
        except ValueError as e:
            raise ConfigurationError(f"Invalid integer value for {key}: {os.getenv(key)}") from e
    
    @staticmethod
    def get_float_env(key: str, default: float) -> float:
        """Parse float from environment variable."""
        try:
            return float(os.getenv(key, str(default)))
        except ValueError as e:
            raise ConfigurationError(f"Invalid float value for {key}: {os.getenv(key)}") from e
    
    @staticmethod
    def get_bool_env(key: str, default: bool) -> bool:
        """Parse boolean from environment variable."""
        value = os.getenv(key, str(default).lower()).lower()
        if value in ('true', '1', 'yes', 'on'):
            return True
        elif value in ('false', '0', 'no', 'off'):
            return False
        else:
            raise ConfigurationError(f"Invalid boolean value for {key}: {value}")
    
    @staticmethod
    def get_str_env(key: str, default: str) -> str:
        """Get string from environment variable."""
        return os.getenv(key, default)
    
    @staticmethod
    def get_path_env(key: str, default: str) -> Path:
        """Parse and validate path from environment variable."""
        path_str = os.getenv(key, default)
        path = Path(path_str)
        
        # Basic path validation - prevent obvious traversal attacks
        if '..' in str(path) or str(path).startswith('/'):
            if not ConfigurationParser._is_safe_absolute_path(path):
                raise ConfigurationError(f"Potentially unsafe path for {key}: {path}")
        
        return path
    
    @staticmethod
    def _is_safe_absolute_path(path: Path) -> bool:
        """Check if absolute path is safe using whitelist approach."""
        try:
            # Resolve path and check if it's within allowed directories (whitelist approach)
            resolved = path.resolve()
            
            # Define allowed base directories
            allowed_bases = [
                Path.cwd(),                    # Current working directory
                Path.home(),                   # User home directory
                Path('/tmp'),                  # Temporary directory
                Path('/var/tmp'),              # Alternative temp directory
                Path('/opt/app') if Path('/opt/app').exists() else None,  # App directory
            ]
            
            # Remove None entries
            allowed_bases = [base for base in allowed_bases if base is not None]
            
            # Check if resolved path is relative to any allowed base
            for base in allowed_bases:
                try:
                    resolved.relative_to(base.resolve())
                    return True  # Path is within allowed base
                except ValueError:
                    continue  # Not relative to this base, try next
            
            return False  # Path not within any allowed base
        except (OSError, ValueError, RuntimeError):
            return False


@dataclass
class Config:
    """
    Configuration class for IFC JSON Chunking system.
    
    Handles configuration loading from environment variables and files,
    with sensible defaults for all settings.
    """
    
    # Chunking settings
    chunk_size_mb: int = field(default_factory=lambda: ConfigurationParser.get_int_env("CHUNK_SIZE_MB", 10))
    max_chunks: int = field(default_factory=lambda: ConfigurationParser.get_int_env("MAX_CHUNKS", 1000))
    overlap_percentage: float = field(default_factory=lambda: ConfigurationParser.get_float_env("OVERLAP_PERCENTAGE", 0.1))
    
    # Processing settings
    max_workers: int = field(default_factory=lambda: ConfigurationParser.get_int_env("MAX_WORKERS", 4))
    timeout_seconds: int = field(default_factory=lambda: ConfigurationParser.get_int_env("TIMEOUT_SECONDS", 300))
    
    # Storage settings
    output_directory: Path = field(default_factory=lambda: ConfigurationParser.get_path_env("OUTPUT_DIRECTORY", "./output"))
    temp_directory: Path = field(default_factory=lambda: ConfigurationParser.get_path_env("TEMP_DIRECTORY", "./temp"))
    
    # Logging settings
    log_level: str = field(default_factory=lambda: ConfigurationParser.get_str_env("LOG_LEVEL", "INFO"))
    log_format: str = field(default_factory=lambda: ConfigurationParser.get_str_env("LOG_FORMAT", "json"))
    
    # Environment
    environment: str = field(default_factory=lambda: ConfigurationParser.get_str_env("ENVIRONMENT", "development"))
    debug: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("DEBUG", False))
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        self.validate()
        logger.info("Configuration initialized for environment: %s", self.environment)
    
    def validate(self) -> None:
        """
        Validate configuration settings.
        
        Raises:
            ValueError: If configuration is invalid
        """
        if self.chunk_size_mb <= 0:
            raise ValueError("chunk_size_mb must be positive")
        
        if self.max_chunks <= 0:
            raise ValueError("max_chunks must be positive")
        
        if not 0 <= self.overlap_percentage <= 1:
            raise ValueError("overlap_percentage must be between 0 and 1")
        
        if self.max_workers <= 0:
            raise ValueError("max_workers must be positive")
        
        if self.timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be positive")
        
        # Ensure directories exist
        self.output_directory.mkdir(parents=True, exist_ok=True)
        self.temp_directory.mkdir(parents=True, exist_ok=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert configuration to dictionary.
        
        Returns:
            Configuration as dictionary
        """
        return {
            "chunk_size_mb": self.chunk_size_mb,
            "max_chunks": self.max_chunks,
            "overlap_percentage": self.overlap_percentage,
            "max_workers": self.max_workers,
            "timeout_seconds": self.timeout_seconds,
            "output_directory": str(self.output_directory),
            "temp_directory": str(self.temp_directory),
            "log_level": self.log_level,
            "log_format": self.log_format,
            "environment": self.environment,
            "debug": self.debug
        }
    
    @classmethod
    def from_file(cls, config_path: Path) -> "Config":
        """
        Load configuration from file.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            Configuration instance
            
        Raises:
            FileNotFoundError: If config file doesn't exist
            ValueError: If config file is invalid
        """
        # Placeholder for file-based configuration loading
        # In a real implementation, this would parse JSON/YAML/TOML files
        logger.info("Loading configuration from file: %s", config_path)
        return cls()
    
    def __str__(self) -> str:
        """String representation of configuration."""
        return f"Config(environment={self.environment}, chunk_size_mb={self.chunk_size_mb})"