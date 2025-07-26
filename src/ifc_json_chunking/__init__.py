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
from .config import Config
from .core import ChunkingEngine
from .exceptions import ChunkingError, ConfigurationError, IFCChunkingError, ValidationError

# LLM Integration
from .llm import ChunkProcessor, GeminiClient, RateLimiter
from .llm.types import LLMConfig, ProcessingRequest, ProcessingResponse
from .models import Chunk, ChunkType

# Query Processing & Orchestration
from .orchestration import IntentClassifier, QueryProcessor
from .query.types import ProgressEvent, QueryIntent, QueryRequest, QueryResult, QueryStatus

# Storage & Caching
from .storage import QueryCache, ResultValidator, TemporaryStorage
from .strategy import ChunkingStrategy

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
