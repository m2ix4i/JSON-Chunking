"""
Intent classification for German building industry queries.

This module provides intelligent intent detection for various types of
building-related queries with pattern matching and confidence scoring.
"""

import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

import structlog

from ..query.types import (
    QueryIntent,
    QueryParameters,
    QUANTITY_PATTERNS,
    COMPONENT_PATTERNS,
    MATERIAL_PATTERNS,
    SPATIAL_PATTERNS,
    COST_PATTERNS
)

logger = structlog.get_logger(__name__)


@dataclass
class IntentMatch:
    """Result of intent classification."""
    intent: QueryIntent
    confidence: float
    matched_patterns: List[str]
    extracted_parameters: QueryParameters
    reasoning: str


class IntentClassifier:
    """
    Classifies user queries to determine intent and extract parameters.
    
    Specialized for German building industry queries with support for
    quantity, component, material, spatial, and cost-related intents.
    """
    
    def __init__(self):
        """Initialize the intent classifier."""
        self.pattern_weights = {
            QueryIntent.QUANTITY: 1.0,
            QueryIntent.COMPONENT: 1.0,
            QueryIntent.MATERIAL: 1.0,
            QueryIntent.SPATIAL: 1.0,
            QueryIntent.COST: 1.0,
            QueryIntent.RELATIONSHIP: 0.8,
            QueryIntent.PROPERTY: 0.8
        }
        
        # Compile regex patterns for efficiency
        self._compiled_patterns = self._compile_patterns()
        
        logger.info("IntentClassifier initialized with German building patterns")
    
    def classify_intent(self, query: str) -> IntentMatch:
        """
        Classify the intent of a user query.
        
        Args:
            query: User query string in German
            
        Returns:
            IntentMatch with classified intent and confidence score
        """
        query_lower = query.lower().strip()
        
        logger.debug("Classifying query intent", query=query)
        
        # Score each intent type
        intent_scores = {}
        matched_patterns = {}
        
        for intent in QueryIntent:
            if intent == QueryIntent.UNKNOWN:
                continue
                
            score, patterns = self._score_intent(query_lower, intent)
            intent_scores[intent] = score
            matched_patterns[intent] = patterns
        
        # Find best matching intent
        best_intent = max(intent_scores.keys(), key=lambda k: intent_scores[k])
        best_score = intent_scores[best_intent]
        
        # Apply confidence threshold - lower threshold for German building queries
        if best_score < 0.2:
            best_intent = QueryIntent.UNKNOWN
            best_score = 0.0
            matched_patterns[best_intent] = []  # Add empty patterns for UNKNOWN
        
        # Extract parameters based on intent
        parameters = self._extract_parameters(query_lower, best_intent)
        
        # Generate reasoning
        reasoning = self._generate_reasoning(
            query, best_intent, best_score, matched_patterns[best_intent]
        )
        
        result = IntentMatch(
            intent=best_intent,
            confidence=best_score,
            matched_patterns=matched_patterns[best_intent],
            extracted_parameters=parameters,
            reasoning=reasoning
        )
        
        logger.info(
            "Intent classification completed",
            query=query,
            intent=best_intent.value,
            confidence=best_score,
            patterns=len(matched_patterns[best_intent])
        )
        
        return result
    
    def _compile_patterns(self) -> Dict[QueryIntent, List[re.Pattern]]:
        """Compile regex patterns for efficient matching."""
        patterns = {
            QueryIntent.QUANTITY: [
                re.compile(pattern, re.IGNORECASE) 
                for pattern in QUANTITY_PATTERNS
            ],
            QueryIntent.COMPONENT: [
                re.compile(pattern, re.IGNORECASE) 
                for pattern in COMPONENT_PATTERNS
            ],
            QueryIntent.MATERIAL: [
                re.compile(pattern, re.IGNORECASE) 
                for pattern in MATERIAL_PATTERNS
            ],
            QueryIntent.SPATIAL: [
                re.compile(pattern, re.IGNORECASE) 
                for pattern in SPATIAL_PATTERNS
            ],
            QueryIntent.COST: [
                re.compile(pattern, re.IGNORECASE) 
                for pattern in COST_PATTERNS
            ],
            QueryIntent.RELATIONSHIP: [
                re.compile(r"(?:verbind|bezieh|relation|abhäng)", re.IGNORECASE),
                re.compile(r"(?:zwischen|zu|von|nach)", re.IGNORECASE),
                re.compile(r"(?:zusammenhang|verknüpf)", re.IGNORECASE)
            ],
            QueryIntent.PROPERTY: [
                re.compile(r"(?:eigenschaft|attribut|merkmal)", re.IGNORECASE),
                re.compile(r"(?:eigenschaften|parameter|werte?)", re.IGNORECASE),
                re.compile(r"(?:charakteristik|spezifikation)", re.IGNORECASE)
            ]
        }
        
        return patterns
    
    def _score_intent(self, query: str, intent: QueryIntent) -> Tuple[float, List[str]]:
        """Score how well a query matches an intent."""
        if intent not in self._compiled_patterns:
            return 0.0, []
        
        patterns = self._compiled_patterns[intent]
        matched_patterns = []
        total_score = 0.0
        
        for pattern in patterns:
            matches = pattern.findall(query)
            if matches:
                matched_patterns.extend(matches)
                # Score based on match strength and position
                match_score = len(matches) * 0.3
                
                # Boost score for matches at beginning of query
                if pattern.search(query[:20]):
                    match_score *= 1.5
                
                total_score += match_score
        
        # Normalize score based on query length and pattern weight
        query_length = len(query.split())
        # Use gentler normalization for short queries to avoid over-penalizing
        normalization_factor = max(query_length * 0.2, 1.0)  # Reduced from 0.5 to 0.2
        normalized_score = min(total_score / normalization_factor, 1.0)
        
        # Apply intent-specific weight
        weighted_score = normalized_score * self.pattern_weights.get(intent, 1.0)
        
        return weighted_score, matched_patterns
    
    def _extract_parameters(self, query: str, intent: QueryIntent) -> QueryParameters:
        """Extract parameters based on detected intent."""
        parameters = QueryParameters()
        
        # Extract entity types
        parameters.entity_types = self._extract_entity_types(query)
        
        # Extract spatial constraints
        parameters.spatial_constraints = self._extract_spatial_constraints(query)
        
        # Extract quantity requirements
        parameters.quantity_requirements = self._extract_quantity_requirements(query)
        
        # Extract material filters
        parameters.material_filters = self._extract_material_filters(query)
        
        # Extract property filters
        parameters.property_filters = self._extract_property_filters(query)
        
        # Set precision level based on intent and query complexity
        if intent in [QueryIntent.QUANTITY, QueryIntent.COST]:
            parameters.precision_level = "high"
        elif intent in [QueryIntent.COMPONENT, QueryIntent.MATERIAL]:
            parameters.precision_level = "standard"
        else:
            parameters.precision_level = "standard"
        
        # Configure aggregation preferences
        if intent in [QueryIntent.QUANTITY, QueryIntent.COST]:
            parameters.aggregate_results = True
        else:
            parameters.aggregate_results = False
        
        return parameters
    
    def _extract_entity_types(self, query: str) -> List[str]:
        """Extract entity types mentioned in the query."""
        entity_patterns = {
            "türen": ["door", "opening"],
            "fenster": ["window", "opening"],
            "wände?": ["wall"],
            "decken?": ["slab", "ceiling"],
            "stützen?": ["column", "support"],
            "träger": ["beam"],
            "fundament": ["foundation"],
            "dach": ["roof"],
            "treppe": ["stair"],
            "aufzug": ["elevator"],
            "hvac": ["hvac", "mechanical"],
            "sanitär": ["plumbing"],
            "elektro": ["electrical"]
        }
        
        entities = []
        for pattern, entity_types in entity_patterns.items():
            if re.search(pattern, query, re.IGNORECASE):
                entities.extend(entity_types)
        
        return list(set(entities))  # Remove duplicates
    
    def _extract_spatial_constraints(self, query: str) -> Dict[str, any]:
        """Extract spatial constraints from the query."""
        constraints = {}
        
        # Room constraints
        room_match = re.search(r"raum\s+(r?\d+|\w+)", query, re.IGNORECASE)
        if room_match:
            constraints["room"] = room_match.group(1)
        
        # Floor/level constraints
        floor_match = re.search(r"(?:stock|stockwerk|etage|ebene)\s+(\d+)", query, re.IGNORECASE)
        if floor_match:
            constraints["floor"] = int(floor_match.group(1))
        
        # Zone constraints
        zone_match = re.search(r"(?:bereich|zone)\s+(\w+)", query, re.IGNORECASE)
        if zone_match:
            constraints["zone"] = zone_match.group(1)
        
        return constraints
    
    def _extract_quantity_requirements(self, query: str) -> Dict[str, any]:
        """Extract quantity-related requirements."""
        requirements = {}
        
        # Volume requirements
        if re.search(r"(?:kubikmeter|m³|cbm)", query, re.IGNORECASE):
            requirements["unit"] = "cubic_meter"
            requirements["measure_type"] = "volume"
        
        # Area requirements
        elif re.search(r"(?:quadratmeter|m²|qm)", query, re.IGNORECASE):
            requirements["unit"] = "square_meter"
            requirements["measure_type"] = "area"
        
        # Length requirements
        elif re.search(r"(?:meter|m|länge)", query, re.IGNORECASE):
            requirements["unit"] = "meter"
            requirements["measure_type"] = "length"
        
        # Count requirements
        elif re.search(r"(?:anzahl|stück|menge)", query, re.IGNORECASE):
            requirements["unit"] = "count"
            requirements["measure_type"] = "quantity"
        
        return requirements
    
    def _extract_material_filters(self, query: str) -> List[str]:
        """Extract material filters from the query."""
        material_patterns = {
            r"beton": "concrete",
            r"stahl": "steel",
            r"holz": "wood",
            r"glas": "glass",
            r"ziegel": "brick",
            r"stein": "stone",
            r"aluminium": "aluminum",
            r"kunststoff": "plastic",
            r"gips": "gypsum"
        }
        
        materials = []
        for pattern, material in material_patterns.items():
            if re.search(pattern, query, re.IGNORECASE):
                materials.append(material)
        
        return materials
    
    def _extract_property_filters(self, query: str) -> Dict[str, any]:
        """Extract property filters from the query."""
        filters = {}
        
        # Fire resistance
        if re.search(r"(?:feuer|brand)(?:schutz|widerstand)", query, re.IGNORECASE):
            filters["fire_resistance"] = True
        
        # Load bearing
        if re.search(r"(?:tragend|lastaufnahme)", query, re.IGNORECASE):
            filters["load_bearing"] = True
        
        # Thermal properties
        if re.search(r"(?:thermisch|wärme|dämmung)", query, re.IGNORECASE):
            filters["thermal"] = True
        
        # Acoustic properties
        if re.search(r"(?:akustisch|schall|lärm)", query, re.IGNORECASE):
            filters["acoustic"] = True
        
        return filters
    
    def _generate_reasoning(
        self,
        query: str,
        intent: QueryIntent,
        confidence: float,
        patterns: List[str]
    ) -> str:
        """Generate human-readable reasoning for the classification."""
        if intent == QueryIntent.UNKNOWN:
            return f"Query '{query}' did not match any known patterns clearly enough (confidence: {confidence:.2f})"
        
        reasoning_parts = [
            f"Classified as '{intent.value}' intent with {confidence:.2f} confidence."
        ]
        
        if patterns:
            reasoning_parts.append(f"Matched patterns: {', '.join(patterns[:3])}")
        
        # Add intent-specific reasoning
        if intent == QueryIntent.QUANTITY:
            reasoning_parts.append("Detected quantitative analysis request")
        elif intent == QueryIntent.COMPONENT:
            reasoning_parts.append("Detected component identification request")
        elif intent == QueryIntent.MATERIAL:
            reasoning_parts.append("Detected material analysis request")
        elif intent == QueryIntent.SPATIAL:
            reasoning_parts.append("Detected spatial/location-based query")
        elif intent == QueryIntent.COST:
            reasoning_parts.append("Detected cost analysis request")
        
        return " ".join(reasoning_parts)
    
    def get_supported_intents(self) -> List[QueryIntent]:
        """Get list of supported query intents."""
        return [intent for intent in QueryIntent if intent != QueryIntent.UNKNOWN]
    
    def get_pattern_examples(self, intent: QueryIntent) -> List[str]:
        """Get example patterns for a specific intent."""
        examples = {
            QueryIntent.QUANTITY: [
                "Wie viel Kubikmeter Beton sind verbaut?",
                "Wieviele Türen sind im 2. Stock?",
                "Anzahl der Stützen im Gebäude"
            ],
            QueryIntent.COMPONENT: [
                "Welche Türen sind im 2. Stock?",
                "Alle Fenster auflisten",
                "Übersicht der Wände"
            ],
            QueryIntent.MATERIAL: [
                "Alle Betonelemente auflisten",
                "Material der Stützen",
                "Welche Baustoffe wurden verwendet?"
            ],
            QueryIntent.SPATIAL: [
                "Was ist in Raum R101?",
                "Komponenten im 3. Stock",
                "Alle Elemente im Bereich A"
            ],
            QueryIntent.COST: [
                "Materialkosten für HVAC-System",
                "Preise der Stahlträger",
                "Budget für Betonarbeiten"
            ]
        }
        
        return examples.get(intent, [])