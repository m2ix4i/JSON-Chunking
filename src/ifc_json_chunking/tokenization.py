"""
Token counting and optimization system for IFC semantic chunks.

This module provides intelligent token counting and optimization for different LLM models,
ensuring chunks are optimally sized for processing by models like Gemini 2.5 Pro.
"""

import re
import json
import math
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Any, Optional, Union, Tuple
from pathlib import Path

import structlog

from .exceptions import IFCChunkingError, ValidationError
from .config import Config

logger = structlog.get_logger(__name__)


class LLMModel(Enum):
    """Supported LLM models with their token characteristics."""
    
    GEMINI_2_5_PRO = "gemini-2.5-pro"
    GEMINI_1_5_PRO = "gemini-1.5-pro" 
    GPT_4_TURBO = "gpt-4-turbo"
    GPT_4 = "gpt-4"
    CLAUDE_3_5_SONNET = "claude-3.5-sonnet"
    CLAUDE_3_OPUS = "claude-3-opus"


@dataclass
class TokenLimits:
    """Token limits and characteristics for LLM models."""
    
    max_context_tokens: int
    max_output_tokens: int
    recommended_chunk_tokens: int
    token_cost_per_1k: float = 0.0
    chars_per_token: float = 4.0  # Average characters per token
    
    def get_safe_chunk_size(self, safety_margin: float = 0.9) -> int:
        """Get safe chunk size with margin for prompt overhead."""
        return int(self.recommended_chunk_tokens * safety_margin)
    
    def estimate_tokens_from_chars(self, char_count: int) -> int:
        """Estimate token count from character count."""
        return max(1, int(char_count / self.chars_per_token))
    
    def estimate_chars_from_tokens(self, token_count: int) -> int:
        """Estimate character count from token count."""
        return int(token_count * self.chars_per_token)


# Model configurations optimized for IFC data processing
MODEL_CONFIGS: Dict[LLMModel, TokenLimits] = {
    LLMModel.GEMINI_2_5_PRO: TokenLimits(
        max_context_tokens=2_000_000,  # 2M context window
        max_output_tokens=8_192,
        recommended_chunk_tokens=32_000,  # Optimal for IFC processing
        token_cost_per_1k=1.25,
        chars_per_token=3.8  # Gemini is efficient with structured data
    ),
    LLMModel.GEMINI_1_5_PRO: TokenLimits(
        max_context_tokens=1_000_000,  # 1M context window
        max_output_tokens=8_192,
        recommended_chunk_tokens=24_000,
        token_cost_per_1k=1.25,
        chars_per_token=3.8
    ),
    LLMModel.GPT_4_TURBO: TokenLimits(
        max_context_tokens=128_000,
        max_output_tokens=4_096,
        recommended_chunk_tokens=16_000,
        token_cost_per_1k=10.0,
        chars_per_token=4.2
    ),
    LLMModel.GPT_4: TokenLimits(
        max_context_tokens=32_000,
        max_output_tokens=4_096,
        recommended_chunk_tokens=8_000,
        token_cost_per_1k=30.0,
        chars_per_token=4.2
    ),
    LLMModel.CLAUDE_3_5_SONNET: TokenLimits(
        max_context_tokens=200_000,
        max_output_tokens=8_192,
        recommended_chunk_tokens=32_000,
        token_cost_per_1k=3.0,
        chars_per_token=4.0
    ),
    LLMModel.CLAUDE_3_OPUS: TokenLimits(
        max_context_tokens=200_000,
        max_output_tokens=4_096,
        recommended_chunk_tokens=24_000,
        token_cost_per_1k=15.0,
        chars_per_token=4.0
    )
}


class TokenCounter(ABC):
    """Abstract base class for token counting strategies."""
    
    @abstractmethod
    def count_tokens(self, text: str) -> int:
        """Count tokens in the given text."""
        pass
    
    @abstractmethod
    def count_chunk_tokens(self, chunk_data: Any) -> int:
        """Count tokens in a semantic chunk."""
        pass


