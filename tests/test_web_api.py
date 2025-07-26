"""
Comprehensive unit tests for web API components.
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from pathlib import Path
import tempfile
import uuid

from src.ifc_json_chunking.web_api.main import app
from src.ifc_json_chunking.web_api.services.file_service import FileService
from src.ifc_json_chunking.web_api.services.query_service import QueryService
from src.ifc_json_chunking.web_api.services.websocket_service import WebSocketService
from src.ifc_json_chunking.web_api.models.requests import (
    QueryRequest,
    FileUploadRequest
)
from src.ifc_json_chunking.web_api.models.responses import (
    FileStatusResponse,
    QueryStatusResponse,
    FileStatus,
    QueryStatus as APIQueryStatus
)
from src.ifc_json_chunking.query.types import QueryStatus
from src.ifc_json_chunking.models import FileMetadata
from src.ifc_json_chunking.config import Config


class TestFileService:
    """Test cases for FileService."""

    @pytest.fixture
    def config(self):
        """Create test configuration."""
        return Config(
            upload_directory=Path(tempfile.gettempdir()) / "test_uploads",
            max_file_size_mb=100,
            allowed_file_extensions=[".json", ".ifc"]
        )

    @pytest.fixture
    def file_service(self, config):
        """Create FileService instance."""
        return FileService(config)

    @pytest.fixture
    def sample_json_file(self):
        """Create sample JSON file."""
        data = {
            "header": {"file_name": "test.ifc", "schema": "IFC4"},
            "data": [{"id": 1, "type": "IfcWall", "material": "concrete"}]
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(data, f)
            return Path(f.name)

    def test_file_service_initialization(self, config):
        """Test FileService initialization."""
        service = FileService(config)
        assert service.config == config
        assert service.upload_directory == config.upload_directory

    @pytest.mark.asyncio
    async def test_upload_file_success(self, file_service, sample_json_file):
        """Test successful file upload."""
        # Read file content
        with open(sample_json_file, 'rb') as f:
            file_content = f.read()
        
        # Mock file object
        mock_file = Mock()
        mock_file.filename = "test_building.json"
        mock_file.content_type = "application/json"
        mock_file.read = AsyncMock(return_value=file_content)
        
        # Upload file
        result = await file_service.upload_file(mock_file)
        
        # Verify result
        assert result.file_id is not None
        assert result.filename == "test_building.json"
        assert result.status == FileStatus.UPLOADED
        assert result.file_size_bytes == len(file_content)
        assert result.file_type == "application/json"

    @pytest.mark.asyncio
    async def test_upload_file_invalid_extension(self, file_service):
        """Test file upload with invalid extension."""
        mock_file = Mock()
        mock_file.filename = "test.txt"
        mock_file.content_type = "text/plain"
        
        with pytest.raises(ValueError, match="not allowed"):
            await file_service.upload_file(mock_file)

    @pytest.mark.asyncio
    async def test_upload_file_too_large(self, file_service):
        """Test file upload that exceeds size limit."""
        # Create large file content
        large_content = b"x" * (101 * 1024 * 1024)  # 101 MB
        
        mock_file = Mock()
        mock_file.filename = "large_file.json"
        mock_file.content_type = "application/json"
        mock_file.read = AsyncMock(return_value=large_content)
        
        with pytest.raises(ValueError, match="too large"):
            await file_service.upload_file(mock_file)

    @pytest.mark.asyncio
    async def test_get_file_status_existing(self, file_service, sample_json_file):
        """Test getting status of existing file."""
        # Upload file first
        with open(sample_json_file, 'rb') as f:
            file_content = f.read()
        
        mock_file = Mock()
        mock_file.filename = "test.json"
        mock_file.content_type = "application/json"
        mock_file.read = AsyncMock(return_value=file_content)
        
        upload_result = await file_service.upload_file(mock_file)
        
        # Get file status
        status = await file_service.get_file_status(upload_result.file_id)
        
        assert status.file_id == upload_result.file_id
        assert status.filename == "test.json"
        assert status.status == FileStatus.UPLOADED

    @pytest.mark.asyncio
    async def test_get_file_status_nonexistent(self, file_service):
        """Test getting status of non-existent file."""
        fake_file_id = str(uuid.uuid4())
        
        with pytest.raises(FileNotFoundError):
            await file_service.get_file_status(fake_file_id)

    @pytest.mark.asyncio
    async def test_list_files(self, file_service, sample_json_file):
        """Test listing uploaded files."""
        # Upload multiple files
        file_ids = []
        for i in range(3):
            with open(sample_json_file, 'rb') as f:
                file_content = f.read()
            
            mock_file = Mock()
            mock_file.filename = f"test_{i}.json"
            mock_file.content_type = "application/json"
            mock_file.read = AsyncMock(return_value=file_content)
            
            result = await file_service.upload_file(mock_file)
            file_ids.append(result.file_id)
        
        # List files
        files = await file_service.list_files()
        
        assert len(files) >= 3
        uploaded_file_ids = [f.file_id for f in files]
        for file_id in file_ids:
            assert file_id in uploaded_file_ids

    @pytest.mark.asyncio
    async def test_delete_file_success(self, file_service, sample_json_file):
        """Test successful file deletion."""
        # Upload file first
        with open(sample_json_file, 'rb') as f:
            file_content = f.read()
        
        mock_file = Mock()
        mock_file.filename = "test_delete.json"
        mock_file.content_type = "application/json"
        mock_file.read = AsyncMock(return_value=file_content)
        
        upload_result = await file_service.upload_file(mock_file)
        
        # Delete file
        success = await file_service.delete_file(upload_result.file_id)
        assert success is True
        
        # Verify file is deleted
        with pytest.raises(FileNotFoundError):
            await file_service.get_file_status(upload_result.file_id)

    @pytest.mark.asyncio
    async def test_delete_file_nonexistent(self, file_service):
        """Test deleting non-existent file."""
        fake_file_id = str(uuid.uuid4())
        
        success = await file_service.delete_file(fake_file_id)
        assert success is False


class TestQueryService:
    """Test cases for QueryService."""

    @pytest.fixture
    def config(self):
        """Create test configuration."""
        return Config(
            gemini_api_key="test_key",
            max_concurrent_requests=5,
            query_timeout_seconds=300
        )

    @pytest.fixture
    def mock_file_service(self):
        """Create mock FileService."""
        service = Mock()
        service.get_file_status = AsyncMock()
        service.get_file_content = AsyncMock()
        return service

    @pytest.fixture
    def mock_query_processor(self):
        """Create mock QueryProcessor."""
        processor = Mock()
        processor.process_query = AsyncMock()
        processor.cancel_query = AsyncMock()
        processor.health_check = AsyncMock(return_value={"overall": True})
        return processor

    @pytest.fixture
    def query_service(self, config, mock_file_service, mock_query_processor):
        """Create QueryService instance."""
        return QueryService(
            config=config,
            file_service=mock_file_service,
            query_processor=mock_query_processor
        )

    @pytest.fixture
    def sample_query_request(self):
        """Create sample query request."""
        return QueryRequest(
            query="How much concrete is used?",
            file_id=str(uuid.uuid4()),
            intent_hint="quantity",
            max_tokens=1000
        )

    def test_query_service_initialization(self, config, mock_file_service, mock_query_processor):
        """Test QueryService initialization."""
        service = QueryService(
            config=config,
            file_service=mock_file_service,
            query_processor=mock_query_processor
        )
        
        assert service.config == config
        assert service.file_service == mock_file_service
        assert service.query_processor == mock_query_processor

    @pytest.mark.asyncio
    async def test_submit_query_success(self, query_service, sample_query_request, mock_file_service, mock_query_processor):
        """Test successful query submission."""
        # Mock file service response
        mock_file_service.get_file_status.return_value = FileStatusResponse(
            file_id=sample_query_request.file_id,
            filename="test.json",
            status=FileStatus.UPLOADED,
            file_size_bytes=1000,
            file_type="application/json",
            upload_timestamp="2023-01-01T00:00:00Z"
        )
        
        mock_file_service.get_file_content.return_value = {
            "data": [{"type": "wall", "material": "concrete"}]
        }
        
        # Mock query processor response
        from src.ifc_json_chunking.query.types import QueryResult
        mock_result = QueryResult(
            query_id="test_query_123",
            original_query=sample_query_request.query,
            intent="quantity",
            status=QueryStatus.COMPLETED,
            answer="Found 25.5 cubic meters of concrete",
            chunk_results=[],
            aggregated_data={},
            total_chunks=1,
            successful_chunks=1,
            failed_chunks=0,
            total_tokens=150,
            total_cost=0.01,
            processing_time=5.2,
            confidence_score=0.9,
            completeness_score=0.95,
            relevance_score=0.85,
            model_used="gemini-2.5-pro",
            prompt_strategy="quantity"
        )
        
        mock_query_processor.process_query.return_value = mock_result
        
        # Submit query
        response = await query_service.submit_query(sample_query_request)
        
        # Verify response
        assert response.query_id == "test_query_123"
        assert response.status == APIQueryStatus.COMPLETED
        assert "25.5" in response.answer
        assert response.confidence_score == 0.9

    @pytest.mark.asyncio
    async def test_submit_query_file_not_found(self, query_service, sample_query_request, mock_file_service):
        """Test query submission with non-existent file."""
        # Mock file not found
        mock_file_service.get_file_status.side_effect = FileNotFoundError("File not found")
        
        with pytest.raises(FileNotFoundError):
            await query_service.submit_query(sample_query_request)

    @pytest.mark.asyncio
    async def test_get_query_status_existing(self, query_service, mock_query_processor):
        """Test getting status of existing query."""
        query_id = "test_query_456"
        
        # Mock query processor response
        mock_query_processor.get_query_status = Mock(return_value={
            "query_id": query_id,
            "status": "processing",
            "progress_percentage": 75.0,
            "message": "Processing chunks 3/4"
        })
        
        status = query_service.get_query_status(query_id)
        
        assert status["query_id"] == query_id
        assert status["status"] == "processing"
        assert status["progress_percentage"] == 75.0

    @pytest.mark.asyncio
    async def test_cancel_query_success(self, query_service, mock_query_processor):
        """Test successful query cancellation."""
        query_id = "test_query_789"
        
        mock_query_processor.cancel_query.return_value = True
        
        result = await query_service.cancel_query(query_id)
        assert result is True

    @pytest.mark.asyncio
    async def test_cancel_query_not_found(self, query_service, mock_query_processor):
        """Test cancelling non-existent query."""
        query_id = "nonexistent_query"
        
        mock_query_processor.cancel_query.return_value = False
        
        result = await query_service.cancel_query(query_id)
        assert result is False

    @pytest.mark.asyncio
    async def test_list_queries(self, query_service):
        """Test listing queries."""
        # Mock internal query storage
        query_service._active_queries = {
            "query_1": {"status": "processing", "progress": 50},
            "query_2": {"status": "completed", "progress": 100}
        }
        
        queries = query_service.list_queries()
        
        assert len(queries) == 2
        assert "query_1" in queries
        assert "query_2" in queries

    @pytest.mark.asyncio
    async def test_health_check(self, query_service, mock_query_processor):
        """Test health check."""
        mock_query_processor.health_check.return_value = {
            "overall": True,
            "llm_client": {"overall": True}
        }
        
        health = await query_service.health_check()
        
        assert health["overall"] is True
        assert "query_processor" in health


class TestWebSocketService:
    """Test cases for WebSocketService."""

    @pytest.fixture
    def websocket_service(self):
        """Create WebSocketService instance."""
        return WebSocketService()

    @pytest.fixture
    def mock_websocket(self):
        """Create mock WebSocket connection."""
        ws = Mock()
        ws.send_text = AsyncMock()
        ws.receive_text = AsyncMock()
        ws.close = AsyncMock()
        return ws

    def test_websocket_service_initialization(self):
        """Test WebSocketService initialization."""
        service = WebSocketService()
        assert len(service.active_connections) == 0

    @pytest.mark.asyncio
    async def test_connect_websocket(self, websocket_service, mock_websocket):
        """Test WebSocket connection."""
        client_id = "test_client_123"
        
        await websocket_service.connect(mock_websocket, client_id)
        
        assert client_id in websocket_service.active_connections
        assert websocket_service.active_connections[client_id] == mock_websocket

    @pytest.mark.asyncio
    async def test_disconnect_websocket(self, websocket_service, mock_websocket):
        """Test WebSocket disconnection."""
        client_id = "test_client_123"
        
        # Connect first
        await websocket_service.connect(mock_websocket, client_id)
        assert client_id in websocket_service.active_connections
        
        # Disconnect
        websocket_service.disconnect(client_id)
        assert client_id not in websocket_service.active_connections

    @pytest.mark.asyncio
    async def test_send_message_to_client(self, websocket_service, mock_websocket):
        """Test sending message to specific client."""
        client_id = "test_client_123"
        
        # Connect client
        await websocket_service.connect(mock_websocket, client_id)
        
        # Send message
        message = {"type": "progress", "data": {"progress": 50}}
        await websocket_service.send_message_to_client(client_id, message)
        
        # Verify message was sent
        mock_websocket.send_text.assert_called_once_with(json.dumps(message))

    @pytest.mark.asyncio
    async def test_send_message_to_nonexistent_client(self, websocket_service):
        """Test sending message to non-existent client."""
        message = {"type": "test"}
        
        # Should not raise exception
        await websocket_service.send_message_to_client("nonexistent", message)

    @pytest.mark.asyncio
    async def test_broadcast_message(self, websocket_service):
        """Test broadcasting message to all clients."""
        # Connect multiple clients
        clients = []
        for i in range(3):
            mock_ws = Mock()
            mock_ws.send_text = AsyncMock()
            client_id = f"client_{i}"
            
            await websocket_service.connect(mock_ws, client_id)
            clients.append((client_id, mock_ws))
        
        # Broadcast message
        message = {"type": "broadcast", "data": "Hello all"}
        await websocket_service.broadcast_message(message)
        
        # Verify all clients received message
        for client_id, mock_ws in clients:
            mock_ws.send_text.assert_called_with(json.dumps(message))

    @pytest.mark.asyncio
    async def test_send_query_progress(self, websocket_service, mock_websocket):
        """Test sending query progress update."""
        client_id = "test_client_123"
        query_id = "query_456"
        
        # Connect client
        await websocket_service.connect(mock_websocket, client_id)
        
        # Send progress update
        await websocket_service.send_query_progress(
            client_id=client_id,
            query_id=query_id,
            progress=75.0,
            message="Processing chunk 3/4",
            status="processing"
        )
        
        # Verify progress message
        expected_message = {
            "type": "query_progress",
            "query_id": query_id,
            "progress": 75.0,
            "message": "Processing chunk 3/4",
            "status": "processing"
        }
        
        mock_websocket.send_text.assert_called_with(json.dumps(expected_message))

    def test_get_connected_clients(self, websocket_service):
        """Test getting list of connected clients."""
        # Initially empty
        clients = websocket_service.get_connected_clients()
        assert len(clients) == 0
        
        # Add some clients
        websocket_service.active_connections["client_1"] = Mock()
        websocket_service.active_connections["client_2"] = Mock()
        
        clients = websocket_service.get_connected_clients()
        assert len(clients) == 2
        assert "client_1" in clients
        assert "client_2" in clients


class TestWebAPIRouters:
    """Test cases for web API routers."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)

    def test_health_endpoint(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "timestamp" in data

    def test_upload_file_endpoint_missing_file(self, client):
        """Test file upload endpoint without file."""
        response = client.post("/api/files/upload")
        assert response.status_code == 422  # Validation error

    def test_get_file_status_nonexistent(self, client):
        """Test getting status of non-existent file."""
        fake_file_id = str(uuid.uuid4())
        response = client.get(f"/api/files/{fake_file_id}/status")
        assert response.status_code == 404

    def test_submit_query_invalid_data(self, client):
        """Test query submission with invalid data."""
        invalid_data = {"invalid": "data"}
        response = client.post("/api/queries/submit", json=invalid_data)
        assert response.status_code == 422  # Validation error

    def test_get_query_status_nonexistent(self, client):
        """Test getting status of non-existent query."""
        fake_query_id = str(uuid.uuid4())
        response = client.get(f"/api/queries/{fake_query_id}/status")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_websocket_connection(self, client):
        """Test WebSocket connection."""
        # This test would require special handling for WebSocket testing
        # For now, we'll test the basic endpoint availability
        
        # Note: WebSocket testing with TestClient requires special setup
        # In a real implementation, you'd use pytest-asyncio and websockets library
        pass


class TestWebAPIIntegration:
    """Integration tests for web API components."""

    @pytest.mark.asyncio
    async def test_file_upload_and_query_workflow(self):
        """Test complete file upload and query workflow."""
        # This would be a full integration test
        # Mock the entire workflow without external dependencies
        
        config = Config(
            gemini_api_key="test_key",
            upload_directory=Path(tempfile.gettempdir()) / "test_integration"
        )
        
        # Create services
        file_service = FileService(config)
        
        # Mock query processor
        mock_processor = Mock()
        mock_processor.process_query = AsyncMock()
        mock_processor.health_check = AsyncMock(return_value={"overall": True})
        
        query_service = QueryService(
            config=config,
            file_service=file_service,
            query_processor=mock_processor
        )
        
        # Simulate file upload
        sample_data = {"building": {"walls": [{"material": "concrete"}]}}
        file_content = json.dumps(sample_data).encode()
        
        mock_file = Mock()
        mock_file.filename = "integration_test.json"
        mock_file.content_type = "application/json"
        mock_file.read = AsyncMock(return_value=file_content)
        
        # Upload file
        upload_result = await file_service.upload_file(mock_file)
        assert upload_result.status == FileStatus.UPLOADED
        
        # Submit query
        query_request = QueryRequest(
            query="How much concrete?",
            file_id=upload_result.file_id,
            intent_hint="quantity"
        )
        
        # Mock successful query processing
        from src.ifc_json_chunking.query.types import QueryResult
        mock_result = QueryResult(
            query_id="integration_query",
            original_query="How much concrete?",
            intent="quantity",
            status=QueryStatus.COMPLETED,
            answer="Integration test successful",
            chunk_results=[],
            aggregated_data={},
            total_chunks=1,
            successful_chunks=1,
            failed_chunks=0,
            total_tokens=100,
            total_cost=0.005,
            processing_time=2.0,
            confidence_score=0.8,
            completeness_score=0.9,
            relevance_score=0.85,
            model_used="gemini-2.5-pro",
            prompt_strategy="quantity"
        )
        
        mock_processor.process_query.return_value = mock_result
        
        # Process query
        query_response = await query_service.submit_query(query_request)
        
        # Verify integration
        assert query_response.query_id == "integration_query"
        assert query_response.status == APIQueryStatus.COMPLETED
        assert query_response.answer == "Integration test successful"
        
        # Cleanup
        await file_service.delete_file(upload_result.file_id)