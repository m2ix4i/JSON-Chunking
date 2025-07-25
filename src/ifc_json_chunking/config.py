"""
Configuration management for IFC JSON Chunking system.
"""

import os
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class Config:
    """
    Configuration class for IFC JSON Chunking system.
    
    Handles configuration loading from environment variables and files,
    with sensible defaults for all settings.
    """
    
    # Chunking settings
    chunk_size_mb: int = field(default_factory=lambda: int(os.getenv("CHUNK_SIZE_MB", "10")))
    max_chunks: int = field(default_factory=lambda: int(os.getenv("MAX_CHUNKS", "1000")))
    overlap_percentage: float = field(default_factory=lambda: float(os.getenv("OVERLAP_PERCENTAGE", "0.1")))
    
    # Processing settings
    max_workers: int = field(default_factory=lambda: int(os.getenv("MAX_WORKERS", "4")))
    timeout_seconds: int = field(default_factory=lambda: int(os.getenv("TIMEOUT_SECONDS", "300")))
    
    # Storage settings
    output_directory: Path = field(default_factory=lambda: Path(os.getenv("OUTPUT_DIRECTORY", "./output")))
    temp_directory: Path = field(default_factory=lambda: Path(os.getenv("TEMP_DIRECTORY", "./temp")))
    
    # Logging settings
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    log_format: str = field(default_factory=lambda: os.getenv("LOG_FORMAT", "json"))
    
    # Environment
    environment: str = field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    debug: bool = field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")
    
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