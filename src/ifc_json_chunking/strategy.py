"""
Chunking strategies for IFC JSON data processing.

This module contains strategies for determining when and how to
create chunks from IFC JSON data, following the Strategy pattern.
"""

from typing import Any, List, Dict, Set
from abc import ABC, abstractmethod

from .config import Config
from .models import Chunk, ChunkingDecision, ChunkType


class ChunkingStrategy(ABC):
    """Abstract base class for chunking strategies."""
    
    @abstractmethod
    def should_create_chunk(
        self, 
        json_path: str, 
        value: Any, 
        existing_chunks: List[Chunk]
    ) -> ChunkingDecision:
        """
        Determine if a new chunk should be created.
        
        Args:
            json_path: JSON path of the element
            value: Element value
            existing_chunks: List of existing chunks
            
        Returns:
            ChunkingDecision with reasoning
        """
        pass


class IFCChunkingStrategy(ChunkingStrategy):
    """
    Default chunking strategy for IFC JSON data.
    
    Creates chunks based on IFC object types and size limits.
    """
    
    def __init__(self, config: Config):
        """
        Initialize strategy with configuration.
        
        Args:
            config: Configuration object
        """
        self.config = config
        self.size_limit_bytes = config.chunk_size_mb * 1024 * 1024
    
    def should_create_chunk(
        self, 
        json_path: str, 
        value: Any, 
        existing_chunks: List[Chunk]
    ) -> ChunkingDecision:
        """
        Determine if a new chunk should be created based on IFC patterns.
        
        Args:
            json_path: JSON path of the element
            value: Element value
            existing_chunks: List of existing chunks
            
        Returns:
            ChunkingDecision with reasoning
        """
        # Create chunks for major IFC objects
        if self._is_major_ifc_object(json_path, value):
            return ChunkingDecision.yes(
                f"Major IFC object at {json_path}",
                ChunkType.IFC_OBJECT
            )
        
        # Create chunks for geometry data
        if self._is_geometry_data(json_path, value):
            return ChunkingDecision.yes(
                f"Geometry data at {json_path}",
                ChunkType.GEOMETRY
            )
        
        # Create chunks for header data
        if self._is_header_data(json_path):
            return ChunkingDecision.yes(
                f"Header data at {json_path}",
                ChunkType.HEADER
            )
        
        # Create chunk when size limit is exceeded
        if self._exceeds_size_limit(existing_chunks):
            return ChunkingDecision.yes(
                f"Size limit exceeded ({self.config.chunk_size_mb}MB)",
                ChunkType.GENERAL
            )
        
        return ChunkingDecision.no(f"No chunking criteria met for {json_path}")
    
    def _is_major_ifc_object(self, json_path: str, value: Any) -> bool:
        """Check if this is a major IFC object worth chunking."""
        return (json_path.startswith('objects.') and 
                isinstance(value, dict) and
                self._has_ifc_structure(value))
    
    def _is_geometry_data(self, json_path: str, value: Any) -> bool:
        """Check if this is geometry data worth chunking."""
        return (json_path.startswith('geometry.') and 
                isinstance(value, (dict, list)))
    
    def _is_header_data(self, json_path: str) -> bool:
        """Check if this is header data."""
        return json_path.startswith('header')
    
    def _has_ifc_structure(self, obj: dict) -> bool:
        """Check if object has typical IFC structure."""
        # Basic check for IFC object structure
        return ('type' in obj or 'id' in obj or 
                'properties' in obj or 'attributes' in obj)
    
    def _exceeds_size_limit(self, existing_chunks: List[Chunk]) -> bool:
        """Check if recent chunks exceed size limit."""
        if not existing_chunks:
            return False
        
        # Check size of last few chunks to avoid creating too large chunks
        recent_chunks = existing_chunks[-5:]  # Last 5 chunks
        total_size = sum(chunk.size_bytes for chunk in recent_chunks)
        
        return total_size > self.size_limit_bytes


