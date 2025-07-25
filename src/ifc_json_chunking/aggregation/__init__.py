"""
Advanced Result Aggregation & Synthesis Engine - Complete Integration.

This module provides comprehensive aggregation capabilities including
data extraction, normalization, conflict detection and resolution,
statistical aggregation strategies, and intelligent result synthesis.
"""

# Core components
from .core.aggregator import AdvancedAggregator
from .core.data_extractor import DataExtractor
from .core.normalizer import DataNormalizer

# Conflict detection
from .conflict.detector import ConflictDetector

# Statistical aggregation strategies
from .strategies.quantity_strategy import QuantityAggregationStrategy
from .strategies.component_strategy import ComponentAggregationStrategy
from .strategies.material_strategy import MaterialAggregationStrategy
from .strategies.spatial_strategy import SpatialAggregationStrategy
from .strategies.cost_strategy import CostAggregationStrategy

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