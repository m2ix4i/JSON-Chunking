"""
Advanced Result Aggregation & Synthesis Engine - Statistical Aggregation Strategies.

This module provides specialized aggregation strategies for different types
of IFC data with statistical methods and domain knowledge.
"""

# Import aggregation strategies for this PR
from .strategies.quantity_strategy import QuantityAggregationStrategy
from .strategies.component_strategy import ComponentAggregationStrategy
from .strategies.material_strategy import MaterialAggregationStrategy
from .strategies.spatial_strategy import SpatialAggregationStrategy
from .strategies.cost_strategy import CostAggregationStrategy

__all__ = [
    # Statistical aggregation strategies
    "QuantityAggregationStrategy",
    "ComponentAggregationStrategy",
    "MaterialAggregationStrategy",
    "SpatialAggregationStrategy",
    "CostAggregationStrategy",
]