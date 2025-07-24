"""
IFC JSON Chunking System

A Python package for processing and chunking Industry Foundation Classes (IFC) 
data in JSON format for efficient storage and retrieval.
"""

__version__ = "0.1.0"
__author__ = "IFC JSON Chunking Team"
__email__ = "team@ifcjsonchunking.com"

from .core import ChunkingEngine
from .config import Config
from .exceptions import IFCChunkingError

__all__ = ["ChunkingEngine", "Config", "IFCChunkingError"]