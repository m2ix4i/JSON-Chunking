"""
Structured logging configuration for IFC JSON Chunking system.

This module provides comprehensive logging setup with JSON formatting,
structured output, and environment-specific configuration.
"""

import logging
import logging.config
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import structlog
from structlog import stdlib
from structlog.processors import JSONRenderer

from .config import Config


def configure_logging(config: Optional[Config] = None) -> None:
    """
    Configure structured logging for the application.
    
    Args:
        config: Configuration object. If None, uses default configuration.
    """
    if config is None:
        config = Config()

    # Configure structlog
    structlog.configure(
        processors=[
            stdlib.filter_by_level,  # Filter by log level
            stdlib.add_logger_name,  # Add logger name
            stdlib.add_log_level,    # Add log level
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="ISO"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            _get_renderer(config.log_format),
        ],
        context_class=dict,
        logger_factory=stdlib.LoggerFactory(),
        wrapper_class=stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Configure standard library logging
    logging_config = _get_logging_config(config)
    logging.config.dictConfig(logging_config)

    # Set root logger level
    logging.getLogger().setLevel(config.log_level.upper())

    # Log initialization
    logger = structlog.get_logger(__name__)
    logger.info("Logging configured",
                log_level=config.log_level,
                log_format=config.log_format,
                environment=config.environment)


def _get_renderer(log_format: str) -> Any:
    """
    Get the appropriate log renderer based on format.
    
    Args:
        log_format: Log format ('json' or 'console')
        
    Returns:
        Appropriate structlog renderer
    """
    if log_format.lower() == "json":
        return JSONRenderer()
    else:
        return structlog.dev.ConsoleRenderer(colors=True)


def _get_logging_config(config: Config) -> Dict[str, Any]:
    """
    Get logging configuration dictionary.
    
    Args:
        config: Configuration object
        
    Returns:
        Logging configuration dictionary
    """
    log_level = config.log_level.upper()

    # Determine log file path
    log_dir = Path("logs")
    if config.environment != "development":
        log_dir.mkdir(exist_ok=True)

    handlers = ["console"]
    if config.environment != "development":
        handlers.extend(["file", "error_file"])

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                "format": "%(asctime)s %(name)s %(levelname)s %(message)s"
            },
            "console": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S"
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": log_level,
                "formatter": "json" if config.log_format == "json" else "console",
                "stream": sys.stdout
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": log_level,
                "formatter": "json",
                "filename": str(log_dir / "ifc_chunking.log"),
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "ERROR",
                "formatter": "json",
                "filename": str(log_dir / "ifc_chunking_error.log"),
                "maxBytes": 10485760,  # 10MB
                "backupCount": 3
            }
        },
        "loggers": {
            "ifc_json_chunking": {
                "level": log_level,
                "handlers": handlers,
                "propagate": False
            },
            # Third-party library logging levels
            "aiohttp": {
                "level": "WARNING",
                "handlers": handlers,
                "propagate": False
            },
            "urllib3": {
                "level": "WARNING",
                "handlers": handlers,
                "propagate": False
            }
        },
        "root": {
            "level": log_level,
            "handlers": handlers
        }
    }


class ContextualLogger:
    """
    Contextual logger wrapper that maintains context across log calls.
    
    This class provides a way to maintain context (like request_id, user_id)
    across multiple log calls without repeating the context each time.
    """

    def __init__(self, logger_name: str, **context):
        """
        Initialize contextual logger.
        
        Args:
            logger_name: Name of the logger
            **context: Context to maintain across log calls
        """
        self.logger = structlog.get_logger(logger_name)
        self.context = context

    def bind(self, **new_context) -> "ContextualLogger":
        """
        Create a new contextual logger with additional context.
        
        Args:
            **new_context: Additional context to bind
            
        Returns:
            New contextual logger with combined context
        """
        combined_context = {**self.context, **new_context}
        return ContextualLogger(self.logger.name, **combined_context)

    def debug(self, message: str, **kwargs) -> None:
        """Log debug message with context."""
        self.logger.debug(message, **self.context, **kwargs)

    def info(self, message: str, **kwargs) -> None:
        """Log info message with context."""
        self.logger.info(message, **self.context, **kwargs)

    def warning(self, message: str, **kwargs) -> None:
        """Log warning message with context."""
        self.logger.warning(message, **self.context, **kwargs)

    def error(self, message: str, **kwargs) -> None:
        """Log error message with context."""
        self.logger.error(message, **self.context, **kwargs)

    def critical(self, message: str, **kwargs) -> None:
        """Log critical message with context."""
        self.logger.critical(message, **self.context, **kwargs)

    def exception(self, message: str, **kwargs) -> None:
        """Log exception message with context and traceback."""
        self.logger.exception(message, **self.context, **kwargs)


def get_logger(name: str, **context) -> ContextualLogger:
    """
    Get a contextual logger instance.
    
    Args:
        name: Logger name
        **context: Initial context for the logger
        
    Returns:
        Contextual logger instance
    """
    return ContextualLogger(name, **context)


def log_performance(func_name: str, duration_ms: float, **context) -> None:
    """
    Log performance metrics.
    
    Args:
        func_name: Name of the function being measured
        duration_ms: Duration in milliseconds
        **context: Additional context
    """
    logger = structlog.get_logger("performance")
    logger.info("Performance metric",
                function_name=func_name,
                duration_ms=duration_ms,
                **context)


def log_security_event(event_type: str, severity: str, **context) -> None:
    """
    Log security-related events.
    
    Args:
        event_type: Type of security event
        severity: Severity level (low, medium, high, critical)
        **context: Additional context
    """
    logger = structlog.get_logger("security")
    logger.warning("Security event",
                   event_type=event_type,
                   severity=severity,
                   **context)


def log_audit_event(action: str, user_id: Optional[str] = None, **context) -> None:
    """
    Log audit events for compliance and tracking.
    
    Args:
        action: Action being audited
        user_id: ID of user performing the action
        **context: Additional context
    """
    logger = structlog.get_logger("audit")
    logger.info("Audit event",
                action=action,
                user_id=user_id,
                **context)
