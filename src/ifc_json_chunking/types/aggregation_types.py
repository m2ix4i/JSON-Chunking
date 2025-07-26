"""
Type definitions for the advanced aggregation and synthesis engine.

This module contains core type definitions and data structures used
throughout the aggregation pipeline for type safety and clarity.
"""

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from ..query.types import QueryContext, QueryIntent, QueryResult


# Configuration constants for validation and quality calculations
class QualityWeights:
    """Configurable weights for quality score calculation."""
    CONFIDENCE = 0.25
    COMPLETENESS = 0.20
    CONSISTENCY = 0.20
    RELIABILITY = 0.20
    EXTRACTION = 0.15


class ValidationThresholds:
    """Configurable thresholds for validation."""
    MIN_CONFIDENCE_SCORE = 0.0
    MAX_CONFIDENCE_SCORE = 1.0
    MIN_QUALITY_SCORE = 0.0
    MAX_QUALITY_SCORE = 1.0
    MIN_SEVERITY = 0.0
    MAX_SEVERITY = 1.0


class ConflictType(Enum):
    """Types of conflicts that can be detected between chunks."""
    QUANTITATIVE_MISMATCH = "quantitative_mismatch"  # Numbers don't match
    QUALITATIVE_CONTRADICTION = "qualitative_contradiction"  # Descriptions contradict
    MISSING_INFORMATION = "missing_information"  # Information missing in some chunks
    INCONSISTENT_UNITS = "inconsistent_units"  # Different units for same measurement
    ENTITY_MISMATCH = "entity_mismatch"  # Different interpretations of same entity
    RELATIONSHIP_CONFLICT = "relationship_conflict"  # Conflicting relationships
    PROPERTY_CONTRADICTION = "property_contradiction"  # Conflicting property values


class ConflictStrategy(Enum):
    """Strategies for resolving conflicts."""
    MAJORITY_RULE = "majority_rule"  # Use most common value
    CONFIDENCE_WEIGHTED = "confidence_weighted"  # Weight by confidence scores
    STATISTICAL_ANALYSIS = "statistical_analysis"  # Use statistical methods
    EXPERT_RULES = "expert_rules"  # Apply domain-specific rules
    EVIDENCE_BASED = "evidence_based"  # Use evidence quality
    CONSERVATIVE = "conservative"  # Use most conservative estimate
    COMPREHENSIVE = "comprehensive"  # Combine all information


class AggregationStrategy(Enum):
    """Different aggregation strategies for different query types."""
    QUANTITATIVE = "quantitative"  # Numerical aggregation
    QUALITATIVE = "qualitative"  # Text/description synthesis
    CATEGORICAL = "categorical"  # Category-based grouping
    HIERARCHICAL = "hierarchical"  # Hierarchical data merging
    SPATIAL = "spatial"  # Spatial relationship synthesis
    TEMPORAL = "temporal"  # Time-based aggregation


class ValidationLevel(Enum):
    """Levels of validation rigor."""
    BASIC = "basic"  # Basic consistency checks
    STANDARD = "standard"  # Standard validation rules
    COMPREHENSIVE = "comprehensive"  # Full validation suite
    STRICT = "strict"  # Strict compliance checking


