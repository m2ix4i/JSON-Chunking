"""
File service for handling uploads, validation, and storage.
"""

import json
import time
from pathlib import Path
from typing import Any, Dict, List

import aiofiles
import structlog
from fastapi import UploadFile

from ...config import Config

logger = structlog.get_logger(__name__)

class FileService:
    """Service for file upload and management operations."""

    def __init__(self, config: Config):
        """Initialize file service with configuration."""
        self.config = config
        self.upload_dir = Path("temp/uploads")
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        # File size limits (in bytes)
        self.max_file_size = 100 * 1024 * 1024  # 100MB
        self.allowed_content_types = [
            "application/json",
            "text/json",
            "application/octet-stream",  # For binary IFC files
            "text/plain"
        ]
        self.allowed_extensions = [".json", ".ifc", ".txt"]

    async def validate_upload_file(self, file: UploadFile) -> None:
        """
        Validate uploaded file meets requirements.
        
        Raises:
            ValueError: If file doesn't meet requirements
        """
        # Check file size
        if hasattr(file, 'size') and file.size and file.size > self.max_file_size:
            raise ValueError(f"File size {file.size} bytes exceeds maximum {self.max_file_size} bytes")

        # Check content type
        if file.content_type not in self.allowed_content_types:
            raise ValueError(f"Content type {file.content_type} not allowed")

        # Check file extension
        if file.filename:
            file_ext = Path(file.filename).suffix.lower()
            if file_ext not in self.allowed_extensions:
                raise ValueError(f"File extension {file_ext} not allowed")

        # Additional content validation for JSON files
        if file.content_type in ["application/json", "text/json"]:
            await self._validate_json_content(file)

    async def _validate_json_content(self, file: UploadFile) -> None:
        """Validate JSON file content."""
        try:
            # Read entire file content for validation
            content = await file.read()
            await file.seek(0)  # Reset file pointer

            # Try to parse as JSON
            if content:
                json.loads(content.decode('utf-8'))

        except json.JSONDecodeError:
            raise ValueError("Invalid JSON file format")
        except UnicodeDecodeError:
            raise ValueError("File encoding not supported")
        except MemoryError:
            # For extremely large files, skip content validation
            logger.warning("File too large for JSON validation, skipping content check")
            pass

    async def save_upload_file(self, file: UploadFile, file_id: str) -> Path:
        """
        Save uploaded file to temporary storage.
        
        Returns:
            Path to saved file
        """
        # Create file path
        file_ext = Path(file.filename).suffix if file.filename else ".bin"
        file_path = self.upload_dir / f"{file_id}{file_ext}"

        try:
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                while chunk := await file.read(8192):  # Read in 8KB chunks
                    await f.write(chunk)

            # Create metadata file
            metadata = {
                "file_id": file_id,
                "filename": file.filename,
                "content_type": file.content_type,
                "upload_time": time.time(),
                "file_path": str(file_path),
                "status": "uploaded"
            }

            metadata_path = self.upload_dir / f"{file_id}.meta"
            async with aiofiles.open(metadata_path, 'w') as f:
                await f.write(json.dumps(metadata, indent=2))

            logger.info(
                "File saved successfully",
                file_id=file_id,
                filename=file.filename,
                file_path=str(file_path)
            )

            return file_path

        except Exception as e:
            # Clean up on error
            if file_path.exists():
                file_path.unlink()
            raise Exception(f"Failed to save file: {str(e)}")

    async def get_file_info(self, file_path: Path) -> Dict[str, Any]:
        """Get file information."""
        stat = file_path.stat()
        return {
            "size": stat.st_size,
            "created": stat.st_ctime,
            "modified": stat.st_mtime
        }

    async def get_file_status(self, file_id: str) -> Dict[str, Any]:
        """Get file status and metadata."""
        metadata_path = self.upload_dir / f"{file_id}.meta"

        if not metadata_path.exists():
            raise FileNotFoundError(f"File {file_id} not found")

        async with aiofiles.open(metadata_path) as f:
            metadata = json.loads(await f.read())

        # Check if actual file still exists
        file_path = Path(metadata["file_path"])
        if not file_path.exists():
            metadata["status"] = "missing"

        return metadata

    async def delete_file(self, file_id: str) -> None:
        """Delete file and metadata."""
        metadata_path = self.upload_dir / f"{file_id}.meta"

        if not metadata_path.exists():
            raise FileNotFoundError(f"File {file_id} not found")

        # Get metadata to find file path
        async with aiofiles.open(metadata_path) as f:
            metadata = json.loads(await f.read())

        # Delete actual file
        file_path = Path(metadata["file_path"])
        if file_path.exists():
            file_path.unlink()

        # Delete metadata
        metadata_path.unlink()

        logger.info("File deleted", file_id=file_id)

    async def list_files(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """List uploaded files with pagination."""
        files = []

        # Get all metadata files
        metadata_files = list(self.upload_dir.glob("*.meta"))
        metadata_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

        # Apply pagination
        for metadata_file in metadata_files[offset:offset + limit]:
            try:
                async with aiofiles.open(metadata_file) as f:
                    metadata = json.loads(await f.read())

                # Check if file still exists
                file_path = Path(metadata["file_path"])
                metadata["exists"] = file_path.exists()

                files.append(metadata)

            except Exception as e:
                logger.warning("Error reading metadata file",
                             file=str(metadata_file), error=str(e))
                continue

        return files

    async def cleanup_expired_files(self, max_age_hours: int = 24) -> int:
        """Clean up files older than specified age."""
        cutoff_time = time.time() - (max_age_hours * 3600)
        cleaned_count = 0

        metadata_files = list(self.upload_dir.glob("*.meta"))

        for metadata_file in metadata_files:
            try:
                if metadata_file.stat().st_mtime < cutoff_time:
                    # Read metadata to get file path
                    async with aiofiles.open(metadata_file) as f:
                        metadata = json.loads(await f.read())

                    # Delete actual file
                    file_path = Path(metadata["file_path"])
                    if file_path.exists():
                        file_path.unlink()

                    # Delete metadata
                    metadata_file.unlink()

                    cleaned_count += 1

            except Exception as e:
                logger.warning("Error cleaning up file",
                             file=str(metadata_file), error=str(e))
                continue

        if cleaned_count > 0:
            logger.info("Cleaned up expired files", count=cleaned_count)

        return cleaned_count