class EstimativeTokenCounter(TokenCounter):
    """
    Fast estimative token counter based on character patterns.
    
    Provides accurate estimates for IFC JSON data without requiring
    model-specific tokenizers which may not be available.
    """
    
    def __init__(self, model: LLMModel):
        """
        Initialize counter for specific model.
        
        Args:
            model: Target LLM model for token counting
        """
        self.model = model
        self.token_limits = MODEL_CONFIGS[model]
        self.chars_per_token = self.token_limits.chars_per_token
        
        # IFC-specific patterns for more accurate counting
        self.ifc_patterns = {
            'entity_refs': re.compile(r'#\d+'),  # IFC entity references
            'guids': re.compile(r'[0-9A-Za-z_$]{22}'),  # IFC GUIDs
            'coordinates': re.compile(r'-?\d+\.?\d*'),  # Numeric coordinates
            'strings': re.compile(r'"[^"]*"'),  # Quoted strings
            'keywords': re.compile(r'\b(IFC\w+|IFCREL\w+)\b'),  # IFC keywords
        }
        
        logger.info(f"EstimativeTokenCounter initialized for {model.value}")
    
    def count_tokens(self, text: str) -> int:
        """
        Count tokens using character-based estimation with IFC patterns.
        
        Args:
            text: Input text to count tokens for
            
        Returns:
            Estimated token count
        """
        if not text:
            return 0
        
        # Base character count
        char_count = len(text)
        
        # Apply IFC-specific adjustments
        token_adjustment = 1.0
        
        # IFC entity references are typically single tokens
        entity_refs = len(self.ifc_patterns['entity_refs'].findall(text))
        if entity_refs > 0:
            # Entity refs are more token-efficient
            token_adjustment *= 0.95
        
        # IFC GUIDs are typically 2-3 tokens
        guids = len(self.ifc_patterns['guids'].findall(text))
        if guids > 0:
            # GUIDs increase token density
            token_adjustment *= 1.1
        
        # Numeric coordinates are usually single tokens
        coordinates = len(self.ifc_patterns['coordinates'].findall(text))
        if coordinates > char_count * 0.3:  # High numeric content
            token_adjustment *= 0.9
        
        # Apply model-specific character-to-token ratio with adjustments
        effective_chars_per_token = self.chars_per_token * token_adjustment
        token_count = max(1, int(char_count / effective_chars_per_token))
        
        return token_count
    
    def count_chunk_tokens(self, chunk_data: Any) -> int:
        """
        Count tokens in a semantic chunk including all components.
        
        Args:
            chunk_data: Semantic chunk or chunk-like data structure
            
        Returns:
            Total estimated token count for the chunk
        """
        total_tokens = 0
        
        try:
            if hasattr(chunk_data, 'entities'):
                # SemanticChunk object
                for entity in chunk_data.entities:
                    entity_text = json.dumps(entity.__dict__, default=str)
                    total_tokens += self.count_tokens(entity_text)
                
                # Add metadata tokens
                if hasattr(chunk_data, 'metadata') and chunk_data.metadata:
                    metadata_text = json.dumps(chunk_data.metadata, default=str)
                    total_tokens += self.count_tokens(metadata_text)
                
                # Add relationship tokens
                if hasattr(chunk_data, 'relationships') and chunk_data.relationships:
                    for rel in chunk_data.relationships:
                        rel_text = json.dumps(rel.__dict__, default=str)
                        total_tokens += self.count_tokens(rel_text)
                        
            elif isinstance(chunk_data, dict):
                # Dictionary-based chunk
                chunk_text = json.dumps(chunk_data, default=str)
                total_tokens = self.count_tokens(chunk_text)
                
            elif isinstance(chunk_data, str):
                # Raw text chunk
                total_tokens = self.count_tokens(chunk_data)
                
            else:
                # Fallback: convert to string and count
                chunk_text = str(chunk_data)
                total_tokens = self.count_tokens(chunk_text)
        
        except Exception as e:
            logger.warning(f"Error counting chunk tokens, using fallback: {e}")
            chunk_text = str(chunk_data)
            total_tokens = self.count_tokens(chunk_text)
        
        return total_tokens


