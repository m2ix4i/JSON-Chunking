"""
Streaming JSON processing for large IFC data files.

This module provides memory-efficient streaming JSON parsing capabilities
using ijson for token-by-token processing of large files.
"""

import gc
import gzip
from pathlib import Path
from typing import Any, AsyncIterator, Dict, Optional, Tuple, Union
import asyncio
import time

try:
    import ijson
except ImportError:
    raise ImportError("ijson is required for streaming JSON processing. Install with: pip install ijson")

try:
    import psutil
except ImportError:
    raise ImportError("psutil is required for memory monitoring. Install with: pip install psutil")

import structlog

from .config import Config
from .exceptions import ProcessingError, ChunkingError, ValidationError

logger = structlog.get_logger(__name__)


class MemoryMonitor:
    """Memory usage monitoring and management utilities."""
    
    def __init__(self, max_memory_mb: int = 500):
        """
        Initialize memory monitor.
        
        Args:
            max_memory_mb: Maximum memory usage in MB before triggering GC
        """
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.process = psutil.Process()
        
    def get_memory_usage(self) -> int:
        """Get current memory usage in bytes."""
        return self.process.memory_info().rss
    
    def get_memory_usage_mb(self) -> float:
        """Get current memory usage in MB."""
        return self.get_memory_usage() / (1024 * 1024)
    
    def should_trigger_gc(self) -> bool:
        """Check if garbage collection should be triggered."""
        return self.get_memory_usage() > (self.max_memory_bytes * 0.8)
    
    def trigger_gc(self) -> int:
        """Trigger garbage collection and return freed memory."""
        memory_before = self.get_memory_usage()
        gc.collect()
        memory_after = self.get_memory_usage()
        freed = memory_before - memory_after
        
        logger.info(
            "Garbage collection triggered",
            memory_before_mb=memory_before / (1024 * 1024),
            memory_after_mb=memory_after / (1024 * 1024),
            freed_mb=freed / (1024 * 1024)
        )
        
        return freed


