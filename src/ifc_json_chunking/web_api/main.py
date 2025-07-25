"""
FastAPI main application for IFC JSON Chunking web interface.

This module creates the FastAPI application with all routers, middleware,
and configuration for the web API.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import structlog

from ..config import Config
from .routers import health, files, queries, websocket
from .middleware.logging import LoggingMiddleware

logger = structlog.get_logger(__name__)

# Initialize configuration
config = Config()

# Create FastAPI application
app = FastAPI(
    title="IFC JSON Chunking API",
    description="Modern web interface for IFC building data analysis with German language support",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom middleware
app.add_middleware(LoggingMiddleware)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(files.router, prefix="/api", tags=["files"])
app.include_router(queries.router, prefix="/api", tags=["queries"])
app.include_router(websocket.router, prefix="/api", tags=["websocket"])

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    logger.info("Starting IFC JSON Chunking API", version=app.version)

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up application on shutdown."""
    logger.info("Shutting down IFC JSON Chunking API")

@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint redirecting to documentation."""
    return {
        "message": "IFC JSON Chunking API",
        "version": app.version,
        "docs": "/api/docs",
        "redoc": "/api/redoc"
    }