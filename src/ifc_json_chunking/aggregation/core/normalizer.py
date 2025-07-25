"""
Data normalization component for standardizing extracted information.

This module normalizes and standardizes extracted data to ensure
consistent formats, units, and representations across all chunks
for reliable aggregation and comparison.
"""

import re
from typing import Any, Dict, List, Optional, Tuple, Union
from decimal import Decimal, InvalidOperation
import structlog

from ...types.aggregation_types import ExtractedData

logger = structlog.get_logger(__name__)


class DataNormalizer:
    """
    Normalizes and standardizes extracted data.
    
    Handles unit conversion, entity name standardization,
    property value normalization, and data format consistency.
    """
    
    def __init__(self):
        """Initialize data normalizer with conversion tables."""
        self._initialize_conversion_tables()
        self._initialize_standardization_maps()
        
        logger.info("DataNormalizer initialized")
    
    def _initialize_conversion_tables(self) -> None:
        """Initialize unit conversion tables."""
        
        # Length conversions to meters
        self.length_conversions = {
            'm': 1.0,
            'meter': 1.0,
            'meters': 1.0,
            'mm': 0.001,
            'millimeter': 0.001,
            'millimeters': 0.001,
            'cm': 0.01,
            'centimeter': 0.01,
            'centimeters': 0.01,
            'km': 1000.0,
            'kilometer': 1000.0,
            'kilometers': 1000.0,
            'ft': 0.3048,
            'foot': 0.3048,
            'feet': 0.3048,
            'in': 0.0254,
            'inch': 0.0254,
            'inches': 0.0254
        }
        
        # Area conversions to square meters
        self.area_conversions = {
            'm²': 1.0,
            'm2': 1.0,
            'sqm': 1.0,
            'square_meter': 1.0,
            'square_meters': 1.0,
            'quadratmeter': 1.0,
            'cm²': 0.0001,
            'cm2': 0.0001,
            'mm²': 0.000001,
            'mm2': 0.000001,
            'ft²': 0.092903,
            'ft2': 0.092903,
            'square_foot': 0.092903,
            'square_feet': 0.092903
        }
        
        # Volume conversions to cubic meters
        self.volume_conversions = {
            'm³': 1.0,
            'm3': 1.0,
            'cubic_meter': 1.0,
            'cubic_meters': 1.0,
            'kubikmeter': 1.0,
            'cm³': 0.000001,
            'cm3': 0.000001,
            'l': 0.001,
            'liter': 0.001,
            'liters': 0.001,
            'ft³': 0.0283168,
            'ft3': 0.0283168,
            'cubic_foot': 0.0283168,
            'cubic_feet': 0.0283168
        }
        
        # Weight conversions to kilograms
        self.weight_conversions = {
            'kg': 1.0,
            'kilogram': 1.0,
            'kilograms': 1.0,
            'g': 0.001,
            'gram': 0.001,
            'grams': 0.001,
            't': 1000.0,
            'ton': 1000.0,
            'tons': 1000.0,
            'tonne': 1000.0,
            'tonnes': 1000.0,
            'lb': 0.453592,
            'pound': 0.453592,
            'pounds': 0.453592
        }
        
        # Currency conversions (base: EUR)
        self.currency_conversions = {
            '€': 1.0,
            'eur': 1.0,
            'euro': 1.0,
            'euros': 1.0,
            '$': 0.85,  # Approximate, should be updated with real rates
            'usd': 0.85,
            'dollar': 0.85,
            'dollars': 0.85,
            '£': 1.15,
            'gbp': 1.15,
            'pound': 1.15,
            'pounds': 1.15
        }
    
    def _initialize_standardization_maps(self) -> None:
        """Initialize entity and property standardization maps."""
        
        # IFC entity type mappings
        self.entity_type_map = {
            # Building elements
            'building': 'IfcBuilding',
            'gebäude': 'IfcBuilding',
            'ifcbuilding': 'IfcBuilding',
            
            'wall': 'IfcWall',
            'wand': 'IfcWall',
            'mauer': 'IfcWall',
            'ifcwall': 'IfcWall',
            
            'door': 'IfcDoor',
            'tür': 'IfcDoor',
            'ifcdoor': 'IfcDoor',
            
            'window': 'IfcWindow',
            'fenster': 'IfcWindow',
            'ifcwindow': 'IfcWindow',
            
            'floor': 'IfcSlab',
            'slab': 'IfcSlab',
            'decke': 'IfcSlab',
            'boden': 'IfcSlab',
            'ifcslab': 'IfcSlab',
            
            'room': 'IfcSpace',
            'space': 'IfcSpace',
            'raum': 'IfcSpace',
            'ifcspace': 'IfcSpace',
            
            'column': 'IfcColumn',
            'stütze': 'IfcColumn',
            'säule': 'IfcColumn',
            'ifccolumn': 'IfcColumn',
            
            'beam': 'IfcBeam',
            'träger': 'IfcBeam',
            'balken': 'IfcBeam',
            'ifcbeam': 'IfcBeam'
        }
        
        # Material standardization
        self.material_map = {
            'concrete': 'Concrete',
            'beton': 'Concrete',
            'steel': 'Steel',
            'stahl': 'Steel',
            'wood': 'Wood',
            'holz': 'Wood',
            'glass': 'Glass',
            'glas': 'Glass',
            'brick': 'Brick',
            'ziegel': 'Brick',
            'stone': 'Stone',
            'stein': 'Stone',
            'metal': 'Metal',
            'metall': 'Metal'
        }
        
        # Property name standardization
        self.property_name_map = {
            'name': 'Name',
            'bezeichnung': 'Name',
            'type': 'Type',
            'typ': 'Type',
            'art': 'Type',
            'material': 'Material',
            'werkstoff': 'Material',
            'baustoff': 'Material',
            'location': 'Location',
            'lage': 'Location',
            'ort': 'Location',
            'position': 'Location',
            'status': 'Status',
            'zustand': 'Status',
            'width': 'Width',
            'breite': 'Width',
            'height': 'Height',
            'höhe': 'Height',
            'length': 'Length',
            'länge': 'Length',
            'thickness': 'Thickness',
            'dicke': 'Thickness'
        }
    
    async def normalize_data(self, extracted_data: ExtractedData) -> ExtractedData:
        """
        Normalize extracted data for consistent representation.
        
        Args:
            extracted_data: Raw extracted data to normalize
            
        Returns:
            Normalized ExtractedData object
        """
        logger.debug(
            "Starting data normalization",
            chunk_id=extracted_data.chunk_id,
            entities_count=len(extracted_data.entities),
            quantities_count=len(extracted_data.quantities)
        )
        
        try:
            # Create a copy to avoid modifying the original
            normalized_data = ExtractedData(
                chunk_id=extracted_data.chunk_id,
                extraction_confidence=extracted_data.extraction_confidence,
                data_quality=extracted_data.data_quality,
                processing_errors=extracted_data.processing_errors.copy(),
                spatial_context=extracted_data.spatial_context.copy(),
                temporal_context=extracted_data.temporal_context.copy(),
                semantic_context=extracted_data.semantic_context.copy()
            )
            
            # Normalize different data types
            normalized_data.entities = await self._normalize_entities(extracted_data.entities)
            normalized_data.quantities = await self._normalize_quantities(extracted_data.quantities)
            normalized_data.properties = await self._normalize_properties(extracted_data.properties)
            normalized_data.relationships = await self._normalize_relationships(extracted_data.relationships)
            
            # Normalize context information
            await self._normalize_contexts(normalized_data)
            
            logger.debug(
                "Data normalization completed",
                chunk_id=normalized_data.chunk_id,
                normalized_entities=len(normalized_data.entities),
                normalized_quantities=len(normalized_data.quantities)
            )
            
            return normalized_data
            
        except Exception as e:
            logger.error(
                "Data normalization failed",
                chunk_id=extracted_data.chunk_id,
                error=str(e)
            )
            
            # Return original data with error annotation
            extracted_data.processing_errors.append(f"Normalization failed: {str(e)}")
            return extracted_data
    
    async def _normalize_entities(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalize entity data."""
        normalized_entities = []
        
        for entity in entities:
            normalized_entity = entity.copy()
            
            # Normalize entity type
            if 'type' in entity:
                entity_type = str(entity['type']).lower().strip()
                if entity_type in self.entity_type_map:
                    normalized_entity['type'] = self.entity_type_map[entity_type]
                else:
                    # Capitalize the first letter if not in map
                    normalized_entity['type'] = entity_type.capitalize()
            
            # Normalize entity ID format
            if 'entity_id' in entity and entity['entity_id']:
                entity_id = str(entity['entity_id']).strip()
                # Ensure ID starts with #
                if not entity_id.startswith('#'):
                    normalized_entity['entity_id'] = f"#{entity_id}"
                else:
                    normalized_entity['entity_id'] = entity_id
            
            # Normalize any embedded properties
            if 'properties' in entity and isinstance(entity['properties'], dict):
                normalized_entity['properties'] = await self._normalize_properties(entity['properties'])
            
            normalized_entities.append(normalized_entity)
        
        return normalized_entities
    
    async def _normalize_quantities(self, quantities: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize quantity data with unit conversion."""
        normalized_quantities = {}
        
        for key, value in quantities.items():
            if key == 'raw_numbers':
                # Keep raw numbers as-is but ensure they're numeric
                normalized_quantities[key] = [self._to_numeric(num) for num in value if self._to_numeric(num) is not None]
                continue
            
            # Handle different quantity types
            if key in ['volume', 'area', 'length', 'weight', 'cost']:
                normalized_value = await self._normalize_measurement(key, value)
                if normalized_value is not None:
                    normalized_quantities[key] = normalized_value
            else:
                # Try to normalize as a general quantity
                numeric_value = self._to_numeric(value)
                if numeric_value is not None:
                    normalized_quantities[key] = numeric_value
                else:
                    normalized_quantities[key] = value
        
        return normalized_quantities
    
    async def _normalize_measurement(self, measurement_type: str, value: Any) -> Optional[Dict[str, Any]]:
        """Normalize a measurement value with unit conversion."""
        if value is None:
            return None
        
        # Extract numeric value and unit if value is a string
        if isinstance(value, str):
            # Pattern to extract number and unit
            pattern = re.compile(r'(\d+(?:\.\d+)?)\s*([a-zA-Z³²°€$£\s]*)')
            match = pattern.match(value.strip())
            if match:
                numeric_part = float(match.group(1))
                unit_part = match.group(2).strip().lower()
            else:
                # Try to convert the whole string to a number
                numeric_part = self._to_numeric(value)
                unit_part = None
                if numeric_part is None:
                    return None
        else:
            numeric_part = self._to_numeric(value)
            unit_part = None
            if numeric_part is None:
                return None
        
        # Select appropriate conversion table
        conversion_table = None
        standard_unit = None
        
        if measurement_type == 'length':
            conversion_table = self.length_conversions
            standard_unit = 'm'
        elif measurement_type == 'area':
            conversion_table = self.area_conversions
            standard_unit = 'm²'
        elif measurement_type == 'volume':
            conversion_table = self.volume_conversions
            standard_unit = 'm³'
        elif measurement_type == 'weight':
            conversion_table = self.weight_conversions
            standard_unit = 'kg'
        elif measurement_type == 'cost':
            conversion_table = self.currency_conversions
            standard_unit = '€'
        
        # Perform conversion if unit is specified and in conversion table
        if unit_part and conversion_table and unit_part in conversion_table:
            converted_value = numeric_part * conversion_table[unit_part]
        else:
            converted_value = numeric_part
            if not unit_part and standard_unit:
                unit_part = standard_unit  # Assume standard unit if none specified
        
        return {
            'value': converted_value,
            'unit': standard_unit,
            'original_value': numeric_part,
            'original_unit': unit_part,
            'measurement_type': measurement_type
        }
    
    async def _normalize_properties(self, properties: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize property data."""
        normalized_properties = {}
        
        for key, value in properties.items():
            # Normalize property name
            normalized_key = key.lower().strip()
            if normalized_key in self.property_name_map:
                normalized_key = self.property_name_map[normalized_key]
            else:
                # Capitalize first letter
                normalized_key = normalized_key.replace('_', ' ').title().replace(' ', '')
            
            # Normalize property value
            if isinstance(value, str):
                normalized_value = value.strip()
                
                # Special handling for material properties
                if normalized_key.lower() == 'material':
                    material_lower = normalized_value.lower()
                    if material_lower in self.material_map:
                        normalized_value = self.material_map[material_lower]
                
                # Special handling for boolean-like values
                if normalized_value.lower() in ['true', 'yes', 'ja', 'wahr']:
                    normalized_value = True
                elif normalized_value.lower() in ['false', 'no', 'nein', 'falsch']:
                    normalized_value = False
                
            else:
                normalized_value = value
            
            normalized_properties[normalized_key] = normalized_value
        
        return normalized_properties
    
    async def _normalize_relationships(self, relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalize relationship data."""
        normalized_relationships = []
        
        for relationship in relationships:
            normalized_rel = relationship.copy()
            
            # Normalize relationship type
            if 'type' in relationship:
                rel_type = str(relationship['type']).lower().strip()
                # Standardize common relationship types
                type_map = {
                    'contains': 'Contains',
                    'enthält': 'Contains',
                    'connected_to': 'ConnectedTo',
                    'verbunden_mit': 'ConnectedTo',
                    'part_of': 'PartOf',
                    'teil_von': 'PartOf',
                    'adjacent_to': 'AdjacentTo',
                    'angrenzend_an': 'AdjacentTo'
                }
                
                normalized_rel['type'] = type_map.get(rel_type, rel_type.title())
            
            # Normalize entity references
            for field in ['source', 'target']:
                if field in relationship and relationship[field]:
                    entity_ref = str(relationship[field]).strip()
                    # Ensure entity references are properly formatted
                    if entity_ref.isdigit():
                        normalized_rel[field] = f"#{entity_ref}"
                    else:
                        normalized_rel[field] = entity_ref
            
            # Ensure confidence is a float
            if 'confidence' in relationship:
                normalized_rel['confidence'] = self._to_numeric(relationship['confidence']) or 0.7
            
            normalized_relationships.append(normalized_rel)
        
        return normalized_relationships
    
    async def _normalize_contexts(self, normalized_data: ExtractedData) -> None:
        """Normalize context information."""
        
        # Normalize spatial context
        if normalized_data.spatial_context:
            spatial = normalized_data.spatial_context
            
            # Normalize floor/level references
            if 'floor' in spatial:
                spatial['floor'] = self._to_numeric(spatial['floor']) or spatial['floor']
            
            # Normalize coordinates
            if 'coordinates' in spatial and isinstance(spatial['coordinates'], list):
                spatial['coordinates'] = [
                    self._to_numeric(coord) for coord in spatial['coordinates']
                    if self._to_numeric(coord) is not None
                ]
        
        # Normalize semantic context
        if normalized_data.semantic_context:
            semantic = normalized_data.semantic_context
            
            # Ensure language is standardized
            if 'language' in semantic:
                lang = semantic['language'].lower().strip()
                # Map common language codes
                lang_map = {'de': 'de', 'german': 'de', 'en': 'en', 'english': 'en'}
                semantic['language'] = lang_map.get(lang, lang)
    
    def _to_numeric(self, value: Any) -> Optional[Union[int, float]]:
        """Convert a value to numeric type safely."""
        if value is None:
            return None
        
        if isinstance(value, (int, float)):
            return value
        
        if isinstance(value, str):
            # Remove common non-numeric characters
            cleaned = re.sub(r'[^\d\.\-\+]', '', value.strip())
            if not cleaned:
                return None
            
            try:
                # Try integer first
                if '.' not in cleaned:
                    return int(cleaned)
                else:
                    return float(cleaned)
            except (ValueError, InvalidOperation):
                return None
        
        # Try direct conversion
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    async def normalize_batch(self, extracted_data_list: List[ExtractedData]) -> List[ExtractedData]:
        """
        Normalize a batch of extracted data.
        
        Args:
            extracted_data_list: List of ExtractedData to normalize
            
        Returns:
            List of normalized ExtractedData objects
        """
        normalized_list = []
        
        for extracted_data in extracted_data_list:
            normalized_data = await self.normalize_data(extracted_data)
            normalized_list.append(normalized_data)
        
        logger.info(
            "Batch normalization completed",
            total_items=len(extracted_data_list),
            successful_normalizations=len([d for d in normalized_list if not d.processing_errors])
        )
        
        return normalized_list