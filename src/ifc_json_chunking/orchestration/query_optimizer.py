"""
Query optimization system for performance enhancement.

This module provides intelligent query optimization including
pattern recognition, caching strategies, and performance tuning.
"""

import hashlib
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

import structlog

from ..models import Chunk
from ..query.types import QueryIntent, QueryRequest, QueryResult

logger = structlog.get_logger(__name__)


class OptimizationStrategy(Enum):
    """Available optimization strategies."""
    CACHE_FIRST = "cache_first"
    PARALLEL_AGGRESSIVE = "parallel_aggressive"
    BATCH_PROCESSING = "batch_processing"
    SMART_CHUNKING = "smart_chunking"
    INTENT_SPECIFIC = "intent_specific"


@dataclass
class QueryPattern:
    """Recognized query pattern for optimization."""

    pattern_id: str
    intent: QueryIntent
    key_terms: Set[str]
    frequency: int = 0
    avg_processing_time: float = 0.0
    avg_chunk_count: int = 0
    success_rate: float = 0.0
    optimal_strategy: OptimizationStrategy = OptimizationStrategy.CACHE_FIRST

    # Performance characteristics
    token_efficiency: float = 0.0  # tokens per result quality
    cache_hit_rate: float = 0.0
    parallel_benefit: float = 0.0  # improvement from parallel processing

    def update_metrics(self, result: QueryResult) -> None:
        """Update pattern metrics with new result."""
        self.frequency += 1

        # Update averages
        self.avg_processing_time = (
            (self.avg_processing_time * (self.frequency - 1) + result.processing_time)
            / self.frequency
        )

        self.avg_chunk_count = (
            (self.avg_chunk_count * (self.frequency - 1) + result.total_chunks)
            / self.frequency
        )

        self.success_rate = (
            (self.success_rate * (self.frequency - 1) + result.success_rate)
            / self.frequency
        )

        # Update efficiency metrics
        if result.total_tokens > 0 and result.confidence_score > 0:
            current_efficiency = result.confidence_score / result.total_tokens
            self.token_efficiency = (
                (self.token_efficiency * (self.frequency - 1) + current_efficiency)
                / self.frequency
            )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "pattern_id": self.pattern_id,
            "intent": self.intent.value,
            "key_terms": list(self.key_terms),
            "frequency": self.frequency,
            "avg_processing_time": self.avg_processing_time,
            "avg_chunk_count": self.avg_chunk_count,
            "success_rate": self.success_rate,
            "optimal_strategy": self.optimal_strategy.value,
            "token_efficiency": self.token_efficiency,
            "cache_hit_rate": self.cache_hit_rate,
            "parallel_benefit": self.parallel_benefit
        }


@dataclass
class OptimizationRecommendation:
    """Optimization recommendation for a query."""

    strategy: OptimizationStrategy
    confidence: float
    estimated_improvement: float  # percentage improvement expected
    reasoning: str
    parameters: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "strategy": self.strategy.value,
            "confidence": self.confidence,
            "estimated_improvement": self.estimated_improvement,
            "reasoning": self.reasoning,
            "parameters": self.parameters
        }


