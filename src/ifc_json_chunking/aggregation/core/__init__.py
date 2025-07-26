"""Core aggregation components."""

from .aggregator import AdvancedAggregator
from .data_extractor import DataExtractor
from .normalizer import DataNormalizer

__all__ = [
    "AdvancedAggregator",
    "DataExtractor",
    "DataNormalizer",
]
