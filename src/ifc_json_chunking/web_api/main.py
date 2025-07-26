"""
FastAPI main application for IFC JSON Chunking web interface.

This module creates the FastAPI application with all routers, middleware,
and configuration for the web API with performance monitoring.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import structlog

from ..config import Config
from .routers import health, files, queries, websocket, demo
from .middleware.logging import LoggingMiddleware
from ..monitoring.metrics_collector import MetricsCollector
from ..monitoring.memory_profiler import MemoryProfiler
from ..storage.redis_cache import RedisCache

logger = structlog.get_logger(__name__)

# Initialize configuration
config = Config()

# Initialize performance monitoring components
metrics_collector = MetricsCollector(config)
memory_profiler = MemoryProfiler(config)
redis_cache = RedisCache(config)

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
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom middleware
app.add_middleware(LoggingMiddleware)

# Add performance monitoring to app state
app.state.config = config
app.state.metrics_collector = metrics_collector
app.state.memory_profiler = memory_profiler
app.state.redis_cache = redis_cache

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(files.router, prefix="/api", tags=["files"])
app.include_router(queries.router, prefix="/api", tags=["queries"])
app.include_router(websocket.router, prefix="/api", tags=["websocket"])
app.include_router(demo.router, prefix="/api", tags=["demo"])

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    logger.info("Starting IFC JSON Chunking API", version=app.version)
    
    # Initialize performance monitoring
    try:
        await redis_cache.connect()
        metrics_collector.start_collection()
        memory_profiler.start_monitoring()
        logger.info("Performance monitoring initialized successfully")
    except Exception as e:
        logger.warning("Failed to initialize performance monitoring", error=str(e))

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up application on shutdown."""
    logger.info("Shutting down IFC JSON Chunking API")
    
    # Cleanup performance monitoring
    try:
        memory_profiler.stop_monitoring()
        metrics_collector.stop_collection()
        await redis_cache.disconnect()
        logger.info("Performance monitoring cleanup complete")
    except Exception as e:
        logger.warning("Error during monitoring cleanup", error=str(e))

@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint redirecting to documentation."""
    return {
        "message": "IFC JSON Chunking API",
        "version": app.version,
        "docs": "/api/docs",
        "redoc": "/api/redoc"
    }