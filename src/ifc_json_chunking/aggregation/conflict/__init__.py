"""
Conflict detection system for advanced aggregation.

This module provides comprehensive conflict detection capabilities
for identifying and categorizing conflicts between chunk results.
"""

from .detector import ConflictDetector
from .detectors import (
    QuantitativeConflictDetector,
    QualitativeConflictDetector,
    EntityConflictDetector,
    SpatialConflictDetector,
    RelationshipConflictDetector
)

__all__ = [
    "ConflictDetector",
    "QuantitativeConflictDetector",
    "QualitativeConflictDetector", 
    "EntityConflictDetector",
    "SpatialConflictDetector",
    "RelationshipConflictDetector"
]