class SizeBasedChunkingStrategy(ChunkingStrategy):
    """
    Simple size-based chunking strategy.
    
    Creates chunks purely based on size limits, ignoring JSON structure.
    """
    
    def __init__(self, config: Config):
        """Initialize with configuration."""
        self.config = config
        self.size_limit_bytes = config.chunk_size_mb * 1024 * 1024
    
    def should_create_chunk(
        self, 
        json_path: str, 
        value: Any, 
        existing_chunks: List[Chunk]
    ) -> ChunkingDecision:
        """Create chunks based purely on size."""
        current_size = len(str(value))
        
        if current_size > self.size_limit_bytes / 2:  # Large individual item
            return ChunkingDecision.yes(
                f"Large item ({current_size} bytes)",
                ChunkType.GENERAL
            )
        
        if existing_chunks:
            total_size = sum(chunk.size_bytes for chunk in existing_chunks[-10:])
            if total_size > self.size_limit_bytes:
                return ChunkingDecision.yes(
                    f"Size limit exceeded ({total_size} bytes)",
                    ChunkType.GENERAL
                )
        
        return ChunkingDecision.no("Size limit not exceeded")


class AggressiveChunkingStrategy(ChunkingStrategy):
    """
    Aggressive chunking strategy for maximum granularity.
    
    Creates many small chunks for fine-grained processing.
    """
    
    def __init__(self, config: Config):
        """Initialize with configuration."""
        self.config = config
        self.small_size_limit = (config.chunk_size_mb * 1024 * 1024) // 10  # 10% of normal
    
    def should_create_chunk(
        self, 
        json_path: str, 
        value: Any, 
        existing_chunks: List[Chunk]
    ) -> ChunkingDecision:
        """Create chunks aggressively for small items."""
        # Create chunk for any structured data
        if isinstance(value, (dict, list)) and len(str(value)) > 100:
            chunk_type = ChunkType.IFC_OBJECT if json_path.startswith('objects.') else ChunkType.GENERAL
            return ChunkingDecision.yes(
                f"Structured data at {json_path}",
                chunk_type
            )
        
        # Very small size limit
        if existing_chunks and len(existing_chunks) > 0:
            recent_size = sum(chunk.size_bytes for chunk in existing_chunks[-2:])
            if recent_size > self.small_size_limit:
                return ChunkingDecision.yes(
                    f"Small size limit exceeded ({recent_size} bytes)",
                    ChunkType.GENERAL
                )
        
        return ChunkingDecision.no("Aggressive criteria not met")


