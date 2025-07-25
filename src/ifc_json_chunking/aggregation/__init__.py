"""
Advanced Result Aggregation & Synthesis Engine.

This module provides sophisticated result aggregation techniques to combine 
LLM responses from multiple chunks into coherent, accurate final answers
with conflict resolution, consistency checking, and quality assurance.
"""

from .core.aggregator import AdvancedAggregator
from .core.data_extractor import DataExtractor
from .core.normalizer import DataNormalizer
from .core.validator import ResultValidator

from .strategies.quantity_strategy import QuantityAggregationStrategy
from .strategies.component_strategy import ComponentAggregationStrategy
from .strategies.material_strategy import MaterialAggregationStrategy
from .strategies.spatial_strategy import SpatialAggregationStrategy
from .strategies.cost_strategy import CostAggregationStrategy

from .conflict.detector import ConflictDetector
from .conflict.resolver import ConflictResolver
from .conflict.consistency import ConsistencyChecker
from .conflict.evidence import EvidenceEvaluator

from .quality.confidence import ConfidenceCalculator
from .quality.uncertainty import UncertaintyHandler
from .quality.scorer import QualityScorer
from .quality.validation import ValidationEngine

from .output.formatter import OutputFormatter
from .output.templates import TemplateEngine
from .output.reports import ReportGenerator
from .output.metadata import MetadataAttacher

__all__ = [
    # Core components
    "AdvancedAggregator",
    "DataExtractor", 
    "DataNormalizer",
    "ResultValidator",
    
    # Aggregation strategies
    "QuantityAggregationStrategy",
    "ComponentAggregationStrategy", 
    "MaterialAggregationStrategy",
    "SpatialAggregationStrategy",
    "CostAggregationStrategy",
    
    # Conflict handling
    "ConflictDetector",
    "ConflictResolver",
    "ConsistencyChecker", 
    "EvidenceEvaluator",
    
    # Quality assurance
    "ConfidenceCalculator",
    "UncertaintyHandler",
    "QualityScorer",
    "ValidationEngine",
    
    # Output system
    "OutputFormatter",
    "TemplateEngine", 
    "ReportGenerator",
    "MetadataAttacher",
]