@dataclass
class ExtractedData:
    """Structured data extracted from a chunk result."""

    # Core data
    entities: List[Dict[str, Any]] = field(default_factory=list)
    quantities: Dict[str, Union[float, int, str]] = field(default_factory=dict)
    properties: Dict[str, Any] = field(default_factory=dict)
    relationships: List[Dict[str, Any]] = field(default_factory=list)

    # Metadata
    chunk_id: str = ""
    extraction_confidence: float = 0.0
    data_quality: str = "unknown"  # high, medium, low, unknown
    processing_errors: List[str] = field(default_factory=list)

    # Context information
    spatial_context: Dict[str, Any] = field(default_factory=dict)
    temporal_context: Dict[str, Any] = field(default_factory=dict)
    semantic_context: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Validate fields after initialization."""
        if not ValidationThresholds.MIN_CONFIDENCE_SCORE <= self.extraction_confidence <= ValidationThresholds.MAX_CONFIDENCE_SCORE:
            raise ValueError(f"Extraction confidence must be between {ValidationThresholds.MIN_CONFIDENCE_SCORE} and {ValidationThresholds.MAX_CONFIDENCE_SCORE}")

        if self.data_quality not in ['high', 'medium', 'low', 'unknown']:
            raise ValueError("Data quality must be one of: high, medium, low, unknown")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "entities": self.entities,
            "quantities": self.quantities,
            "properties": self.properties,
            "relationships": self.relationships,
            "chunk_id": self.chunk_id,
            "extraction_confidence": self.extraction_confidence,
            "data_quality": self.data_quality,
            "processing_errors": self.processing_errors,
            "spatial_context": self.spatial_context,
            "temporal_context": self.temporal_context,
            "semantic_context": self.semantic_context
        }


@dataclass
class Evidence:
    """Evidence supporting a particular piece of information."""

    source_chunk_id: str
    content: str
    confidence: float
    quality_score: float
    supporting_data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Validate fields after initialization."""
        if not ValidationThresholds.MIN_CONFIDENCE_SCORE <= self.confidence <= ValidationThresholds.MAX_CONFIDENCE_SCORE:
            raise ValueError(f"Confidence must be between {ValidationThresholds.MIN_CONFIDENCE_SCORE} and {ValidationThresholds.MAX_CONFIDENCE_SCORE}")

        if not ValidationThresholds.MIN_QUALITY_SCORE <= self.quality_score <= ValidationThresholds.MAX_QUALITY_SCORE:
            raise ValueError(f"Quality score must be between {ValidationThresholds.MIN_QUALITY_SCORE} and {ValidationThresholds.MAX_QUALITY_SCORE}")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "source_chunk_id": self.source_chunk_id,
            "content": self.content,
            "confidence": self.confidence,
            "quality_score": self.quality_score,
            "supporting_data": self.supporting_data,
            "metadata": self.metadata
        }


@dataclass
class Conflict:
    """Detected conflict between chunk results."""

    conflict_type: ConflictType
    description: str
    conflicting_chunks: List[str]
    conflicting_values: List[Any]
    severity: float  # 0.0 to 1.0

    # Evidence for each conflicting value
    evidence: List[Evidence] = field(default_factory=list)

    # Context information
    context: Dict[str, Any] = field(default_factory=dict)
    detected_at: float = field(default_factory=time.time)

    def __post_init__(self):
        """Validate fields after initialization."""
        if not ValidationThresholds.MIN_SEVERITY <= self.severity <= ValidationThresholds.MAX_SEVERITY:
            raise ValueError(f"Severity must be between {ValidationThresholds.MIN_SEVERITY} and {ValidationThresholds.MAX_SEVERITY}")

        if len(self.conflicting_chunks) < 2:
            raise ValueError("Conflict must involve at least 2 conflicting chunks")

        if len(self.conflicting_values) < 2:
            raise ValueError("Conflict must involve at least 2 conflicting values")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "conflict_type": self.conflict_type.value,
            "description": self.description,
            "conflicting_chunks": self.conflicting_chunks,
            "conflicting_values": self.conflicting_values,
            "severity": self.severity,
            "evidence": [e.to_dict() for e in self.evidence],
            "context": self.context,
            "detected_at": self.detected_at
        }


@dataclass
class ConflictResolution:
    """Resolution of a detected conflict."""

    conflict: Conflict
    strategy: ConflictStrategy
    resolved_value: Any
    confidence: float
    reasoning: str

    # Resolution details
    evidence_used: List[Evidence] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    resolved_at: float = field(default_factory=time.time)

    def __post_init__(self):
        """Validate fields after initialization."""
        if not ValidationThresholds.MIN_CONFIDENCE_SCORE <= self.confidence <= ValidationThresholds.MAX_CONFIDENCE_SCORE:
            raise ValueError(f"Confidence must be between {ValidationThresholds.MIN_CONFIDENCE_SCORE} and {ValidationThresholds.MAX_CONFIDENCE_SCORE}")

        if not self.reasoning.strip():
            raise ValueError("Reasoning cannot be empty")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "conflict": self.conflict.to_dict(),
            "strategy": self.strategy.value,
            "resolved_value": self.resolved_value,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "evidence_used": [e.to_dict() for e in self.evidence_used],
            "metadata": self.metadata,
            "resolved_at": self.resolved_at
        }


