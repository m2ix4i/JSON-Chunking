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
    
    def __init__(self, config: Optional[Config] = None):
        """
        Initialize the chunking engine.
        
        Args:
            config: Configuration object. If None, uses default configuration.
        """
        self.config = config or Config()
        
        # Initialize streaming components
        from .streaming import StreamingJSONParser, StreamingValidator
        from .progress import FileProgressTracker, create_progress_callback
        
        self.parser = StreamingJSONParser(self.config)
        self.validator = StreamingValidator()
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
        logger.info("Starting streaming file processing", file_path=str(file_path))
        
        if not file_path.exists():
            raise IFCChunkingError(f"File not found: {file_path}")
        
        start_time = time.time()
        file_size = file_path.stat().st_size
        
        # Initialize progress tracking
        progress_tracker = FileProgressTracker(
            file_path=file_path,
            description=f"Processing {file_path.name}",
            callback=progress_callback or create_progress_callback()
        )
        
        chunks = []
        processed_objects = 0
        validation_errors = 0
        
        try:
            # Stream parse the file
            async for json_path, value in self.parser.parse_file(file_path):
                # Update progress based on parser tokens processed
                estimated_position = min(
                    file_size,
                    int((self.parser.tokens_processed / 10000) * file_size)
                )
                progress_tracker.update_from_position(estimated_position)
                
                # Validate the parsed element
                if not self.validator.validate_ifc_structure(json_path, value):
                    validation_errors += 1
                    continue
                
                # Create chunk if we have enough data or specific IFC objects
                if self._should_create_chunk(json_path, value, chunks):
                    chunk = await self._create_chunk_from_element(
                        json_path, value, processed_objects
                    )
                    chunks.append(chunk)
                    self.chunks_created += 1
                
                processed_objects += 1
                
                # Memory management - yield control periodically
                if processed_objects % 100 == 0:
                    await asyncio.sleep(0)
        
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(
                "Streaming file processing failed",
                file_path=str(file_path),
                error=str(e),
                elapsed_seconds=elapsed,
                processed_objects=processed_objects
            )
            raise IFCChunkingError(f"Failed to process file {file_path}: {e}") from e
        
        # Finalize progress
        progress_tracker.update(file_size)
        
        elapsed = time.time() - start_time
        processing_stats = self.parser.get_stats()
        
        metadata = {
            "file_path": str(file_path),
            "file_size_bytes": file_size,
            "file_size_mb": file_size / (1024 * 1024),
            "status": "completed",
            "chunks_created": len(chunks),
            "processed_objects": processed_objects,
            "validation_errors": validation_errors,
            "processing_time_seconds": elapsed,
            "processing_rate_mb_per_sec": (file_size / (1024 * 1024)) / elapsed if elapsed > 0 else 0,
            "memory_stats": {
                "tokens_processed": processing_stats["tokens_processed"],
                "gc_triggers": processing_stats["gc_triggers"],
                "peak_memory_mb": processing_stats["current_memory_mb"]
            },
            "chunks": chunks
        }
        
        logger.info(
            "Streaming file processing completed",
            file_path=str(file_path),
            chunks_created=len(chunks),
            processed_objects=processed_objects,
            elapsed_seconds=elapsed,
            memory_mb=processing_stats["current_memory_mb"]
        )
        
        return metadata
    
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
        
        return chunks
    
    def _should_create_chunk(
        self, 
        json_path: str, 
        value: Any, 
        existing_chunks: List[Dict[str, Any]]
    ) -> bool:
        """
        Determine if a new chunk should be created for the given element.
        
        Args:
            json_path: JSON path of the element
            value: Element value  
            existing_chunks: List of existing chunks
            
        Returns:
            True if a new chunk should be created
        """
        # Create chunks for major IFC objects
        if json_path.startswith('objects.') and isinstance(value, dict):
            return True
        
        # Create chunks for geometry data
        if json_path.startswith('geometry.') and isinstance(value, (dict, list)):
            return True
        
        # Create chunk when we reach size limit
        current_chunk_size = sum(len(str(chunk)) for chunk in existing_chunks[-5:])
        size_limit = self.config.chunk_size_mb * 1024 * 1024  # Convert to bytes
        
        return current_chunk_size > size_limit
    
    async def _create_chunk_from_element(
        self, 
        json_path: str, 
        value: Any, 
        sequence_number: int
    ) -> Dict[str, Any]:
        """
        Create a chunk from a single parsed element.
        
        Args:
            json_path: JSON path of the element
            value: Element value
            sequence_number: Sequence number for ordering
            
        Returns:
            Chunk dictionary
        """
        chunk = {
            "chunk_id": f"chunk_{sequence_number:06d}",
            "sequence_number": sequence_number,
            "json_path": json_path,
            "chunk_type": self._determine_chunk_type(json_path),
            "data": value,
            "size_bytes": len(str(value)),
            "created_timestamp": time.time()
        }
        
        return chunk
    
    async def _chunk_ifc_objects(self, objects: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create chunks from IFC objects."""
        chunks = []
        
        for obj_id, obj_data in objects.items():
            chunk = {
                "chunk_id": f"object_{obj_id}",
                "chunk_type": "ifc_object",
                "object_id": obj_id,
                "data": obj_data,
                "size_bytes": len(str(obj_data)),
                "created_timestamp": time.time()
            }
            chunks.append(chunk)
        
        return chunks
    
    async def _create_header_chunk(self, header: Dict[str, Any]) -> Dict[str, Any]:
        """Create chunk from IFC header."""
        return {
            "chunk_id": "ifc_header",
            "chunk_type": "header",
            "data": header,
            "size_bytes": len(str(header)),
            "created_timestamp": time.time()
        }
    
    async def _chunk_geometry_data(self, geometry: Any) -> List[Dict[str, Any]]:
        """Create chunks from geometry data."""
        chunks = []
        
        if isinstance(geometry, dict):
            for geom_id, geom_data in geometry.items():
                chunk = {
                    "chunk_id": f"geometry_{geom_id}",
                    "chunk_type": "geometry",
                    "geometry_id": geom_id,
                    "data": geom_data,
                    "size_bytes": len(str(geom_data)),
                    "created_timestamp": time.time()
                }
                chunks.append(chunk)
        
        return chunks
    
    def _determine_chunk_type(self, json_path: str) -> str:
        """Determine chunk type based on JSON path."""
        if json_path.startswith('objects.'):
            return "ifc_object"
        elif json_path.startswith('header.'):
            return "header"
        elif json_path.startswith('geometry.'):
            return "geometry"
        else:
            return "general"
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive chunking statistics.
        
        Returns:
            Dictionary with chunking statistics
        """
        parser_stats = self.parser.get_stats() if hasattr(self, 'parser') else {}
        validator_errors = len(self.validator.get_errors()) if hasattr(self, 'validator') else 0
        
        return {
            "chunks_created": self.chunks_created,
            "validation_errors": validator_errors,
            "parser_stats": parser_stats,
            "config": self.config.to_dict()
        }