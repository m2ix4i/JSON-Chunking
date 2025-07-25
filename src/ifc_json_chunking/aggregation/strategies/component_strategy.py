"""
Component aggregation strategy for entity-based data.

This module implements aggregation techniques for building components,
entities, and structural elements with deduplication and categorization.
"""

from typing import Any, Dict, List, Optional, Set
from collections import defaultdict, Counter
import structlog

from ...types.aggregation_types import (
    ExtractedData, AggregationStrategyBase, AggregationStrategy,
    ConflictResolution
)
from ...query.types import QueryContext, QueryIntent

logger = structlog.get_logger(__name__)


class ComponentAggregationStrategy(AggregationStrategyBase):
    """Aggregation strategy for building components and entities."""
    
    def __init__(self, similarity_threshold: float = 0.8):
        self.similarity_threshold = similarity_threshold
        self.supported_intents = [QueryIntent.COMPONENT]
        
    async def aggregate(
        self,
        extracted_data: List[ExtractedData],
        context: QueryContext,
        resolutions: Optional[List[ConflictResolution]] = None
    ) -> Dict[str, Any]:
        """Aggregate component data with deduplication and categorization."""
        logger.debug(
            "Starting component aggregation",
            data_count=len(extracted_data),
            intent=context.intent.value
        )
        
        if not extracted_data:
            return {"aggregation_method": "none", "reason": "no_data"}
        
        # Apply conflict resolutions if provided
        resolved_data = self._apply_resolutions(extracted_data, resolutions or [])
        
        # Collect all entities
        all_entities = []
        for data in resolved_data:
            for entity in data.entities:
                entity_with_source = entity.copy()
                entity_with_source['_source_chunk'] = data.chunk_id
                entity_with_source['_extraction_confidence'] = data.extraction_confidence
                all_entities.append(entity_with_source)
        
        # Deduplicate entities
        unique_entities = await self._deduplicate_entities(all_entities)
        
        # Categorize entities
        categorized_entities = await self._categorize_entities(unique_entities)
        
        # Generate entity statistics
        entity_statistics = await self._calculate_entity_statistics(unique_entities)
        
        # Calculate aggregation confidence
        aggregation_confidence = self._calculate_aggregation_confidence(resolved_data, unique_entities)
        
        result = {
            "aggregation_method": "entity_based",
            "strategy": AggregationStrategy.CATEGORICAL.value,
            "unique_entities": unique_entities,
            "categorized_entities": categorized_entities,
            "entity_statistics": entity_statistics,
            "aggregation_confidence": aggregation_confidence,
            "data_sources": len(resolved_data),
            "total_entities_found": len(all_entities),
            "unique_entities_count": len(unique_entities)
        }
        
        logger.info(
            "Component aggregation completed",
            unique_entities=len(unique_entities),
            categories=len(categorized_entities),
            confidence=aggregation_confidence
        )
        
        return result
    
    def get_supported_intents(self) -> List[QueryIntent]:
        """Get list of query intents this strategy supports."""
        return self.supported_intents
    
    async def _deduplicate_entities(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate entities based on similarity."""
        if not entities:
            return []
        
        unique_entities = []
        processed_indices = set()
        
        for i, entity in enumerate(entities):
            if i in processed_indices:
                continue
                
            # Find similar entities
            similar_entities = [entity]
            for j, other_entity in enumerate(entities[i+1:], i+1):
                if j in processed_indices:
                    continue
                    
                if self._entities_similar(entity, other_entity):
                    similar_entities.append(other_entity)
                    processed_indices.add(j)
            
            # Merge similar entities
            merged_entity = await self._merge_entities(similar_entities)
            unique_entities.append(merged_entity)
            processed_indices.add(i)
        
        return unique_entities
    
    def _entities_similar(self, entity1: Dict[str, Any], entity2: Dict[str, Any]) -> bool:
        """Check if two entities are similar enough to be considered duplicates."""
        # Check by ID first
        if entity1.get('id') and entity2.get('id'):
            return entity1['id'] == entity2['id']
        
        # Check by name
        name1 = entity1.get('name', '').lower().strip()
        name2 = entity2.get('name', '').lower().strip()
        if name1 and name2:
            # Simple string similarity
            return self._string_similarity(name1, name2) >= self.similarity_threshold
        
        # Check by type and properties
        type1 = entity1.get('type', '').lower()
        type2 = entity2.get('type', '').lower()
        
        if type1 != type2:
            return False
        
        # Compare key properties
        key_props = ['guid', 'globalid', 'tag', 'mark']
        for prop in key_props:
            val1 = entity1.get(prop)
            val2 = entity2.get(prop)
            if val1 and val2 and val1 == val2:
                return True
        
        return False
    
    def _string_similarity(self, str1: str, str2: str) -> float:
        """Calculate simple string similarity."""
        if not str1 or not str2:
            return 0.0
        
        if str1 == str2:
            return 1.0
        
        # Simple Jaccard similarity on words
        words1 = set(str1.split())
        words2 = set(str2.split())
        
        if not words1 and not words2:
            return 1.0
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        return intersection / union if union > 0 else 0.0
    
    async def _merge_entities(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Merge similar entities into a single representative entity."""
        if len(entities) == 1:
            return entities[0]
        
        # Start with the highest confidence entity
        entities_sorted = sorted(entities, key=lambda e: e.get('_extraction_confidence', 0), reverse=True)
        base_entity = entities_sorted[0].copy()
        
        # Merge properties from other entities
        merged_properties = base_entity.copy()
        source_chunks = [base_entity.get('_source_chunk')]
        confidences = [base_entity.get('_extraction_confidence', 0)]
        
        for entity in entities_sorted[1:]:
            source_chunks.append(entity.get('_source_chunk'))
            confidences.append(entity.get('_extraction_confidence', 0))
            
            # Merge properties, preferring non-empty values
            for key, value in entity.items():
                if key.startswith('_'):
                    continue
                    
                if key not in merged_properties or not merged_properties[key]:
                    merged_properties[key] = value
                elif isinstance(value, str) and len(value) > len(str(merged_properties[key])):
                    # Prefer longer, more descriptive strings
                    merged_properties[key] = value
        
        # Add merge metadata
        merged_properties['_source_chunks'] = list(set(source_chunks))
        merged_properties['_merged_from'] = len(entities)
        merged_properties['_average_confidence'] = sum(confidences) / len(confidences)
        merged_properties['_extraction_confidence'] = max(confidences)
        
        return merged_properties
    
    async def _categorize_entities(self, entities: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Categorize entities by type and properties."""
        categories = defaultdict(list)
        
        for entity in entities:
            # Primary categorization by type
            entity_type = entity.get('type', 'unknown').lower()
            categories[entity_type].append(entity)
        
        # Secondary categorization for large categories
        refined_categories = {}
        for category, entity_list in categories.items():
            if len(entity_list) <= 5:
                refined_categories[category] = entity_list
            else:
                # Sub-categorize large categories
                subcategories = await self._subcategorize_entities(entity_list)
                for subcat, sub_entities in subcategories.items():
                    refined_categories[f"{category}_{subcat}"] = sub_entities
        
        return refined_categories
    
    async def _subcategorize_entities(self, entities: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Sub-categorize a list of entities of the same type."""
        subcategories = defaultdict(list)
        
        # Try to subcategorize by material, function, or location
        for entity in entities:
            subcat_key = "general"
            
            # Check for material-based subcategory
            material = entity.get('material', '').lower()
            if material:
                subcat_key = f"material_{material[:10]}"  # Truncate long materials
            
            # Check for function-based subcategory
            elif entity.get('function') or entity.get('category'):
                func = (entity.get('function') or entity.get('category', '')).lower()
                if func:
                    subcat_key = f"function_{func[:10]}"
            
            # Check for location-based subcategory
            elif entity.get('location') or entity.get('space'):
                loc = (entity.get('location') or entity.get('space', '')).lower()
                if loc:
                    subcat_key = f"location_{loc[:10]}"
            
            subcategories[subcat_key].append(entity)
        
        return subcategories
    
    async def _calculate_entity_statistics(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate statistical information about entities."""
        if not entities:
            return {"error": "no_entities"}
        
        # Count by type
        type_counts = Counter(entity.get('type', 'unknown').lower() for entity in entities)
        
        # Confidence statistics
        confidences = [entity.get('_extraction_confidence', 0) for entity in entities]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        # Source distribution
        all_sources = []
        for entity in entities:
            sources = entity.get('_source_chunks', [entity.get('_source_chunk')])
            if isinstance(sources, list):
                all_sources.extend(sources)
            else:
                all_sources.append(sources)
        
        source_counts = Counter(all_sources)
        
        # Property completeness
        all_properties = set()
        for entity in entities:
            all_properties.update(k for k in entity.keys() if not k.startswith('_'))
        
        property_completeness = {}
        for prop in all_properties:
            filled_count = sum(1 for entity in entities if entity.get(prop))
            property_completeness[prop] = filled_count / len(entities)
        
        return {
            "total_entities": len(entities),
            "unique_types": len(type_counts),
            "type_distribution": dict(type_counts),
            "average_confidence": avg_confidence,
            "source_distribution": dict(source_counts),
            "property_completeness": property_completeness,
            "most_common_type": type_counts.most_common(1)[0] if type_counts else None
        }
    
    def _calculate_aggregation_confidence(
        self,
        data_list: List[ExtractedData],
        unique_entities: List[Dict[str, Any]]
    ) -> float:
        """Calculate overall confidence in the component aggregation."""
        if not data_list or not unique_entities:
            return 0.0
        
        # Base confidence from extractions
        extraction_confidences = [data.extraction_confidence for data in data_list]
        base_confidence = sum(extraction_confidences) / len(extraction_confidences)
        
        # Confidence from entity merging
        merged_count = sum(1 for entity in unique_entities if entity.get('_merged_from', 1) > 1)
        merge_confidence_bonus = min(merged_count * 0.05, 0.15)
        
        # Confidence from source diversity
        unique_sources = len(set(data.chunk_id for data in data_list))
        source_diversity_bonus = min(unique_sources * 0.03, 0.1)
        
        total_confidence = base_confidence + merge_confidence_bonus + source_diversity_bonus
        return min(total_confidence, 1.0)
    
    def _apply_resolutions(
        self,
        data_list: List[ExtractedData],
        resolutions: List[ConflictResolution]
    ) -> List[ExtractedData]:
        """Apply conflict resolutions to the data."""
        if not resolutions:
            return data_list
        
        # For component strategy, resolutions mainly affect entity identification
        # This is a simplified implementation
        return data_list