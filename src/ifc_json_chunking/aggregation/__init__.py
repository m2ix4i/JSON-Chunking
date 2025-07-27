"""
Advanced Result Aggregation & Synthesis Engine - Complete Integration.

This module provides comprehensive aggregation capabilities including
data extraction, normalization, conflict detection and resolution,
statistical aggregation strategies, and intelligent result synthesis.
"""

# Core components
# Conflict detection
from .conflict.detector import ConflictDetector
from .core.aggregator import AdvancedAggregator
from .core.data_extractor import DataExtractor
from .core.normalizer import DataNormalizer
from .strategies.component_strategy import ComponentAggregationStrategy
from .strategies.cost_strategy import CostAggregationStrategy
from .strategies.material_strategy import MaterialAggregationStrategy

# Statistical aggregation strategies
from .strategies.quantity_strategy import QuantityAggregationStrategy
from .strategies.spatial_strategy import SpatialAggregationStrategy

__all__ = [
    # Main aggregator for QueryProcessor integration
    "AdvancedAggregator",
    "DataExtractor",
    "DataNormalizer",

    # Conflict handling
    "ConflictDetector",

    # Statistical aggregation strategies
    "QuantityAggregationStrategy",
    "ComponentAggregationStrategy",
    "MaterialAggregationStrategy",
    "SpatialAggregationStrategy",
    "CostAggregationStrategy",
]
