"""
Query result caching system for performance optimization.

This module provides intelligent caching of query results with
similarity matching, TTL management, and cache optimization.
"""

import hashlib
import time
from typing import Any, Dict, List, Optional, Set
from dataclasses import dataclass, field
from collections import defaultdict
import json

import structlog

from ..query.types import QueryResult, QueryIntent

logger = structlog.get_logger(__name__)


@dataclass
class CacheEntry:
    """Entry in the query cache."""
    
    cache_key: str
    original_query: str
    intent: QueryIntent
    result: QueryResult
    created_at: float = field(default_factory=time.time)
    last_accessed: float = field(default_factory=time.time)
    access_count: int = 0
    ttl_seconds: Optional[int] = None
    
    # Cache optimization data
    query_hash: str = ""
    similarity_features: Dict[str, Any] = field(default_factory=dict)
    chunk_count: int = 0
    processing_time: float = 0.0
    
    def __post_init__(self):
        """Initialize computed fields."""
        if not self.query_hash:
            self.query_hash = self._compute_query_hash()
        
        if not self.similarity_features:
            self.similarity_features = self._extract_similarity_features()
        
        self.chunk_count = self.result.total_chunks
        self.processing_time = self.result.processing_time
    
    @property
    def is_expired(self) -> bool:
        """Check if cache entry has expired."""
        if self.ttl_seconds is None:
            return False
        return time.time() > (self.created_at + self.ttl_seconds)
    
    @property
    def age_seconds(self) -> float:
        """Get age of cache entry in seconds."""
        return time.time() - self.created_at
    
    def access(self) -> None:
        """Record access to cache entry."""
        self.access_count += 1
        self.last_accessed = time.time()
    
    def _compute_query_hash(self) -> str:
        """Compute hash of query for exact matching."""
        query_data = {
            "query": self.original_query.lower().strip(),
            "intent": self.intent.value
        }
        
        query_json = json.dumps(query_data, sort_keys=True)
        return hashlib.sha256(query_json.encode()).hexdigest()[:16]
    
    def _extract_similarity_features(self) -> Dict[str, Any]:
        """Extract features for similarity matching."""
        query_lower = self.original_query.lower()
        
        # Extract key terms
        key_terms = set()
        building_terms = [
            "beton", "stahl", "holz", "glas", "ziegel",
            "türen", "fenster", "wände", "decken", "stützen",
            "raum", "stock", "etage", "geschoss",
            "kubikmeter", "quadratmeter", "anzahl", "menge"
        ]
        
        for term in building_terms:
            if term in query_lower:
                key_terms.add(term)
        
        # Extract numeric patterns
        import re
        numbers = re.findall(r'\d+', query_lower)
        
        # Extract question type indicators
        question_indicators = []
        if query_lower.startswith(("wie", "wieviel", "was", "welche", "wo")):
            question_indicators.append(query_lower.split()[0])
        
        return {
            "key_terms": list(key_terms),
            "numbers": numbers,
            "question_indicators": question_indicators,
            "query_length": len(self.original_query.split()),
            "intent": self.intent.value
        }
    
    def calculate_similarity(self, other_query: str, other_intent: QueryIntent) -> float:
        """Calculate similarity score with another query."""
        other_features = self._extract_features_for_query(other_query, other_intent)
        
        # Intent similarity (high weight)
        intent_score = 1.0 if self.intent == other_intent else 0.0
        
        # Key terms similarity
        my_terms = set(self.similarity_features.get("key_terms", []))
        other_terms = set(other_features.get("key_terms", []))
        
        if my_terms or other_terms:
            terms_intersection = len(my_terms.intersection(other_terms))
            terms_union = len(my_terms.union(other_terms))
            terms_score = terms_intersection / terms_union if terms_union > 0 else 0.0
        else:
            terms_score = 0.0
        
        # Numeric similarity
        my_numbers = set(self.similarity_features.get("numbers", []))
        other_numbers = set(other_features.get("numbers", []))
        
        if my_numbers or other_numbers:
            numbers_intersection = len(my_numbers.intersection(other_numbers))
            numbers_union = len(my_numbers.union(other_numbers))
            numbers_score = numbers_intersection / numbers_union if numbers_union > 0 else 0.0
        else:
            numbers_score = 1.0  # No numbers in either query
        
        # Question type similarity
        my_indicators = set(self.similarity_features.get("question_indicators", []))
        other_indicators = set(other_features.get("question_indicators", []))
        
        if my_indicators or other_indicators:
            indicators_score = 1.0 if my_indicators.intersection(other_indicators) else 0.0
        else:
            indicators_score = 1.0
        
        # Weighted combination
        similarity = (
            intent_score * 0.4 +
            terms_score * 0.3 +
            numbers_score * 0.2 +
            indicators_score * 0.1
        )
        
        return similarity
    
    def _extract_features_for_query(self, query: str, intent: QueryIntent) -> Dict[str, Any]:
        """Extract features for another query (for similarity comparison)."""
        query_lower = query.lower()
        
        # Extract key terms
        key_terms = set()
        building_terms = [
            "beton", "stahl", "holz", "glas", "ziegel",
            "türen", "fenster", "wände", "decken", "stützen",
            "raum", "stock", "etage", "geschoss",
            "kubikmeter", "quadratmeter", "anzahl", "menge"
        ]
        
        for term in building_terms:
            if term in query_lower:
                key_terms.add(term)
        
        # Extract numeric patterns
        import re
        numbers = re.findall(r'\d+', query_lower)
        
        # Extract question type indicators
        question_indicators = []
        if query_lower.startswith(("wie", "wieviel", "was", "welche", "wo")):
            question_indicators.append(query_lower.split()[0])
        
        return {
            "key_terms": list(key_terms),
            "numbers": numbers,
            "question_indicators": question_indicators,
            "query_length": len(query.split()),
            "intent": intent.value
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "cache_key": self.cache_key,
            "original_query": self.original_query,
            "intent": self.intent.value,
            "result": self.result.to_dict(),
            "created_at": self.created_at,
            "last_accessed": self.last_accessed,
            "access_count": self.access_count,
            "ttl_seconds": self.ttl_seconds,
            "query_hash": self.query_hash,
            "similarity_features": self.similarity_features,
            "chunk_count": self.chunk_count,
            "processing_time": self.processing_time
        }


