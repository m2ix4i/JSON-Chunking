"""
Request models for API endpoints.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from enum import Enum

class QueryIntentHint(str, Enum):
    """Query intent hints for processing optimization."""
    QUANTITY = "quantity"
    COMPONENT = "component" 
    MATERIAL = "material"
    SPATIAL = "spatial"
    COST = "cost"
    RELATIONSHIP = "relationship"
    PROPERTY = "property"

class QueryRequest(BaseModel):
    """Request model for submitting queries."""
    
    query: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description="Query in German for IFC data analysis",
        example="Wie viel Kubikmeter Beton sind verbaut?"
    )
    
    file_id: str = Field(
        ...,
        description="ID of uploaded file to analyze",
        example="123e4567-e89b-12d3-a456-426614174000"
    )
    
    intent_hint: Optional[QueryIntentHint] = Field(
        None,
        description="Optional hint about query intent for optimization"
    )
    
    max_concurrent: Optional[int] = Field(
        default=10,
        ge=1,
        le=50,
        description="Maximum concurrent chunk processing requests"
    )
    
    timeout_seconds: Optional[int] = Field(
        default=300,
        ge=30,
        le=1800,
        description="Maximum processing timeout in seconds"
    )
    
    cache_results: Optional[bool] = Field(
        default=True,
        description="Whether to cache results for future similar queries"
    )
    
    options: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional processing options"
    )
    
    @validator("query")
    def validate_query(cls, v):
        """Validate query content."""
        if not v.strip():
            raise ValueError("Query cannot be empty")
        
        # Check for potential injection attempts
        suspicious_patterns = ["<script", "javascript:", "eval(", "exec("]
        if any(pattern in v.lower() for pattern in suspicious_patterns):
            raise ValueError("Query contains suspicious content")
        
        return v.strip()
    
    @validator("file_id")
    def validate_file_id(cls, v):
        """Validate file ID format."""
        if not v.strip():
            raise ValueError("File ID cannot be empty")
        
        # Basic UUID format validation
        import re
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        if not re.match(uuid_pattern, v.lower()):
            raise ValueError("Invalid file ID format")
        
        return v.strip()

    class Config:
        """Pydantic configuration."""
        schema_extra = {
            "example": {
                "query": "Wie viel Kubikmeter Beton sind verbaut?",
                "file_id": "123e4567-e89b-12d3-a456-426614174000",
                "intent_hint": "quantity",
                "max_concurrent": 10,
                "timeout_seconds": 300,
                "cache_results": True,
                "options": {
                    "precision_level": "standard",
                    "include_metadata": True
                }
            }
        }