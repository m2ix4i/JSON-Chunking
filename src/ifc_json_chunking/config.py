"""
Configuration management for IFC JSON Chunking system.
"""

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict

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

    # Semantic chunking settings
    chunking_strategy: str = field(default_factory=lambda: ConfigurationParser.get_str_env("CHUNKING_STRATEGY", "hierarchical"))
    target_llm_model: str = field(default_factory=lambda: ConfigurationParser.get_str_env("TARGET_LLM_MODEL", "gemini-2.5-pro"))
    overlap_strategy: str = field(default_factory=lambda: ConfigurationParser.get_str_env("OVERLAP_STRATEGY", "token_based"))
    enable_token_optimization: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("ENABLE_TOKEN_OPTIMIZATION", True))

    # LLM Integration settings
    gemini_api_key: str = field(default_factory=lambda: ConfigurationParser.get_str_env("GEMINI_API_KEY", ""))
    max_concurrent_requests: int = field(default_factory=lambda: ConfigurationParser.get_int_env("MAX_CONCURRENT_REQUESTS", 10))
    request_timeout: int = field(default_factory=lambda: ConfigurationParser.get_int_env("REQUEST_TIMEOUT", 30))
    rate_limit_rpm: int = field(default_factory=lambda: ConfigurationParser.get_int_env("RATE_LIMIT_RPM", 60))
    enable_caching: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("ENABLE_CACHING", True))

    # Redis Configuration
    redis_url: str = field(default_factory=lambda: ConfigurationParser.get_str_env("REDIS_URL", ""))
    redis_host: str = field(default_factory=lambda: ConfigurationParser.get_str_env("REDIS_HOST", "localhost"))
    redis_port: int = field(default_factory=lambda: ConfigurationParser.get_int_env("REDIS_PORT", 6379))
    redis_db: int = field(default_factory=lambda: ConfigurationParser.get_int_env("REDIS_DB", 0))
    redis_password: str = field(default_factory=lambda: ConfigurationParser.get_str_env("REDIS_PASSWORD", ""))
    redis_pool_max_connections: int = field(default_factory=lambda: ConfigurationParser.get_int_env("REDIS_POOL_MAX_CONNECTIONS", 50))
    redis_pool_retry_on_timeout: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("REDIS_POOL_RETRY_ON_TIMEOUT", True))
    redis_socket_connect_timeout: int = field(default_factory=lambda: ConfigurationParser.get_int_env("REDIS_SOCKET_CONNECT_TIMEOUT", 5))
    redis_socket_timeout: int = field(default_factory=lambda: ConfigurationParser.get_int_env("REDIS_SOCKET_TIMEOUT", 5))

    # Cache Configuration
    cache_default_ttl_seconds: int = field(default_factory=lambda: ConfigurationParser.get_int_env("CACHE_DEFAULT_TTL_SECONDS", 3600))
    cache_query_result_ttl_seconds: int = field(default_factory=lambda: ConfigurationParser.get_int_env("CACHE_QUERY_RESULT_TTL_SECONDS", 7200))
    cache_chunk_result_ttl_seconds: int = field(default_factory=lambda: ConfigurationParser.get_int_env("CACHE_CHUNK_RESULT_TTL_SECONDS", 1800))
    cache_similarity_threshold: float = field(default_factory=lambda: ConfigurationParser.get_float_env("CACHE_SIMILARITY_THRESHOLD", 0.85))
    cache_max_memory_mb: int = field(default_factory=lambda: ConfigurationParser.get_int_env("CACHE_MAX_MEMORY_MB", 512))
    cache_eviction_policy: str = field(default_factory=lambda: ConfigurationParser.get_str_env("CACHE_EVICTION_POLICY", "lru"))
    cache_compression_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("CACHE_COMPRESSION_ENABLED", True))

    # Processing settings
    max_workers: int = field(default_factory=lambda: ConfigurationParser.get_int_env("MAX_WORKERS", 4))
    timeout_seconds: int = field(default_factory=lambda: ConfigurationParser.get_int_env("TIMEOUT_SECONDS", 300))

    # Storage settings
    output_directory: Path = field(default_factory=lambda: ConfigurationParser.get_path_env("OUTPUT_DIRECTORY", "./output"))
    temp_directory: Path = field(default_factory=lambda: ConfigurationParser.get_path_env("TEMP_DIRECTORY", "./temp"))

    # Logging settings
    log_level: str = field(default_factory=lambda: ConfigurationParser.get_str_env("LOG_LEVEL", "INFO"))
    log_format: str = field(default_factory=lambda: ConfigurationParser.get_str_env("LOG_FORMAT", "json"))

    # Performance Monitoring Configuration
    performance_monitoring_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("PERFORMANCE_MONITORING_ENABLED", True))
    metrics_collection_interval_seconds: int = field(default_factory=lambda: ConfigurationParser.get_int_env("METRICS_COLLECTION_INTERVAL_SECONDS", 30))
    memory_profiling_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("MEMORY_PROFILING_ENABLED", False))
    memory_monitoring_interval_seconds: int = field(default_factory=lambda: ConfigurationParser.get_int_env("MEMORY_MONITORING_INTERVAL_SECONDS", 60))
    memory_threshold_warning_mb: int = field(default_factory=lambda: ConfigurationParser.get_int_env("MEMORY_THRESHOLD_WARNING_MB", 800))
    memory_threshold_critical_mb: int = field(default_factory=lambda: ConfigurationParser.get_int_env("MEMORY_THRESHOLD_CRITICAL_MB", 1000))

    # APM Configuration
    apm_service_name: str = field(default_factory=lambda: ConfigurationParser.get_str_env("APM_SERVICE_NAME", "ifc-json-chunking"))
    apm_service_version: str = field(default_factory=lambda: ConfigurationParser.get_str_env("APM_SERVICE_VERSION", "0.1.0"))
    apm_environment: str = field(default_factory=lambda: ConfigurationParser.get_str_env("APM_ENVIRONMENT", "development"))
    enable_request_tracing: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("ENABLE_REQUEST_TRACING", True))
    trace_sampling_rate: float = field(default_factory=lambda: ConfigurationParser.get_float_env("TRACE_SAMPLING_RATE", 0.1))

    # Health Check Configuration
    health_check_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("HEALTH_CHECK_ENABLED", True))
    health_check_interval_seconds: int = field(default_factory=lambda: ConfigurationParser.get_int_env("HEALTH_CHECK_INTERVAL_SECONDS", 30))
    health_check_timeout_seconds: int = field(default_factory=lambda: ConfigurationParser.get_int_env("HEALTH_CHECK_TIMEOUT_SECONDS", 10))

    # Security Configuration
    enable_security_headers: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("ENABLE_SECURITY_HEADERS", True))
    enable_rate_limiting: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("ENABLE_RATE_LIMITING", True))
    rate_limit_requests_per_minute: int = field(default_factory=lambda: ConfigurationParser.get_int_env("RATE_LIMIT_REQUESTS_PER_MINUTE", 100))
    rate_limit_burst_size: int = field(default_factory=lambda: ConfigurationParser.get_int_env("RATE_LIMIT_BURST_SIZE", 20))
    cors_origins: str = field(default_factory=lambda: ConfigurationParser.get_str_env("CORS_ORIGINS", "*"))

    # Production Readiness Configuration
    max_file_size_mb: int = field(default_factory=lambda: ConfigurationParser.get_int_env("MAX_FILE_SIZE_MB", 1000))
    max_query_length: int = field(default_factory=lambda: ConfigurationParser.get_int_env("MAX_QUERY_LENGTH", 10000))
    enable_compression: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("ENABLE_COMPRESSION", True))
    backup_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("BACKUP_ENABLED", False))
    backup_interval_hours: int = field(default_factory=lambda: ConfigurationParser.get_int_env("BACKUP_INTERVAL_HOURS", 24))

    # Environment
    environment: str = field(default_factory=lambda: ConfigurationParser.get_str_env("ENVIRONMENT", "development"))
    debug: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("DEBUG", False))

    # Redis Configuration (Enhanced)
    redis_host: str = field(default_factory=lambda: ConfigurationParser.get_str_env("REDIS_HOST", "localhost"))
    redis_port: int = field(default_factory=lambda: ConfigurationParser.get_int_env("REDIS_PORT", 6379))
    redis_password: str = field(default_factory=lambda: ConfigurationParser.get_str_env("REDIS_PASSWORD", ""))
    redis_db: int = field(default_factory=lambda: ConfigurationParser.get_int_env("REDIS_DB", 0))
    redis_pool_max_connections: int = field(default_factory=lambda: ConfigurationParser.get_int_env("REDIS_POOL_MAX_CONNECTIONS", 50))
    redis_pool_min_connections: int = field(default_factory=lambda: ConfigurationParser.get_int_env("REDIS_POOL_MIN_CONNECTIONS", 5))
    redis_connection_timeout: float = field(default_factory=lambda: ConfigurationParser.get_float_env("REDIS_CONNECTION_TIMEOUT", 5.0))
    redis_socket_keepalive: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("REDIS_SOCKET_KEEPALIVE", True))
    redis_compression_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("REDIS_COMPRESSION_ENABLED", True))
    redis_compression_threshold: int = field(default_factory=lambda: ConfigurationParser.get_int_env("REDIS_COMPRESSION_THRESHOLD", 1024))

    # APM and Monitoring Configuration
    apm_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("APM_ENABLED", True))
    apm_service_name: str = field(default_factory=lambda: ConfigurationParser.get_str_env("APM_SERVICE_NAME", "ifc-json-chunking"))
    apm_environment: str = field(default_factory=lambda: ConfigurationParser.get_str_env("APM_ENVIRONMENT", "development"))
    apm_sample_rate: float = field(default_factory=lambda: ConfigurationParser.get_float_env("APM_SAMPLE_RATE", 1.0))
    apm_buffer_size: int = field(default_factory=lambda: ConfigurationParser.get_int_env("APM_BUFFER_SIZE", 1000))
    apm_flush_interval: float = field(default_factory=lambda: ConfigurationParser.get_float_env("APM_FLUSH_INTERVAL", 10.0))

    # Performance Monitoring
    performance_monitoring_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("PERFORMANCE_MONITORING_ENABLED", True))
    metrics_collection_interval: float = field(default_factory=lambda: ConfigurationParser.get_float_env("METRICS_COLLECTION_INTERVAL", 15.0))
    metrics_retention_days: int = field(default_factory=lambda: ConfigurationParser.get_int_env("METRICS_RETENTION_DAYS", 30))

    # Health Check Configuration
    health_check_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("HEALTH_CHECK_ENABLED", True))
    health_check_interval: float = field(default_factory=lambda: ConfigurationParser.get_float_env("HEALTH_CHECK_INTERVAL", 30.0))
    health_check_timeout: float = field(default_factory=lambda: ConfigurationParser.get_float_env("HEALTH_CHECK_TIMEOUT", 5.0))

    # Alert System Configuration
    alerting_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("ALERTING_ENABLED", True))
    alert_evaluation_interval: float = field(default_factory=lambda: ConfigurationParser.get_float_env("ALERT_EVALUATION_INTERVAL", 30.0))
    alert_cooldown_period: float = field(default_factory=lambda: ConfigurationParser.get_float_env("ALERT_COOLDOWN_PERIOD", 600.0))

    # Memory Management
    memory_monitoring_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("MEMORY_MONITORING_ENABLED", True))
    memory_profiling_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("MEMORY_PROFILING_ENABLED", False))
    memory_profile_interval: float = field(default_factory=lambda: ConfigurationParser.get_float_env("MEMORY_PROFILE_INTERVAL", 60.0))
    memory_leak_detection_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("MEMORY_LEAK_DETECTION_ENABLED", True))
    memory_gc_optimization_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("MEMORY_GC_OPTIMIZATION_ENABLED", True))

    # Security Configuration
    security_monitoring_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("SECURITY_MONITORING_ENABLED", True))
    rate_limiting_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("RATE_LIMITING_ENABLED", True))
    request_validation_enabled: bool = field(default_factory=lambda: ConfigurationParser.get_bool_env("REQUEST_VALIDATION_ENABLED", True))

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
            "chunking_strategy": self.chunking_strategy,
            "target_llm_model": self.target_llm_model,
            "overlap_strategy": self.overlap_strategy,
            "enable_token_optimization": self.enable_token_optimization,
            "max_concurrent_requests": self.max_concurrent_requests,
            "request_timeout": self.request_timeout,
            "rate_limit_rpm": self.rate_limit_rpm,
            "enable_caching": self.enable_caching,
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
