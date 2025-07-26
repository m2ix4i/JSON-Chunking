"""
Token counting utilities for LLM-optimized chunking.

This module provides token counting and optimization capabilities for different
LLM models, enabling precise chunk sizing for optimal performance.
"""

import json
import re
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Union

import structlog

logger = structlog.get_logger(__name__)


class LLMModel(Enum):
    """Supported LLM models with their token limits."""

    GEMINI_2_5_PRO = "gemini-2.5-pro"
    GEMINI_1_5_PRO = "gemini-1.5-pro"
    GPT_4_TURBO = "gpt-4-turbo"
    CLAUDE_3_SONNET = "claude-3-sonnet"


@dataclass
class TokenLimits:
    """Token limits and optimal chunk sizes for different models."""

    max_context: int
    optimal_chunk: int
    overlap_tokens: int
    safety_margin: int

    @property
    def effective_chunk_size(self) -> int:
        """Get effective chunk size accounting for safety margin."""
        return self.optimal_chunk - self.safety_margin


class TokenCounter:
    """
    Token counting utility for LLM-optimized chunking.
    
    Provides accurate token counting for different LLM models and
    optimization strategies for chunk sizing.
    """

    # Model-specific token limits
    MODEL_LIMITS = {
        LLMModel.GEMINI_2_5_PRO: TokenLimits(
            max_context=2_000_000,
            optimal_chunk=8_000,
            overlap_tokens=400,
            safety_margin=200
        ),
        LLMModel.GEMINI_1_5_PRO: TokenLimits(
            max_context=1_000_000,
            optimal_chunk=6_000,
            overlap_tokens=300,
            safety_margin=200
        ),
        LLMModel.GPT_4_TURBO: TokenLimits(
            max_context=128_000,
            optimal_chunk=4_000,
            overlap_tokens=200,
            safety_margin=100
        ),
        LLMModel.CLAUDE_3_SONNET: TokenLimits(
            max_context=200_000,
            optimal_chunk=5_000,
            overlap_tokens=250,
            safety_margin=150
        )
    }

    def __init__(self, model: LLMModel = LLMModel.GEMINI_2_5_PRO):
        """
        Initialize token counter for specific LLM model.
        
        Args:
            model: Target LLM model for optimization
        """
        self.model = model
        self.limits = self.MODEL_LIMITS[model]

        logger.info(
            "TokenCounter initialized",
            model=model.value,
            max_context=self.limits.max_context,
            optimal_chunk=self.limits.optimal_chunk
        )

    def count_tokens(self, content: Union[str, Dict, List, Any]) -> int:
        """
        Count tokens in content for the target LLM model.
        
        Args:
            content: Content to count tokens for
            
        Returns:
            Estimated token count
        """
        if isinstance(content, (dict, list)):
            content = json.dumps(content, separators=(',', ':'))
        elif not isinstance(content, str):
            content = str(content)

        # Use model-specific token counting
        return self._estimate_tokens(content)

    def _estimate_tokens(self, text: str) -> int:
        """
        Estimate token count using model-appropriate heuristics.
        
        For Gemini models: ~4 characters per token on average
        For GPT models: ~4 characters per token on average
        For Claude: ~3.5 characters per token on average
        
        Args:
            text: Text to analyze
            
        Returns:
            Estimated token count
        """
        if self.model in [LLMModel.GEMINI_2_5_PRO, LLMModel.GEMINI_1_5_PRO]:
            return self._estimate_gemini_tokens(text)
        elif self.model == LLMModel.GPT_4_TURBO:
            return self._estimate_gpt_tokens(text)
        elif self.model == LLMModel.CLAUDE_3_SONNET:
            return self._estimate_claude_tokens(text)
        else:
            # Default estimation
            return len(text) // 4

    def _estimate_gemini_tokens(self, text: str) -> int:
        """Estimate tokens for Gemini models."""
        json_tokens = self._count_json_structure_tokens(text)
        ifc_bonus = self._calculate_ifc_complexity_bonus(text)
        base_tokens = self._calculate_base_tokens(text, json_tokens, ifc_bonus)
        return self._log_and_return_gemini_total(json_tokens, ifc_bonus, base_tokens)

    def _count_json_structure_tokens(self, text: str) -> int:
        """Count JSON structural elements as tokens."""
        structural_chars = text.count('{') + text.count('}') + text.count('[') + text.count(']')
        return structural_chars + text.count(',') + text.count(':')

    def _calculate_ifc_complexity_bonus(self, text: str) -> int:
        """Calculate bonus tokens for IFC-specific patterns."""
        ifc_patterns = re.findall(r'Ifc[A-Z][a-zA-Z]+', text)
        return len(ifc_patterns)

    def _calculate_base_tokens(self, text: str, json_tokens: int, ifc_bonus: int) -> int:
        """Calculate base tokens from remaining character content."""
        ifc_pattern_chars = len(''.join(re.findall(r'Ifc[A-Z][a-zA-Z]+', text)))
        remaining_chars = len(text) - (ifc_pattern_chars + json_tokens)
        return remaining_chars // 4

    def _log_and_return_gemini_total(self, json_tokens: int, ifc_tokens: int, base_tokens: int) -> int:
        """Log token breakdown and return total for Gemini estimation."""
        total_tokens = json_tokens + ifc_tokens + base_tokens
        logger.debug(
            "Gemini token estimation",
            total_tokens=total_tokens,
            json_tokens=json_tokens,
            ifc_tokens=ifc_tokens,
            base_tokens=base_tokens
        )
        return total_tokens

    def _estimate_gpt_tokens(self, text: str) -> int:
        """Estimate tokens for GPT models."""
        # GPT-4 tokenization is similar to GPT-3.5
        # Average ~4 characters per token
        # JSON and code tend to be more token-dense

        # Simple estimation with slight adjustment for JSON density
        base_estimate = len(text) // 4

        # JSON content tends to use more tokens per character
        json_density_factor = 1.1 if '{' in text or '[' in text else 1.0

        return int(base_estimate * json_density_factor)

    def _estimate_claude_tokens(self, text: str) -> int:
        """Estimate tokens for Claude models."""
        # Claude tends to have slightly more efficient tokenization
        # Average ~3.5 characters per token

        return len(text) // 3.5

    def is_within_limit(self, content: Union[str, Dict, List, Any]) -> bool:
        """
        Check if content is within optimal chunk size limits.
        
        Args:
            content: Content to check
            
        Returns:
            True if within limits, False otherwise
        """
        token_count = self.count_tokens(content)
        return token_count <= self.limits.effective_chunk_size

    def get_optimal_chunk_size(self) -> int:
        """Get optimal chunk size in tokens for current model."""
        return self.limits.effective_chunk_size

    def get_overlap_size(self) -> int:
        """Get recommended overlap size in tokens."""
        return self.limits.overlap_tokens

    def calculate_chunk_metrics(self, chunks: List[Any]) -> Dict[str, Any]:
        """
        Calculate comprehensive metrics for a list of chunks.
        
        Args:
            chunks: List of chunk content
            
        Returns:
            Dictionary with token metrics
        """
        if not chunks:
            return self._empty_metrics_dict()

        token_counts = [self.count_tokens(chunk) for chunk in chunks]
        basic_stats = self._calculate_basic_stats(token_counts)
        efficiency_score = self._calculate_efficiency_score(token_counts)

        metrics = self._build_metrics_dict(basic_stats, efficiency_score, len(chunks))
        logger.info("Chunk token metrics calculated", **metrics)
        return metrics

    def _empty_metrics_dict(self) -> Dict[str, Any]:
        """Return empty metrics dictionary for no chunks case."""
        return {
            "total_chunks": 0,
            "total_tokens": 0,
            "avg_tokens_per_chunk": 0,
            "max_tokens_per_chunk": 0,
            "min_tokens_per_chunk": 0,
            "chunks_over_limit": 0,
            "efficiency_score": 0.0
        }

    def _calculate_basic_stats(self, token_counts: List[int]) -> Dict[str, Any]:
        """Calculate basic statistical metrics from token counts."""
        total_tokens = sum(token_counts)
        chunks_over_limit = sum(1 for count in token_counts if count > self.limits.effective_chunk_size)

        return {
            "total_tokens": total_tokens,
            "max_tokens": max(token_counts),
            "min_tokens": min(token_counts),
            "avg_tokens": total_tokens / len(token_counts),
            "chunks_over_limit": chunks_over_limit
        }

    def _calculate_efficiency_score(self, token_counts: List[int]) -> float:
        """Calculate efficiency score based on token space utilization."""
        target_size = self.limits.effective_chunk_size
        efficiency_scores = [min(count / target_size, 1.0) for count in token_counts]
        return sum(efficiency_scores) / len(efficiency_scores)

    def _build_metrics_dict(self, basic_stats: Dict[str, Any], efficiency_score: float, chunk_count: int) -> Dict[str, Any]:
        """Build complete metrics dictionary from calculated components."""
        return {
            "total_chunks": chunk_count,
            "total_tokens": basic_stats["total_tokens"],
            "avg_tokens_per_chunk": basic_stats["avg_tokens"],
            "max_tokens_per_chunk": basic_stats["max_tokens"],
            "min_tokens_per_chunk": basic_stats["min_tokens"],
            "chunks_over_limit": basic_stats["chunks_over_limit"],
            "efficiency_score": efficiency_score,
            "target_tokens_per_chunk": self.limits.effective_chunk_size,
            "model": self.model.value
        }

    def suggest_optimization(self, token_count: int) -> Dict[str, Any]:
        """
        Suggest optimization strategies based on token count.
        
        Args:
            token_count: Current token count
            
        Returns:
            Dictionary with optimization suggestions
        """
        target_size = self.limits.effective_chunk_size

        if token_count <= target_size:
            return self._optimal_size_response(token_count)

        overage = token_count - target_size
        overage_percentage = (overage / target_size) * 100
        suggestions = self._generate_optimization_suggestions(overage_percentage)

        return self._oversized_response(overage, overage_percentage, suggestions)

    def _optimal_size_response(self, token_count: int) -> Dict[str, Any]:
        """Generate response for optimally sized chunks."""
        return {
            "status": "optimal",
            "message": f"Chunk size ({token_count} tokens) is within optimal range",
            "suggestions": []
        }

    def _generate_optimization_suggestions(self, overage_percentage: float) -> List[str]:
        """Generate optimization suggestions based on overage percentage."""
        if overage_percentage > 50:
            return ["Consider splitting into multiple chunks", "Use hierarchical chunking strategy"]
        elif overage_percentage > 20:
            return ["Remove redundant information", "Compress property representations"]
        else:
            return ["Minor optimization needed", "Consider slight size reduction"]

    def _oversized_response(self, overage: int, overage_percentage: float, suggestions: List[str]) -> Dict[str, Any]:
        """Generate response for oversized chunks."""
        return {
            "status": "oversized",
            "message": f"Chunk exceeds optimal size by {overage} tokens ({overage_percentage:.1f}%)",
            "overage_tokens": overage,
            "overage_percentage": overage_percentage,
            "suggestions": suggestions
        }


def create_token_counter(model_name: str = "gemini-2.5-pro") -> TokenCounter:
    """
    Factory function to create token counter for specified model.
    
    Args:
        model_name: Name of the LLM model
        
    Returns:
        TokenCounter instance
        
    Raises:
        ValueError: If model name is not supported
    """
    model_map = {
        "gemini-2.5-pro": LLMModel.GEMINI_2_5_PRO,
        "gemini-1.5-pro": LLMModel.GEMINI_1_5_PRO,
        "gpt-4-turbo": LLMModel.GPT_4_TURBO,
        "claude-3-sonnet": LLMModel.CLAUDE_3_SONNET
    }

    if model_name not in model_map:
        available_models = list(model_map.keys())
        raise ValueError(f"Unsupported model: {model_name}. Available: {available_models}")

    return TokenCounter(model_map[model_name])