class QueryCache:
    """
    Intelligent query result caching system.
    
    Provides exact matching and similarity-based caching with
    automatic expiration, cache optimization, and hit rate tracking.
    """
    
    def __init__(
        self,
        max_entries: int = 1000,
        default_ttl_seconds: int = 3600,
        similarity_threshold: float = 0.8
    ):
        """
        Initialize query cache.
        
        Args:
            max_entries: Maximum number of cache entries
            default_ttl_seconds: Default TTL for cache entries
            similarity_threshold: Minimum similarity for cache hits
        """
        self.max_entries = max_entries
        self.default_ttl_seconds = default_ttl_seconds
        self.similarity_threshold = similarity_threshold
        
        # Storage
        self._cache: Dict[str, CacheEntry] = {}
        self._hash_index: Dict[str, str] = {}  # query_hash -> cache_key
        self._intent_index: Dict[QueryIntent, Set[str]] = defaultdict(set)
        
        # Statistics
        self._hits = 0
        self._misses = 0
        self._similarity_hits = 0
        self._exact_hits = 0
        
        logger.info(
            "QueryCache initialized",
            max_entries=max_entries,
            default_ttl=default_ttl_seconds,
            similarity_threshold=similarity_threshold
        )
    
    def put(
        self,
        query: str,
        intent: QueryIntent,
        result: QueryResult,
        ttl_seconds: Optional[int] = None
    ) -> str:
        """
        Store query result in cache.
        
        Args:
            query: Original query string
            intent: Query intent
            result: Query result to cache
            ttl_seconds: Time to live (uses default if None)
            
        Returns:
            Cache key for the stored entry
        """
        ttl = ttl_seconds or self.default_ttl_seconds
        cache_key = f"cache_{int(time.time())}_{len(self._cache)}"
        
        entry = CacheEntry(
            cache_key=cache_key,
            original_query=query,
            intent=intent,
            result=result,
            ttl_seconds=ttl
        )
        
        # Store entry
        self._cache[cache_key] = entry
        self._hash_index[entry.query_hash] = cache_key
        self._intent_index[intent].add(cache_key)
        
        # Enforce size limit
        if len(self._cache) > self.max_entries:
            self._evict_entries()
        
        logger.debug(
            "Query result cached",
            cache_key=cache_key,
            query=query[:50],
            intent=intent.value,
            ttl=ttl
        )
        
        return cache_key
    
    def get(self, query: str, intent: QueryIntent) -> Optional[QueryResult]:
        """
        Retrieve cached query result.
        
        Args:
            query: Query string to search for
            intent: Query intent
            
        Returns:
            Cached QueryResult if found, None otherwise
        """
        # First try exact match
        exact_entry = self._find_exact_match(query, intent)
        if exact_entry and not exact_entry.is_expired:
            exact_entry.access()
            self._hits += 1
            self._exact_hits += 1
            
            logger.debug(
                "Cache exact hit",
                cache_key=exact_entry.cache_key,
                query=query[:50]
            )
            
            return exact_entry.result
        
        # Try similarity match
        similar_entry = self._find_similar_match(query, intent)
        if similar_entry and not similar_entry.is_expired:
            similar_entry.access()
            self._hits += 1
            self._similarity_hits += 1
            
            logger.debug(
                "Cache similarity hit",
                cache_key=similar_entry.cache_key,
                query=query[:50],
                original_query=similar_entry.original_query[:50]
            )
            
            return similar_entry.result
        
        # Cache miss
        self._misses += 1
        logger.debug("Cache miss", query=query[:50], intent=intent.value)
        return None
    
    def _find_exact_match(self, query: str, intent: QueryIntent) -> Optional[CacheEntry]:
        """Find exact cache match."""
        # Create temporary entry to compute hash
        temp_entry = CacheEntry(
            cache_key="temp",
            original_query=query,
            intent=intent,
            result=None  # Not needed for hash computation
        )
        
        query_hash = temp_entry.query_hash
        cache_key = self._hash_index.get(query_hash)
        
        if cache_key and cache_key in self._cache:
            return self._cache[cache_key]
        
        return None
    
    def _find_similar_match(self, query: str, intent: QueryIntent) -> Optional[CacheEntry]:
        """Find similar cache match."""
        # Only search within the same intent
        candidate_keys = self._intent_index.get(intent, set())
        
        best_entry = None
        best_similarity = 0.0
        
        for cache_key in candidate_keys:
            if cache_key not in self._cache:
                continue
            
            entry = self._cache[cache_key]
            if entry.is_expired:
                continue
            
            similarity = entry.calculate_similarity(query, intent)
            
            if similarity >= self.similarity_threshold and similarity > best_similarity:
                best_similarity = similarity
                best_entry = entry
        
        return best_entry
    
    def invalidate(self, cache_key: str) -> bool:
        """
        Invalidate a specific cache entry.
        
        Args:
            cache_key: Cache key to invalidate
            
        Returns:
            True if entry was found and removed
        """
        if cache_key not in self._cache:
            return False
        
        entry = self._cache[cache_key]
        
        # Remove from all indices
        del self._cache[cache_key]
        self._hash_index.pop(entry.query_hash, None)
        self._intent_index[entry.intent].discard(cache_key)
        
        logger.debug("Cache entry invalidated", cache_key=cache_key)
        return True
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
        self._hash_index.clear()
        self._intent_index.clear()
        
        logger.info("Cache cleared")
    
    def cleanup_expired(self) -> int:
        """
        Clean up expired cache entries.
        
        Returns:
            Number of entries removed
        """
        current_time = time.time()
        expired_keys = [
            key for key, entry in self._cache.items()
            if entry.is_expired
        ]
        
        for key in expired_keys:
            self.invalidate(key)
        
        if expired_keys:
            logger.debug("Expired cache entries removed", count=len(expired_keys))
        
        return len(expired_keys)
    
    def _evict_entries(self) -> None:
        """Evict entries to maintain size limit using LRU policy."""
        if len(self._cache) <= self.max_entries:
            return
        
        # Sort by last accessed time (LRU)
        entries_by_access = sorted(
            self._cache.items(),
            key=lambda x: x[1].last_accessed
        )
        
        # Remove oldest entries
        entries_to_remove = len(self._cache) - self.max_entries + 50  # Remove extra for buffer
        
        for cache_key, _ in entries_by_access[:entries_to_remove]:
            self.invalidate(cache_key)
        
        logger.debug("Cache entries evicted", count=entries_to_remove)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total_requests = self._hits + self._misses
        hit_rate = (self._hits / total_requests * 100) if total_requests > 0 else 0.0
        
        # Calculate average processing time saved
        if self._cache:
            avg_processing_time = sum(
                entry.processing_time for entry in self._cache.values()
            ) / len(self._cache)
        else:
            avg_processing_time = 0.0
        
        time_saved = avg_processing_time * self._hits
        
        # Analyze cache by intent
        by_intent = {}
        for intent, keys in self._intent_index.items():
            valid_keys = [k for k in keys if k in self._cache and not self._cache[k].is_expired]
            by_intent[intent.value] = len(valid_keys)
        
        return {
            "total_entries": len(self._cache),
            "max_entries": self.max_entries,
            "hit_rate_percent": hit_rate,
            "total_hits": self._hits,
            "exact_hits": self._exact_hits,
            "similarity_hits": self._similarity_hits,
            "total_misses": self._misses,
            "total_requests": total_requests,
            "estimated_time_saved_seconds": time_saved,
            "entries_by_intent": by_intent,
            "similarity_threshold": self.similarity_threshold,
            "default_ttl_seconds": self.default_ttl_seconds
        }
    
    def get_cache_entries(self, intent: Optional[QueryIntent] = None) -> List[Dict[str, Any]]:
        """
        Get cache entries, optionally filtered by intent.
        
        Args:
            intent: Optional intent to filter by
            
        Returns:
            List of cache entry information
        """
        entries = []
        
        for cache_key, entry in self._cache.items():
            if intent and entry.intent != intent:
                continue
            
            if entry.is_expired:
                continue
            
            entries.append({
                "cache_key": cache_key,
                "query": entry.original_query,
                "intent": entry.intent.value,
                "created_at": entry.created_at,
                "last_accessed": entry.last_accessed,
                "access_count": entry.access_count,
                "age_seconds": entry.age_seconds,
                "chunk_count": entry.chunk_count,
                "processing_time": entry.processing_time
            })
        
        # Sort by last accessed (most recent first)
        entries.sort(key=lambda x: x["last_accessed"], reverse=True)
        return entries
    
    def optimize_cache(self) -> Dict[str, Any]:
        """
        Optimize cache by removing low-value entries.
        
        Returns:
            Optimization results
        """
        initial_count = len(self._cache)
        
        # Remove expired entries
        expired_removed = self.cleanup_expired()
        
        # Remove entries with very low access count and old age
        current_time = time.time()
        low_value_keys = []
        
        for cache_key, entry in self._cache.items():
            # Consider entries low-value if:
            # - Older than 24 hours with only 1 access
            # - Older than 1 week with less than 5 accesses
            age_hours = entry.age_seconds / 3600
            
            if (age_hours > 24 and entry.access_count <= 1) or \
               (age_hours > 168 and entry.access_count < 5):  # 168 hours = 1 week
                low_value_keys.append(cache_key)
        
        # Remove low-value entries
        for key in low_value_keys:
            self.invalidate(key)
        
        final_count = len(self._cache)
        
        optimization_result = {
            "initial_entries": initial_count,
            "expired_removed": expired_removed,
            "low_value_removed": len(low_value_keys),
            "final_entries": final_count,
            "total_removed": initial_count - final_count,
            "optimization_ratio": (initial_count - final_count) / initial_count if initial_count > 0 else 0.0
        }
        
        logger.info(
            "Cache optimized",
            **optimization_result
        )
        
        return optimization_result