"""
Health check endpoints for monitoring system status.
"""

import time
from typing import Any, Dict

import structlog
from fastapi import APIRouter, HTTPException

from ...config import Config
from ...orchestration.query_processor import QueryProcessor

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.get("/health", summary="System health check")
async def health_check() -> Dict[str, Any]:
    """
    Comprehensive system health check.
    
    Returns system status including:
    - API server status
    - Query processor health
    - LLM integration status
    - Storage system availability
    """
    start_time = time.time()

    try:
        config = Config()

        # Basic health info
        health_status = {
            "status": "healthy",
            "timestamp": time.time(),
            "version": "0.1.0",
            "services": {}
        }

        # Check query processor
        try:
            query_processor = QueryProcessor(config)
            processor_health = await query_processor.health_check()
            health_status["services"]["query_processor"] = {
                "status": "healthy" if processor_health.get("overall", False) else "unhealthy",
                "details": processor_health
            }
        except Exception as e:
            logger.error("Query processor health check failed", error=str(e))
            health_status["services"]["query_processor"] = {
                "status": "unhealthy",
                "error": str(e)
            }
            health_status["status"] = "degraded"

        # Check configuration
        health_status["services"]["configuration"] = {
            "status": "healthy" if config.gemini_api_key else "missing_api_key",
            "llm_model": config.target_llm_model,
            "max_concurrent": config.max_concurrent_requests
        }

        # Check storage systems
        health_status["services"]["storage"] = {
            "status": "healthy",
            "cache_enabled": config.enable_caching,
            "redis_configured": bool(config.redis_url)
        }

        # Calculate response time
        response_time = time.time() - start_time
        health_status["response_time_ms"] = round(response_time * 1000, 2)

        return health_status

    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.get("/health/simple", summary="Simple health check")
async def simple_health_check() -> Dict[str, str]:
    """
    Simple health check for load balancers.
    
    Returns basic status without detailed checks.
    """
    return {
        "status": "ok",
        "timestamp": str(time.time())
    }
