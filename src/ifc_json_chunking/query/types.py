"""
Type definitions for query processing and orchestration system.

This module contains all type definitions and data structures used
throughout the query processing pipeline for type safety and clarity.
"""

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from ..models import Chunk


class QueryIntent(Enum):
    """Supported query intents for building industry queries."""
    QUANTITY = "quantity"      # Wie viel, Wieviele - quantitative analysis
    COMPONENT = "component"    # Welche, Alle - component identification
    MATERIAL = "material"      # Material, Stoff - material classification
    SPATIAL = "spatial"        # Raum, Stock - spatial/location queries
    COST = "cost"             # Kosten, Preis - cost analysis
    RELATIONSHIP = "relationship"  # Beziehung, Verbindung - entity relationships
    PROPERTY = "property"      # Eigenschaft, Attribut - property queries
    UNKNOWN = "unknown"        # Unrecognized query pattern


class QueryStatus(Enum):
    """Status of query processing."""
    PENDING = "pending"
    PREPROCESSING = "preprocessing"
    PROCESSING = "processing"
    AGGREGATING = "aggregating"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ProgressEventType(Enum):
    """Types of progress events during query processing."""
    STARTED = "started"
    PREPROCESSING_COMPLETE = "preprocessing_complete"
    CHUNK_STARTED = "chunk_started"
    CHUNK_COMPLETED = "chunk_completed"
    CHUNK_FAILED = "chunk_failed"
    AGGREGATION_STARTED = "aggregation_started"
    AGGREGATION_COMPLETE = "aggregation_complete"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class QueryParameters:
    """Parameters extracted from query analysis."""

    # Query characteristics
    language: str = "de"
    entity_types: List[str] = field(default_factory=list)
    spatial_constraints: Dict[str, Any] = field(default_factory=dict)
    quantity_requirements: Dict[str, Any] = field(default_factory=dict)
    material_filters: List[str] = field(default_factory=list)
    property_filters: Dict[str, Any] = field(default_factory=dict)

    # Processing preferences
    precision_level: str = "standard"  # low, standard, high
    include_metadata: bool = True
    aggregate_results: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "language": self.language,
            "entity_types": self.entity_types,
            "spatial_constraints": self.spatial_constraints,
            "quantity_requirements": self.quantity_requirements,
            "material_filters": self.material_filters,
            "property_filters": self.property_filters,
            "precision_level": self.precision_level,
            "include_metadata": self.include_metadata,
            "aggregate_results": self.aggregate_results
        }


@dataclass
class QueryContext:
    """Context maintained throughout query processing."""

    query_id: str
    original_query: str
    intent: QueryIntent
    parameters: QueryParameters
    confidence_score: float

    # Processing state
    processed_chunks: List[str] = field(default_factory=list)
    chunk_results: Dict[str, Any] = field(default_factory=dict)
    aggregated_context: Dict[str, Any] = field(default_factory=dict)

    # Metadata
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def update_context(self, chunk_id: str, result: Dict[str, Any]) -> None:
        """Update context with chunk processing result."""
        self.processed_chunks.append(chunk_id)
        self.chunk_results[chunk_id] = result
        self.updated_at = time.time()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "query_id": self.query_id,
            "original_query": self.original_query,
            "intent": self.intent.value,
            "parameters": self.parameters.to_dict(),
            "confidence_score": self.confidence_score,
            "processed_chunks": self.processed_chunks,
            "chunk_results": self.chunk_results,
            "aggregated_context": self.aggregated_context,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


@dataclass
class ProgressEvent:
    """Event for tracking query processing progress."""

    event_type: ProgressEventType
    query_id: str
    current_step: int
    total_steps: int
    message: str
    progress_percentage: float

    # Optional details
    chunk_id: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "event_type": self.event_type.value,
            "query_id": self.query_id,
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "message": self.message,
            "progress_percentage": self.progress_percentage,
            "chunk_id": self.chunk_id,
            "error_message": self.error_message,
            "metadata": self.metadata,
            "timestamp": self.timestamp
        }


@dataclass
class ChunkResult:
    """Result from processing a single chunk."""

    chunk_id: str
    content: str
    status: str
    tokens_used: int
    processing_time: float

    # Extracted information
    entities: List[Dict[str, Any]] = field(default_factory=list)
    quantities: Dict[str, float] = field(default_factory=dict)
    properties: Dict[str, Any] = field(default_factory=dict)
    relationships: List[Dict[str, Any]] = field(default_factory=list)

    # Quality metrics
    confidence_score: float = 0.0
    extraction_quality: str = "unknown"  # high, medium, low, unknown

    # Metadata
    model_used: Optional[str] = None
    prompt_used: Optional[str] = None
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "chunk_id": self.chunk_id,
            "content": self.content,
            "status": self.status,
            "tokens_used": self.tokens_used,
            "processing_time": self.processing_time,
            "entities": self.entities,
            "quantities": self.quantities,
            "properties": self.properties,
            "relationships": self.relationships,
            "confidence_score": self.confidence_score,
            "extraction_quality": self.extraction_quality,
            "model_used": self.model_used,
            "prompt_used": self.prompt_used,
            "error_message": self.error_message
        }


