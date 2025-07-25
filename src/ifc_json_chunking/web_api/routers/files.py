"""
File upload and management endpoints.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import Dict, Any, List
import uuid
import time
import aiofiles
import structlog
from pathlib import Path

from ...config import Config
from ..services.file_service import FileService
from ..models.responses import FileUploadResponse, FileStatusResponse

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize file service
config = Config()
file_service = FileService(config)

@router.post("/files/upload", 
    response_model=FileUploadResponse,
    summary="Upload IFC or JSON file for processing"
)
async def upload_file(
    file: UploadFile = File(..., description="IFC or JSON file to upload")
) -> FileUploadResponse:
    """
    Upload a file for IFC analysis.
    
    Supported formats:
    - JSON files with IFC data
    - IFC files (will be converted to JSON)
    - Maximum size: 100MB
    
    Returns file ID for tracking and processing.
    """
    start_time = time.time()
    
    try:
        # Validate file
        await file_service.validate_upload_file(file)
        
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        
        # Save file
        file_path = await file_service.save_upload_file(file, file_id)
        
        # Get file info
        file_info = await file_service.get_file_info(file_path)
        
        processing_time = time.time() - start_time
        
        logger.info(
            "File uploaded successfully",
            file_id=file_id,
            filename=file.filename,
            size=file_info["size"],
            processing_time=processing_time
        )
        
        return FileUploadResponse(
            file_id=file_id,
            filename=file.filename,
            size=file_info["size"],
            content_type=file.content_type,
            status="uploaded",
            processing_time=processing_time
        )
        
    except ValueError as e:
        logger.warning("File validation failed", error=str(e), filename=file.filename)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("File upload failed", error=str(e), filename=file.filename)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/files/{file_id}/status",
    response_model=FileStatusResponse,
    summary="Get file status and information"
)
async def get_file_status(file_id: str) -> FileStatusResponse:
    """
    Get status and information about uploaded file.
    
    Returns file metadata, processing status, and availability.
    """
    try:
        file_info = await file_service.get_file_status(file_id)
        
        return FileStatusResponse(
            file_id=file_id,
            filename=file_info["filename"],
            size=file_info["size"],
            content_type=file_info["content_type"],
            status=file_info["status"],
            upload_time=file_info["upload_time"],
            expires_at=file_info.get("expires_at")
        )
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        logger.error("Error getting file status", file_id=file_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error retrieving file status: {str(e)}")

@router.delete("/files/{file_id}",
    summary="Delete uploaded file"
)
async def delete_file(file_id: str) -> Dict[str, str]:
    """
    Delete uploaded file and associated data.
    
    This will permanently remove the file and cannot be undone.
    """
    try:
        await file_service.delete_file(file_id)
        
        logger.info("File deleted successfully", file_id=file_id)
        
        return {
            "file_id": file_id,
            "status": "deleted",
            "message": "File deleted successfully"
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        logger.error("Error deleting file", file_id=file_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

@router.get("/files",
    summary="List uploaded files"
)
async def list_files(limit: int = 50, offset: int = 0) -> Dict[str, Any]:
    """
    List recently uploaded files.
    
    Returns paginated list of uploaded files with basic metadata.
    """
    try:
        files = await file_service.list_files(limit=limit, offset=offset)
        
        return {
            "files": files,
            "total": len(files),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error("Error listing files", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")