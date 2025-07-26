"""
Material aggregation strategy for material-based data.

This module implements aggregation techniques for material properties,
specifications, and classifications with standardization and grouping.
"""

from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional

import structlog

from ...query.types import QueryContext, QueryIntent
from ...types.aggregation_types import (
    AggregationStrategy,
    AggregationStrategyBase,
    ConflictResolution,
    ExtractedData,
)

logger = structlog.get_logger(__name__)


class MaterialAggregationStrategy(AggregationStrategyBase):
    """Aggregation strategy for materials and their properties."""

    def __init__(self):
        self.supported_intents = [QueryIntent.MATERIAL]
        # Standard material classifications
        self.material_categories = {
            'concrete': ['concrete', 'beton', 'cement'],
            'steel': ['steel', 'stahl', 'metal', 'iron'],
            'wood': ['wood', 'timber', 'holz', 'lumber'],
            'masonry': ['brick', 'stone', 'masonry', 'ziegel'],
            'glass': ['glass', 'glas', 'glazing'],
            'insulation': ['insulation', 'dämmung', 'foam'],
            'composite': ['composite', 'verbund', 'hybrid']
        }

    async def aggregate(
        self,
        extracted_data: List[ExtractedData],
        context: QueryContext,
        resolutions: Optional[List[ConflictResolution]] = None
    ) -> Dict[str, Any]:
        """Aggregate material data with standardization and grouping."""
        logger.debug(
            "Starting material aggregation",
            data_count=len(extracted_data),
            intent=context.intent.value
        )

        if not extracted_data:
            return {"aggregation_method": "none", "reason": "no_data"}

        # Apply conflict resolutions if provided
        resolved_data = self._apply_resolutions(extracted_data, resolutions or [])

        # Extract material information
        materials = await self._extract_materials(resolved_data)

        # Standardize material names and properties
        standardized_materials = await self._standardize_materials(materials)

        # Group materials by category
        material_groups = await self._group_materials(standardized_materials)

        # Calculate material statistics
        material_statistics = await self._calculate_material_statistics(standardized_materials)

        # Generate material composition analysis
        composition_analysis = await self._analyze_composition(standardized_materials)

        # Calculate aggregation confidence
        aggregation_confidence = self._calculate_aggregation_confidence(resolved_data, standardized_materials)

        result = {
            "aggregation_method": "material_based",
            "strategy": AggregationStrategy.CATEGORICAL.value,
            "materials": standardized_materials,
            "material_groups": material_groups,
            "material_statistics": material_statistics,
            "composition_analysis": composition_analysis,
            "aggregation_confidence": aggregation_confidence,
            "data_sources": len(resolved_data),
            "total_materials_found": len(materials),
            "standardized_materials_count": len(standardized_materials)
        }

        logger.info(
            "Material aggregation completed",
            materials_count=len(standardized_materials),
            groups=len(material_groups),
            confidence=aggregation_confidence
        )

        return result

    def get_supported_intents(self) -> List[QueryIntent]:
        """Get list of query intents this strategy supports."""
        return self.supported_intents

    async def _extract_materials(self, data_list: List[ExtractedData]) -> List[Dict[str, Any]]:
        """Extract material information from all data sources."""
        materials = []

        for data in data_list:
            # Extract from entities
            for entity in data.entities:
                if self._is_material_entity(entity):
                    material = self._create_material_from_entity(entity, data.chunk_id, data.extraction_confidence)
                    materials.append(material)

            # Extract from properties
            material_props = {k: v for k, v in data.properties.items() if self._is_material_property(k)}
            if material_props:
                material = self._create_material_from_properties(material_props, data.chunk_id, data.extraction_confidence)
                materials.append(material)

        return materials

    def _is_material_entity(self, entity: Dict[str, Any]) -> bool:
        """Check if an entity represents a material."""
        entity_type = entity.get('type', '').lower()
        material_types = ['material', 'materialstep', 'ifcmaterial', 'substance']

        return any(mat_type in entity_type for mat_type in material_types)

    def _is_material_property(self, prop_key: str) -> bool:
        """Check if a property key relates to materials."""
        material_props = ['material', 'substance', 'composition', 'finish', 'coating']
        return any(prop in prop_key.lower() for prop in material_props)

    def _create_material_from_entity(self, entity: Dict[str, Any], chunk_id: str, confidence: float) -> Dict[str, Any]:
        """Create a material record from an entity."""
        return {
            'name': entity.get('name', entity.get('id', 'unknown')),
            'type': entity.get('type', ''),
            'properties': {k: v for k, v in entity.items() if k not in ['name', 'type', 'id']},
            'source_chunk': chunk_id,
            'extraction_confidence': confidence,
            'source_type': 'entity',
            'original_data': entity
        }

    def _create_material_from_properties(self, properties: Dict[str, Any], chunk_id: str, confidence: float) -> Dict[str, Any]:
        """Create a material record from properties."""
        # Try to determine material name from properties
        name = 'unknown'
        for key, value in properties.items():
            if 'material' in key.lower() and isinstance(value, str):
                name = value
                break

        return {
            'name': name,
            'type': 'property_derived',
            'properties': properties,
            'source_chunk': chunk_id,
            'extraction_confidence': confidence,
            'source_type': 'property',
            'original_data': properties
        }

    async def _standardize_materials(self, materials: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Standardize material names and merge similar materials."""
        if not materials:
            return []

        # Group similar materials
        material_groups = defaultdict(list)

        for material in materials:
            standardized_name = self._standardize_material_name(material['name'])
            material_groups[standardized_name].append(material)

        # Merge materials in each group
        standardized = []
        for std_name, group in material_groups.items():
            merged_material = await self._merge_materials(std_name, group)
            standardized.append(merged_material)

        return standardized

    def _standardize_material_name(self, name: str) -> str:
        """Standardize a material name."""
        if not name or name == 'unknown':
            return 'unknown'

        name_lower = name.lower().strip()

        # Check against known categories
        for category, keywords in self.material_categories.items():
            if any(keyword in name_lower for keyword in keywords):
                return category

        # Remove common prefixes/suffixes and normalize
        normalized = name_lower
        prefixes = ['ifc', 'mat_', 'material_']
        suffixes = ['_material', '_mat']

        for prefix in prefixes:
            if normalized.startswith(prefix):
                normalized = normalized[len(prefix):]

        for suffix in suffixes:
            if normalized.endswith(suffix):
                normalized = normalized[:-len(suffix)]

        return normalized.strip() or 'unknown'

    async def _merge_materials(self, std_name: str, materials: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Merge similar materials into a single record."""
        if len(materials) == 1:
            material = materials[0].copy()
            material['standardized_name'] = std_name
            return material

        # Sort by confidence and merge
        sorted_materials = sorted(materials, key=lambda m: m['extraction_confidence'], reverse=True)
        base_material = sorted_materials[0].copy()

        # Merge properties
        merged_properties = base_material['properties'].copy()
        source_chunks = [base_material['source_chunk']]
        confidences = [base_material['extraction_confidence']]
        original_names = [base_material['name']]

        for material in sorted_materials[1:]:
            source_chunks.append(material['source_chunk'])
            confidences.append(material['extraction_confidence'])
            original_names.append(material['name'])

            # Merge properties, preferring more detailed values
            for key, value in material['properties'].items():
                if key not in merged_properties or not merged_properties[key]:
                    merged_properties[key] = value
                elif isinstance(value, str) and len(value) > len(str(merged_properties[key])):
                    merged_properties[key] = value

        # Create merged material
        return {
            'name': base_material['name'],
            'standardized_name': std_name,
            'type': base_material['type'],
            'properties': merged_properties,
            'source_chunks': list(set(source_chunks)),
            'extraction_confidence': max(confidences),
            'average_confidence': sum(confidences) / len(confidences),
            'source_type': 'merged',
            'merged_from': len(materials),
            'original_names': list(set(original_names)),
            'original_data': [mat['original_data'] for mat in materials]
        }

    async def _group_materials(self, materials: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group materials by category and properties."""
        groups = defaultdict(list)

        # Primary grouping by standardized name
        for material in materials:
            std_name = material.get('standardized_name', material['name'])
            groups[std_name].append(material)

        # Secondary grouping for materials with similar properties
        enhanced_groups = {}
        for group_name, group_materials in groups.items():
            if len(group_materials) <= 3:
                enhanced_groups[group_name] = group_materials
            else:
                # Sub-group by specific properties
                subgroups = await self._subgroup_materials(group_materials)
                for subgroup_name, subgroup_materials in subgroups.items():
                    enhanced_groups[f"{group_name}_{subgroup_name}"] = subgroup_materials

        return enhanced_groups

    async def _subgroup_materials(self, materials: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Create subgroups based on material properties."""
        subgroups = defaultdict(list)

        for material in materials:
            subgroup_key = self._determine_subgroup(material)
            subgroups[subgroup_key].append(material)

        return subgroups

    def _determine_subgroup(self, material: Dict[str, Any]) -> str:
        """Determine subgroup for a material based on its properties."""
        properties = material.get('properties', {})

        # Check for strength class
        for key, value in properties.items():
            if 'strength' in key.lower() or 'class' in key.lower():
                if isinstance(value, str) and value:
                    return f"class_{value[:10]}"

        # Check for thickness or dimension
        for key, value in properties.items():
            if 'thickness' in key.lower() or 'dimension' in key.lower():
                if isinstance(value, (int, float)):
                    return f"thickness_{int(value)}"
                elif isinstance(value, str) and any(c.isdigit() for c in value):
                    return "thickness_var"

        # Check for color or finish
        for key, value in properties.items():
            if 'color' in key.lower() or 'finish' in key.lower():
                if isinstance(value, str) and value:
                    return f"finish_{value[:10]}"

        return "general"

    async def _calculate_material_statistics(self, materials: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate statistical information about materials."""
        if not materials:
            return {"error": "no_materials"}

        # Count by standardized name
        name_counts = Counter(mat.get('standardized_name', mat['name']) for mat in materials)

        # Count by category
        category_counts = Counter()
        for material in materials:
            std_name = material.get('standardized_name', material['name'])
            for category, keywords in self.material_categories.items():
                if any(keyword in std_name.lower() for keyword in keywords):
                    category_counts[category] += 1
                    break
            else:
                category_counts['other'] += 1

        # Confidence statistics
        confidences = [mat['extraction_confidence'] for mat in materials]
        avg_confidence = sum(confidences) / len(confidences)

        # Source distribution
        all_sources = []
        for material in materials:
            sources = material.get('source_chunks', [material.get('source_chunk')])
            if isinstance(sources, list):
                all_sources.extend(sources)
            else:
                all_sources.append(sources)
        source_counts = Counter(all_sources)

        # Property analysis
        all_properties = set()
        for material in materials:
            all_properties.update(material.get('properties', {}).keys())

        property_coverage = {}
        for prop in all_properties:
            covered_count = sum(1 for mat in materials if prop in mat.get('properties', {}))
            property_coverage[prop] = covered_count / len(materials)

        return {
            "total_materials": len(materials),
            "unique_names": len(name_counts),
            "name_distribution": dict(name_counts),
            "category_distribution": dict(category_counts),
            "average_confidence": avg_confidence,
            "source_distribution": dict(source_counts),
            "property_coverage": property_coverage,
            "most_common_material": name_counts.most_common(1)[0] if name_counts else None,
            "most_common_category": category_counts.most_common(1)[0] if category_counts else None
        }

    async def _analyze_composition(self, materials: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze material composition and relationships."""
        if not materials:
            return {"error": "no_materials"}

        # Analyze material hierarchy (composites, layers, etc.)
        composition_data = {
            "primary_materials": [],
            "composite_materials": [],
            "material_layers": [],
            "relationships": []
        }

        for material in materials:
            properties = material.get('properties', {})

            # Check if it's a composite
            if any(key.lower() in ['composite', 'layer', 'component'] for key in properties.keys()):
                composition_data["composite_materials"].append(material)
            else:
                composition_data["primary_materials"].append(material)

            # Look for layer information
            layer_props = {k: v for k, v in properties.items() if 'layer' in k.lower()}
            if layer_props:
                composition_data["material_layers"].append({
                    "material": material['name'],
                    "layer_info": layer_props
                })

        # Calculate composition statistics
        total = len(materials)
        composition_stats = {
            "primary_percentage": len(composition_data["primary_materials"]) / total * 100,
            "composite_percentage": len(composition_data["composite_materials"]) / total * 100,
            "layered_materials": len(composition_data["material_layers"])
        }

        return {
            "composition_data": composition_data,
            "composition_statistics": composition_stats
        }

    def _calculate_aggregation_confidence(
        self,
        data_list: List[ExtractedData],
        materials: List[Dict[str, Any]]
    ) -> float:
        """Calculate overall confidence in the material aggregation."""
        if not data_list or not materials:
            return 0.0

        # Base confidence from extractions
        extraction_confidences = [data.extraction_confidence for data in data_list]
        base_confidence = sum(extraction_confidences) / len(extraction_confidences)

        # Confidence from material standardization
        standardized_count = sum(1 for mat in materials if mat.get('standardized_name'))
        standardization_bonus = min(standardized_count / len(materials) * 0.1, 0.1)

        # Confidence from source diversity
        unique_sources = len(set(data.chunk_id for data in data_list))
        source_diversity_bonus = min(unique_sources * 0.03, 0.1)

        total_confidence = base_confidence + standardization_bonus + source_diversity_bonus
        return min(total_confidence, 1.0)

    def _apply_resolutions(
        self,
        data_list: List[ExtractedData],
        resolutions: List[ConflictResolution]
    ) -> List[ExtractedData]:
        """Apply conflict resolutions to the data."""
        if not resolutions:
            return data_list

        # For material strategy, resolutions mainly affect material identification
        # This is a simplified implementation
        return data_list
