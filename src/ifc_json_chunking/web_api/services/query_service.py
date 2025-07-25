"""
Query service for handling query processing integration.
"""

import asyncio
import time
import json
import uuid
from typing import Dict, Any, List, Optional
from pathlib import Path
import structlog

from ...config import Config
from ...core import ChunkingEngine
from ...orchestration.query_processor import QueryProcessor
from ...query.types import QueryRequest as CoreQueryRequest, QueryResult, QueryStatus, QueryIntent
from ...llm.types import LLMConfig, RateLimitConfig
from ..models.requests import QueryRequest as APIQueryRequest
from .file_service import FileService

logger = structlog.get_logger(__name__)

class QueryService:
    """Service for query processing operations."""
    
    def __init__(self, config: Config):
        """Initialize query service with configuration."""
        self.config = config
        self.file_service = FileService(config)
        
        # Initialize query processor
        llm_config = LLMConfig(
            api_key=config.gemini_api_key,
            model=config.target_llm_model,
            max_tokens=8000,
            timeout=config.request_timeout
        )
        
        rate_limit_config = RateLimitConfig(
            requests_per_minute=config.rate_limit_rpm,
            max_concurrent=config.max_concurrent_requests
        )
        
        self.query_processor = QueryProcessor(
            config=config,
            llm_config=llm_config,
            rate_limit_config=rate_limit_config
        )
        
        # Initialize chunking engine
        self.chunking_engine = ChunkingEngine(config)
        
        # Active queries tracking
        self._active_queries: Dict[str, Dict[str, Any]] = {}
        self._query_results: Dict[str, QueryResult] = {}
    
    async def validate_file_exists(self, file_id: str) -> None:
        """Validate that file exists and is ready for processing."""
        try:
            file_status = await self.file_service.get_file_status(file_id)
            
            if file_status["status"] != "uploaded":
                raise ValueError(f"File {file_id} is not ready for processing (status: {file_status['status']})")
            
            # Check if file actually exists
            file_path = Path(file_status["file_path"])
            if not file_path.exists():
                raise FileNotFoundError(f"File {file_id} not found on disk")
                
        except FileNotFoundError:
            raise FileNotFoundError(f"File {file_id} not found")
    
    async def create_query(self, request: APIQueryRequest) -> str:
        """
        Create a new query for processing.
        
        Returns:
            Query ID for tracking
        """
        query_id = str(uuid.uuid4())
        
        # Store query information
        self._active_queries[query_id] = {
            "query_id": query_id,
            "request": request,
            "status": "started",
            "created_at": time.time(),
            "updated_at": time.time(),
            "progress_percentage": 0.0,
            "current_step": 0,
            "total_steps": 4,  # preprocessing, chunking, processing, aggregation
            "message": "Query created, waiting for processing"
        }
        
        logger.info("Query created", query_id=query_id, file_id=request.file_id)
        
        return query_id
    
    async def process_query_background(self, query_id: str, request: APIQueryRequest) -> None:
        """
        Process query in background task.
        
        This method handles the complete query processing pipeline.
        """
        try:
            await self._update_query_status(query_id, "preprocessing", 0, "Loading and chunking file")
            
            # Load file and create chunks
            file_status = await self.file_service.get_file_status(request.file_id)
            file_path = Path(file_status["file_path"])
            
            # Read and parse file
            with open(file_path, 'r', encoding='utf-8') as f:
                file_content = f.read()
            
            try:
                json_data = json.loads(file_content)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON file: {str(e)}")
            
            await self._update_query_status(query_id, "processing", 1, "Creating semantic chunks")
            
            # Create chunks using the chunking engine
            chunks = await self.chunking_engine.chunk_json_async(
                json_data=json_data,
                chunking_strategy="hierarchical"  # Use hierarchical strategy
            )
            
            if not chunks:
                raise ValueError("No chunks could be created from the file")
            
            await self._update_query_status(query_id, "processing", 2, f"Processing {len(chunks)} chunks with LLM")
            
            # Create core query request
            core_request = CoreQueryRequest(
                query=request.query,
                chunks=chunks,
                intent_hint=QueryIntent(request.intent_hint.value) if request.intent_hint else None,
                max_concurrent=request.max_concurrent or 10,
                timeout_seconds=request.timeout_seconds or 300,
                cache_results=request.cache_results,
                progress_callback=lambda event: self._handle_progress_event(query_id, event)
            )
            
            # Process query
            result = await self.query_processor.process_request(core_request)
            
            await self._update_query_status(query_id, "completed", 4, "Query processing completed")
            
            # Store result
            self._query_results[query_id] = result
            
            logger.info(
                "Query processing completed successfully",
                query_id=query_id,
                intent=result.intent.value,
                confidence=result.confidence_score,
                processing_time=result.processing_time
            )
            
        except Exception as e:
            logger.error("Query processing failed", query_id=query_id, error=str(e))
            await self._update_query_status(
                query_id, "failed", 0, f"Processing failed: {str(e)}", error_message=str(e)
            )
    
    async def _update_query_status(
        self,
        query_id: str,
        status: str,
        current_step: int,
        message: str,
        error_message: Optional[str] = None
    ) -> None:
        """Update query status information."""
        if query_id in self._active_queries:
            query_info = self._active_queries[query_id]
            query_info.update({
                "status": status,
                "current_step": current_step,
                "progress_percentage": (current_step / query_info["total_steps"]) * 100,
                "message": message,
                "updated_at": time.time()
            })
            
            if error_message:
                query_info["error_message"] = error_message
            
            logger.debug("Query status updated", query_id=query_id, status=status, message=message)
    
    def _handle_progress_event(self, query_id: str, event) -> None:
        """Handle progress events from query processor."""
        # This could be enhanced to broadcast via WebSocket
        logger.debug(
            "Progress event received",
            query_id=query_id,
            event_type=event.event_type.value,
            message=event.message,
            progress=event.progress_percentage
        )
    
    async def get_query_status(self, query_id: str) -> Optional[Dict[str, Any]]:
        """Get current query status."""
        return self._active_queries.get(query_id)
    
    async def get_query_results(self, query_id: str) -> Optional[QueryResult]:
        """Get query processing results."""
        return self._query_results.get(query_id)
    
    async def cancel_query(self, query_id: str) -> bool:
        """Cancel query processing."""
        if query_id in self._active_queries:
            # Try to cancel with query processor
            cancelled = await self.query_processor.cancel_query(query_id)
            
            if cancelled:
                await self._update_query_status(query_id, "cancelled", 0, "Query cancelled by user")
            
            return cancelled
        
        return False
    
    async def list_queries(
        self,
        limit: int = 50,
        offset: int = 0,
        status_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """List queries with optional filtering."""
        queries = list(self._active_queries.values())
        
        # Apply status filter
        if status_filter:
            queries = [q for q in queries if q["status"] == status_filter]
        
        # Sort by creation time (newest first)
        queries.sort(key=lambda x: x["created_at"], reverse=True)
        
        # Apply pagination
        return queries[offset:offset + limit]
    
    async def cleanup_old_queries(self, max_age_hours: int = 24) -> int:
        """Clean up old queries and results."""
        cutoff_time = time.time() - (max_age_hours * 3600)
        cleaned_count = 0
        
        # Clean up active queries
        old_query_ids = [
            qid for qid, info in self._active_queries.items()
            if info["created_at"] < cutoff_time
        ]
        
        for query_id in old_query_ids:
            del self._active_queries[query_id]
            if query_id in self._query_results:
                del self._query_results[query_id]
            cleaned_count += 1
        
        if cleaned_count > 0:
            logger.info("Cleaned up old queries", count=cleaned_count)
        
        return cleaned_count
    
    async def get_query_statistics(self) -> Dict[str, Any]:
        """Get query processing statistics."""
        total_queries = len(self._active_queries)
        completed_queries = len([q for q in self._active_queries.values() if q["status"] == "completed"])
        failed_queries = len([q for q in self._active_queries.values() if q["status"] == "failed"])
        
        return {
            "total_queries": total_queries,
            "completed_queries": completed_queries,
            "failed_queries": failed_queries,
            "success_rate": (completed_queries / total_queries * 100) if total_queries > 0 else 0.0,
            "active_queries": len([q for q in self._active_queries.values() if q["status"] in ["started", "preprocessing", "processing"]]),
            "stored_results": len(self._query_results)
        }