@dataclass
class TokenBudget:
    """
    Manages token allocation and budget across multiple chunks.
    
    Provides intelligent distribution of available tokens while respecting
    model limits and maintaining quality.
    """
    
    model: LLMModel
    target_tokens_per_chunk: int
    max_chunks: int = 100
    overlap_token_budget: float = 0.15  # 15% of tokens reserved for overlap
    prompt_token_overhead: int = 1000  # Reserved for prompt and instructions
    
    def __post_init__(self):
        """Initialize computed properties."""
        self.token_limits = MODEL_CONFIGS[self.model]
        self.effective_tokens_per_chunk = int(
            self.target_tokens_per_chunk * (1 - self.overlap_token_budget)
        )
        self.overlap_tokens_per_chunk = int(
            self.target_tokens_per_chunk * self.overlap_token_budget
        )
        
        logger.info(
            f"TokenBudget initialized for {self.model.value}",
            target_tokens_per_chunk=self.target_tokens_per_chunk,
            effective_tokens_per_chunk=self.effective_tokens_per_chunk,
            overlap_tokens_per_chunk=self.overlap_tokens_per_chunk
        )
    
    def get_chunk_budget(self, chunk_index: int, total_chunks: int) -> Dict[str, int]:
        """
        Get token budget allocation for a specific chunk.
        
        Args:
            chunk_index: Index of the chunk (0-based)
            total_chunks: Total number of chunks in the set
            
        Returns:
            Dictionary with token budget allocations
        """
        # Dynamic budget based on chunk position and total count
        base_budget = self.effective_tokens_per_chunk
        overlap_budget = self.overlap_tokens_per_chunk
        
        # First and last chunks may have different overlap requirements
        if chunk_index == 0:
            # First chunk: no preceding overlap needed
            overlap_budget = overlap_budget // 2
        elif chunk_index == total_chunks - 1:
            # Last chunk: no following overlap needed
            overlap_budget = overlap_budget // 2
        
        return {
            "content_tokens": base_budget,
            "overlap_tokens": overlap_budget,
            "total_budget": base_budget + overlap_budget,
            "safety_margin": int(base_budget * 0.1)  # 10% safety margin
        }
    
    def validate_chunk_budget(self, chunk_tokens: int, chunk_index: int, total_chunks: int) -> bool:
        """
        Validate that a chunk respects its token budget.
        
        Args:
            chunk_tokens: Actual token count of the chunk
            chunk_index: Index of the chunk
            total_chunks: Total number of chunks
            
        Returns:
            True if chunk is within budget limits
        """
        budget = self.get_chunk_budget(chunk_index, total_chunks)
        max_allowed = budget["total_budget"] + budget["safety_margin"]
        
        return chunk_tokens <= max_allowed
    
    def calculate_cost_estimate(self, total_tokens: int) -> Dict[str, float]:
        """
        Calculate estimated processing cost for token usage.
        
        Args:
            total_tokens: Total tokens to be processed
            
        Returns:
            Cost breakdown dictionary
        """
        cost_per_1k = self.token_limits.token_cost_per_1k
        base_cost = (total_tokens / 1000) * cost_per_1k
        
        return {
            "total_tokens": total_tokens,
            "cost_per_1k_tokens": cost_per_1k,
            "estimated_cost_usd": base_cost,
            "cost_breakdown": {
                "input_tokens": total_tokens,
                "input_cost": base_cost
            }
        }


