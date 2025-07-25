"""
IFC JSON Chunking System

A Python package for processing and chunking Industry Foundation Classes (IFC) 
data in JSON format with semantic chunking strategies, LLM integration, 
and intelligent query orchestration for efficient storage and retrieval.
"""

__version__ = "0.4.0"
__author__ = "IFC JSON Chunking Team"
__email__ = "team@ifcjsonchunking.com"

# Core functionality
from .core import ChunkingEngine
from .config import Config
from .exceptions import IFCChunkingError, ChunkingError, ValidationError, ConfigurationError
from .models import Chunk, ChunkType, ChunkingStrategy

# LLM Integration
from .llm import GeminiClient, ChunkProcessor, RateLimiter
from .llm.types import LLMConfig, ProcessingRequest, ProcessingResponse

# Query Processing & Orchestration
from .orchestration import QueryProcessor, IntentClassifier
from .query.types import (
    QueryRequest,
    QueryResult,
    QueryIntent,
    QueryStatus,
    ProgressEvent
)

# Storage & Caching
from .storage import TemporaryStorage, QueryCache, ResultValidator

__all__ = [
    # Core functionality
    "ChunkingEngine",
    "Config", 
    "IFCChunkingError",
    "ChunkingError",
    "ValidationError",
    "ConfigurationError",
    "Chunk",
    "ChunkType",
    "ChunkingStrategy",
    
    # LLM Integration
    "GeminiClient",
    "ChunkProcessor",
    "RateLimiter",
    "LLMConfig",
    "ProcessingRequest",
    "ProcessingResponse",
    
    # Query Processing & Orchestration
    "QueryProcessor",
    "IntentClassifier", 
    "QueryRequest",
    "QueryResult",
    "QueryIntent",
    "QueryStatus",
    "ProgressEvent",
    
    # Storage & Caching
    "TemporaryStorage",
    "QueryCache",
    "ResultValidator"
]