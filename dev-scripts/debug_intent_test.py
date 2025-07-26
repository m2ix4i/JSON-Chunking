#!/usr/bin/env python3
"""Quick debug test for intent classifier pattern matching."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import re
from ifc_json_chunking.query.types import QUANTITY_PATTERNS, QueryIntent
from ifc_json_chunking.orchestration.intent_classifier import IntentClassifier

def test_pattern_matching():
    """Test pattern matching directly."""
    
    query = "Wieviele Türen sind im Gebäude?"
    query_lower = query.lower()
    
    print(f"Testing query: '{query}'")
    print(f"Query lower: '{query_lower}'")
    print()
    
    # Test quantity patterns directly
    print("QUANTITY_PATTERNS:")
    for i, pattern_str in enumerate(QUANTITY_PATTERNS):
        pattern = re.compile(pattern_str, re.IGNORECASE)
        matches = pattern.findall(query_lower)
        print(f"  {i+1}. '{pattern_str}' -> matches: {matches}")
    
    print()
    
    # Test with actual classifier
    classifier = IntentClassifier()
    
    # Test _score_intent method directly
    score, matched_patterns = classifier._score_intent(query_lower, QueryIntent.QUANTITY)
    print(f"Direct _score_intent for QUANTITY: score={score}, patterns={matched_patterns}")
    
    # Test full classification
    result = classifier.classify_intent(query)
    print(f"Full classification: intent={result.intent}, confidence={result.confidence}")
    print(f"Matched patterns: {result.matched_patterns}")
    print(f"Reasoning: {result.reasoning}")

if __name__ == "__main__":
    test_pattern_matching()