class StreamingJSONParser:
    """
    Memory-efficient streaming JSON parser for large IFC files.
    
    Uses ijson for token-by-token processing to handle files larger than
    available memory while maintaining low memory footprint.
    """
    
    def __init__(self, config: Optional[Config] = None):
        """
        Initialize the streaming parser.
        
        Args:
            config: Configuration object with parsing settings
        """
        self.config = config or Config()
        self.memory_monitor = MemoryMonitor(max_memory_mb=500)
        self.tokens_processed = 0
        self.gc_triggers = 0
        
        logger.info(
            "StreamingJSONParser initialized",
            max_memory_mb=500,
            config=str(self.config)
        )
    
    def _open_file(self, file_path: Path):
        """
        Open file handle with support for compressed files.
        
        Args:
            file_path: Path to JSON file (supports .gz compression)
            
        Returns:
            File handle (regular file or gzip file)
        """
        if file_path.suffix.lower() == '.gz':
            logger.info("Opening compressed file", file_path=str(file_path))
            return gzip.open(file_path, 'rb')
        else:
            logger.info("Opening uncompressed file", file_path=str(file_path))
            return open(file_path, 'rb')
    
    async def parse_file(
        self, 
        file_path: Path,
        prefix: str = ""
    ) -> AsyncIterator[Tuple[str, Any]]:
        """
        Stream-parse a JSON file yielding (path, value) tuples.
        
        Args:
            file_path: Path to the JSON file to parse
            prefix: JSON path prefix for nested parsing
            
        Yields:
            Tuple of (json_path, value) for each parsed element
            
        Raises:
            ProcessingError: If file cannot be processed
            ChunkingError: If parsing fails
        """
        if not file_path.exists():
            raise ProcessingError(f"File not found: {file_path}")
        
        start_time = time.time()
        file_size = file_path.stat().st_size
        
        logger.info(
            "Starting streaming parse",
            file_path=str(file_path),
            file_size_mb=file_size / (1024 * 1024),
            prefix=prefix
        )
        
        try:
            with self._open_file(file_path) as file_handle:
                parser = ijson.parse(file_handle, multiple_values=True)
                
                current_path = []
                
                async for event, value in self._async_parse_events(parser):
                    # Update parsing statistics
                    self.tokens_processed += 1
                    
                    # Memory management
                    if self.tokens_processed % 1000 == 0:
                        await self._check_memory_and_yield()
                    
                    # Process the parsing event
                    json_path = await self._process_parse_event(
                        event, value, current_path, prefix
                    )
                    
                    if json_path is not None:
                        yield json_path, value
                        
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(
                "Streaming parse failed",
                file_path=str(file_path),
                error=str(e),
                elapsed_seconds=elapsed,
                tokens_processed=self.tokens_processed
            )
            raise ChunkingError(f"Failed to parse JSON file {file_path}: {e}") from e
        
        elapsed = time.time() - start_time
        logger.info(
            "Streaming parse completed",
            file_path=str(file_path),
            elapsed_seconds=elapsed,
            tokens_processed=self.tokens_processed,
            gc_triggers=self.gc_triggers,
            final_memory_mb=self.memory_monitor.get_memory_usage_mb()
        )
    
    async def _async_parse_events(self, parser):
        """Convert ijson parser events to async iterator."""
        for event in parser:
            # Yield control periodically to allow other coroutines to run
            if self.tokens_processed % 100 == 0:
                await asyncio.sleep(0)
            yield event
    
    async def _process_parse_event(
        self, 
        event: str, 
        value: Any, 
        current_path: list, 
        prefix: str
    ) -> Optional[str]:
        """
        Process a single parsing event and update the current JSON path.
        
        Args:
            event: ijson event type (start_map, end_map, map_key, etc.)
            value: Event value
            current_path: Current JSON path being tracked
            prefix: Path prefix
            
        Returns:
            Full JSON path if this event represents a complete value, None otherwise
        """
        if event == 'start_map':
            return None
        elif event == 'end_map':
            if current_path:
                current_path.pop()
            return None
        elif event == 'start_array':
            return None
        elif event == 'end_array':
            if current_path:
                current_path.pop()
            return None
        elif event == 'map_key':
            current_path.append(str(value))
            return None
        elif event in ('string', 'number', 'boolean', 'null'):
            # This is a complete value
            full_path = prefix + '.'.join(current_path) if current_path else prefix
            return full_path
        
        return None
    
    async def _check_memory_and_yield(self):
        """Check memory usage and trigger GC if needed."""
        if self.memory_monitor.should_trigger_gc():
            self.memory_monitor.trigger_gc()
            self.gc_triggers += 1
            
            # Check if memory is still too high after GC
            if self.memory_monitor.get_memory_usage_mb() > 450:  # 90% of 500MB limit
                logger.warning(
                    "High memory usage after garbage collection",
                    memory_mb=self.memory_monitor.get_memory_usage_mb(),
                    tokens_processed=self.tokens_processed
                )
        
        # Always yield control to allow other coroutines to run
        await asyncio.sleep(0)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get parsing statistics.
        
        Returns:
            Dictionary with parsing statistics
        """
        return {
            "tokens_processed": self.tokens_processed,
            "gc_triggers": self.gc_triggers,
            "current_memory_mb": self.memory_monitor.get_memory_usage_mb(),
            "max_memory_mb": self.memory_monitor.max_memory_bytes / (1024 * 1024)
        }


class StreamingValidator:
    """JSON validation for streaming data with IFC-specific checks."""
    
    def __init__(self):
        """Initialize the streaming validator."""
        self.validation_errors = []
        logger.info("StreamingValidator initialized")
    
    def validate_ifc_structure(self, json_path: str, value: Any) -> bool:
        """
        Validate IFC JSON structure elements.
        
        Args:
            json_path: JSON path of the element
            value: Element value
            
        Returns:
            True if valid, False otherwise
        """
        try:
            # Basic IFC structure validation
            if json_path.startswith('objects.') and isinstance(value, dict):
                # Validate IFC object structure
                return self._validate_ifc_object(value)
            elif json_path.startswith('header.') and isinstance(value, dict):
                # Validate IFC header structure
                return self._validate_ifc_header(value)
            
            return True  # Allow other structures
            
        except Exception as e:
            error = ValidationError(f"Validation failed for {json_path}: {e}")
            self.validation_errors.append(error)
            logger.warning(
                "Validation error",
                json_path=json_path,
                error=str(e)
            )
            return False
    
    def _validate_ifc_object(self, obj: Dict[str, Any]) -> bool:
        """Validate IFC object structure."""
        required_fields = ['type', 'id']
        for field in required_fields:
            if field not in obj:
                return False
        return True
    
    def _validate_ifc_header(self, header: Dict[str, Any]) -> bool:
        """Validate IFC header structure."""
        # Basic header validation
        return isinstance(header, dict)
    
    def get_errors(self) -> list:
        """Get validation errors."""
        return self.validation_errors.copy()
    
    def clear_errors(self):
        """Clear validation errors."""
        self.validation_errors.clear()