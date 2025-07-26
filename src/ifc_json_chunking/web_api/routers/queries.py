"""
Query processing endpoints for IFC data analysis with performance monitoring.
"""

from typing import Any, Dict, Optional

import structlog
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from ..models.requests import QueryRequest as APIQueryRequest
from ..models.responses import QueryResponse, QueryResultResponse, QueryStatusResponse
from ..services.query_service import QueryService

logger = structlog.get_logger(__name__)
router = APIRouter()

def get_query_service(request: Request) -> QueryService:
    """Get QueryService instance with monitoring components from app state."""
    return QueryService(
        config=request.app.state.config,
        metrics_collector=request.app.state.metrics_collector,
        memory_profiler=request.app.state.memory_profiler,
        redis_cache=request.app.state.redis_cache
    )

@router.post("/queries",
    response_model=QueryResponse,
    summary="Submit query for IFC data analysis"
)
async def submit_query(
    query_request: APIQueryRequest,
    background_tasks: BackgroundTasks,
    request: Request
) -> QueryResponse:
    """
    Submit a query for processing against uploaded IFC data.
    
    Supports German building industry queries:
    - Quantity analysis: "Wie viel Kubikmeter Beton sind verbaut?"
    - Component identification: "Welche Türen sind im 2. Stock?"
    - Material analysis: "Material der Stützen"
    - Spatial queries: "Was ist in Raum R101?"
    - Cost analysis: "Kosten für Stahlträger"
    
    Returns query ID for tracking progress via WebSocket or status endpoint.
    """
    try:
        # Get query service with monitoring components
        query_service = get_query_service(request)

        # Validate file exists
        await query_service.validate_file_exists(query_request.file_id)

        # Create query processing task
        query_id = await query_service.create_query(query_request)

        # Start background processing
        background_tasks.add_task(
            query_service.process_query_background,
            query_id,
            query_request
        )

        logger.info(
            "Query submitted for processing",
            query_id=query_id,
            file_id=request.file_id,
            query=request.query[:100]  # Log first 100 chars
        )

        return QueryResponse(
            query_id=query_id,
            status="started",
            message="Query processing started"
        )

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error submitting query", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error submitting query: {str(e)}")

@router.get("/queries/{query_id}/status",
    response_model=QueryStatusResponse,
    summary="Get query processing status"
)
async def get_query_status(query_id: str, request: Request) -> QueryStatusResponse:
    """
    Get current status of query processing.
    
    Returns processing progress, current stage, and any errors.
    Use WebSocket endpoint for real-time updates.
    """
    try:
        query_service = get_query_service(request)
        status = await query_service.get_query_status(query_id)

        if not status:
            raise HTTPException(status_code=404, detail="Query not found")

        return QueryStatusResponse(
            query_id=query_id,
            status=status["status"],
            progress_percentage=status.get("progress_percentage", 0.0),
            current_step=status.get("current_step", 0),
            total_steps=status.get("total_steps", 0),
            message=status.get("message", ""),
            started_at=status.get("started_at"),
            updated_at=status.get("updated_at"),
            error_message=status.get("error_message")
        )

    except Exception as e:
        logger.error("Error getting query status", query_id=query_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error retrieving query status: {str(e)}")

@router.get("/queries/{query_id}/results",
    response_model=QueryResultResponse,
    summary="Get query processing results"
)
async def get_query_results(query_id: str, request: Request) -> QueryResultResponse:
    """
    Get final results of completed query processing.
    
    Returns structured analysis results with:
    - Direct answer to the query
    - Detailed findings by chunk
    - Aggregated data and metrics
    - Processing statistics
    """
    try:
        query_service = get_query_service(request)
        results = await query_service.get_query_results(query_id)

        if not results:
            raise HTTPException(status_code=404, detail="Query results not found")

        # Check if query is completed
        if results.status != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Query not completed yet. Status: {results.status}"
            )

        return QueryResultResponse(
            query_id=query_id,
            original_query=results.original_query,
            intent=results.intent.value,
            status=results.status.value,
            answer=results.answer,
            confidence_score=results.confidence_score,
            completeness_score=results.completeness_score,
            relevance_score=results.relevance_score,
            chunk_results=[
                {
                    "chunk_id": cr.chunk_id,
                    "content": cr.content,
                    "status": cr.status,
                    "confidence_score": cr.confidence_score,
                    "extraction_quality": cr.extraction_quality,
                    "tokens_used": cr.tokens_used,
                    "processing_time": cr.processing_time
                }
                for cr in results.chunk_results
            ],
            aggregated_data=results.aggregated_data,
            processing_stats={
                "total_chunks": results.total_chunks,
                "successful_chunks": results.successful_chunks,
                "failed_chunks": results.failed_chunks,
                "total_tokens": results.total_tokens,
                "total_cost": results.total_cost,
                "processing_time": results.processing_time,
                "model_used": results.model_used
            },
            created_at=results.created_at if hasattr(results, 'created_at') else None
        )

    except Exception as e:
        logger.error("Error getting query results", query_id=query_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error retrieving query results: {str(e)}")

@router.delete("/queries/{query_id}",
    summary="Cancel query processing"
)
async def cancel_query(query_id: str, request: Request) -> Dict[str, str]:
    """
    Cancel ongoing query processing.
    
    Attempts to stop processing gracefully and clean up resources.
    """
    try:
        query_service = get_query_service(request)
        cancelled = await query_service.cancel_query(query_id)

        if not cancelled:
            raise HTTPException(status_code=404, detail="Query not found or cannot be cancelled")

        logger.info("Query cancelled successfully", query_id=query_id)

        return {
            "query_id": query_id,
            "status": "cancelled",
            "message": "Query processing cancelled"
        }

    except Exception as e:
        logger.error("Error cancelling query", query_id=query_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error cancelling query: {str(e)}")

@router.get("/queries",
    summary="List recent queries"
)
async def list_queries(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    request: Request = None
) -> Dict[str, Any]:
    """
    List recent queries with optional status filtering.
    
    Returns paginated list of queries with basic information.
    """
    try:
        query_service = get_query_service(request)
        queries = await query_service.list_queries(
            limit=limit,
            offset=offset,
            status_filter=status
        )

        return {
            "queries": queries,
            "total": len(queries),
            "limit": limit,
            "offset": offset,
            "status_filter": status
        }

    except Exception as e:
        logger.error("Error listing queries", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error listing queries: {str(e)}")
