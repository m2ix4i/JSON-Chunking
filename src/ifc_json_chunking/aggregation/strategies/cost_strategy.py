"""
Cost aggregation strategy for financial and pricing data.

This module implements aggregation techniques for cost-related information
including pricing, budgets, estimates, and financial calculations.
"""

import statistics
from typing import Any, Dict, List, Optional, Union
from collections import defaultdict
import structlog

from ...types.aggregation_types import (
    ExtractedData, AggregationStrategyBase, AggregationStrategy,
    ConflictResolution
)
from ...query.types import QueryContext, QueryIntent

logger = structlog.get_logger(__name__)


class CostAggregationStrategy(AggregationStrategyBase):
    """Aggregation strategy for cost and financial data."""
    
    def __init__(self, default_currency: str = "EUR"):
        self.supported_intents = [QueryIntent.COST, QueryIntent.QUANTITY]
        self.default_currency = default_currency
        # Currency conversion rates (simplified - in real implementation, use live rates)
        self.currency_rates = {
            "EUR": 1.0,
            "USD": 0.92,
            "GBP": 1.16,
            "CHF": 0.98
        }
        
    async def aggregate(
        self,
        extracted_data: List[ExtractedData],
        context: QueryContext,
        resolutions: Optional[List[ConflictResolution]] = None
    ) -> Dict[str, Any]:
        """Aggregate cost data with currency normalization and calculations."""
        logger.debug(
            "Starting cost aggregation",
            data_count=len(extracted_data),
            intent=context.intent.value
        )
        
        if not extracted_data:
            return {"aggregation_method": "none", "reason": "no_data"}
        
        # Apply conflict resolutions if provided
        resolved_data = self._apply_resolutions(extracted_data, resolutions or [])
        
        # Extract cost information
        cost_data = await self._extract_cost_data(resolved_data)
        
        # Normalize currencies
        normalized_costs = await self._normalize_currencies(cost_data)
        
        # Calculate cost aggregations
        cost_aggregations = await self._calculate_cost_aggregations(normalized_costs)
        
        # Analyze cost distribution
        cost_analysis = await self._analyze_cost_distribution(normalized_costs)
        
        # Calculate cost statistics
        cost_statistics = await self._calculate_cost_statistics(normalized_costs)
        
        # Calculate aggregation confidence
        aggregation_confidence = self._calculate_aggregation_confidence(resolved_data, normalized_costs)
        
        result = {
            "aggregation_method": "financial",
            "strategy": AggregationStrategy.QUANTITATIVE.value,
            "cost_data": normalized_costs,
            "cost_aggregations": cost_aggregations,
            "cost_analysis": cost_analysis,
            "cost_statistics": cost_statistics,
            "aggregation_confidence": aggregation_confidence,
            "data_sources": len(resolved_data),
            "base_currency": self.default_currency
        }
        
        logger.info(
            "Cost aggregation completed",
            cost_items=len(normalized_costs),
            total_cost=cost_aggregations.get('total_cost', 0),
            confidence=aggregation_confidence
        )
        
        return result
    
    def get_supported_intents(self) -> List[QueryIntent]:
        """Get list of query intents this strategy supports."""
        return self.supported_intents
    
    async def _extract_cost_data(self, data_list: List[ExtractedData]) -> List[Dict[str, Any]]:
        """Extract cost-related information from all data sources."""
        cost_items = []
        
        for data in data_list:
            # Extract from quantities with cost indicators
            for qty_key, qty_value in data.quantities.items():
                if self._is_cost_quantity(qty_key, qty_value):
                    cost_item = self._create_cost_item_from_quantity(
                        qty_key, qty_value, data.chunk_id, data.extraction_confidence
                    )
                    if cost_item:
                        cost_items.append(cost_item)
            
            # Extract from properties with cost information
            for prop_key, prop_value in data.properties.items():
                if self._is_cost_property(prop_key, prop_value):
                    cost_item = self._create_cost_item_from_property(
                        prop_key, prop_value, data.chunk_id, data.extraction_confidence
                    )
                    if cost_item:
                        cost_items.append(cost_item)
            
            # Extract from entities that represent cost information
            for entity in data.entities:
                if self._is_cost_entity(entity):
                    cost_item = self._create_cost_item_from_entity(
                        entity, data.chunk_id, data.extraction_confidence
                    )
                    if cost_item:
                        cost_items.append(cost_item)
        
        return cost_items
    
    def _is_cost_quantity(self, key: str, value: Any) -> bool:
        """Check if a quantity represents cost information."""
        cost_keywords = ['cost', 'price', 'budget', 'estimate', 'expense', 'fee', 'rate']
        currency_symbols = ['€', '$', '£', 'CHF', 'EUR', 'USD', 'GBP']
        
        key_lower = key.lower()
        
        # Check key for cost indicators
        if any(keyword in key_lower for keyword in cost_keywords):
            return True
        
        # Check value for currency symbols
        if isinstance(value, str):
            return any(symbol in value for symbol in currency_symbols)
        
        return False
    
    def _is_cost_property(self, key: str, value: Any) -> bool:
        """Check if a property represents cost information."""
        return self._is_cost_quantity(key, value)
    
    def _is_cost_entity(self, entity: Dict[str, Any]) -> bool:
        """Check if an entity represents cost information."""
        entity_type = entity.get('type', '').lower()
        cost_types = ['cost', 'price', 'budget', 'estimate', 'financial']
        
        return any(cost_type in entity_type for cost_type in cost_types)
    
    def _create_cost_item_from_quantity(self, key: str, value: Any, chunk_id: str, confidence: float) -> Optional[Dict[str, Any]]:
        """Create a cost item from a quantity."""
        parsed_cost = self._parse_cost_value(value)
        if not parsed_cost:
            return None
        
        return {
            'name': key,
            'type': 'quantity',
            'amount': parsed_cost['amount'],
            'currency': parsed_cost['currency'],
            'original_value': value,
            'source_chunk': chunk_id,
            'extraction_confidence': confidence,
            'category': self._categorize_cost(key)
        }
    
    def _create_cost_item_from_property(self, key: str, value: Any, chunk_id: str, confidence: float) -> Optional[Dict[str, Any]]:
        """Create a cost item from a property."""
        parsed_cost = self._parse_cost_value(value)
        if not parsed_cost:
            return None
        
        return {
            'name': key,
            'type': 'property',
            'amount': parsed_cost['amount'],
            'currency': parsed_cost['currency'],
            'original_value': value,
            'source_chunk': chunk_id,
            'extraction_confidence': confidence,
            'category': self._categorize_cost(key)
        }
    
    def _create_cost_item_from_entity(self, entity: Dict[str, Any], chunk_id: str, confidence: float) -> Optional[Dict[str, Any]]:
        """Create a cost item from an entity."""
        # Look for cost value in entity properties
        cost_value = None
        for key, value in entity.items():
            if self._is_cost_quantity(key, value):
                cost_value = value
                break
        
        if not cost_value:
            return None
        
        parsed_cost = self._parse_cost_value(cost_value)
        if not parsed_cost:
            return None
        
        return {
            'name': entity.get('name', entity.get('id', 'unknown')),
            'type': 'entity',
            'amount': parsed_cost['amount'],
            'currency': parsed_cost['currency'],
            'original_value': cost_value,
            'source_chunk': chunk_id,
            'extraction_confidence': confidence,
            'category': self._categorize_cost(entity.get('name', '')),
            'entity_type': entity.get('type'),
            'entity_properties': entity
        }
    
    def _parse_cost_value(self, value: Any) -> Optional[Dict[str, Any]]:
        """Parse a cost value to extract amount and currency."""
        if isinstance(value, (int, float)) and value > 0:
            return {'amount': float(value), 'currency': self.default_currency}
        
        if isinstance(value, str):
            # Remove spaces and convert to lowercase for parsing
            value_clean = value.strip()
            
            # Try to extract currency and amount
            currency = self._extract_currency(value_clean)
            amount = self._extract_amount(value_clean)
            
            if amount is not None and amount > 0:
                return {'amount': amount, 'currency': currency or self.default_currency}
        
        return None
    
    def _extract_currency(self, value: str) -> Optional[str]:
        """Extract currency from a string value."""
        # Check for currency codes
        for currency in self.currency_rates.keys():
            if currency in value.upper():
                return currency
        
        # Check for currency symbols
        if '€' in value:
            return 'EUR'
        elif '$' in value:
            return 'USD'
        elif '£' in value:
            return 'GBP'
        elif 'CHF' in value.upper():
            return 'CHF'
        
        return None
    
    def _extract_amount(self, value: str) -> Optional[float]:
        """Extract numerical amount from a string value."""
        import re
        
        # Remove currency symbols and codes
        cleaned = re.sub(r'[€$£]|EUR|USD|GBP|CHF', '', value.upper())
        
        # Extract numbers (including decimals)
        numbers = re.findall(r'\d+(?:\.\d+)?', cleaned)
        
        if numbers:
            try:
                # Take the largest number (assuming it's the main amount)
                amounts = [float(num) for num in numbers]
                return max(amounts)
            except ValueError:
                pass
        
        return None
    
    def _categorize_cost(self, name: str) -> str:
        """Categorize a cost item based on its name."""
        name_lower = name.lower()
        
        categories = {
            'material': ['material', 'concrete', 'steel', 'wood', 'brick'],
            'labor': ['labor', 'work', 'installation', 'assembly'],
            'equipment': ['equipment', 'machine', 'tool'],
            'overhead': ['overhead', 'indirect', 'admin'],
            'transport': ['transport', 'shipping', 'delivery'],
            'other': []
        }
        
        for category, keywords in categories.items():
            if any(keyword in name_lower for keyword in keywords):
                return category
        
        return 'other'
    
    async def _normalize_currencies(self, cost_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalize all currencies to the base currency."""
        normalized_items = []
        
        for item in cost_items:
            normalized_item = item.copy()
            
            # Convert to base currency
            original_currency = item['currency']
            original_amount = item['amount']
            
            if original_currency != self.default_currency:
                conversion_rate = self.currency_rates.get(original_currency, 1.0)
                normalized_amount = original_amount * conversion_rate
                
                normalized_item['amount'] = normalized_amount
                normalized_item['original_amount'] = original_amount
                normalized_item['original_currency'] = original_currency
                normalized_item['conversion_rate'] = conversion_rate
                normalized_item['currency'] = self.default_currency
            
            normalized_items.append(normalized_item)
        
        return normalized_items
    
    async def _calculate_cost_aggregations(self, cost_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate various cost aggregations."""
        if not cost_items:
            return {"error": "no_cost_items"}
        
        amounts = [item['amount'] for item in cost_items]
        
        # Basic aggregations
        total_cost = sum(amounts)
        average_cost = statistics.mean(amounts)
        median_cost = statistics.median(amounts)
        min_cost = min(amounts)
        max_cost = max(amounts)
        
        # Category-based aggregations
        category_totals = defaultdict(float)
        category_counts = defaultdict(int)
        
        for item in cost_items:
            category = item.get('category', 'other')
            category_totals[category] += item['amount']
            category_counts[category] += 1
        
        # Statistical measures
        std_dev = statistics.stdev(amounts) if len(amounts) > 1 else 0.0
        
        return {
            'total_cost': total_cost,
            'average_cost': average_cost,
            'median_cost': median_cost,
            'min_cost': min_cost,
            'max_cost': max_cost,
            'standard_deviation': std_dev,
            'category_totals': dict(category_totals),
            'category_averages': {cat: total/category_counts[cat] for cat, total in category_totals.items()},
            'cost_range': max_cost - min_cost,
            'currency': self.default_currency,
            'item_count': len(cost_items)
        }
    
    async def _analyze_cost_distribution(self, cost_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze the distribution of costs."""
        if not cost_items:
            return {"error": "no_cost_items"}
        
        amounts = [item['amount'] for item in cost_items]
        total_cost = sum(amounts)
        
        # Category distribution
        category_distribution = defaultdict(float)
        for item in cost_items:
            category = item.get('category', 'other')
            category_distribution[category] += item['amount']
        
        # Convert to percentages
        category_percentages = {
            cat: (amount / total_cost * 100) if total_cost > 0 else 0
            for cat, amount in category_distribution.items()
        }
        
        # Source distribution
        source_distribution = defaultdict(float)
        for item in cost_items:
            source = item['source_chunk']
            source_distribution[source] += item['amount']
        
        # Cost tier analysis
        sorted_amounts = sorted(amounts, reverse=True)
        high_cost_threshold = sorted_amounts[len(sorted_amounts)//4] if sorted_amounts else 0  # Top 25%
        low_cost_threshold = sorted_amounts[3*len(sorted_amounts)//4] if sorted_amounts else 0  # Bottom 25%
        
        cost_tiers = {
            'high_cost': [item for item in cost_items if item['amount'] >= high_cost_threshold],
            'medium_cost': [item for item in cost_items if low_cost_threshold <= item['amount'] < high_cost_threshold],
            'low_cost': [item for item in cost_items if item['amount'] < low_cost_threshold]
        }
        
        return {
            'category_distribution': dict(category_distribution),
            'category_percentages': category_percentages,
            'source_distribution': dict(source_distribution),
            'cost_tiers': {tier: len(items) for tier, items in cost_tiers.items()},
            'high_cost_items': [item['name'] for item in cost_tiers['high_cost'][:5]],  # Top 5
            'largest_category': max(category_percentages.items(), key=lambda x: x[1]) if category_percentages else None
        }
    
    async def _calculate_cost_statistics(self, cost_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate statistical information about costs."""
        if not cost_items:
            return {"error": "no_cost_items"}
        
        # Confidence statistics
        confidences = [item['extraction_confidence'] for item in cost_items]
        avg_confidence = sum(confidences) / len(confidences)
        
        # Source statistics
        unique_sources = len(set(item['source_chunk'] for item in cost_items))
        
        # Type distribution
        type_counts = defaultdict(int)
        for item in cost_items:
            type_counts[item['type']] += 1
        
        # Currency conversion statistics
        converted_items = sum(1 for item in cost_items if 'original_currency' in item)
        
        return {
            "total_items": len(cost_items),
            "average_confidence": avg_confidence,
            "unique_sources": unique_sources,
            "type_distribution": dict(type_counts),
            "converted_items": converted_items,
            "conversion_rate": converted_items / len(cost_items) if cost_items else 0,
            "base_currency": self.default_currency
        }
    
    def _calculate_aggregation_confidence(
        self,
        data_list: List[ExtractedData],
        cost_items: List[Dict[str, Any]]
    ) -> float:
        """Calculate overall confidence in the cost aggregation."""
        if not data_list or not cost_items:
            return 0.0
        
        # Base confidence from extractions
        extraction_confidences = [data.extraction_confidence for data in data_list]
        base_confidence = sum(extraction_confidences) / len(extraction_confidences)
        
        # Confidence from cost item extraction quality
        item_confidences = [item['extraction_confidence'] for item in cost_items]
        item_confidence = sum(item_confidences) / len(item_confidences)
        
        # Confidence bonus for well-structured cost data
        structured_items = sum(1 for item in cost_items if item.get('currency') and item.get('amount'))
        structure_bonus = min(structured_items / len(cost_items) * 0.1, 0.1)
        
        # Average the different confidence sources
        total_confidence = (base_confidence + item_confidence) / 2 + structure_bonus
        return min(total_confidence, 1.0)
    
    def _apply_resolutions(
        self,
        data_list: List[ExtractedData],
        resolutions: List[ConflictResolution]
    ) -> List[ExtractedData]:
        """Apply conflict resolutions to the data."""
        if not resolutions:
            return data_list
        
        # For cost strategy, resolutions mainly affect cost value conflicts
        # This is a simplified implementation
        return data_list