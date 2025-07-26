"""
Core chunking engine for IFC JSON data processing.
"""

import asyncio
import time
from typing import Dict, List, Any, Optional, Callable
from pathlib import Path

import structlog

from .config import Config
from .exceptions import IFCChunkingError

logger = structlog.get_logger(__name__)


class ChunkingEngine:
    """
    Main engine for chunking IFC JSON data.
    
    This class provides the core functionality for processing large IFC JSON files
    and breaking them down into manageable chunks for efficient storage and retrieval
    using memory-efficient streaming parsing.
    """
    
    def __init__(
        self, 
        config: Optional[Config] = None,
        parser: Optional[Any] = None,
        validator: Optional[Any] = None,
        chunking_strategy: Optional[Any] = None
    ):
        """
        Initialize the chunking engine with dependency injection.
        
        Args:
            config: Configuration object. If None, uses default configuration.
            parser: StreamingJSONParser instance. If None, creates default.
            validator: StreamingValidator instance. If None, creates default.
            chunking_strategy: ChunkingStrategy instance. If None, creates default.
        """
        self.config = config or Config()
        
        # Use dependency injection for better testability
        if parser is None:
            from .streaming import StreamingJSONParser
            parser = StreamingJSONParser(self.config)
        if validator is None:
            from .streaming import StreamingValidator
            validator = StreamingValidator()
        if chunking_strategy is None:
            from .strategy import create_chunking_strategy
            chunking_strategy = create_chunking_strategy('ifc', self.config)
        
        self.parser = parser
        self.validator = validator
        self.chunking_strategy = chunking_strategy
        self.chunks_created = 0
        
        logger.info("ChunkingEngine initialized with streaming support", 
                   config=str(self.config))
    
    async def process_file(
        self, 
        file_path: Path,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Process an IFC JSON file using streaming parser and return chunking metadata.
        
        Args:
            file_path: Path to the IFC JSON file to process
            progress_callback: Optional callback for progress updates
            
        Returns:
            Dictionary containing processing metadata including chunks
            
        Raises:
            IFCChunkingError: If file processing fails
        """
        self._validate_file_exists(file_path)
        progress_tracker = self._create_progress_tracker(file_path, progress_callback)
        
        start_time = time.time()
        
        try:
            processing_result = await self._stream_process_file(file_path, progress_tracker)
            return self._create_processing_metadata(file_path, processing_result, start_time)
        except Exception as e:
            elapsed = time.time() - start_time
            self._handle_processing_error(e, file_path, elapsed, 0)
    
    def _validate_file_exists(self, file_path: Path) -> None:
        """Validate that the file exists."""
        if not file_path.exists():
            raise IFCChunkingError(f"File not found: {file_path}")
    
    def _create_progress_tracker(self, file_path: Path, progress_callback: Optional[Callable]):
        """Create and configure progress tracker."""
        from .progress import FileProgressTracker, create_progress_callback
        
        return FileProgressTracker(
            file_path=file_path,
            description=f"Processing {file_path.name}",
            callback=progress_callback or create_progress_callback()
        )
    
    async def _stream_process_file(self, file_path: Path, progress_tracker) -> 'ProcessingResult':
        """Core streaming processing logic."""
        from .models import ProcessingResult, Chunk
        
        chunks = []
        processed_objects = 0
        validation_errors = 0
        file_size = file_path.stat().st_size
        
        async for json_path, value in self.parser.parse_file(file_path):
            # Update progress based on parser tokens processed
            self._update_progress(progress_tracker, file_size)
            
            # Process element with validation and chunking
            processing_outcome = await self._process_element(
                json_path, value, chunks, processed_objects
            )
            
            if processing_outcome.validation_failed:
                validation_errors += 1
                continue
            
            if processing_outcome.chunk_created:
                chunks.append(processing_outcome.chunk)
                self.chunks_created += 1
            
            processed_objects += 1
            
            # Memory management - yield control periodically
            if processed_objects % 100 == 0:
                await asyncio.sleep(0)
        
        # Finalize progress
        progress_tracker.update(file_size)
        
        elapsed = time.time() - time.time()  # Will be recalculated in caller
        return ProcessingResult(
            chunks=chunks,
            processed_objects=processed_objects,
            validation_errors=validation_errors,
            elapsed_seconds=elapsed
        )
    
    def _update_progress(self, progress_tracker, file_size: int) -> None:
        """Update progress based on parser state."""
        estimated_position = min(
            file_size,
            int((self.parser.tokens_processed / 10000) * file_size)
        )
        progress_tracker.update_from_position(estimated_position)
    
    async def _process_element(self, json_path: str, value: Any, chunks: list, sequence_number: int):
        """Process a single JSON element."""
        from .models import Chunk
        
        # Validate the element
        validation_result = self.validator.process_element(json_path, value)
        if validation_result.has_errors():
            return ElementProcessingOutcome(validation_failed=True)
        
        # Determine if chunk should be created
        chunking_decision = self.chunking_strategy.should_create_chunk(json_path, value, chunks)
        if not chunking_decision.should_create_chunk():
            return ElementProcessingOutcome(validation_failed=False, chunk_created=False)
        
        # Create the chunk
        chunk = await self._create_chunk_from_element(json_path, value, sequence_number)
        return ElementProcessingOutcome(
            validation_failed=False, 
            chunk_created=True, 
            chunk=chunk
        )
    
    async def _create_chunk_from_element(
        self, 
        json_path: str, 
        value: Any, 
        sequence_number: int
    ) -> 'Chunk':
        """Create a chunk from a single parsed element."""
        from .models import Chunk
        
        return Chunk.create_from_element(json_path, value, sequence_number)
    
    def _create_processing_metadata(
        self, 
        file_path: Path, 
        result: 'ProcessingResult',
        start_time: float
    ) -> Dict[str, Any]:
        """Create comprehensive processing metadata."""
        elapsed = time.time() - start_time
        file_size = file_path.stat().st_size
        processing_stats = self.parser.get_stats()
        
        # Update result with actual elapsed time
        result.elapsed_seconds = elapsed
        
        metadata = {
            "file_path": str(file_path),
            "file_size_bytes": file_size,
            "file_size_mb": file_size / (1024 * 1024),
            "status": "completed",
            "chunks_created": result.chunks_created,
            "processed_objects": result.processed_objects,
            "validation_errors": result.validation_errors,
            "processing_time_seconds": elapsed,
            "processing_time_ms": elapsed * 1000,  # Add milliseconds for backward compatibility
            "processing_rate_mb_per_sec": (file_size / (1024 * 1024)) / elapsed if elapsed > 0 else 0,
            "memory_stats": {
                "tokens_processed": processing_stats["tokens_processed"],
                "gc_triggers": processing_stats["gc_triggers"],
                "peak_memory_mb": processing_stats["current_memory_mb"]
            },
            "chunks": [chunk.to_dict() for chunk in result.chunks]
        }
        
        logger.info(
            "Streaming file processing completed",
            file_path=str(file_path),
            chunks_created=result.chunks_created,
            processed_objects=result.processed_objects,
            elapsed_seconds=elapsed,
            memory_mb=processing_stats["current_memory_mb"]
        )
        
        return metadata
    
    def _handle_processing_error(
        self, 
        error: Exception, 
        file_path: Path, 
        elapsed: float, 
        processed_objects: int
    ) -> None:
        """Handle processing errors with proper logging."""
        logger.error(
            "Streaming file processing failed",
            file_path=str(file_path),
            error=str(error),
            elapsed_seconds=elapsed,
            processed_objects=processed_objects
        )
        raise IFCChunkingError(f"Failed to process file {file_path}: {error}") from error
    
    async def create_chunks(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Create chunks from pre-loaded IFC JSON data.
        
        Args:
            data: IFC JSON data to chunk
            
        Returns:
            List of data chunks
            
        Raises:
            IFCChunkingError: If chunking fails
        """
        logger.info("Creating chunks from in-memory data", 
                   data_size_bytes=len(str(data)))
        
        # Validate input data
        if not isinstance(data, dict):
            raise IFCChunkingError(f"Invalid data type: expected dict, got {type(data).__name__}")
        
        chunks = []
        
        try:
            # Handle IFC JSON structure
            if 'objects' in data:
                chunks.extend(await self._chunk_ifc_objects(data['objects']))
            if 'header' in data:
                chunks.append(await self._create_header_chunk(data['header']))
            if 'geometry' in data:
                chunks.extend(await self._chunk_geometry_data(data['geometry']))
            
            self.chunks_created = len(chunks)
            
            logger.info("In-memory chunking completed", chunks_created=len(chunks))
            
        except Exception as e:
            logger.error("In-memory chunking failed", error=str(e))
            raise IFCChunkingError(f"Failed to create chunks: {e}") from e
        
        return [chunk.to_dict() for chunk in chunks]
    
    async def _chunk_ifc_objects(self, objects: Dict[str, Any]) -> List['Chunk']:
        """Create chunks from IFC objects using domain objects."""
        from .models import Chunk
        
        return [
            Chunk.create_ifc_object(obj_id, obj_data)
            for obj_id, obj_data in objects.items()
        ]
    
    async def _create_header_chunk(self, header: Dict[str, Any]) -> 'Chunk':
        """Create chunk from IFC header using domain object."""
        from .models import Chunk
        
        return Chunk.create_header(header)
    
    async def _chunk_geometry_data(self, geometry: Any) -> List['Chunk']:
        """Create chunks from geometry data using domain objects."""
        from .models import Chunk
        
        chunks = []
        if isinstance(geometry, dict):
            for geom_id, geom_data in geometry.items():
                chunks.append(Chunk.create_geometry(geom_id, geom_data))
        
        return chunks
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive chunking statistics.
        
        Returns:
            Dictionary with chunking statistics
        """
        parser_stats = self.parser.get_stats() if hasattr(self.parser, 'get_stats') else {}
        validator_errors = len(self.validator.get_errors()) if hasattr(self.validator, 'get_errors') else 0
        
        return {
            "chunks_created": self.chunks_created,
            "validation_errors": validator_errors,
            "parser_stats": parser_stats,
            "config": self.config.to_dict()
        }


class ElementProcessingOutcome:
    """
    Represents the outcome of processing a single JSON element.
    
    Encapsulates validation and chunking results to improve
    code organization and eliminate primitive obsession.
    """
    
    def __init__(
        self, 
        validation_failed: bool, 
        chunk_created: bool = False, 
        chunk: Optional['Chunk'] = None
    ):
        self.validation_failed = validation_failed
        self.chunk_created = chunk_created
        self.chunk = chunk