class HierarchicalChunkingStrategy(ChunkingStrategy):
    """
    Hierarchical chunking strategy for IFC building data.
    
    Creates chunks based on building hierarchy: Building → Floor → Room → Components
    Preserves spatial containment relationships and maintains context.
    """
    
    def __init__(self, config: Config):
        """Initialize with configuration."""
        self.config = config
        self.size_limit_bytes = config.chunk_size_mb * 1024 * 1024
        self.hierarchy_levels = {
            'IfcSite': 1,
            'IfcBuilding': 2, 
            'IfcBuildingStorey': 3,
            'IfcSpace': 4,
            'IfcRoom': 4,
            'IfcZone': 4
        }
        self.current_hierarchy = {}  # Track current position in hierarchy
    
    def should_create_chunk(
        self, 
        json_path: str, 
        value: Any, 
        existing_chunks: List[Chunk]
    ) -> ChunkingDecision:
        """Create chunks based on building hierarchy boundaries."""
        
        # Extract IFC type from value if it's an entity
        ifc_type = self._extract_ifc_type(value)
        
        if ifc_type in self.hierarchy_levels:
            hierarchy_level = self.hierarchy_levels[ifc_type]
            
            # Check if this represents a hierarchy boundary
            if self._is_hierarchy_boundary(ifc_type, hierarchy_level, existing_chunks):
                return ChunkingDecision.yes(
                    f"Hierarchy boundary: {ifc_type} at level {hierarchy_level}",
                    ChunkType.IFC_OBJECT
                )
        
        # Group building elements by spatial container
        if self._is_building_element(ifc_type):
            return self._evaluate_spatial_grouping(json_path, value, existing_chunks)
        
        # Default size-based fallback
        if self._exceeds_size_limit(existing_chunks):
            return ChunkingDecision.yes(
                f"Size limit exceeded ({self.config.chunk_size_mb}MB)",
                ChunkType.GENERAL
            )
        
        return ChunkingDecision.no(f"No hierarchical criteria met for {ifc_type}")
    
    def _extract_ifc_type(self, value: Any) -> str:
        """Extract IFC type from entity value."""
        if isinstance(value, dict):
            return value.get('type', value.get('IfcType', ''))
        return ''
    
    def _is_hierarchy_boundary(self, ifc_type: str, level: int, existing_chunks: List[Chunk]) -> bool:
        """Check if this entity represents a significant hierarchy boundary."""
        if level <= 2:
            return True
        
        return self._check_container_level_changes(level, existing_chunks)
    
    def _check_container_level_changes(self, current_level: int, existing_chunks: List[Chunk]) -> bool:
        """Check if recent chunks represent a change in hierarchy level."""
        recent_chunks = existing_chunks[-5:] if existing_chunks else []
        for chunk in recent_chunks:
            if hasattr(chunk, 'data') and isinstance(chunk.data, dict):
                chunk_type = self._extract_ifc_type(chunk.data)
                if chunk_type in self.hierarchy_levels:
                    chunk_level = self.hierarchy_levels[chunk_type]
                    if chunk_level != current_level:
                        return True
        return False
    
    def _is_building_element(self, ifc_type: str) -> bool:
        """Check if entity is a building element that should be grouped."""
        building_elements = {
            'IfcWall', 'IfcDoor', 'IfcWindow', 'IfcSlab', 'IfcBeam', 
            'IfcColumn', 'IfcRoof', 'IfcStair', 'IfcRamp', 'IfcCurtainWall'
        }
        return ifc_type in building_elements
    
    def _evaluate_spatial_grouping(self, json_path: str, value: Any, existing_chunks: List[Chunk]) -> ChunkingDecision:
        """Evaluate whether to group building elements by spatial container."""
        spatial_container = self._extract_spatial_container(value)
        
        if not spatial_container:
            return ChunkingDecision.no("No spatial container information")
        
        return self._decide_based_on_container_grouping(spatial_container, existing_chunks)
    
    def _decide_based_on_container_grouping(self, spatial_container: str, existing_chunks: List[Chunk]) -> ChunkingDecision:
        """Decide whether to create new chunk based on spatial container grouping."""
        recent_chunks = existing_chunks[-10:] if existing_chunks else []
        same_container_chunks = [
            chunk for chunk in recent_chunks 
            if self._get_chunk_spatial_container(chunk) == spatial_container
        ]
        
        if len(same_container_chunks) > 0:
            return ChunkingDecision.no(f"Grouping with same spatial container: {spatial_container}")
        else:
            return ChunkingDecision.yes(
                f"New spatial container: {spatial_container}",
                ChunkType.IFC_OBJECT
            )
    
    def _extract_spatial_container(self, value: Any) -> str:
        """Extract spatial container ID from building element."""
        if isinstance(value, dict):
            # Look for common spatial relationship patterns
            relationships = value.get('relationships', {})
            contained_in = relationships.get('IfcRelContainedInSpatialStructure', [])
            if contained_in:
                return contained_in[0] if isinstance(contained_in, list) else str(contained_in)
        return ''
    
    def _get_chunk_spatial_container(self, chunk: Chunk) -> str:
        """Get spatial container from existing chunk."""
        if hasattr(chunk, 'data') and isinstance(chunk.data, dict):
            return self._extract_spatial_container(chunk.data)
        return ''
    
    def _exceeds_size_limit(self, existing_chunks: List[Chunk]) -> bool:
        """Check if recent chunks exceed size limit."""
        if not existing_chunks:
            return False
        
        recent_chunks = existing_chunks[-5:]
        total_size = sum(chunk.size_bytes for chunk in recent_chunks)
        return total_size > self.size_limit_bytes