class QueryOptimizer:
    """
    Intelligent query optimization system.
    
    Analyzes query patterns, performance characteristics, and historical
    data to recommend optimal processing strategies and parameters.
    """

    def __init__(self, cache_enabled: bool = True):
        """
        Initialize query optimizer.
        
        Args:
            cache_enabled: Whether caching optimizations are available
        """
        self.cache_enabled = cache_enabled

        # Pattern recognition
        self._query_patterns: Dict[str, QueryPattern] = {}
        self._pattern_index: Dict[QueryIntent, List[str]] = defaultdict(list)

        # Performance history
        self._performance_history: List[Dict[str, Any]] = []
        self._optimization_results: Dict[str, Dict[str, Any]] = {}

        # Optimization thresholds
        self.min_pattern_frequency = 3
        self.cache_recommendation_threshold = 0.7
        self.parallel_benefit_threshold = 0.2

        logger.info("QueryOptimizer initialized", cache_enabled=cache_enabled)

    def analyze_query(self, request: QueryRequest) -> OptimizationRecommendation:
        """
        Analyze query and recommend optimization strategy.
        
        Args:
            request: Query request to analyze
            
        Returns:
            Optimization recommendation
        """
        logger.debug(
            "Analyzing query for optimization",
            query=request.query[:50],
            intent=request.intent_hint.value if request.intent_hint else None
        )

        # Find matching patterns
        matching_patterns = self._find_matching_patterns(request)

        # Analyze query characteristics
        characteristics = self._analyze_query_characteristics(request)

        # Generate recommendation
        recommendation = self._generate_recommendation(
            request, matching_patterns, characteristics
        )

        logger.info(
            "Optimization analysis completed",
            query_id=request.query_id,
            strategy=recommendation.strategy.value,
            confidence=recommendation.confidence,
            estimated_improvement=recommendation.estimated_improvement
        )

        return recommendation

    def record_query_result(self, request: QueryRequest, result: QueryResult) -> None:
        """
        Record query result for pattern learning.
        
        Args:
            request: Original query request
            result: Query result
        """
        # Extract pattern
        pattern = self._extract_pattern(request, result)

        # Update or create pattern
        if pattern.pattern_id in self._query_patterns:
            self._query_patterns[pattern.pattern_id].update_metrics(result)
        else:
            self._query_patterns[pattern.pattern_id] = pattern
            self._pattern_index[result.intent].append(pattern.pattern_id)

        # Record performance
        self._record_performance(request, result)

        # Update optimization strategies
        self._update_optimization_strategies()

        logger.debug(
            "Query result recorded for optimization",
            query_id=result.query_id,
            pattern_id=pattern.pattern_id
        )

    def _find_matching_patterns(self, request: QueryRequest) -> List[QueryPattern]:
        """Find patterns matching the query request."""
        if not request.intent_hint:
            return []

        matching_patterns = []
        pattern_ids = self._pattern_index.get(request.intent_hint, [])

        for pattern_id in pattern_ids:
            pattern = self._query_patterns[pattern_id]

            # Calculate similarity
            similarity = self._calculate_pattern_similarity(request, pattern)

            if similarity >= 0.6:  # Similarity threshold
                matching_patterns.append(pattern)

        # Sort by frequency and success rate
        matching_patterns.sort(
            key=lambda p: (p.frequency, p.success_rate),
            reverse=True
        )

        return matching_patterns

    def _calculate_pattern_similarity(self, request: QueryRequest, pattern: QueryPattern) -> float:
        """Calculate similarity between request and pattern."""
        query_terms = set(request.query.lower().split())

        # Term overlap
        term_overlap = len(query_terms.intersection(pattern.key_terms))
        term_union = len(query_terms.union(pattern.key_terms))
        term_similarity = term_overlap / term_union if term_union > 0 else 0.0

        # Intent match
        intent_match = 1.0 if request.intent_hint == pattern.intent else 0.0

        # Chunk count similarity
        chunk_similarity = 1.0
        if pattern.avg_chunk_count > 0:
            chunk_ratio = len(request.chunks) / pattern.avg_chunk_count
            chunk_similarity = 1.0 - abs(1.0 - chunk_ratio)
            chunk_similarity = max(0.0, min(1.0, chunk_similarity))

        # Weighted combination
        similarity = (
            term_similarity * 0.4 +
            intent_match * 0.4 +
            chunk_similarity * 0.2
        )

        return similarity

    def _analyze_query_characteristics(self, request: QueryRequest) -> Dict[str, Any]:
        """Analyze characteristics of the query request."""
        characteristics = {}

        # Query complexity
        query_length = len(request.query.split())
        characteristics["query_complexity"] = min(query_length / 20, 1.0)  # Normalize to 0-1

        # Chunk characteristics
        characteristics["chunk_count"] = len(request.chunks)
        characteristics["chunk_size_variance"] = self._calculate_chunk_size_variance(request.chunks)

        # Processing parameters
        characteristics["max_concurrent"] = request.max_concurrent
        characteristics["timeout_seconds"] = request.timeout_seconds
        characteristics["cache_enabled"] = request.cache_results and self.cache_enabled

        # Intent characteristics
        if request.intent_hint:
            characteristics["intent"] = request.intent_hint.value
            characteristics["intent_complexity"] = self._get_intent_complexity(request.intent_hint)

        return characteristics

    def _calculate_chunk_size_variance(self, chunks: List[Chunk]) -> float:
        """Calculate variance in chunk sizes."""
        if not chunks:
            return 0.0

        sizes = [len(str(chunk.data)) for chunk in chunks]
        if not sizes:
            return 0.0

        mean_size = sum(sizes) / len(sizes)
        variance = sum((size - mean_size) ** 2 for size in sizes) / len(sizes)

        # Normalize variance
        return min(variance / (mean_size ** 2), 1.0) if mean_size > 0 else 0.0

    def _get_intent_complexity(self, intent: QueryIntent) -> float:
        """Get complexity score for intent type."""
        complexity_map = {
            QueryIntent.QUANTITY: 0.3,
            QueryIntent.COMPONENT: 0.4,
            QueryIntent.MATERIAL: 0.5,
            QueryIntent.SPATIAL: 0.6,
            QueryIntent.COST: 0.7,
            QueryIntent.RELATIONSHIP: 0.8,
            QueryIntent.PROPERTY: 0.6,
            QueryIntent.UNKNOWN: 1.0
        }

        return complexity_map.get(intent, 0.5)

    def _generate_recommendation(
        self,
        request: QueryRequest,
        patterns: List[QueryPattern],
        characteristics: Dict[str, Any]
    ) -> OptimizationRecommendation:
        """Generate optimization recommendation."""

        # Analyze patterns for strategy recommendation
        if patterns:
            best_pattern = patterns[0]
            strategy = best_pattern.optimal_strategy
            confidence = 0.8 + (best_pattern.frequency / 100) * 0.2  # Higher confidence for frequent patterns

            reasoning = f"Based on {best_pattern.frequency} similar queries with {best_pattern.success_rate:.1f}% success rate"

            # Estimate improvement based on pattern performance
            baseline_time = characteristics.get("timeout_seconds", 300) * 0.5  # Assume 50% of timeout as baseline
            estimated_improvement = max(0, (baseline_time - best_pattern.avg_processing_time) / baseline_time * 100)

        else:
            # No patterns found, use heuristic recommendation
            strategy, confidence, reasoning, estimated_improvement = self._heuristic_recommendation(
                request, characteristics
            )

        # Generate strategy-specific parameters
        parameters = self._generate_strategy_parameters(strategy, characteristics)

        return OptimizationRecommendation(
            strategy=strategy,
            confidence=min(confidence, 1.0),
            estimated_improvement=estimated_improvement,
            reasoning=reasoning,
            parameters=parameters
        )

    def _heuristic_recommendation(
        self,
        request: QueryRequest,
        characteristics: Dict[str, Any]
    ) -> Tuple[OptimizationStrategy, float, str, float]:
        """Generate heuristic-based recommendation when no patterns match."""

        chunk_count = characteristics["chunk_count"]
        query_complexity = characteristics["query_complexity"]
        cache_enabled = characteristics["cache_enabled"]

        # Decision logic
        if cache_enabled and query_complexity < 0.5:
            strategy = OptimizationStrategy.CACHE_FIRST
            confidence = 0.6
            reasoning = "Simple query suitable for caching"
            estimated_improvement = 20.0

        elif chunk_count > 20:
            strategy = OptimizationStrategy.PARALLEL_AGGRESSIVE
            confidence = 0.7
            reasoning = f"Large chunk count ({chunk_count}) benefits from aggressive parallelization"
            estimated_improvement = 40.0

        elif chunk_count > 5 and characteristics.get("chunk_size_variance", 0) < 0.3:
            strategy = OptimizationStrategy.BATCH_PROCESSING
            confidence = 0.65
            reasoning = "Uniform chunks suitable for batch processing"
            estimated_improvement = 25.0

        elif request.intent_hint and request.intent_hint != QueryIntent.UNKNOWN:
            strategy = OptimizationStrategy.INTENT_SPECIFIC
            confidence = 0.55
            reasoning = f"Intent-specific optimization for {request.intent_hint.value}"
            estimated_improvement = 15.0

        else:
            strategy = OptimizationStrategy.SMART_CHUNKING
            confidence = 0.5
            reasoning = "Default smart chunking strategy"
            estimated_improvement = 10.0

        return strategy, confidence, reasoning, estimated_improvement

    def _generate_strategy_parameters(
        self,
        strategy: OptimizationStrategy,
        characteristics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate parameters for optimization strategy."""

        chunk_count = characteristics["chunk_count"]
        query_complexity = characteristics["query_complexity"]

        if strategy == OptimizationStrategy.CACHE_FIRST:
            return {
                "enable_similarity_caching": True,
                "cache_ttl_multiplier": 2.0 if query_complexity < 0.3 else 1.0,
                "similarity_threshold": 0.85
            }

        elif strategy == OptimizationStrategy.PARALLEL_AGGRESSIVE:
            # Increase parallelism for large chunk counts
            max_concurrent = min(chunk_count, max(characteristics["max_concurrent"] * 2, 20))
            return {
                "max_concurrent": max_concurrent,
                "batch_size": max(chunk_count // 4, 5),
                "enable_adaptive_batching": True
            }

        elif strategy == OptimizationStrategy.BATCH_PROCESSING:
            return {
                "batch_size": min(chunk_count // 3, 15),
                "batch_delay_ms": 100,
                "enable_batch_optimization": True
            }

        elif strategy == OptimizationStrategy.SMART_CHUNKING:
            return {
                "enable_chunk_reordering": True,
                "priority_based_processing": True,
                "adaptive_timeout": True
            }

        elif strategy == OptimizationStrategy.INTENT_SPECIFIC:
            intent = characteristics.get("intent", "unknown")
            if intent == "quantity":
                return {
                    "focus_numeric_extraction": True,
                    "enable_aggregation_optimization": True
                }
            elif intent == "component":
                return {
                    "focus_entity_extraction": True,
                    "enable_component_grouping": True
                }
            else:
                return {
                    "enable_context_optimization": True
                }

        return {}

    def _extract_pattern(self, request: QueryRequest, result: QueryResult) -> QueryPattern:
        """Extract pattern from query request and result."""
        # Extract key terms
        query_terms = set(request.query.lower().split())

        # Filter out common words
        common_words = {"der", "die", "das", "und", "oder", "ist", "sind", "wie", "was", "wo", "wann"}
        key_terms = query_terms - common_words

        # Create pattern ID
        pattern_id = hashlib.sha256(
            f"{result.intent.value}_{sorted(key_terms)}".encode()
        ).hexdigest()[:16]

        pattern = QueryPattern(
            pattern_id=pattern_id,
            intent=result.intent,
            key_terms=key_terms
        )

        pattern.update_metrics(result)

        return pattern

    def _record_performance(self, request: QueryRequest, result: QueryResult) -> None:
        """Record performance metrics."""
        performance_record = {
            "timestamp": time.time(),
            "query_id": result.query_id,
            "intent": result.intent.value,
            "chunk_count": result.total_chunks,
            "processing_time": result.processing_time,
            "success_rate": result.success_rate,
            "confidence_score": result.confidence_score,
            "total_tokens": result.total_tokens,
            "total_cost": result.total_cost
        }

        self._performance_history.append(performance_record)

        # Limit history size
        if len(self._performance_history) > 1000:
            self._performance_history = self._performance_history[-800:]  # Keep last 800

    def _update_optimization_strategies(self) -> None:
        """Update optimization strategies based on performance data."""
        # Analyze recent performance
        recent_performance = self._performance_history[-50:]  # Last 50 queries

        if not recent_performance:
            return

        # Group by intent and analyze performance
        by_intent = defaultdict(list)
        for record in recent_performance:
            by_intent[record["intent"]].append(record)

        # Update pattern strategies based on performance
        for intent, records in by_intent.items():
            avg_time = sum(r["processing_time"] for r in records) / len(records)
            avg_success = sum(r["success_rate"] for r in records) / len(records)

            # Update patterns for this intent
            pattern_ids = self._pattern_index.get(QueryIntent(intent), [])
            for pattern_id in pattern_ids:
                pattern = self._query_patterns[pattern_id]

                # Recommend strategy based on performance
                if avg_success > 90 and avg_time < 30:
                    pattern.optimal_strategy = OptimizationStrategy.CACHE_FIRST
                elif avg_time > 120:
                    pattern.optimal_strategy = OptimizationStrategy.PARALLEL_AGGRESSIVE
                elif len(records) > 5:
                    pattern.optimal_strategy = OptimizationStrategy.BATCH_PROCESSING

    def get_optimization_stats(self) -> Dict[str, Any]:
        """Get optimization statistics."""
        total_patterns = len(self._query_patterns)

        # Strategy distribution
        strategy_counts = Counter(p.optimal_strategy for p in self._query_patterns.values())

        # Performance trends
        if self._performance_history:
            recent_avg_time = sum(
                r["processing_time"] for r in self._performance_history[-20:]
            ) / min(len(self._performance_history), 20)

            recent_avg_success = sum(
                r["success_rate"] for r in self._performance_history[-20:]
            ) / min(len(self._performance_history), 20)
        else:
            recent_avg_time = 0.0
            recent_avg_success = 0.0

        # Most frequent patterns
        top_patterns = sorted(
            self._query_patterns.values(),
            key=lambda p: p.frequency,
            reverse=True
        )[:5]

        return {
            "total_patterns": total_patterns,
            "strategy_distribution": {s.value: count for s, count in strategy_counts.items()},
            "recent_avg_processing_time": recent_avg_time,
            "recent_avg_success_rate": recent_avg_success,
            "performance_history_size": len(self._performance_history),
            "top_patterns": [p.to_dict() for p in top_patterns],
            "optimization_enabled": True
        }

    def clear_patterns(self, older_than_days: Optional[int] = None) -> int:
        """
        Clear optimization patterns.
        
        Args:
            older_than_days: Clear patterns older than N days (None = clear all)
            
        Returns:
            Number of patterns cleared
        """
        if older_than_days is None:
            # Clear all patterns
            cleared_count = len(self._query_patterns)
            self._query_patterns.clear()
            self._pattern_index.clear()
        else:
            # Clear old patterns (simplified - in practice would need timestamps)
            # For now, clear patterns with low frequency as proxy for old patterns
            threshold_frequency = max(1, self.min_pattern_frequency)
            old_patterns = [
                pid for pid, pattern in self._query_patterns.items()
                if pattern.frequency < threshold_frequency
            ]

            for pattern_id in old_patterns:
                pattern = self._query_patterns.pop(pattern_id)
                self._pattern_index[pattern.intent].remove(pattern_id)

            cleared_count = len(old_patterns)

        logger.info("Optimization patterns cleared", count=cleared_count)
        return cleared_count
