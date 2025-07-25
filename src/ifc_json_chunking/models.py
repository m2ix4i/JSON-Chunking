"""
Domain models for IFC JSON Chunking system.

This module contains dataclasses and domain objects that represent
core concepts in the IFC JSON chunking domain.
"""

import time
from dataclasses import dataclass
from typing import Any, Dict, Optional
from enum import Enum


class ChunkType(Enum):
    """Types of chunks that can be created."""
    IFC_OBJECT = "ifc_object"
    HEADER = "header"
    GEOMETRY = "geometry" 
    GENERAL = "general"


@dataclass
class Chunk:
    """
    Represents a single chunk of IFC JSON data.
    
    This is the primary domain object for chunked data, replacing
    primitive dictionaries with a proper typed object.
    """
    
    chunk_id: str
    sequence_number: int
    json_path: str
    chunk_type: ChunkType
    data: Any
    size_bytes: int
    created_timestamp: float
    
    # Optional fields for specific chunk types
    object_id: Optional[str] = None
    geometry_id: Optional[str] = None
    
    # Token optimization fields
    token_count: Optional[int] = None
    target_model: Optional[str] = None
    
    @classmethod
    def create_from_element(
        cls, 
        json_path: str, 
        value: Any, 
        sequence_number: int
    ) -> 'Chunk':
        """
        Create a chunk from a parsed JSON element.
        
        Args:
            json_path: JSON path of the element
            value: Element value
            sequence_number: Sequence number for ordering
            
        Returns:
            New Chunk instance
        """
        return cls(
            chunk_id=f"chunk_{sequence_number:06d}",
            sequence_number=sequence_number,
            json_path=json_path,
            chunk_type=cls._determine_chunk_type(json_path),
            data=value,
            size_bytes=cls._calculate_size(value),
            created_timestamp=time.time()
        )
    
    @classmethod
    def create_ifc_object(
        cls,
        object_id: str,
        obj_data: Dict[str, Any]
    ) -> 'Chunk':
        """
        Create a chunk for an IFC object.
        
        Args:
            object_id: IFC object identifier
            obj_data: Object data
            
        Returns:
            New Chunk instance for IFC object
        """
        return cls(
            chunk_id=f"object_{object_id}",
            sequence_number=0,  # Objects don't use sequence numbers
            json_path=f"objects.{object_id}",
            chunk_type=ChunkType.IFC_OBJECT,
            data=obj_data,
            size_bytes=cls._calculate_size(obj_data),
            created_timestamp=time.time(),
            object_id=object_id
        )
    
    @classmethod
    def create_header(cls, header_data: Dict[str, Any]) -> 'Chunk':
        """
        Create a chunk for IFC header data.
        
        Args:
            header_data: Header data
            
        Returns:
            New Chunk instance for header
        """
        return cls(
            chunk_id="ifc_header",
            sequence_number=0,
            json_path="header",
            chunk_type=ChunkType.HEADER,
            data=header_data,
            size_bytes=cls._calculate_size(header_data),
            created_timestamp=time.time()
        )
    
    @classmethod
    def create_geometry(
        cls,
        geometry_id: str,
        geom_data: Dict[str, Any]
    ) -> 'Chunk':
        """
        Create a chunk for geometry data.
        
        Args:
            geometry_id: Geometry identifier
            geom_data: Geometry data
            
        Returns:
            New Chunk instance for geometry
        """
        return cls(
            chunk_id=f"geometry_{geometry_id}",
            sequence_number=0,
            json_path=f"geometry.{geometry_id}",
            chunk_type=ChunkType.GEOMETRY,
            data=geom_data,
            size_bytes=cls._calculate_size(geom_data),
            created_timestamp=time.time(),
            geometry_id=geometry_id
        )
    
    @staticmethod
    def _determine_chunk_type(json_path: str) -> ChunkType:
        """Determine chunk type based on JSON path."""
        if json_path.startswith('objects.'):
            return ChunkType.IFC_OBJECT
        elif json_path.startswith('header'):
            return ChunkType.HEADER
        elif json_path.startswith('geometry.'):
            return ChunkType.GEOMETRY
        else:
            return ChunkType.GENERAL
    
    @staticmethod
    def _calculate_size(data: Any) -> int:
        """Calculate the size of data in bytes."""
        return len(str(data))
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert chunk to dictionary for serialization.
        
        Returns:
            Dictionary representation of the chunk
        """
        result = {
            "chunk_id": self.chunk_id,
            "sequence_number": self.sequence_number,
            "json_path": self.json_path,
            "chunk_type": self.chunk_type.value,
            "data": self.data,
            "size_bytes": self.size_bytes,
            "created_timestamp": self.created_timestamp
        }
        
        # Add optional fields if present
        if self.object_id:
            result["object_id"] = self.object_id
        if self.geometry_id:
            result["geometry_id"] = self.geometry_id
        if self.token_count is not None:
            result["token_count"] = self.token_count
        if self.target_model:
            result["target_model"] = self.target_model
            
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Chunk':
        """
        Create chunk from dictionary.
        
        Args:
            data: Dictionary with chunk data
            
        Returns:
            New Chunk instance
        """
        return cls(
            chunk_id=data["chunk_id"],
            sequence_number=data["sequence_number"],
            json_path=data["json_path"],
            chunk_type=ChunkType(data["chunk_type"]),
            data=data["data"],
            size_bytes=data["size_bytes"],
            created_timestamp=data["created_timestamp"],
            object_id=data.get("object_id"),
            geometry_id=data.get("geometry_id"),
            token_count=data.get("token_count"),
            target_model=data.get("target_model")
        )
    
    def calculate_token_count(self, model_name: str = "gemini-2.5-pro") -> int:
        """
        Calculate and set token count for this chunk.
        
        Args:
            model_name: Target LLM model for token counting
            
        Returns:
            Token count for the chunk
        """
        # Import here to avoid circular dependencies
        from .token_counter import create_token_counter
        
        counter = create_token_counter(model_name)
        self.token_count = counter.count_tokens(self.data)
        self.target_model = model_name
        
        return self.token_count
    
    def is_token_optimized(self, model_name: str = "gemini-2.5-pro") -> bool:
        """
        Check if chunk is optimally sized for target model.
        
        Args:
            model_name: Target LLM model
            
        Returns:
            True if chunk is within optimal token limits
        """
        from .token_counter import create_token_counter
        
        counter = create_token_counter(model_name)
        if self.token_count is None:
            self.calculate_token_count(model_name)
        
        return self.token_count <= counter.get_optimal_chunk_size()
    
    def __str__(self) -> str:
        """String representation of chunk."""
        token_info = f", tokens={self.token_count}" if self.token_count else ""
        return f"Chunk(id={self.chunk_id}, type={self.chunk_type.value}, size={self.size_bytes}{token_info})"


@dataclass
class ProcessingResult:
    """
    Results from processing a file or data.
    
    Encapsulates the outcome of a processing operation
    to improve code organization and testability.
    """
    
    chunks: list[Chunk]
    processed_objects: int
    validation_errors: int
    elapsed_seconds: float
    
    @property
    def chunks_created(self) -> int:
        """Get the number of chunks created."""
        return len(self.chunks)
    
    @property
    def processing_rate_objects_per_sec(self) -> float:
        """Get processing rate in objects per second."""
        if self.elapsed_seconds <= 0:
            return 0.0
        return self.processed_objects / self.elapsed_seconds
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "chunks": [chunk.to_dict() for chunk in self.chunks],
            "processed_objects": self.processed_objects,
            "validation_errors": self.validation_errors,
            "elapsed_seconds": self.elapsed_seconds,
            "chunks_created": self.chunks_created,
            "processing_rate_objects_per_sec": self.processing_rate_objects_per_sec
        }


@dataclass
class ValidationResult:
    """
    Results from validating JSON structure.
    
    Encapsulates validation outcomes to support the
    "Tell, Don't Ask" pattern.
    """
    
    is_valid: bool
    errors: list[str]
    warnings: list[str]
    
    def has_errors(self) -> bool:
        """Check if there are validation errors."""
        return len(self.errors) > 0
    
    def has_warnings(self) -> bool:
        """Check if there are validation warnings."""
        return len(self.warnings) > 0
    
    def error_count(self) -> int:
        """Get number of errors."""
        return len(self.errors)
    
    def add_error(self, error: str) -> None:
        """Add a validation error."""
        self.errors.append(error)
        self.is_valid = False
    
    def add_warning(self, warning: str) -> None:
        """Add a validation warning."""
        self.warnings.append(warning)
    
    @classmethod
    def valid(cls) -> 'ValidationResult':
        """Create a valid result with no errors."""
        return cls(is_valid=True, errors=[], warnings=[])
    
    @classmethod
    def invalid(cls, error: str) -> 'ValidationResult':
        """Create an invalid result with an error."""
        return cls(is_valid=False, errors=[error], warnings=[])


@dataclass
class ChunkingDecision:
    """
    Represents a decision about whether to create a chunk.
    
    Supports the "Tell, Don't Ask" pattern by encapsulating
    the decision logic and chunk creation.
    """
    
    should_chunk: bool
    reason: str
    suggested_chunk_type: Optional[ChunkType] = None
    
    def should_create_chunk(self) -> bool:
        """Check if a chunk should be created."""
        return self.should_chunk
    
    @classmethod
    def yes(cls, reason: str, chunk_type: Optional[ChunkType] = None) -> 'ChunkingDecision':
        """Create a positive chunking decision."""
        return cls(should_chunk=True, reason=reason, suggested_chunk_type=chunk_type)
    
    @classmethod
    def no(cls, reason: str) -> 'ChunkingDecision':
        """Create a negative chunking decision."""
        return cls(should_chunk=False, reason=reason)