class DisciplineBasedChunkingStrategy(ChunkingStrategy):
    """
    Discipline-based chunking strategy for IFC data.
    
    Groups elements by building discipline: Architectural, Structural, MEP.
    Maintains disciplinary coherence for specialized LLM processing.
    """
    
    def __init__(self, config: Config):
        """Initialize with configuration."""
        self.config = config
        self.size_limit_bytes = config.chunk_size_mb * 1024 * 1024
        
        # Define discipline mappings
        self.disciplines = {
            'architectural': {
                'IfcWall', 'IfcDoor', 'IfcWindow', 'IfcSlab', 'IfcRoof', 
                'IfcStair', 'IfcRamp', 'IfcCurtainWall', 'IfcSpace', 'IfcRoom'
            },
            'structural': {
                'IfcBeam', 'IfcColumn', 'IfcFooting', 'IfcPile', 'IfcPlate',
                'IfcMember', 'IfcBuildingElementProxy', 'IfcReinforcingBar'
            },
            'mep': {
                'IfcPipe', 'IfcDuct', 'IfcCableCarrierFitting', 'IfcFlowTerminal',
                'IfcDistributionElement', 'IfcFlowController', 'IfcFlowMovingDevice',
                'IfcEnergyConversionDevice', 'IfcFlowStorageDevice'
            }
        }
        
        self.current_discipline = None
    
    def should_create_chunk(
        self, 
        json_path: str, 
        value: Any, 
        existing_chunks: List[Chunk]
    ) -> ChunkingDecision:
        """Create chunks based on discipline boundaries."""
        
        ifc_type = self._extract_ifc_type(value)
        element_discipline = self._get_element_discipline(ifc_type)
        
        if element_discipline:
            # Check for discipline boundary crossing
            if self._is_discipline_boundary(element_discipline, existing_chunks):
                self.current_discipline = element_discipline
                return ChunkingDecision.yes(
                    f"Discipline boundary: switching to {element_discipline}",
                    ChunkType.IFC_OBJECT
                )
        
        # Size-based fallback
        if self._exceeds_size_limit(existing_chunks):
            return ChunkingDecision.yes(
                f"Size limit exceeded ({self.config.chunk_size_mb}MB)",
                ChunkType.GENERAL
            )
        
        return ChunkingDecision.no(f"No discipline boundary for {ifc_type}")
    
    def _extract_ifc_type(self, value: Any) -> str:
        """Extract IFC type from entity value."""
        if isinstance(value, dict):
            return value.get('type', value.get('IfcType', ''))
        return ''
    
    def _get_element_discipline(self, ifc_type: str) -> str:
        """Determine discipline for IFC element type."""
        for discipline, types in self.disciplines.items():
            if ifc_type in types:
                return discipline
        return ''
    
    def _is_discipline_boundary(self, element_discipline: str, existing_chunks: List[Chunk]) -> bool:
        """Check if we're crossing discipline boundaries."""
        if not existing_chunks:
            return True  # First element always creates chunk
        
        # Check recent chunks for discipline consistency
        recent_chunks = existing_chunks[-5:]
        for chunk in recent_chunks:
            if hasattr(chunk, 'data') and isinstance(chunk.data, dict):
                chunk_ifc_type = self._extract_ifc_type(chunk.data)
                chunk_discipline = self._get_element_discipline(chunk_ifc_type)
                
                if chunk_discipline and chunk_discipline != element_discipline:
                    return True  # Crossing discipline boundary
        
        return False
    
    def _exceeds_size_limit(self, existing_chunks: List[Chunk]) -> bool:
        """Check if recent chunks exceed size limit."""
        if not existing_chunks:
            return False
        
        recent_chunks = existing_chunks[-3:]
        total_size = sum(chunk.size_bytes for chunk in recent_chunks)
        return total_size > self.size_limit_bytes


def create_chunking_strategy(strategy_name: str, config: Config) -> ChunkingStrategy:
    """
    Factory function to create chunking strategies.
    
    Args:
        strategy_name: Name of strategy to create
        config: Configuration object
        
    Returns:
        ChunkingStrategy instance
        
    Raises:
        ValueError: If strategy name is unknown
    """
    strategies = {
        'ifc': IFCChunkingStrategy,
        'size': SizeBasedChunkingStrategy,
        'aggressive': AggressiveChunkingStrategy,
        'hierarchical': HierarchicalChunkingStrategy,
        'discipline': DisciplineBasedChunkingStrategy
    }
    
    if strategy_name not in strategies:
        raise ValueError(f"Unknown chunking strategy: {strategy_name}. "
                        f"Available: {list(strategies.keys())}")
    
    return strategies[strategy_name](config)