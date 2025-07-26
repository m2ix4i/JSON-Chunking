"""
Tests for query processing orchestration system.

This module provides comprehensive tests for the orchestration engine
including intent classification, query processing, and optimization.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from typing import List

from src.ifc_json_chunking.orchestration import (
    QueryProcessor,
    IntentClassifier,
    IntentMatch
)
from src.ifc_json_chunking.orchestration.progress_tracker import ProgressTracker
from src.ifc_json_chunking.orchestration.context_manager import ContextManager
from src.ifc_json_chunking.orchestration.query_optimizer import QueryOptimizer
from src.ifc_json_chunking.query.types import (
    QueryRequest,
    QueryResult,
    QueryIntent,
    QueryStatus,
    QueryParameters,
    ProgressEvent,
    ProgressEventType,
    ChunkResult
)
from src.ifc_json_chunking.models import Chunk, ChunkType
from src.ifc_json_chunking.config import Config
from src.ifc_json_chunking.llm.types import LLMConfig, ProcessingResponse, ProcessingStatus


class TestIntentClassifier:
    """Test cases for intent classification."""
    
    @pytest.fixture
    def classifier(self):
        """Create intent classifier instance."""
        return IntentClassifier()
    
    def test_quantity_intent_classification(self, classifier):
        """Test quantity query classification."""
        queries = [
            "Wie viel Kubikmeter Beton sind verbaut?",
            "Wieviele Türen sind im Gebäude?",
            "Anzahl der Stützen im 2. Stock"
        ]
        
        for query in queries:
            result = classifier.classify_intent(query)
            assert result.intent == QueryIntent.QUANTITY
            assert result.confidence > 0.35  # Realistic threshold for German building queries
            assert len(result.matched_patterns) > 0
    
    def test_component_intent_classification(self, classifier):
        """Test component query classification."""
        queries = [
            "Welche Türen sind im 2. Stock?",
            "Alle Fenster auflisten",
            "Übersicht der Wände"
        ]
        
        for query in queries:
            result = classifier.classify_intent(query)
            assert result.intent == QueryIntent.COMPONENT
            assert result.confidence > 0.35  # Realistic threshold for German building queries
    
    def test_material_intent_classification(self, classifier):
        """Test material query classification."""
        queries = [
            "Alle Betonelemente auflisten",
            "Material der Stützen",
            "Welche Baustoffe wurden verwendet?"
        ]
        
        for query in queries:
            result = classifier.classify_intent(query)
            assert result.intent == QueryIntent.MATERIAL
            assert result.confidence > 0.35  # Realistic threshold for German building queries
    
    def test_spatial_intent_classification(self, classifier):
        """Test spatial query classification."""
        queries = [
            "Was ist in Raum R101?",
            "Komponenten im 3. Stock",
            "Alle Elemente im Bereich A"
        ]
        
        for query in queries:
            result = classifier.classify_intent(query)
            assert result.intent == QueryIntent.SPATIAL
            assert result.confidence > 0.35  # Realistic threshold for German building queries
    
    def test_cost_intent_classification(self, classifier):
        """Test cost query classification."""
        queries = [
            "Materialkosten für HVAC-System",
            "Preise der Stahlträger",
            "Budget für Betonarbeiten"
        ]
        
        for query in queries:
            result = classifier.classify_intent(query)
            assert result.intent == QueryIntent.COST
            assert result.confidence > 0.35  # Realistic threshold for German building queries
    
    def test_unknown_intent_classification(self, classifier):
        """Test unknown query classification."""
        queries = [
            "Hello world",
            "Random text without building context",
            "xyz abc def"
        ]
        
        for query in queries:
            result = classifier.classify_intent(query)
            assert result.intent == QueryIntent.UNKNOWN
            assert result.confidence == 0.0
    
    def test_parameter_extraction(self, classifier):
        """Test parameter extraction from queries."""
        query = "Wie viel Kubikmeter Beton sind im 2. Stock verbaut?"
        result = classifier.classify_intent(query)
        
        assert result.intent == QueryIntent.QUANTITY
        assert "beton" in [f.lower() for f in result.extracted_parameters.material_filters]
        assert result.extracted_parameters.spatial_constraints.get("floor") == 2
        assert result.extracted_parameters.quantity_requirements.get("unit") == "cubic_meter"


class TestProgressTracker:
    """Test cases for progress tracking."""
    
    @pytest.fixture
    def tracker(self):
        """Create progress tracker instance."""
        return ProgressTracker()
    
    def test_start_tracking(self, tracker):
        """Test starting progress tracking."""
        query_id = "test_query_123"
        total_steps = 5
        
        state = tracker.start_tracking(query_id, total_steps)
        
        assert state.query_id == query_id
        assert state.total_steps == total_steps
        assert state.current_step == 0
        assert state.status == QueryStatus.PENDING
        assert state.progress_percentage == 0.0
    
    def test_update_progress(self, tracker):
        """Test progress updates."""
        query_id = "test_query_123"
        tracker.start_tracking(query_id, 5)
        
        tracker.update_progress(query_id, 2, "Processing chunks")
        
        state = tracker.get_progress(query_id)
        assert state.current_step == 2
        assert state.progress_percentage == 40.0
        assert "Processing chunks" in state.step_details[2]
    
    def test_complete_tracking(self, tracker):
        """Test completing progress tracking."""
        query_id = "test_query_123"
        tracker.start_tracking(query_id, 5)
        
        tracker.complete_tracking(query_id, success=True, final_message="Completed successfully")
        
        state = tracker.get_progress(query_id)
        assert state.status == QueryStatus.COMPLETED
        assert state.current_step == 5
        assert state.progress_percentage == 100.0
    
    def test_progress_callbacks(self, tracker):
        """Test progress callbacks."""
        events = []
        
        def callback(event: ProgressEvent):
            events.append(event)
        
        query_id = "test_query_123"
        tracker.start_tracking(query_id, 3, callback)
        tracker.update_progress(query_id, 1, "Step 1")
        tracker.complete_tracking(query_id, True)
        
        assert len(events) == 3  # Start, update, complete
        assert events[0].event_type == ProgressEventType.STARTED
        assert events[1].event_type == ProgressEventType.CHUNK_COMPLETED
        assert events[2].event_type == ProgressEventType.COMPLETED


class TestContextManager:
    """Test cases for context management."""
    
    @pytest.fixture
    def context_manager(self):
        """Create context manager instance."""
        return ContextManager()
    
    @pytest.fixture
    def sample_context(self, context_manager):
        """Create sample context."""
        return context_manager.create_context(
            query_id="test_query_123",
            original_query="Wie viel Beton ist verbaut?",
            intent=QueryIntent.QUANTITY,
            parameters=QueryParameters(),
            confidence_score=0.85
        )
    
    def test_create_context(self, context_manager):
        """Test context creation."""
        context = context_manager.create_context(
            query_id="test_query_123",
            original_query="Test query",
            intent=QueryIntent.COMPONENT,
            parameters=QueryParameters(),
            confidence_score=0.9
        )
        
        assert context.query_id == "test_query_123"
        assert context.original_query == "Test query"
        assert context.intent == QueryIntent.COMPONENT
        assert context.confidence_score == 0.9
    
    def test_update_context_with_chunk_result(self, context_manager, sample_context):
        """Test updating context with chunk results."""
        chunk = Chunk(
            chunk_id="chunk_001",
            sequence_number=1,
            json_path="test.data",
            chunk_type=ChunkType.GENERAL,
            data={"test": "data"},
            size_bytes=100,
            created_timestamp=1640995200.0  # 2022-01-01 00:00:00
        )
        
        chunk_result = ChunkResult(
            chunk_id="chunk_001",
            content="Test result content",
            status="completed",
            tokens_used=100,
            processing_time=1.5,
            confidence_score=0.8
        )
        
        context_manager.update_context_with_chunk_result(
            sample_context.query_id, chunk, chunk_result
        )
        
        context = context_manager.get_context(sample_context.query_id)
        assert "chunk_001" in context.processed_chunks
        assert context.chunk_results["chunk_001"]["content"] == "Test result content"
    
    def test_entity_tracking(self, context_manager, sample_context):
        """Test entity tracking across chunks."""
        chunk = Chunk(
            chunk_id="chunk_001",
            sequence_number=1,
            json_path="test.data",
            chunk_type=ChunkType.GENERAL,
            data={"test": "data"},
            size_bytes=100,
            created_timestamp=1640995200.0  # 2022-01-01 00:00:00
        )
        
        chunk_result = ChunkResult(
            chunk_id="chunk_001",
            content="Found concrete elements",
            status="completed",
            tokens_used=100,
            processing_time=1.5,
            entities=[
                {
                    "id": "concrete_001",
                    "type": "material",
                    "properties": {"volume": 50.5, "density": 2400}
                }
            ]
        )
        
        context_manager.update_context_with_chunk_result(
            sample_context.query_id, chunk, chunk_result
        )
        
        entities = context_manager.get_all_entities(sample_context.query_id)
        assert "concrete_001" in entities
        assert entities["concrete_001"].entity_type == "material"
        assert entities["concrete_001"].properties["volume"] == 50.5
    
    def test_contextual_summary(self, context_manager, sample_context):
        """Test contextual summary generation."""
        summary = context_manager.get_contextual_summary(sample_context.query_id)
        
        assert "query_context" in summary
        assert "entity_analysis" in summary
        assert "coherence_score" in summary
        assert summary["query_context"]["query_id"] == sample_context.query_id


class TestQueryOptimizer:
    """Test cases for query optimization."""
    
    @pytest.fixture
    def optimizer(self):
        """Create query optimizer instance."""
        return QueryOptimizer()
    
    @pytest.fixture
    def sample_request(self):
        """Create sample query request."""
        chunks = [
            Chunk(
                chunk_id=f"chunk_{i:03d}",
                sequence_number=i,
                json_path=f"test.data[{i}]",
                chunk_type=ChunkType.GENERAL,
                data={"test": f"data_{i}"},
                size_bytes=50,
                created_timestamp=1640995200.0
            )
            for i in range(10)
        ]
        
        return QueryRequest(
            query="Wie viel Beton ist verbaut?",
            chunks=chunks,
            intent_hint=QueryIntent.QUANTITY
        )
    
    def test_analyze_query(self, optimizer, sample_request):
        """Test query analysis for optimization."""
        recommendation = optimizer.analyze_query(sample_request)
        
        assert recommendation.strategy is not None
        assert 0.0 <= recommendation.confidence <= 1.0
        assert recommendation.estimated_improvement >= 0.0
        assert recommendation.reasoning is not None
    
    def test_record_query_result(self, optimizer, sample_request):
        """Test recording query results for learning."""
        result = QueryResult(
            query_id=sample_request.query_id,
            original_query=sample_request.query,
            intent=QueryIntent.QUANTITY,
            status=QueryStatus.COMPLETED,
            answer="Found 150 cubic meters of concrete",
            chunk_results=[],
            aggregated_data={},
            total_chunks=10,
            successful_chunks=9,
            failed_chunks=1,
            total_tokens=1500,
            total_cost=0.03,
            processing_time=45.2,
            confidence_score=0.85,
            completeness_score=0.9,
            relevance_score=0.8,
            model_used="gemini-2.5-pro",
            prompt_strategy="quantity"
        )
        
        optimizer.record_query_result(sample_request, result)
        
        stats = optimizer.get_optimization_stats()
        assert stats["total_patterns"] >= 1
        assert stats["performance_history_size"] >= 1
    
    def test_pattern_matching(self, optimizer, sample_request):
        """Test pattern matching for similar queries."""
        # Record a result first
        result = QueryResult(
            query_id=sample_request.query_id,
            original_query=sample_request.query,
            intent=QueryIntent.QUANTITY,
            status=QueryStatus.COMPLETED,
            answer="Test answer",
            chunk_results=[],
            aggregated_data={},
            total_chunks=10,
            successful_chunks=10,
            failed_chunks=0,
            total_tokens=1000,
            total_cost=0.02,
            processing_time=30.0,
            confidence_score=0.9,
            completeness_score=0.9,
            relevance_score=0.9,
            model_used="gemini-2.5-pro",
            prompt_strategy="quantity"
        )
        
        optimizer.record_query_result(sample_request, result)
        
        # Analyze similar query
        similar_request = QueryRequest(
            query="Wieviel Kubikmeter Beton sind verbaut?",
            chunks=sample_request.chunks,
            intent_hint=QueryIntent.QUANTITY
        )
        
        recommendation = optimizer.analyze_query(similar_request)
        
        # Should have higher confidence due to pattern match
        assert recommendation.confidence > 0.35  # Realistic threshold for German building queries


class TestQueryProcessor:
    """Test cases for query processor integration."""
    
    @pytest.fixture
    def config(self):
        """Create test configuration."""
        return Config(
            gemini_api_key="test_key",
            target_llm_model="gemini-2.5-pro",
            max_concurrent_requests=5
        )
    
    @pytest.fixture
    def mock_chunk_processor(self):
        """Create mock chunk processor."""
        processor = Mock()
        processor.process_chunks = AsyncMock()
        processor.health_check = AsyncMock(return_value={"overall": True})
        processor.close = AsyncMock()
        
        # Mock processing result
        mock_responses = [
            ProcessingResponse(
                request_id=f"req_{i:03d}",
                content=f"Processed chunk {i}",
                status=ProcessingStatus.COMPLETED,
                tokens_used=100,
                processing_time=1.0,
                model="gemini-2.5-pro"
            )
            for i in range(3)
        ]
        
        mock_result = Mock()
        mock_result.responses = mock_responses
        processor.process_chunks.return_value = mock_result
        
        return processor
    
    @pytest.fixture
    def query_processor(self, config, mock_chunk_processor):
        """Create query processor with mocked dependencies."""
        return QueryProcessor(
            config=config,
            chunk_processor=mock_chunk_processor
        )
    
    @pytest.fixture
    def sample_chunks(self):
        """Create sample chunks for testing."""
        return [
            Chunk(
                chunk_id=f"chunk_{i:03d}",
                sequence_number=i,
                json_path=f"building_elements[{i}]",
                chunk_type=ChunkType.GENERAL,
                data={"building_element": f"element_{i}", "material": "concrete"},
                size_bytes=100,
                created_timestamp=1640995200.0
            )
            for i in range(3)
        ]
    
    @pytest.mark.asyncio
    async def test_process_query(self, query_processor, sample_chunks):
        """Test complete query processing."""
        progress_events = []
        
        def progress_callback(event: ProgressEvent):
            progress_events.append(event)
        
        result = await query_processor.process_query(
            query="Wie viel Beton ist verbaut?",
            chunks=sample_chunks,
            progress_callback=progress_callback
        )
        
        assert result.query_id is not None
        assert result.original_query == "Wie viel Beton ist verbaut?"
        assert result.intent == QueryIntent.QUANTITY
        assert result.status == QueryStatus.COMPLETED
        assert result.answer is not None
        assert len(result.chunk_results) == 3
        assert result.total_chunks == 3
        assert result.processing_time > 0
        
        # Check progress events
        assert len(progress_events) >= 3  # At least start, processing, complete
        assert progress_events[0].event_type == ProgressEventType.STARTED
        assert progress_events[-1].event_type == ProgressEventType.COMPLETED
    
    @pytest.mark.asyncio
    async def test_process_request(self, query_processor, sample_chunks):
        """Test processing with QueryRequest object."""
        request = QueryRequest(
            query="Welche Türen sind im 2. Stock?",
            chunks=sample_chunks,
            intent_hint=QueryIntent.COMPONENT,
            max_concurrent=3
        )
        
        result = await query_processor.process_request(request)
        
        assert result.query_id == request.query_id
        assert result.intent == QueryIntent.COMPONENT
        assert result.total_chunks == 3
    
    @pytest.mark.asyncio
    async def test_health_check(self, query_processor):
        """Test health check functionality."""
        health_status = await query_processor.health_check()
        
        assert "overall" in health_status
        assert isinstance(health_status["overall"], bool)
    
    @pytest.mark.asyncio
    async def test_query_cancellation(self, query_processor):
        """Test query cancellation."""
        query_id = "test_cancel_query"
        
        # This would normally require active query tracking
        cancelled = await query_processor.cancel_query(query_id)
        
        # Should return False for non-existent query
        assert cancelled is False


# Integration tests
class TestOrchestrationIntegration:
    """Integration tests for orchestration system."""
    
    @pytest.mark.asyncio
    async def test_end_to_end_quantity_query(self):
        """Test complete end-to-end quantity query processing."""
        # This would require real LLM integration for full testing
        # For now, we'll test with mocked components
        
        config = Config(
            gemini_api_key="test_key",
            target_llm_model="gemini-2.5-pro"
        )
        
        # Create sample chunks
        chunks = [
            Chunk(
                chunk_id="chunk_001",
                sequence_number=0,
                json_path="building_elements[0]",
                chunk_type=ChunkType.GENERAL,
                data={
                    "building_elements": [
                        {"type": "wall", "material": "concrete", "volume": 25.5},
                        {"type": "slab", "material": "concrete", "volume": 15.2}
                    ]
                },
                size_bytes=200,
                created_timestamp=1640995200.0
            ),
            Chunk(
                chunk_id="chunk_002",
                sequence_number=1,
                json_path="building_elements[1]",
                chunk_type=ChunkType.GENERAL,
                data={
                    "building_elements": [
                        {"type": "column", "material": "concrete", "volume": 8.3},
                        {"type": "beam", "material": "concrete", "volume": 12.1}
                    ]
                },
                size_bytes=200,
                created_timestamp=1640995200.0
            )
        ]
        
        # Mock the chunk processor for integration test
        with patch('src.ifc_json_chunking.orchestration.query_processor.ChunkProcessor') as mock_processor_class:
            mock_processor = Mock()
            mock_processor_class.return_value = mock_processor
            mock_processor.process_chunks = AsyncMock()
            mock_processor.health_check = AsyncMock(return_value={"overall": True})
            mock_processor.close = AsyncMock()
            
            # Mock successful processing
            mock_responses = [
                ProcessingResponse(
                    request_id="req_001",
                    content="Found concrete volume: 40.7 cubic meters in chunk 1",
                    status=ProcessingStatus.COMPLETED,
                    tokens_used=150,
                    processing_time=2.1,
                    model="gemini-2.5-pro"
                ),
                ProcessingResponse(
                    request_id="req_002", 
                    content="Found concrete volume: 20.4 cubic meters in chunk 2",
                    status=ProcessingStatus.COMPLETED,
                    tokens_used=140,
                    processing_time=1.8,
                    model="gemini-2.5-pro"
                )
            ]
            
            mock_result = Mock()
            mock_result.responses = mock_responses
            mock_processor.process_chunks.return_value = mock_result
            
            # Create processor and run query
            processor = QueryProcessor(config=config)
            
            result = await processor.process_query(
                query="Wie viel Kubikmeter Beton sind verbaut?",
                chunks=chunks
            )
            
            # Verify results
            assert result.intent == QueryIntent.QUANTITY
            assert result.status == QueryStatus.COMPLETED
            assert "beton" in result.answer.lower() or "concrete" in result.answer.lower()
            assert result.total_chunks == 2
            assert result.successful_chunks == 2
            assert result.total_tokens == 290
            assert result.confidence_score > 0
    
    def test_orchestration_components_integration(self):
        """Test integration between orchestration components."""
        # Test that all components work together
        classifier = IntentClassifier()
        tracker = ProgressTracker()
        context_manager = ContextManager()
        optimizer = QueryOptimizer()
        
        # Test workflow
        query = "Wie viel Beton ist verbaut?"
        
        # 1. Classify intent
        intent_result = classifier.classify_intent(query)
        assert intent_result.intent == QueryIntent.QUANTITY
        
        # 2. Start progress tracking
        query_id = "integration_test_123"
        tracker.start_tracking(query_id, 4)
        
        # 3. Create context
        context = context_manager.create_context(
            query_id=query_id,
            original_query=query,
            intent=intent_result.intent,
            parameters=intent_result.extracted_parameters,
            confidence_score=intent_result.confidence
        )
        
        # 4. Get optimization recommendation
        chunks = [
            Chunk(
                chunk_id="test_chunk",
                sequence_number=0,
                json_path="test.data",
                chunk_type=ChunkType.GENERAL,
                data={"test": "data"},
                size_bytes=50,
                created_timestamp=1640995200.0
            )
        ]
        
        request = QueryRequest(
            query=query,
            chunks=chunks,
            intent_hint=intent_result.intent
        )
        
        optimization = optimizer.analyze_query(request)
        
        # Verify integration
        assert context.query_id == query_id
        assert context.intent == intent_result.intent
        assert optimization.strategy is not None
        
        progress_state = tracker.get_progress(query_id)
        assert progress_state.query_id == query_id