@dataclass
class QualityMetrics:
    """Comprehensive quality metrics for aggregated results."""

    # Core quality scores (0.0 to 1.0)
    confidence_score: float = 0.0
    completeness_score: float = 0.0
    consistency_score: float = 0.0
    reliability_score: float = 0.0

    # Uncertainty and validation
    uncertainty_level: float = 0.0
    validation_passed: bool = False
    validation_issues: List[str] = field(default_factory=list)

    # Processing metrics
    data_coverage: float = 0.0  # Percentage of chunks contributing data
    extraction_quality: float = 0.0  # Average extraction quality
    conflict_resolution_rate: float = 0.0  # Percentage of conflicts resolved

    # Metadata
    calculated_at: float = field(default_factory=time.time)
    calculation_method: str = "standard"

    def __post_init__(self):
        """Validate quality scores after initialization."""
        score_fields = [
            ('confidence_score', self.confidence_score),
            ('completeness_score', self.completeness_score),
            ('consistency_score', self.consistency_score),
            ('reliability_score', self.reliability_score),
            ('uncertainty_level', self.uncertainty_level),
            ('data_coverage', self.data_coverage),
            ('extraction_quality', self.extraction_quality),
            ('conflict_resolution_rate', self.conflict_resolution_rate)
        ]

        for field_name, value in score_fields:
            if not ValidationThresholds.MIN_QUALITY_SCORE <= value <= ValidationThresholds.MAX_QUALITY_SCORE:
                raise ValueError(f"{field_name} must be between {ValidationThresholds.MIN_QUALITY_SCORE} and {ValidationThresholds.MAX_QUALITY_SCORE}, got {value}")

    @property
    def overall_quality(self) -> float:
        """Calculate overall quality score using configurable weights."""
        return (
            QualityWeights.CONFIDENCE * self.confidence_score +
            QualityWeights.COMPLETENESS * self.completeness_score +
            QualityWeights.CONSISTENCY * self.consistency_score +
            QualityWeights.RELIABILITY * self.reliability_score +
            QualityWeights.EXTRACTION * self.extraction_quality
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "confidence_score": self.confidence_score,
            "completeness_score": self.completeness_score,
            "consistency_score": self.consistency_score,
            "reliability_score": self.reliability_score,
            "uncertainty_level": self.uncertainty_level,
            "validation_passed": self.validation_passed,
            "validation_issues": self.validation_issues,
            "data_coverage": self.data_coverage,
            "extraction_quality": self.extraction_quality,
            "conflict_resolution_rate": self.conflict_resolution_rate,
            "overall_quality": self.overall_quality,
            "calculated_at": self.calculated_at,
            "calculation_method": self.calculation_method
        }


@dataclass
class AggregationMetadata:
    """Metadata about the aggregation process."""

    strategy_used: AggregationStrategy
    chunks_processed: int
    chunks_successful: int
    conflicts_detected: int
    conflicts_resolved: int

    # Processing details
    processing_time: float = 0.0
    memory_used: Optional[int] = None
    extraction_errors: List[str] = field(default_factory=list)

    # Algorithm information
    algorithms_used: List[str] = field(default_factory=list)
    parameters: Dict[str, Any] = field(default_factory=dict)

    # Quality information
    quality_checks_performed: List[str] = field(default_factory=list)
    validation_level: ValidationLevel = ValidationLevel.STANDARD

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "strategy_used": self.strategy_used.value,
            "chunks_processed": self.chunks_processed,
            "chunks_successful": self.chunks_successful,
            "conflicts_detected": self.conflicts_detected,
            "conflicts_resolved": self.conflicts_resolved,
            "processing_time": self.processing_time,
            "memory_used": self.memory_used,
            "extraction_errors": self.extraction_errors,
            "algorithms_used": self.algorithms_used,
            "parameters": self.parameters,
            "quality_checks_performed": self.quality_checks_performed,
            "validation_level": self.validation_level.value
        }


