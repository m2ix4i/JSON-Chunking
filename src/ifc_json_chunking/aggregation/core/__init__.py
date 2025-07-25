"""Core aggregation components."""

from .aggregator import AdvancedAggregator
from .data_extractor import DataExtractor
from .normalizer import DataNormalizer
from .validator import ResultValidator

__all__ = [
    "AdvancedAggregator",
    "DataExtractor",
    "DataNormalizer", 
    "ResultValidator",
]