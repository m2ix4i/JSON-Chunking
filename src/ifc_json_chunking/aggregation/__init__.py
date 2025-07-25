"""
Advanced Result Aggregation & Synthesis Engine - Conflict Detection.

This module provides conflict detection capabilities for identifying
contradictions and inconsistencies between chunk results.
"""

# Import only the conflict detection components for this PR
from .conflict.detector import ConflictDetector
from .conflict.detectors import (
    QuantitativeConflictDetector,
    QualitativeConflictDetector,
    EntityConflictDetector,
    SpatialConflictDetector,
    RelationshipConflictDetector
)

__all__ = [
    # Conflict detection system
    "ConflictDetector",
    "QuantitativeConflictDetector",
    "QualitativeConflictDetector",
    "EntityConflictDetector", 
    "SpatialConflictDetector",
    "RelationshipConflictDetector",
]