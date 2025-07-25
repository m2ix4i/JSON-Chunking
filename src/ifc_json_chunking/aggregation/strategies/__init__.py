"""Aggregation strategies for different query types."""

from .quantity_strategy import QuantityAggregationStrategy
from .component_strategy import ComponentAggregationStrategy
from .material_strategy import MaterialAggregationStrategy
from .spatial_strategy import SpatialAggregationStrategy
from .cost_strategy import CostAggregationStrategy

__all__ = [
    "QuantityAggregationStrategy",
    "ComponentAggregationStrategy",
    "MaterialAggregationStrategy", 
    "SpatialAggregationStrategy",
    "CostAggregationStrategy",
]