class TokenOptimizer:
    """
    Optimizes chunks for optimal token usage and LLM processing.
    
    Provides intelligent optimization strategies that balance token efficiency
    with semantic coherence and relationship preservation.
    """
    
    def __init__(self, model: LLMModel, config: Optional[Config] = None):
        """
        Initialize optimizer for specific model.
        
        Args:
            model: Target LLM model for optimization
            config: Configuration object
        """
        self.model = model
        self.config = config or Config()
        self.token_limits = MODEL_CONFIGS[model]
        self.token_counter = EstimativeTokenCounter(model)
        
        # Optimization settings
        self.target_utilization = 0.85  # Target 85% of available tokens
        self.min_utilization = 0.60     # Minimum 60% utilization
        self.max_utilization = 0.95     # Maximum 95% utilization
        
        logger.info(f"TokenOptimizer initialized for {model.value}")
    
    def optimize_chunks(self, chunks: List[Any]) -> List[Any]:
        """
        Optimize a list of chunks for better token utilization.
        
        Args:
            chunks: List of semantic chunks to optimize
            
        Returns:
            Optimized list of chunks
        """
        if not chunks:
            return chunks
        
        logger.info(f"Starting chunk optimization for {len(chunks)} chunks")
        
        optimized_chunks = []
        current_chunk_entities = []
        current_tokens = 0
        target_tokens = self.token_limits.get_safe_chunk_size()
        
        for chunk in chunks:
            chunk_tokens = self.token_counter.count_chunk_tokens(chunk)
            
            # Check if adding this chunk would exceed target
            if current_tokens + chunk_tokens > target_tokens and current_chunk_entities:
                # Create optimized chunk from accumulated entities
                optimized_chunk = self._create_optimized_chunk(current_chunk_entities)
                optimized_chunks.append(optimized_chunk)
                
                # Start new chunk
                current_chunk_entities = [chunk]
                current_tokens = chunk_tokens
            else:
                # Add to current chunk
                current_chunk_entities.append(chunk)
                current_tokens += chunk_tokens
        
        # Handle remaining entities
        if current_chunk_entities:
            optimized_chunk = self._create_optimized_chunk(current_chunk_entities)
            optimized_chunks.append(optimized_chunk)
        
        logger.info(
            f"Chunk optimization completed",
            original_chunks=len(chunks),
            optimized_chunks=len(optimized_chunks),
            avg_tokens_per_chunk=sum(
                self.token_counter.count_chunk_tokens(chunk) 
                for chunk in optimized_chunks
            ) // len(optimized_chunks) if optimized_chunks else 0
        )
        
        return optimized_chunks
    
    def _create_optimized_chunk(self, chunk_components: List[Any]) -> Any:
        """Create an optimized chunk from components."""
        if len(chunk_components) == 1:
            return chunk_components[0]
        
        # Merge multiple chunks into one optimized chunk
        # This is a simplified implementation - in practice, you'd want to
        # intelligently merge the semantic information
        from .chunking_strategies import SemanticChunk
        
        merged_entities = []
        merged_relationships = []
        merged_metadata = {}
        
        for component in chunk_components:
            if hasattr(component, 'entities'):
                merged_entities.extend(component.entities)
            if hasattr(component, 'relationships'):
                merged_relationships.extend(component.relationships)
            if hasattr(component, 'metadata') and component.metadata:
                merged_metadata.update(component.metadata)
        
        return SemanticChunk(
            chunk_id=f"optimized_{len(chunk_components)}_chunks",
            strategy_used="TokenOptimizer",
            entities=merged_entities,
            relationships=merged_relationships,
            metadata=merged_metadata
        )
    
    def analyze_token_distribution(self, chunks: List[Any]) -> Dict[str, Any]:
        """
        Analyze token distribution across chunks for optimization insights.
        
        Args:
            chunks: List of chunks to analyze
            
        Returns:
            Analysis results with optimization recommendations
        """
        if not chunks:
            return {"error": "No chunks provided for analysis"}
        
        token_counts = [self.token_counter.count_chunk_tokens(chunk) for chunk in chunks]
        total_tokens = sum(token_counts)
        avg_tokens = total_tokens / len(chunks)
        target_tokens = self.token_limits.get_safe_chunk_size()
        
        # Calculate distribution metrics
        utilization_rates = [count / target_tokens for count in token_counts]
        under_utilized = sum(1 for rate in utilization_rates if rate < self.min_utilization)
        over_utilized = sum(1 for rate in utilization_rates if rate > self.max_utilization)
        well_utilized = len(chunks) - under_utilized - over_utilized
        
        analysis = {
            "total_chunks": len(chunks),
            "total_tokens": total_tokens,
            "average_tokens_per_chunk": avg_tokens,
            "target_tokens_per_chunk": target_tokens,
            "token_distribution": {
                "min_tokens": min(token_counts),
                "max_tokens": max(token_counts),
                "median_tokens": sorted(token_counts)[len(token_counts) // 2],
                "std_deviation": self._calculate_std_deviation(token_counts, avg_tokens)
            },
            "utilization_analysis": {
                "well_utilized_chunks": well_utilized,
                "under_utilized_chunks": under_utilized,
                "over_utilized_chunks": over_utilized,
                "average_utilization": sum(utilization_rates) / len(utilization_rates),
                "utilization_efficiency": well_utilized / len(chunks)
            },
            "optimization_recommendations": []
        }
        
        # Generate recommendations
        if under_utilized > len(chunks) * 0.3:
            analysis["optimization_recommendations"].append(
                "Consider merging under-utilized chunks to improve token efficiency"
            )
        
        if over_utilized > 0:
            analysis["optimization_recommendations"].append(
                "Some chunks exceed target size - consider splitting or reducing content"
            )
        
        if analysis["utilization_analysis"]["utilization_efficiency"] < 0.7:
            analysis["optimization_recommendations"].append(
                "Overall utilization is low - run optimize_chunks() to improve efficiency"
            )
        
        return analysis
    
    def _calculate_std_deviation(self, values: List[float], mean: float) -> float:
        """Calculate standard deviation of values."""
        if len(values) <= 1:
            return 0.0
        
        variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
        return math.sqrt(variance)
    
    def estimate_processing_cost(self, chunks: List[Any]) -> Dict[str, Any]:
        """
        Estimate the cost of processing chunks with the target LLM.
        
        Args:
            chunks: List of chunks to estimate cost for
            
        Returns:
            Detailed cost estimation
        """
        token_counts = [self.token_counter.count_chunk_tokens(chunk) for chunk in chunks]
        total_tokens = sum(token_counts)
        
        budget = TokenBudget(
            model=self.model,
            target_tokens_per_chunk=self.token_limits.get_safe_chunk_size()
        )
        
        cost_analysis = budget.calculate_cost_estimate(total_tokens)
        cost_analysis.update({
            "chunk_analysis": {
                "total_chunks": len(chunks),
                "tokens_per_chunk": token_counts,
                "average_tokens_per_chunk": total_tokens / len(chunks) if chunks else 0
            },
            "model_info": {
                "model": self.model.value,
                "max_context_tokens": self.token_limits.max_context_tokens,
                "recommended_chunk_tokens": self.token_limits.recommended_chunk_tokens
            }
        })
        
        return cost_analysis


def create_token_counter(model: LLMModel) -> TokenCounter:
    """
    Factory function to create appropriate token counter for model.
    
    Args:
        model: Target LLM model
        
    Returns:
        Configured token counter instance
    """
    return EstimativeTokenCounter(model)


def create_token_optimizer(model: LLMModel, config: Optional[Config] = None) -> TokenOptimizer:
    """
    Factory function to create token optimizer for model.
    
    Args:
        model: Target LLM model
        config: Configuration object
        
    Returns:
        Configured token optimizer instance
    """
    return TokenOptimizer(model, config)