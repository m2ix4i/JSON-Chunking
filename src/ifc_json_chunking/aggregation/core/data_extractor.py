"""
Data extraction component for structured information retrieval.

This module extracts structured data from LLM chunk responses,
parsing entities, quantities, properties, and relationships into
standardized formats for aggregation processing.
"""

import json
import re
from typing import Any, Dict, List, Optional, Tuple

import structlog

from ...query.types import ChunkResult, QueryIntent
from ...types.aggregation_types import ExtractedData

logger = structlog.get_logger(__name__)


class DataExtractor:
    """
    Extracts structured data from LLM chunk responses.
    
    Parses natural language responses into structured data formats
    suitable for aggregation, conflict detection, and synthesis.
    """

    def __init__(self):
        """Initialize data extractor with parsing patterns."""
        self._initialize_patterns()

        logger.info("DataExtractor initialized")

    def _initialize_patterns(self) -> None:
        """Initialize regex patterns for data extraction."""

        # Quantity patterns (numbers with units)
        self.quantity_patterns = {
            'volume': re.compile(r'(\d+(?:\.\d+)?)\s*(?:cubic\s*)?(?:meters?|m³|m3|kubikmeter)', re.IGNORECASE),
            'area': re.compile(r'(\d+(?:\.\d+)?)\s*(?:square\s*)?(?:meters?|m²|m2|quadratmeter)', re.IGNORECASE),
            'length': re.compile(r'(\d+(?:\.\d+)?)\s*(?:meters?|m|millimeters?|mm|centimeters?|cm)', re.IGNORECASE),
            'weight': re.compile(r'(\d+(?:\.\d+)?)\s*(?:kilograms?|kg|tons?|t)', re.IGNORECASE),
            'count': re.compile(r'(\d+)\s*(?:pieces?|items?|units?|stück)', re.IGNORECASE),
            'cost': re.compile(r'(\d+(?:\.\d+)?)\s*(?:€|euros?|EUR|\$|dollars?|USD)', re.IGNORECASE)
        }

        # Entity patterns (IFC entities)
        self.entity_patterns = {
            'building': re.compile(r'\b(?:IfcBuilding|building|gebäude)\b', re.IGNORECASE),
            'wall': re.compile(r'\b(?:IfcWall|wall|wand|mauer)\b', re.IGNORECASE),
            'door': re.compile(r'\b(?:IfcDoor|door|tür)\b', re.IGNORECASE),
            'window': re.compile(r'\b(?:IfcWindow|window|fenster)\b', re.IGNORECASE),
            'floor': re.compile(r'\b(?:IfcSlab|floor|slab|decke|boden)\b', re.IGNORECASE),
            'room': re.compile(r'\b(?:IfcSpace|room|space|raum)\b', re.IGNORECASE),
            'column': re.compile(r'\b(?:IfcColumn|column|stütze|säule)\b', re.IGNORECASE),
            'beam': re.compile(r'\b(?:IfcBeam|beam|träger|balken)\b', re.IGNORECASE)
        }

        # Property patterns
        self.property_patterns = {
            'material': re.compile(r'(?:material|werkstoff|baustoff):\s*([^\n,]+)', re.IGNORECASE),
            'name': re.compile(r'(?:name|bezeichnung):\s*([^\n,]+)', re.IGNORECASE),
            'type': re.compile(r'(?:type|typ|art):\s*([^\n,]+)', re.IGNORECASE),
            'location': re.compile(r'(?:location|lage|ort|position):\s*([^\n,]+)', re.IGNORECASE),
            'status': re.compile(r'(?:status|zustand):\s*([^\n,]+)', re.IGNORECASE)
        }

        # Relationship patterns
        self.relationship_patterns = {
            'contains': re.compile(r'(\w+)\s+(?:contains?|enthält|beinhaltet)\s+(\w+)', re.IGNORECASE),
            'connected_to': re.compile(r'(\w+)\s+(?:connected to|verbunden mit)\s+(\w+)', re.IGNORECASE),
            'part_of': re.compile(r'(\w+)\s+(?:part of|teil von)\s+(\w+)', re.IGNORECASE),
            'adjacent_to': re.compile(r'(\w+)\s+(?:adjacent to|angrenzend an)\s+(\w+)', re.IGNORECASE)
        }

        # Identifier patterns (entity IDs)
        self.id_pattern = re.compile(r'#(\d+)')

        # Structured data patterns (JSON-like structures)
        self.json_pattern = re.compile(r'\{[^}]+\}')

    async def extract_data(
        self,
        chunk_result: ChunkResult,
        query_intent: QueryIntent,
        context: Optional[Dict[str, Any]] = None
    ) -> ExtractedData:
        """Extract structured data from a chunk result."""
        logger.debug("Starting data extraction", chunk_id=chunk_result.chunk_id, intent=query_intent.value)

        try:
            if not self._is_valid_content(chunk_result.content):
                return self._create_empty_extracted_data(chunk_result)

            extracted_data = self._initialize_extracted_data(chunk_result)
            await self._extract_by_intent(extracted_data, chunk_result.content.strip(), query_intent)
            extracted_data.semantic_context = await self._extract_semantic_context(chunk_result.content, query_intent)
            extracted_data.extraction_confidence = self._calculate_extraction_confidence(extracted_data)

            self._log_extraction_results(extracted_data)
            return extracted_data

        except Exception as e:
            return self._handle_extraction_error(chunk_result, e)

    def _is_valid_content(self, content: str) -> bool:
        """Check if content is valid for extraction."""
        return bool(content and content.strip())

    def _create_empty_extracted_data(self, chunk_result: ChunkResult) -> ExtractedData:
        """Create empty extracted data for invalid content."""
        logger.warning("Empty chunk content", chunk_id=chunk_result.chunk_id)
        return ExtractedData(chunk_id=chunk_result.chunk_id, extraction_confidence=chunk_result.confidence_score)

    def _initialize_extracted_data(self, chunk_result: ChunkResult) -> ExtractedData:
        """Initialize extracted data with chunk metadata."""
        return ExtractedData(
            chunk_id=chunk_result.chunk_id,
            extraction_confidence=chunk_result.confidence_score,
            data_quality=chunk_result.extraction_quality
        )

    async def _extract_by_intent(self, data: ExtractedData, content: str, intent: QueryIntent) -> None:
        """Extract data based on query intent using pluggable handlers."""
        handler = self._get_intent_handler(intent)
        await handler(data, content)

    def _get_intent_handler(self, intent: QueryIntent):
        """Get intent-specific extraction handler."""
        handlers = {
            QueryIntent.QUANTITY: self._handle_quantity_intent,
            QueryIntent.COMPONENT: self._handle_component_intent,
            QueryIntent.MATERIAL: self._handle_material_intent,
            QueryIntent.SPATIAL: self._handle_spatial_intent,
            QueryIntent.COST: self._handle_cost_intent,
        }
        return handlers.get(intent, self._handle_generic_intent)

    async def _handle_quantity_intent(self, data: ExtractedData, content: str) -> None:
        """Handle quantity-focused extraction."""
        data.quantities = await self._extract_quantities(content)
        data.entities = await self._extract_entities(content)

    async def _handle_component_intent(self, data: ExtractedData, content: str) -> None:
        """Handle component-focused extraction."""
        data.entities = await self._extract_entities(content)
        data.properties = await self._extract_properties(content)
        data.relationships = await self._extract_relationships(content)

    async def _handle_material_intent(self, data: ExtractedData, content: str) -> None:
        """Handle material-focused extraction."""
        data.properties = await self._extract_properties(content)
        data.entities = await self._extract_entities(content)

    async def _handle_spatial_intent(self, data: ExtractedData, content: str) -> None:
        """Handle spatial-focused extraction."""
        data.entities = await self._extract_entities(content)
        data.relationships = await self._extract_relationships(content)
        data.spatial_context = await self._extract_spatial_context(content)

    async def _handle_cost_intent(self, data: ExtractedData, content: str) -> None:
        """Handle cost-focused extraction."""
        data.quantities = await self._extract_quantities(content)
        data.properties = await self._extract_properties(content)

    async def _handle_generic_intent(self, data: ExtractedData, content: str) -> None:
        """Handle generic extraction for unknown intents."""
        data.entities = await self._extract_entities(content)
        data.quantities = await self._extract_quantities(content)
        data.properties = await self._extract_properties(content)
        data.relationships = await self._extract_relationships(content)

    def _log_extraction_results(self, data: ExtractedData) -> None:
        """Log extraction results for monitoring."""
        logger.debug(
            "Data extraction completed",
            chunk_id=data.chunk_id,
            entities_count=len(data.entities),
            quantities_count=len(data.quantities),
            properties_count=len(data.properties),
            relationships_count=len(data.relationships),
            confidence=data.extraction_confidence
        )

    def _handle_extraction_error(self, chunk_result: ChunkResult, error: Exception) -> ExtractedData:
        """Handle extraction errors gracefully."""
        logger.error("Data extraction failed", chunk_id=chunk_result.chunk_id, error=str(error))
        return ExtractedData(
            chunk_id=chunk_result.chunk_id,
            extraction_confidence=0.0,
            data_quality="low",
            processing_errors=[f"Extraction failed: {str(error)}"]
        )

    async def _extract_quantities(self, content: str) -> Dict[str, Any]:
        """Extract numerical quantities with units."""
        quantities = {}

        for quantity_type, pattern in self.quantity_patterns.items():
            matches = pattern.findall(content)
            if matches:
                # Convert to float and store the first match (could be enhanced for multiple matches)
                try:
                    quantities[quantity_type] = float(matches[0])
                except (ValueError, IndexError):
                    quantities[quantity_type] = matches[0] if matches else None

        # Extract general numbers that might be quantities
        number_pattern = re.compile(r'\b(\d+(?:\.\d+)?)\b')
        numbers = [float(match) for match in number_pattern.findall(content)]
        if numbers:
            quantities['raw_numbers'] = numbers

        return quantities

    async def _extract_entities(self, content: str) -> List[Dict[str, Any]]:
        """Extract building entities and components."""
        entities = []
        entities.extend(await self._extract_pattern_entities(content))
        entities.extend(await self._extract_structured_entities(content))
        return entities

    async def _extract_pattern_entities(self, content: str) -> List[Dict[str, Any]]:
        """Extract entities using regex patterns."""
        entities = []
        for entity_type, pattern in self.entity_patterns.items():
            matches = pattern.finditer(content)
            for match in matches:
                entity = self._create_pattern_entity(entity_type, match, content)
                entities.append(entity)
        return entities

    def _create_pattern_entity(self, entity_type: str, match, content: str) -> Dict[str, Any]:
        """Create entity from pattern match."""
        entity_id = self._extract_entity_id(content, match)
        context_start, context_end = self._get_context_bounds(match, content)

        return {
            'type': entity_type,
            'entity_id': entity_id,
            'text_match': match.group(),
            'context_start': context_start,
            'context_end': context_end,
            'context': content[context_start:context_end]
        }

    def _extract_entity_id(self, content: str, match) -> Optional[str]:
        """Extract entity ID near the match."""
        id_search = self.id_pattern.search(content, match.start() - 10, match.end() + 10)
        return f"#{id_search.group(1)}" if id_search else None

    def _get_context_bounds(self, match, content: str) -> Tuple[int, int]:
        """Get context boundaries around match."""
        context_start = max(0, match.start() - 50)
        context_end = min(len(content), match.end() + 50)
        return context_start, context_end

    async def _extract_structured_entities(self, content: str) -> List[Dict[str, Any]]:
        """Extract structured entity data from JSON-like patterns."""
        entities = []
        json_matches = self.json_pattern.finditer(content)
        for match in json_matches:
            entity = await self._parse_json_entity(match.group())
            if entity:
                entities.append(entity)
        return entities

    async def _parse_json_entity(self, json_text: str) -> Optional[Dict[str, Any]]:
        """Parse JSON entity data safely."""
        try:
            json_data = json.loads(json_text)
            if isinstance(json_data, dict) and any(key in json_data for key in ['type', 'name', 'id']):
                return {'type': 'structured', 'data': json_data, 'source': 'json_extraction'}
        except json.JSONDecodeError:
            pass
        return None

    async def _extract_properties(self, content: str) -> Dict[str, Any]:
        """Extract properties and attributes."""
        properties = {}

        for property_name, pattern in self.property_patterns.items():
            matches = pattern.findall(content)
            if matches:
                # Store the first match (could be enhanced for multiple matches)
                properties[property_name] = matches[0].strip()

        # Extract key-value pairs (general pattern)
        kv_pattern = re.compile(r'(\w+):\s*([^\n,]+)', re.IGNORECASE)
        kv_matches = kv_pattern.findall(content)
        for key, value in kv_matches:
            if key.lower() not in properties:  # Don't override specific extractions
                properties[key.lower()] = value.strip()

        return properties

    async def _extract_relationships(self, content: str) -> List[Dict[str, Any]]:
        """Extract relationships between entities."""
        relationships = []

        for relationship_type, pattern in self.relationship_patterns.items():
            matches = pattern.findall(content)
            for match in matches:
                if len(match) >= 2:
                    relationship = {
                        'type': relationship_type,
                        'source': match[0],
                        'target': match[1],
                        'confidence': 0.7  # Default confidence
                    }
                    relationships.append(relationship)

        return relationships

    async def _extract_spatial_context(self, content: str) -> Dict[str, Any]:
        """Extract spatial context and location information."""
        spatial_context = {}

        # Extract floor/level information
        floor_pattern = re.compile(r'(?:floor|level|stock|ebene|geschoss)\s*(\d+)', re.IGNORECASE)
        floor_matches = floor_pattern.findall(content)
        if floor_matches:
            spatial_context['floor'] = int(floor_matches[0])

        # Extract room information
        room_pattern = re.compile(r'(?:room|raum)\s*([A-Za-z0-9-]+)', re.IGNORECASE)
        room_matches = room_pattern.findall(content)
        if room_matches:
            spatial_context['room'] = room_matches[0]

        # Extract coordinates if present
        coord_pattern = re.compile(r'(?:x|y|z):\s*(-?\d+(?:\.\d+)?)', re.IGNORECASE)
        coord_matches = coord_pattern.findall(content)
        if coord_matches:
            spatial_context['coordinates'] = [float(coord) for coord in coord_matches]

        return spatial_context

    async def _extract_semantic_context(self, content: str, query_intent: QueryIntent) -> Dict[str, Any]:
        """Extract semantic context relevant to the query intent."""
        semantic_context = {
            'intent': query_intent.value,
            'content_type': self._classify_content_type(content),
            'language': self._detect_language(content),
            'complexity': self._assess_content_complexity(content)
        }

        # Extract key phrases and terms
        key_phrases = self._extract_key_phrases(content)
        if key_phrases:
            semantic_context['key_phrases'] = key_phrases

        return semantic_context

    def _classify_content_type(self, content: str) -> str:
        """Classify the type of content in the chunk."""
        if any(pattern.search(content) for pattern in self.quantity_patterns.values()):
            return 'quantitative'
        elif any(pattern.search(content) for pattern in self.entity_patterns.values()):
            return 'entity_focused'
        elif any(pattern.search(content) for pattern in self.relationship_patterns.values()):
            return 'relationship_focused'
        else:
            return 'descriptive'

    def _detect_language(self, content: str) -> str:
        """Detect the primary language of the content."""
        # Simple heuristic based on common German construction terms
        german_terms = ['gebäude', 'wand', 'tür', 'fenster', 'raum', 'decke', 'boden',
                       'material', 'baustoff', 'kubikmeter', 'quadratmeter']

        german_count = sum(1 for term in german_terms if term in content.lower())

        if german_count > 2:
            return 'de'
        else:
            return 'en'  # Default to English

    def _assess_content_complexity(self, content: str) -> str:
        """Assess the complexity of the content."""
        # Simple heuristic based on content length and structure
        if len(content) < 100:
            return 'simple'
        elif len(content) < 500:
            return 'moderate'
        else:
            return 'complex'

    def _extract_key_phrases(self, content: str) -> List[str]:
        """Extract key phrases from the content."""
        # Simple approach: extract noun phrases and technical terms
        # This could be enhanced with NLP libraries

        # Pattern for technical terms (IfcXxx, capitalized words)
        technical_pattern = re.compile(r'\b(?:Ifc\w+|\b[A-Z][a-z]+(?:[A-Z][a-z]+)*)\b')
        technical_terms = technical_pattern.findall(content)

        # Pattern for measurement terms
        measurement_pattern = re.compile(r'\b\d+(?:\.\d+)?\s*[a-zA-Z]+\b')
        measurements = measurement_pattern.findall(content)

        return list(set(technical_terms + measurements))

    def _calculate_extraction_confidence(self, extracted_data: ExtractedData) -> float:
        """Calculate confidence score based on extraction completeness."""
        score = 0.0

        # Base score from original chunk confidence
        score += extracted_data.extraction_confidence * 0.3

        # Score based on data richness
        if extracted_data.entities:
            score += 0.2
        if extracted_data.quantities:
            score += 0.2
        if extracted_data.properties:
            score += 0.15
        if extracted_data.relationships:
            score += 0.1
        if extracted_data.spatial_context:
            score += 0.05

        return min(score, 1.0)

    async def extract_batch(
        self,
        chunk_results: List[ChunkResult],
        query_intent: QueryIntent,
        context: Optional[Dict[str, Any]] = None
    ) -> List[ExtractedData]:
        """
        Extract data from multiple chunk results in batch.
        
        Args:
            chunk_results: List of chunk results to process
            query_intent: Intent of the original query
            context: Optional context information
            
        Returns:
            List of ExtractedData objects
        """
        extracted_data_list = []

        for chunk_result in chunk_results:
            extracted_data = await self.extract_data(chunk_result, query_intent, context)
            extracted_data_list.append(extracted_data)

        logger.info(
            "Batch extraction completed",
            total_chunks=len(chunk_results),
            successful_extractions=len([d for d in extracted_data_list if d.extraction_confidence > 0.0])
        )

        return extracted_data_list
