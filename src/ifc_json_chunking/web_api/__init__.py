"""
Web API package for IFC JSON Chunking system.

This package provides a modern FastAPI-based web interface with:
- RESTful API endpoints for file upload and query processing
- WebSocket support for real-time progress tracking
- Interactive API documentation
- German language support for building industry professionals
"""

from .main import app

__all__ = ["app"]