@dataclass
class QueryResult:
    """Final result of query processing."""

    query_id: str
    original_query: str
    intent: QueryIntent
    status: QueryStatus

    # Results
    answer: str
    chunk_results: List[ChunkResult]
    aggregated_data: Dict[str, Any]

    # Performance metrics
    total_chunks: int
    successful_chunks: int
    failed_chunks: int
    total_tokens: int
    total_cost: float
    processing_time: float

    # Quality metrics
    confidence_score: float
    completeness_score: float  # How complete is the answer
    relevance_score: float     # How relevant is the answer

    # Metadata
    model_used: str
    prompt_strategy: str
    context_preserved: bool = True
    created_at: float = field(default_factory=time.time)

    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage."""
        if self.total_chunks == 0:
            return 0.0
        return (self.successful_chunks / self.total_chunks) * 100

    @property
    def average_confidence(self) -> float:
        """Calculate average confidence across chunk results."""
        if not self.chunk_results:
            return 0.0

        confidences = [r.confidence_score for r in self.chunk_results if r.confidence_score > 0]
        return sum(confidences) / len(confidences) if confidences else 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "query_id": self.query_id,
            "original_query": self.original_query,
            "intent": self.intent.value,
            "status": self.status.value,
            "answer": self.answer,
            "chunk_results": [r.to_dict() for r in self.chunk_results],
            "aggregated_data": self.aggregated_data,
            "total_chunks": self.total_chunks,
            "successful_chunks": self.successful_chunks,
            "failed_chunks": self.failed_chunks,
            "total_tokens": self.total_tokens,
            "total_cost": self.total_cost,
            "processing_time": self.processing_time,
            "confidence_score": self.confidence_score,
            "completeness_score": self.completeness_score,
            "relevance_score": self.relevance_score,
            "success_rate": self.success_rate,
            "average_confidence": self.average_confidence,
            "model_used": self.model_used,
            "prompt_strategy": self.prompt_strategy,
            "context_preserved": self.context_preserved,
            "created_at": self.created_at
        }


@dataclass
class QueryRequest:
    """Request for processing a query."""

    query: str
    chunks: List[Chunk]

    # Optional parameters
    query_id: Optional[str] = None
    intent_hint: Optional[QueryIntent] = None
    parameters: Optional[QueryParameters] = None
    progress_callback: Optional[Callable[[ProgressEvent], None]] = None

    # Processing options
    max_concurrent: int = 10
    timeout_seconds: int = 300
    cache_results: bool = True

    def __post_init__(self):
        """Initialize default values after creation."""
        if self.query_id is None:
            self.query_id = f"query_{uuid.uuid4().hex[:12]}"

        if self.parameters is None:
            self.parameters = QueryParameters()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "query": self.query,
            "chunks": [c.to_dict() for c in self.chunks],
            "query_id": self.query_id,
            "intent_hint": self.intent_hint.value if self.intent_hint else None,
            "parameters": self.parameters.to_dict() if self.parameters else None,
            "max_concurrent": self.max_concurrent,
            "timeout_seconds": self.timeout_seconds,
            "cache_results": self.cache_results
        }


# Type aliases for callback functions
ProgressCallback = Callable[[ProgressEvent], None]
ResultCallback = Callable[[QueryResult], None]
ErrorCallback = Callable[[Exception], None]

# Common pattern definitions for German building industry queries
QUANTITY_PATTERNS = [
    r"wie\s+viel(?:e?)",
    r"wieviel(?:e?)",
    r"anzahl",
    r"menge",
    r"volumen",
    r"fläche",
    r"länge",
    r"kubikmeter",
    r"quadratmeter",
    r"meter"
]

COMPONENT_PATTERNS = [
    r"welche?\s+(?:arten?|typen?|komponenten?)",
    r"alle?\s+(?:bauteile?|elemente?|komponenten?)",
    r"(?:türen?|fenster|wände?|decken?|stützen?)",
    r"liste\s+(?:aller?|der?)",
    r"auflistung",
    r"übersicht"
]

MATERIAL_PATTERNS = [
    r"material(?:ien?)?",
    r"baustoff(?:e?)",
    r"(?:beton|stahl|holz|glas|ziegel)",
    r"werkstoff(?:e?)",
    r"stofflich",
    r"materialart(?:en?)?",
    r"konstruktionsvollholz",
    r"brettschichtholz",
    r"festigkeitsklasse(?:n?)?",
    r"holzart(?:en?)?",
    r"rohdichte",
    r"(?:c24|gl70)\b",  # strength/material classes (word boundary to avoid false matches)
    r"(?:fichte|buche|eiche)",  # wood types
    r"baustoffklasse"
]

SPATIAL_PATTERNS = [
    r"raum\s+(?:r?\d+|\w+)",
    r"(?:stock|stockwerk|etage|ebene)\s+\d+",
    r"\d+\.\s+(?:stock|stockwerk|etage|ebene|geschoss)",  # matches "3. Stock"
    r"(?:in|im|am|auf)\s+(?:raum|stock|ebene)",
    r"(?:im|in)\s+(?:bereich|zone)\s+\w+",  # "im Bereich A" - stronger spatial context
    r"bereich\s+\w+",  # "Bereich A"
    r"zone\s+\w+",  # "Zone A"
    r"geschoss\s*\d*",
    r"(?:erd|dach)geschoss",  # EG, DG
    r"(?:eg|1og|2og|3og|dg)",  # floor abbreviations
    r"obergeschoss",
    r"bauteilzugehörigkeits?(?:-?nr\.?)?",  # component association numbers
    r"w_\d+",  # wall numbering like W_035
    r"bauabschnitt",
    r"bauteilschicht"
]

COST_PATTERNS = [
    r"materialkosten",  # specific material cost pattern first
    r"(?:material|bau|gesamt|transport|produktions)?kosten",  # broader cost patterns
    r"preis(?:e?)",
    r"budget",
    r"aufwand",
    r"investition(?:en?)?",
    r"ausgaben?",
    r"euro|€|\$",
    r"wirtschaftlich",  # economic
    r"finanzierung",  # financing
    r"kostengruppe(?:n?)?",  # cost groups
    r"din\s*276",  # DIN 276 cost classification
    r"hersteller(?:/produkt)?",  # manufacturer/product
    r"produktionsnummer",
    r"transportnummer"
]
