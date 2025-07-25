"""
Token counting utilities for LLM-optimized chunking.

This module provides token counting and optimization capabilities for different
LLM models, enabling precise chunk sizing for optimal performance.
"""

import json
import re
from typing import Any, Dict, List, Union
from dataclasses import dataclass
from enum import Enum

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
        # Gemini tokenization considerations:
        # - JSON structure tokens
        # - IFC-specific terms may be single tokens
        # - Average ~4 chars per token
        
        # Count JSON structural elements
        json_tokens = text.count('{') + text.count('}') + text.count('[') + text.count(']')
        json_tokens += text.count(',') + text.count(':')
        
        # Count IFC-specific patterns that likely form single tokens
        ifc_patterns = re.findall(r'Ifc[A-Z][a-zA-Z]+', text)
        ifc_tokens = len(ifc_patterns)
        
        # Estimate remaining content
        remaining_chars = len(text) - (len(''.join(ifc_patterns)) + json_tokens)
        base_tokens = remaining_chars // 4
        
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
            return {
                "total_chunks": 0,
                "total_tokens": 0,
                "avg_tokens_per_chunk": 0,
                "max_tokens_per_chunk": 0,
                "min_tokens_per_chunk": 0,
                "chunks_over_limit": 0,
                "efficiency_score": 0.0
            }
        
        token_counts = [self.count_tokens(chunk) for chunk in chunks]
        total_tokens = sum(token_counts)
        max_tokens = max(token_counts)
        min_tokens = min(token_counts)
        avg_tokens = total_tokens / len(chunks)
        
        chunks_over_limit = sum(1 for count in token_counts if count > self.limits.effective_chunk_size)
        
        # Calculate efficiency score (0-1, higher is better)
        # Based on how well chunks utilize available token space
        target_size = self.limits.effective_chunk_size
        efficiency_scores = [min(count / target_size, 1.0) for count in token_counts]
        efficiency_score = sum(efficiency_scores) / len(efficiency_scores)
        
        metrics = {
            "total_chunks": len(chunks),
            "total_tokens": total_tokens,
            "avg_tokens_per_chunk": avg_tokens,
            "max_tokens_per_chunk": max_tokens,
            "min_tokens_per_chunk": min_tokens,
            "chunks_over_limit": chunks_over_limit,
            "efficiency_score": efficiency_score,
            "target_tokens_per_chunk": target_size,
            "model": self.model.value
        }
        
        logger.info("Chunk token metrics calculated", **metrics)
        
        return metrics
    
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
            return {
                "status": "optimal",
                "message": f"Chunk size ({token_count} tokens) is within optimal range",
                "suggestions": []
            }
        
        overage = token_count - target_size
        overage_percentage = (overage / target_size) * 100
        
        suggestions = []
        
        if overage_percentage > 50:
            suggestions.append("Consider splitting into multiple chunks")
            suggestions.append("Use hierarchical chunking strategy")
        elif overage_percentage > 20:
            suggestions.append("Remove redundant information")
            suggestions.append("Compress property representations")
        else:
            suggestions.append("Minor optimization needed")
            suggestions.append("Consider slight size reduction")
        
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