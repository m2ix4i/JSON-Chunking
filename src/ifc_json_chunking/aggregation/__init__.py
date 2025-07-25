"""
Advanced Result Aggregation & Synthesis Engine.

This module provides sophisticated result aggregation techniques to combine 
LLM responses from multiple chunks into coherent, accurate final answers
with conflict resolution, consistency checking, and quality assurance.
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