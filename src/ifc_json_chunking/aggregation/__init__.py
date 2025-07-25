"""
Advanced Result Aggregation & Synthesis Engine.

This module provides comprehensive aggregation capabilities including
data extraction, normalization, conflict detection and resolution,
and intelligent result synthesis.
"""

from .core.aggregator import AdvancedAggregator
from .core.data_extractor import DataExtractor
from .core.normalizer import DataNormalizer

from .strategies.quantity_strategy import QuantityAggregationStrategy
from .conflict.detector import ConflictDetector

__all__ = [
    # Core components
    "AdvancedAggregator",
    "DataExtractor", 
    "DataNormalizer",
    
    # Aggregation strategies
    "QuantityAggregationStrategy",
    
    # Conflict handling
    "ConflictDetector",
]