@dataclass
class EnhancedQueryResult(QueryResult):
    """Enhanced query result with advanced aggregation information."""

    # Enhanced aggregation data
    extracted_data: List[ExtractedData] = field(default_factory=list)
    conflicts_detected: List[Conflict] = field(default_factory=list)
    conflicts_resolved: List[ConflictResolution] = field(default_factory=list)
    quality_metrics: Optional[QualityMetrics] = None

    # Structured output
    structured_output: Dict[str, Any] = field(default_factory=dict)
    aggregation_metadata: Optional[AggregationMetadata] = None

    # Additional analysis
    data_insights: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    uncertainty_factors: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        base_dict = super().to_dict()

        enhanced_dict = {
            "extracted_data": [d.to_dict() for d in self.extracted_data],
            "conflicts_detected": [c.to_dict() for c in self.conflicts_detected],
            "conflicts_resolved": [r.to_dict() for r in self.conflicts_resolved],
            "quality_metrics": self.quality_metrics.to_dict() if self.quality_metrics else None,
            "structured_output": self.structured_output,
            "aggregation_metadata": self.aggregation_metadata.to_dict() if self.aggregation_metadata else None,
            "data_insights": self.data_insights,
            "recommendations": self.recommendations,
            "uncertainty_factors": self.uncertainty_factors
        }

        return {**base_dict, **enhanced_dict}


# Abstract base classes for aggregation components

class AggregationStrategyBase(ABC):
    """Abstract base class for aggregation strategies."""

    @abstractmethod
    async def aggregate(
        self,
        extracted_data: List[ExtractedData],
        context: QueryContext
    ) -> Dict[str, Any]:
        """Aggregate extracted data using this strategy."""
        pass

    @abstractmethod
    def get_supported_intents(self) -> List[QueryIntent]:
        """Get list of query intents this strategy supports."""
        pass


class ConflictResolverBase(ABC):
    """Abstract base class for conflict resolvers."""

    @abstractmethod
    async def resolve_conflict(
        self,
        conflict: Conflict,
        context: QueryContext
    ) -> ConflictResolution:
        """Resolve a detected conflict."""
        pass

    @abstractmethod
    def get_supported_conflict_types(self) -> List[ConflictType]:
        """Get list of conflict types this resolver can handle."""
        pass


class QualityCalculatorBase(ABC):
    """Abstract base class for quality calculators."""

    @abstractmethod
    async def calculate_quality(
        self,
        extracted_data: List[ExtractedData],
        conflicts: List[Conflict],
        resolutions: List[ConflictResolution],
        context: QueryContext
    ) -> QualityMetrics:
        """Calculate quality metrics for aggregated results."""
        pass


# Type aliases for callback functions
ProgressCallback = Callable[[str, float], None]
QualityCallback = Callable[[QualityMetrics], None]
ConflictCallback = Callable[[List[Conflict]], None]

# Specific domain types for better type safety
@dataclass
class EntityData:
    """Structured entity data with type safety."""
    entity_id: str
    entity_type: str
    name: Optional[str] = None
    properties: Dict[str, Union[str, float, int, bool]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "name": self.name,
            "properties": self.properties
        }

@dataclass
class RelationshipData:
    """Structured relationship data with type safety."""
    relationship_type: str
    from_entity: str
    to_entity: str
    properties: Dict[str, Union[str, float, int, bool]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.relationship_type,
            "from": self.from_entity,
            "to": self.to_entity,
            "properties": self.properties
        }

@dataclass
class SpatialContext:
    """Structured spatial context data."""
    building_id: Optional[str] = None
    floor_id: Optional[str] = None
    room_id: Optional[str] = None
    zone_id: Optional[str] = None
    coordinates: Optional[Tuple[float, float, float]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "building_id": self.building_id,
            "floor_id": self.floor_id,
            "room_id": self.room_id,
            "zone_id": self.zone_id,
            "coordinates": self.coordinates
        }

@dataclass
class TemporalContext:
    """Structured temporal context data."""
    created_date: Optional[str] = None
    modified_date: Optional[str] = None
    version: Optional[str] = None
    lifecycle_phase: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "created_date": self.created_date,
            "modified_date": self.modified_date,
            "version": self.version,
            "lifecycle_phase": self.lifecycle_phase
        }

# Common utility types
EntityMapping = Dict[str, EntityData]
QuantityMapping = Dict[str, Union[float, int, str]]
PropertyMapping = Dict[str, Union[str, float, int, bool]]
RelationshipMapping = Dict[str, List[RelationshipData]]
