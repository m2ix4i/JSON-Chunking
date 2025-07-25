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
        context = self._create_processing_context(file_path)
        await self._process_all_elements(context, progress_tracker)
        return self._finalize_processing(context, progress_tracker)
    
    def _create_processing_context(self, file_path: Path) -> 'StreamingProcessingContext':
        """Create processing context for the file."""
        from .models import StreamingProcessingContext
        return StreamingProcessingContext.create_for_file(file_path)
    
    async def _process_all_elements(self, context: 'StreamingProcessingContext', progress_tracker) -> None:
        """Process all elements in the file."""
        async for json_path, value in self.parser.parse_file(context.file_path):
            await self._process_single_iteration(context, json_path, value, progress_tracker)
    
    async def _process_single_iteration(
        self, 
        context: 'StreamingProcessingContext', 
        json_path: str, 
        value: Any, 
        progress_tracker
    ) -> None:
        """Process a single iteration of the streaming loop."""
        self._update_progress(progress_tracker, context.file_size)
        
        processing_outcome = await self._process_element(
            json_path, value, context.chunks, context.processed_objects
        )
        
        self._handle_processing_outcome(context, processing_outcome)
        self._perform_memory_management(context)
    
    def _handle_processing_outcome(self, context: 'StreamingProcessingContext', outcome) -> None:
        """Handle the outcome of processing an element."""
        if outcome.validation_failed:
            context.increment_validation_errors()
            return
        
        if outcome.chunk_created:
            context.add_chunk(outcome.chunk)
            self.chunks_created += 1
        
        context.increment_objects()
    
    async def _perform_memory_management(self, context: 'StreamingProcessingContext') -> None:
        """Perform periodic memory management."""
        if context.processed_objects % 100 == 0:
            await asyncio.sleep(0)
    
    def _finalize_processing(self, context: 'StreamingProcessingContext', progress_tracker) -> 'ProcessingResult':
        """Finalize processing and create result."""
        progress_tracker.update(context.file_size)
        return context.to_processing_result()
    
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
        elapsed = self._calculate_elapsed_time(start_time)
        result.elapsed_seconds = elapsed
        
        metadata = self._assemble_metadata(file_path, result, elapsed)
        self._log_processing_completion(file_path, result, elapsed)
        
        return metadata
    
    def _calculate_elapsed_time(self, start_time: float) -> float:
        """Calculate elapsed processing time."""
        return time.time() - start_time
    
    def _assemble_metadata(self, file_path: Path, result: 'ProcessingResult', elapsed: float) -> Dict[str, Any]:
        """Assemble processing metadata dictionary."""
        file_info = self._create_file_info(file_path)
        processing_info = self._create_processing_info(result, elapsed)
        memory_info = self._create_memory_stats()
        chunk_info = self._create_chunk_info(result)
        
        return {**file_info, **processing_info, **memory_info, **chunk_info}
    
    def _create_file_info(self, file_path: Path) -> Dict[str, Any]:
        """Create file-related metadata."""
        file_size = file_path.stat().st_size
        return {
            "file_path": str(file_path),
            "file_size_bytes": file_size,
            "file_size_mb": file_size / (1024 * 1024),
            "status": "processed"
        }
    
    def _create_processing_info(self, result: 'ProcessingResult', elapsed: float) -> Dict[str, Any]:
        """Create processing performance metadata."""
        total_size_mb = sum(chunk.size_bytes for chunk in result.chunks) / (1024 * 1024)
        
        return {
            "chunks_created": result.chunks_created,
            "processed_objects": result.processed_objects,
            "validation_errors": result.validation_errors,
            "processing_time_seconds": elapsed,
            "processing_time_ms": elapsed * 1000,
            "processing_rate_mb_per_sec": total_size_mb / elapsed if elapsed > 0 else 0
        }
    
    def _create_memory_stats(self) -> Dict[str, Any]:
        """Create memory-related statistics."""
        processing_stats = self.parser.get_stats()
        return {
            "memory_stats": {
                "tokens_processed": processing_stats["tokens_processed"],
                "gc_triggers": processing_stats["gc_triggers"],
                "peak_memory_mb": processing_stats["current_memory_mb"]
            }
        }
    
    def _create_chunk_info(self, result: 'ProcessingResult') -> Dict[str, Any]:
        """Create chunk-related information."""
        return {
            "chunks": [chunk.to_dict() for chunk in result.chunks]
        }
    
    def _log_processing_completion(self, file_path: Path, result: 'ProcessingResult', elapsed: float) -> None:
        """Log processing completion with summary statistics."""
        processing_stats = self.parser.get_stats()
        
        logger.info(
            "Streaming file processing completed",
            file_path=str(file_path),
            chunks_created=result.chunks_created,
            processed_objects=result.processed_objects,
            elapsed_seconds=elapsed,
            memory_mb=processing_stats["current_memory_mb"]
        )
    
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
        
        chunks = []
        
        try:
            # For in-memory data, process it as a structured object
            if isinstance(data, dict):
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