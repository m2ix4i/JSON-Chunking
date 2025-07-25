"""
Advanced Result Aggregation & Synthesis Engine - Complete Integration.

This module provides the complete advanced aggregation system for integration
with QueryProcessor, including all components from previous PRs.
"""

# Import the main aggregator for QueryProcessor integration
from .core.aggregator import AdvancedAggregator

__all__ = [
    # Main aggregator for QueryProcessor integration
    "AdvancedAggregator",
]