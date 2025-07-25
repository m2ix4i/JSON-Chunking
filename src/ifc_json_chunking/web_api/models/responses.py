"""
Response models for API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class FileStatus(str, Enum):
    """File processing status."""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"
    EXPIRED = "expired"

class QueryStatus(str, Enum):
    """Query processing status."""
    STARTED = "started"
    PREPROCESSING = "preprocessing"
    PROCESSING = "processing"
    AGGREGATING = "aggregating"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class FileUploadResponse(BaseModel):
    """Response model for file upload."""
    
    file_id: str = Field(..., description="Unique file identifier")
    filename: str = Field(..., description="Original filename")
    size: int = Field(..., description="File size in bytes")
    content_type: str = Field(..., description="MIME content type")
    status: FileStatus = Field(..., description="Upload status")
    processing_time: float = Field(..., description="Upload processing time in seconds")
    
    class Config:
        schema_extra = {
            "example": {
                "file_id": "123e4567-e89b-12d3-a456-426614174000",
                "filename": "building_data.json",
                "size": 1048576,
                "content_type": "application/json",
                "status": "uploaded",
                "processing_time": 1.23
            }
        }

class FileStatusResponse(BaseModel):
    """Response model for file status."""
    
    file_id: str = Field(..., description="Unique file identifier")
    filename: str = Field(..., description="Original filename")
    size: int = Field(..., description="File size in bytes")
    content_type: str = Field(..., description="MIME content type")
    status: FileStatus = Field(..., description="Current file status")
    upload_time: datetime = Field(..., description="Upload timestamp")
    expires_at: Optional[datetime] = Field(None, description="Expiration timestamp")

class QueryResponse(BaseModel):
    """Response model for query submission."""
    
    query_id: str = Field(..., description="Unique query identifier")
    status: QueryStatus = Field(..., description="Query status")
    message: str = Field(..., description="Status message")
    
    class Config:
        schema_extra = {
            "example": {
                "query_id": "456e7890-e89b-12d3-a456-426614174001",
                "status": "started",
                "message": "Query processing started"
            }
        }

class QueryStatusResponse(BaseModel):
    """Response model for query status."""
    
    query_id: str = Field(..., description="Unique query identifier")
    status: QueryStatus = Field(..., description="Current processing status")
    progress_percentage: float = Field(..., ge=0, le=100, description="Progress percentage")
    current_step: int = Field(..., description="Current processing step")
    total_steps: int = Field(..., description="Total processing steps")
    message: str = Field(..., description="Current status message")
    started_at: Optional[datetime] = Field(None, description="Processing start time")
    updated_at: Optional[datetime] = Field(None, description="Last update time")
    error_message: Optional[str] = Field(None, description="Error message if failed")

class ChunkResultResponse(BaseModel):
    """Response model for individual chunk results."""
    
    chunk_id: str = Field(..., description="Chunk identifier")
    content: str = Field(..., description="Processed content")
    status: str = Field(..., description="Processing status")
    confidence_score: float = Field(..., ge=0, le=1, description="Confidence score")
    extraction_quality: str = Field(..., description="Quality assessment")
    tokens_used: int = Field(..., description="Tokens consumed")
    processing_time: float = Field(..., description="Processing time in seconds")

class ProcessingStatsResponse(BaseModel):
    """Response model for processing statistics."""
    
    total_chunks: int = Field(..., description="Total chunks processed")
    successful_chunks: int = Field(..., description="Successfully processed chunks")
    failed_chunks: int = Field(..., description="Failed chunks")
    total_tokens: int = Field(..., description="Total tokens consumed")
    total_cost: float = Field(..., description="Estimated total cost")
    processing_time: float = Field(..., description="Total processing time")
    model_used: str = Field(..., description="LLM model used")

class QueryResultResponse(BaseModel):
    """Response model for complete query results."""
    
    query_id: str = Field(..., description="Unique query identifier")
    original_query: str = Field(..., description="Original query text")
    intent: str = Field(..., description="Detected query intent")
    status: str = Field(..., description="Final processing status")
    answer: str = Field(..., description="Direct answer to the query")
    confidence_score: float = Field(..., ge=0, le=1, description="Overall confidence")
    completeness_score: float = Field(..., ge=0, le=1, description="Result completeness")
    relevance_score: float = Field(..., ge=0, le=1, description="Result relevance")
    chunk_results: List[ChunkResultResponse] = Field(..., description="Individual chunk results")
    aggregated_data: Dict[str, Any] = Field(..., description="Aggregated analysis data")
    processing_stats: ProcessingStatsResponse = Field(..., description="Processing statistics")
    created_at: Optional[datetime] = Field(None, description="Result creation time")
    
    class Config:
        schema_extra = {
            "example": {
                "query_id": "456e7890-e89b-12d3-a456-426614174001",
                "original_query": "Wie viel Kubikmeter Beton sind verbaut?",
                "intent": "quantity",
                "status": "completed",
                "answer": "Es sind insgesamt 125,5 Kubikmeter Beton verbaut.",
                "confidence_score": 0.92,
                "completeness_score": 0.95,
                "relevance_score": 0.88,
                "chunk_results": [
                    {
                        "chunk_id": "chunk_001",
                        "content": "Betonmenge: 75,2 m³ in Fundament",
                        "status": "completed",
                        "confidence_score": 0.95,
                        "extraction_quality": "high",
                        "tokens_used": 150,
                        "processing_time": 2.1
                    }
                ],
                "aggregated_data": {
                    "total_concrete_volume": 125.5,
                    "concrete_locations": ["Fundament", "Stützen", "Decken"],
                    "aggregation_method": "advanced"
                },
                "processing_stats": {
                    "total_chunks": 5,
                    "successful_chunks": 5,
                    "failed_chunks": 0,
                    "total_tokens": 750,
                    "total_cost": 0.015,
                    "processing_time": 45.2,
                    "model_used": "gemini-2.5-pro"
                },
                "created_at": "2024-01-15T10:30:00Z"
            }
        }