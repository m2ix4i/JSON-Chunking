"""
Tests using real-world wooden building components data.

This module provides comprehensive tests using the IDM_Holzbauteile_mapped_cleaned.json
file with 801 wooden building components, testing German query processing for volume
analysis and component identification in the wooden construction industry.
"""

import pytest
import asyncio
import json
import os
from typing import List, Dict, Any
from unittest.mock import Mock, AsyncMock, patch

from src.ifc_json_chunking.core import ChunkingEngine
from src.ifc_json_chunking.orchestration import (
    QueryProcessor,
    IntentClassifier,
    IntentMatch
)
from src.ifc_json_chunking.query.types import (
    QueryRequest,
    QueryResult,
    QueryIntent,
    QueryStatus,
    QueryParameters
)
from src.ifc_json_chunking.models import Chunk, ChunkType
from src.ifc_json_chunking.config import Config
from src.ifc_json_chunking.llm.types import ProcessingResponse, ProcessingStatus


class TestRealWorldWoodenComponents:
    """Test cases using real-world wooden building components data."""
    
    @pytest.fixture
    def real_world_data_path(self):
        """Path to real-world wooden components data."""
        return "/Users/max/Downloads/BA Cursor Projekt/IDM_Holzbauteile_mapped_cleaned.json"
    
    @pytest.fixture
    def wooden_components_data(self, real_world_data_path):
        """Load real-world wooden components data."""
        if not os.path.exists(real_world_data_path):
            pytest.skip(f"Real-world data file not found: {real_world_data_path}")
        
        with open(real_world_data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    @pytest.fixture
    def sample_chunks_from_real_data(self, wooden_components_data):
        """Create chunks from real wooden components data."""
        chunks = []
        chunk_id = 0
        
        # Create chunks for each component type
        for component_type, components in wooden_components_data.items():
            if not components:  # Skip empty component types
                continue
                
            # Take first 5 components of each type for testing
            for i, component in enumerate(components[:5]):
                chunks.append(Chunk(
                    chunk_id=f"chunk_{component_type}_{i:03d}",
                    sequence_number=chunk_id,
                    json_path=f"{component_type}[{i}]",
                    chunk_type=ChunkType.IFC_OBJECT,
                    data={component_type: [component]},
                    size_bytes=len(json.dumps(component).encode('utf-8')),
                    created_timestamp=1640995200.0
                ))
                chunk_id += 1
        
        return chunks
    
    @pytest.fixture
    def classifier(self):
        """Create intent classifier instance."""
        return IntentClassifier()
    
    def test_data_structure_validation(self, wooden_components_data):
        """Test that the real-world data has the expected structure."""
        # Verify top-level component types
        expected_types = ["Binder", "Decke", "Dämmung", "Rähm", "Schwelle", "Ständer", "Träger", "Wand"]
        assert set(wooden_components_data.keys()) == set(expected_types)
        
        # Verify total component count (801 as mentioned in documentation)
        total_components = sum(len(components) for components in wooden_components_data.values())
        assert total_components == 801, f"Expected 801 components, found {total_components}"
        
        # Verify component distribution
        component_counts = {
            component_type: len(components) 
            for component_type, components in wooden_components_data.items()
        }
        
        # Verify counts match expected distribution
        expected_counts = {
            "Ständer": 555, "Binder": 70, "Rähm": 57, "Schwelle": 57,
            "Decke": 24, "Träger": 19, "Wand": 16, "Dämmung": 3
        }
        
        for component_type, expected_count in expected_counts.items():
            assert component_counts[component_type] == expected_count, \
                f"{component_type}: expected {expected_count}, got {component_counts[component_type]}"
    
    def test_component_data_quality(self, wooden_components_data):
        """Test data quality of wooden components."""
        for component_type, components in wooden_components_data.items():
            for i, component in enumerate(components):
                # Verify required fields are present
                assert "Name" in component, f"{component_type}[{i}] missing Name"
                assert "GUID" in component, f"{component_type}[{i}] missing GUID"
                assert "Material" in component, f"{component_type}[{i}] missing Material"
                
                # Verify no null values (should be cleaned to "unbekannt")
                for field, value in component.items():
                    assert value is not None, f"{component_type}[{i}].{field} has null value"
                    
                # Verify dimensional data
                if "Länge" in component:
                    assert isinstance(component["Länge"], (int, float, str)), \
                        f"{component_type}[{i}].Länge has invalid type"
                if "Breite" in component:
                    assert isinstance(component["Breite"], (int, float, str)), \
                        f"{component_type}[{i}].Breite has invalid type"
                if "Höhe" in component:
                    assert isinstance(component["Höhe"], (int, float, str)), \
                        f"{component_type}[{i}].Höhe has invalid type"
    
    def test_german_quantity_queries_real_data(self, classifier):
        """Test German quantity queries with real wooden building context."""
        quantity_queries = [
            "Wie viel Kubikmeter Holz sind insgesamt verbaut?",
            "Wieviele Ständer sind im Gebäude?",
            "Anzahl der Träger im 2. Obergeschoss",
            "Volumen aller Holzbauteile berechnen",
            "Gesamtmenge Konstruktionsvollholz",
            "Wie viele Kubikmeter Fichte sind verbaut?",
            "Anzahl Binder im Dachgeschoss"
        ]
        
        for query in quantity_queries:
            result = classifier.classify_intent(query)
            assert result.intent == QueryIntent.QUANTITY, \
                f"Query '{query}' incorrectly classified as {result.intent.value}"
            assert result.confidence > 0.35, \
                f"Query '{query}' has low confidence: {result.confidence}"
    
    def test_german_component_queries_real_data(self, classifier):
        """Test German component queries with real wooden building context."""
        component_queries = [
            "Welche Ständer sind im 2. Obergeschoss?",
            "Alle Träger aus Buche auflisten",
            "Übersicht der Rähm im Erdgeschoss",
            "Zeige alle Binder im Dachgeschoss",
            "Welche Schwellen sind verbaut?",
            "Liste aller Deckenelemente",
            "Holzwände im 1. Obergeschoss"
        ]
        
        for query in component_queries:
            result = classifier.classify_intent(query)
            assert result.intent == QueryIntent.COMPONENT, \
                f"Query '{query}' incorrectly classified as {result.intent.value}"
            assert result.confidence > 0.35, \
                f"Query '{query}' has low confidence: {result.confidence}"
    
    def test_german_material_queries_real_data(self, classifier):
        """Test German material queries with real wooden building context."""
        material_queries = [
            "Alle Bauteile aus Fichte auflisten",
            "Welche Materialien wurden für Träger verwendet?",
            "Konstruktionsvollholz C24 Übersicht",
            "Brettschichtholz GL70 Bauteile",
            "Materialverteilung im Holzbau",
            "Welche Holzarten sind verbaut?",
            "Festigkeitsklassen der verwendeten Hölzer"
        ]
        
        for query in material_queries:
            result = classifier.classify_intent(query)
            assert result.intent == QueryIntent.MATERIAL, \
                f"Query '{query}' incorrectly classified as {result.intent.value}"
            assert result.confidence > 0.35, \
                f"Query '{query}' has low confidence: {result.confidence}"
    
    def test_german_spatial_queries_real_data(self, classifier):
        """Test German spatial queries with real wooden building context."""
        spatial_queries = [
            "Was ist im 2. Obergeschoss verbaut?",
            "Komponenten im Erdgeschoss auflisten",
            "Alle Bauteile im Dachgeschoss",
            "Holzbauteile im 1. OG analysieren",
            "Geschossverteilung der Ständer",
            "Bauteile in Bauteilzugehörigkeits-Nr. W_035",
            "Elemente im Bereich DG"
        ]
        
        for query in spatial_queries:
            result = classifier.classify_intent(query)
            assert result.intent == QueryIntent.SPATIAL, \
                f"Query '{query}' incorrectly classified as {result.intent.value}"
            assert result.confidence > 0.35, \
                f"Query '{query}' has low confidence: {result.confidence}"
    
    def test_german_cost_queries_real_data(self, classifier):
        """Test German cost queries with real wooden building context."""
        cost_queries = [
            "Materialkosten für Hasslacher Gruppe Produkte",
            "Preise der Pollmeier Baubuche Träger",
            "Kostengruppe 331 Budget berechnen",
            "Kosten für Konstruktionsvollholz",
            "Budget für Holzbauteile im 2. OG",
            "Transportkosten für Binder",
            "Produktionskosten nach Hersteller"
        ]
        
        for query in cost_queries:
            result = classifier.classify_intent(query)
            assert result.intent == QueryIntent.COST, \
                f"Query '{query}' incorrectly classified as {result.intent.value}"
            assert result.confidence > 0.35, \
                f"Query '{query}' has low confidence: {result.confidence}"
    
    def test_parameter_extraction_real_data(self, classifier):
        """Test parameter extraction with real wooden building data context."""
        # Test spatial constraint extraction
        query = "Wie viel Kubikmeter Fichte-Konstruktionsvollholz ist im 2. Obergeschoss verbaut?"
        result = classifier.classify_intent(query)
        
        assert result.intent == QueryIntent.QUANTITY
        assert "cubic_meter" in str(result.extracted_parameters.quantity_requirements.get("unit", ""))
        assert "wood" in [f.lower() for f in result.extracted_parameters.material_filters]
        
        # Test component type extraction
        query2 = "Welche Ständer aus C24 Holz sind im Erdgeschoss?"
        result2 = classifier.classify_intent(query2)
        
        assert result2.intent == QueryIntent.COMPONENT
        assert "wood" in [f.lower() for f in result2.extracted_parameters.material_filters]
    
    @pytest.mark.asyncio
    async def test_chunking_with_real_data(self, wooden_components_data):
        """Test chunking with real wooden components data."""
        chunker = ChunkingEngine()
        
        # Test with a subset of the data
        test_data = {
            "Ständer": wooden_components_data["Ständer"][:5],
            "Träger": wooden_components_data["Träger"][:3]
        }
        
        result = await chunker.create_chunks(test_data)
        
        assert result["status"] == "completed"
        assert "chunks" in result
        assert len(result["chunks"]) > 0
        
        # Verify chunk content
        for chunk in result["chunks"]:
            assert chunk.chunk_type in [ChunkType.IFC_OBJECT, ChunkType.GENERAL]
            assert isinstance(chunk.data, dict)
            assert chunk.size_bytes > 0
    
    @pytest.mark.asyncio
    async def test_volume_calculation_workflow(self, sample_chunks_from_real_data):
        """Test complete volume calculation workflow with real data."""
        # Mock the chunk processor for this integration test
        mock_processor = Mock()
        mock_processor.process_chunks = AsyncMock()
        mock_processor.health_check = AsyncMock(return_value={"overall": True})
        mock_processor.close = AsyncMock()
        
        # Create realistic mock responses for volume calculation
        mock_responses = []
        total_volume = 0.0
        
        for i, chunk in enumerate(sample_chunks_from_real_data[:5]):  # Test with first 5 chunks
            # Extract component from chunk data
            for component_type, components in chunk.data.items():
                if components:
                    component = components[0]
                    # Calculate volume if dimensions available
                    length = component.get("Länge", 0)
                    width = component.get("Breite", 0)
                    height = component.get("Höhe", 0)
                    
                    if all(isinstance(dim, (int, float)) and dim > 0 for dim in [length, width, height]):
                        # Convert mm to m and calculate volume
                        volume_m3 = (length / 1000) * (width / 1000) * (height / 1000)
                        total_volume += volume_m3
                        content = f"Bauteil {component.get('Name', 'unbekannt')}: Volumen {volume_m3:.4f} m³"
                    else:
                        content = f"Bauteil {component.get('Name', 'unbekannt')}: Keine vollständigen Abmessungen"
                    
                    mock_responses.append(ProcessingResponse(
                        request_id=f"req_{i:03d}",
                        content=content,
                        status=ProcessingStatus.COMPLETED,
                        tokens_used=120,
                        processing_time=1.2,
                        model="gemini-2.5-pro"
                    ))
        
        mock_result = Mock()
        mock_result.responses = mock_responses
        mock_processor.process_chunks.return_value = mock_result
        
        # Create query processor with mocked dependencies
        config = Config(
            gemini_api_key="test_key",
            target_llm_model="gemini-2.5-pro"
        )
        
        query_processor = QueryProcessor(
            config=config,
            chunk_processor=mock_processor
        )
        
        # Process German volume query
        result = await query_processor.process_query(
            query="Wie viel Kubikmeter Holz sind insgesamt verbaut?",
            chunks=sample_chunks_from_real_data[:5]
        )
        
        # Verify results
        assert result.intent == QueryIntent.QUANTITY
        assert result.status == QueryStatus.COMPLETED
        assert result.total_chunks == 5
        assert result.successful_chunks <= 5
        assert "holz" in result.answer.lower() or "volumen" in result.answer.lower()
        assert result.confidence_score > 0
    
    def test_wooden_component_types_coverage(self, wooden_components_data):
        """Test that all wooden component types are properly represented."""
        # Verify all 8 component types from the scientific summary
        expected_types = ["Ständer", "Schwelle", "Rähm", "Decke", "Träger", "Binder", "Wand", "Dämmung"]
        
        for component_type in expected_types:
            assert component_type in wooden_components_data, f"Missing component type: {component_type}"
            components = wooden_components_data[component_type]
            assert len(components) > 0, f"No components found for type: {component_type}"
            
            # Verify each component has material information
            for component in components[:3]:  # Check first 3 of each type
                assert "Material" in component, f"{component_type} missing Material field"
                assert "Holzart" in component, f"{component_type} missing Holzart field"
                assert "Festigkeitsklasse (DIN EN 338/14080)" in component, \
                    f"{component_type} missing Festigkeitsklasse field"
    
    def test_material_classification_accuracy(self, wooden_components_data):
        """Test material classification accuracy based on scientific summary."""
        # Verify Fichte C24 for structural elements
        structural_types = ["Ständer", "Schwelle", "Rähm"]
        for component_type in structural_types:
            components = wooden_components_data[component_type]
            for component in components[:5]:  # Check first 5
                assert component["Holzart"] == "Fichte", \
                    f"{component_type} should be Fichte, got {component['Holzart']}"
                assert component["Festigkeitsklasse (DIN EN 338/14080)"] == "C24", \
                    f"{component_type} should be C24, got {component['Festigkeitsklasse (DIN EN 338/14080)']}"
        
        # Verify Buche GL70 for Träger (beams)
        träger_components = wooden_components_data["Träger"]
        for träger in träger_components[:3]:  # Check first 3
            assert träger["Holzart"] == "Buche", \
                f"Träger should be Buche, got {träger['Holzart']}"
            assert träger["Festigkeitsklasse (DIN EN 338/14080)"] == "GL70", \
                f"Träger should be GL70, got {träger['Festigkeitsklasse (DIN EN 338/14080)']}"
    
    def test_floor_distribution_validation(self, wooden_components_data):
        """Test floor distribution as mentioned in scientific summary."""
        # Check that components are distributed across floors
        floors_found = set()
        
        for component_type, components in wooden_components_data.items():
            for component in components:
                if "Geschoss" in component:
                    floors_found.add(component["Geschoss"])
        
        # Should have floors from EG to DG (as mentioned in summary)
        expected_floors = {"EG", "1OG", "2OG", "3OG", "DG"}
        found_floors = floors_found.intersection(expected_floors)
        assert len(found_floors) >= 3, f"Expected multiple floors, found: {found_floors}"
    
    def test_german_prompt_template_integration(self, classifier):
        """Test integration with the German prompt template for volume calculation."""
        # Test the exact query pattern from the prompt template
        prompt_based_queries = [
            "Analysiere die JSON-Daten und identifiziere alle Bauteile aus Holz",
            "Berechne das Gesamtvolumen des verbauten Holzes in Kubikmetern",
            "Zähle die Anzahl der berücksichtigten Holzbauteile",
            "Überprüfe die notwendigen Daten für die Volumenberechnung"
        ]
        
        for query in prompt_based_queries:
            result = classifier.classify_intent(query)
            # These should be classified as QUANTITY or COMPONENT intent
            assert result.intent in [QueryIntent.QUANTITY, QueryIntent.COMPONENT], \
                f"Query '{query}' classified as {result.intent.value}"
            assert result.confidence > 0.2, \
                f"Query '{query}' has low confidence: {result.confidence}"


class TestGermanQueryProcessing:
    """Dedicated tests for German query processing with building industry terminology."""
    
    @pytest.fixture
    def classifier(self):
        """Create intent classifier instance.""" 
        return IntentClassifier()
    
    def test_building_specific_terms(self, classifier):
        """Test classification of building-specific German terms."""
        building_terms = {
            "Konstruktionsvollholz": QueryIntent.MATERIAL,
            "Brettschichtholz": QueryIntent.MATERIAL,
            "Festigkeitsklasse": QueryIntent.MATERIAL,
            "Obergeschoss": QueryIntent.SPATIAL,
            "Dachgeschoss": QueryIntent.SPATIAL,
            "Kostengruppe": QueryIntent.COST,
            "Materialkosten": QueryIntent.COST,
            "Kubikmeter": QueryIntent.QUANTITY,
            "Anzahl": QueryIntent.QUANTITY
        }
        
        for term, expected_intent in building_terms.items():
            query = f"Zeige alle {term} im Projekt"
            result = classifier.classify_intent(query)
            assert result.intent == expected_intent, \
                f"Term '{term}' incorrectly classified as {result.intent.value}, expected {expected_intent.value}"
        
        # Test spatial terms with more specific context
        spatial_queries = [
            ("Zeige alle Komponenten der Bauteilzugehörigkeits-Nr W_035", QueryIntent.SPATIAL),
            ("Bauteile mit Bauteilzugehörigkeits-Nr im 2. OG", QueryIntent.SPATIAL)
        ]
        
        for query, expected_intent in spatial_queries:
            result = classifier.classify_intent(query)
            assert result.intent == expected_intent, \
                f"Spatial query '{query}' incorrectly classified as {result.intent.value}, expected {expected_intent.value}"
    
    def test_complex_german_queries(self, classifier):
        """Test complex German queries combining multiple concepts."""
        complex_queries = [
            ("Wie viele Ständer aus Fichte C24 sind im 2. Obergeschoss verbaut und wie viel Volumen haben sie?", QueryIntent.QUANTITY),
            ("Welche Träger aus Brettschichtholz GL70 von Pollmeier sind im Dachgeschoss installiert?", QueryIntent.COMPONENT),
            ("Berechne die Materialkosten für alle Hasslacher Gruppe Produkte in Kostengruppe 331", QueryIntent.COST),
            ("Analysiere die Verteilung von Konstruktionsvollholz C24 über alle Geschosse", QueryIntent.SPATIAL),
            ("Erstelle eine Übersicht aller verwendeten Holzarten mit ihren Festigkeitsklassen", QueryIntent.MATERIAL)
        ]
        
        for query, expected_intent in complex_queries:
            result = classifier.classify_intent(query)
            assert result.intent == expected_intent, \
                f"Complex query incorrectly classified as {result.intent.value}, expected {expected_intent.value}"
            assert result.confidence > 0.25, \
                f"Complex query has low confidence: {result.confidence}"
    
    def test_abbreviations_and_technical_terms(self, classifier):
        """Test handling of German building industry abbreviations."""
        abbreviation_queries = [
            ("C24 Holz im EG", QueryIntent.MATERIAL),
            ("GL70 Träger im DG", QueryIntent.MATERIAL), 
            ("DIN 276 Kostengruppen", QueryIntent.COST),
            ("REI 60 Feuerwiderstand", QueryIntent.MATERIAL),
            ("W_035 Bauteilgruppe", QueryIntent.SPATIAL)
        ]
        
        for query, expected_intent in abbreviation_queries:
            result = classifier.classify_intent(query)
            assert result.intent == expected_intent, \
                f"Abbreviation query '{query}' incorrectly classified as {result.intent.value}"
    
    def test_german_numerical_expressions(self, classifier):
        """Test German numerical expressions and measurements."""
        numerical_queries = [
            "Wie viele Kubikmeter",
            "Wieviele Stück",
            "Anzahl der Bauteile",
            "Gesamtvolumen berechnen",
            "Länge in Millimeter",
            "Breite und Höhe",
            "Rohdichte nach DIN 68364"
        ]
        
        for query in numerical_queries:
            full_query = f"{query} sind verbaut?"
            result = classifier.classify_intent(full_query)
            assert result.intent == QueryIntent.QUANTITY, \
                f"Numerical query '{full_query}' incorrectly classified as {result.intent.value}"