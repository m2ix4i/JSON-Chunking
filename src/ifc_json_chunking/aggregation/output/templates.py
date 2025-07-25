"""
Template engine for structured output generation.

This module provides template-based output generation for different
query types and presentation formats.
"""

from typing import Dict, Any, Optional
import structlog

from ...query.types import QueryIntent
from ...types.aggregation_types import EnhancedQueryResult

logger = structlog.get_logger(__name__)


class TemplateEngine:
    """
    Template engine for generating structured output from aggregation results.
    
    Provides customizable templates for different query types and formats
    with support for dynamic content generation.
    """
    
    def __init__(self):
        """Initialize template engine with predefined templates."""
        self.templates = {
            QueryIntent.QUANTITY: self._get_quantity_template(),
            QueryIntent.COMPONENT: self._get_component_template(),
            QueryIntent.MATERIAL: self._get_material_template(),
            QueryIntent.SPATIAL: self._get_spatial_template(),
            QueryIntent.COST: self._get_cost_template()
        }
        
        logger.debug("TemplateEngine initialized with templates for all query types")
    
    def generate_output(
        self,
        result: EnhancedQueryResult,
        template_type: str = "default"
    ) -> str:
        """
        Generate formatted output using appropriate template.
        
        Args:
            result: Enhanced query result to format
            template_type: Template variant to use ('default', 'detailed', 'summary')
            
        Returns:
            Formatted string output
        """
        intent = result.intent
        template_func = self.templates.get(intent, self._get_generic_template())
        
        return template_func(result, template_type)
    
    def _get_quantity_template(self):
        """Get quantity analysis template function."""
        def template(result: EnhancedQueryResult, template_type: str) -> str:
            sections = []
            
            # Header
            sections.append(f"QUANTITATIVE ANALYSIS RESULTS")
            sections.append(f"Query: {result.original_query}")
            sections.append("-" * 50)
            
            # Summary
            if template_type == "summary":
                sections.append(self._format_summary_section(result))
            else:
                # Quantities section
                if 'quantitative' in result.structured_output:
                    sections.append("QUANTITIES:")
                    quant_data = result.structured_output['quantitative']
                    for key, value in quant_data.items():
                        if isinstance(value, dict) and 'value' in value:
                            unit = value.get('unit', '')
                            confidence = value.get('confidence', 0.0)
                            sections.append(f"  • {key}: {value['value']:.2f} {unit} (confidence: {confidence:.2f})")
                
                # Detailed data if requested
                if template_type == "detailed":
                    sections.append("\nSOURCE DATA:")
                    for i, data in enumerate(result.extracted_data[:5]):  # Limit to 5
                        sections.append(f"  Source {i+1} ({data.chunk_id}):")
                        for qty_key, qty_val in data.quantities.items():
                            sections.append(f"    - {qty_key}: {qty_val}")
                
                # Quality information
                sections.append(self._format_quality_section(result))
            
            return "\n".join(sections)
        
        return template
    
    def _get_component_template(self):
        """Get component analysis template function."""
        def template(result: EnhancedQueryResult, template_type: str) -> str:
            sections = []
            
            # Header
            sections.append("COMPONENT ANALYSIS RESULTS")
            sections.append(f"Query: {result.original_query}")
            sections.append("-" * 50)
            
            if template_type == "summary":
                sections.append(self._format_summary_section(result))
            else:
                # Component types summary
                if 'entities' in result.structured_output:
                    entity_data = result.structured_output['entities']
                    if 'entity_types' in entity_data:
                        sections.append("COMPONENT TYPES:")
                        for comp_type, count in entity_data['entity_types'].items():
                            sections.append(f"  • {comp_type}: {count}")
                
                # Detailed components if requested
                if template_type == "detailed" and result.extracted_data:
                    sections.append("\nDETAILED COMPONENTS:")
                    all_entities = []
                    for data in result.extracted_data:
                        all_entities.extend(data.entities)
                    
                    for entity in all_entities[:10]:  # Limit to 10
                        entity_type = entity.get('type', 'unknown')
                        entity_name = entity.get('name', 'unnamed')
                        sections.append(f"  • {entity_type}: {entity_name}")
                
                sections.append(self._format_quality_section(result))
            
            return "\n".join(sections)
        
        return template
    
    def _get_material_template(self):
        """Get material analysis template function."""
        def template(result: EnhancedQueryResult, template_type: str) -> str:
            sections = []
            
            # Header
            sections.append("MATERIAL ANALYSIS RESULTS")
            sections.append(f"Query: {result.original_query}")
            sections.append("-" * 50)
            
            if template_type == "summary":
                sections.append(self._format_summary_section(result))
            else:
                # Material properties
                material_props = {}
                if result.extracted_data:
                    for data in result.extracted_data:
                        for key, value in data.properties.items():
                            if 'material' in key.lower():
                                material_props[key] = value
                
                if material_props:
                    sections.append("MATERIAL PROPERTIES:")
                    for prop, value in material_props.items():
                        sections.append(f"  • {prop}: {value}")
                else:
                    sections.append("No specific material properties identified.")
                
                sections.append(self._format_quality_section(result))
            
            return "\n".join(sections)
        
        return template
    
    def _get_spatial_template(self):
        """Get spatial analysis template function."""
        def template(result: EnhancedQueryResult, template_type: str) -> str:
            sections = []
            
            # Header
            sections.append("SPATIAL ANALYSIS RESULTS")
            sections.append(f"Query: {result.original_query}")
            sections.append("-" * 50)
            
            if template_type == "summary":
                sections.append(self._format_summary_section(result))
            else:
                # Spatial entities
                spatial_entities = []
                if result.extracted_data:
                    for data in result.extracted_data:
                        for entity in data.entities:
                            if any(term in str(entity).lower() for term in ['room', 'floor', 'space', 'zone']):
                                spatial_entities.append(entity)
                
                if spatial_entities:
                    sections.append("SPATIAL ELEMENTS:")
                    for entity in spatial_entities[:10]:  # Limit display
                        entity_type = entity.get('type', 'unknown')
                        entity_name = entity.get('name', 'unnamed')
                        sections.append(f"  • {entity_type}: {entity_name}")
                else:
                    sections.append("No specific spatial elements identified.")
                
                sections.append(self._format_quality_section(result))
            
            return "\n".join(sections)
        
        return template
    
    def _get_cost_template(self):
        """Get cost analysis template function."""
        def template(result: EnhancedQueryResult, template_type: str) -> str:
            sections = []
            
            # Header
            sections.append("COST ANALYSIS RESULTS")
            sections.append(f"Query: {result.original_query}")
            sections.append("-" * 50)
            
            if template_type == "summary":
                sections.append(self._format_summary_section(result))
            else:
                # Cost data
                cost_data = {}
                if result.extracted_data:
                    for data in result.extracted_data:
                        for key, value in data.quantities.items():
                            if 'cost' in key.lower() or 'price' in key.lower():
                                cost_data[key] = value
                
                if cost_data:
                    sections.append("COST INFORMATION:")
                    for cost_item, value in cost_data.items():
                        if isinstance(value, (int, float)):
                            sections.append(f"  • {cost_item}: ${value:,.2f}")
                        else:
                            sections.append(f"  • {cost_item}: {value}")
                else:
                    sections.append("No specific cost information identified.")
                
                sections.append(self._format_quality_section(result))
            
            return "\n".join(sections)
        
        return template
    
    def _get_generic_template(self):
        """Get generic template for unknown query types."""
        def template(result: EnhancedQueryResult, template_type: str) -> str:
            sections = []
            
            # Header
            sections.append("ANALYSIS RESULTS")
            sections.append(f"Query: {result.original_query}")
            sections.append("-" * 50)
            
            # Generic summary
            sections.append(f"Analysis completed for {result.intent.value} query.")
            sections.append(f"Processed {result.total_chunks} data chunks.")
            
            if result.extracted_data:
                total_entities = sum(len(data.entities) for data in result.extracted_data)
                total_quantities = sum(len(data.quantities) for data in result.extracted_data)
                sections.append(f"Found {total_entities} entities and {total_quantities} quantities.")
            
            sections.append(self._format_quality_section(result))
            
            return "\n".join(sections)
        
        return template
    
    def _format_summary_section(self, result: EnhancedQueryResult) -> str:
        """Format summary section for any template."""
        summary_lines = []
        
        # Basic summary
        summary_lines.append(f"Analysis Summary:")
        summary_lines.append(f"  • Status: {'Completed' if result.status else 'Failed'}")
        summary_lines.append(f"  • Confidence: {result.confidence_score:.1%}")
        summary_lines.append(f"  • Completeness: {result.completeness_score:.1%}")
        
        # Conflicts
        if result.conflicts_detected:
            resolved = len(result.conflicts_resolved)
            total = len(result.conflicts_detected)
            summary_lines.append(f"  • Conflicts: {resolved}/{total} resolved")
        
        # Processing info
        summary_lines.append(f"  • Processing time: {result.processing_time:.2f}s")
        summary_lines.append(f"  • Data sources: {result.successful_chunks}/{result.total_chunks}")
        
        return "\n".join(summary_lines)
    
    def _format_quality_section(self, result: EnhancedQueryResult) -> str:
        """Format quality section for templates."""
        quality_lines = []
        
        quality_lines.append("\nQUALITY ASSESSMENT:")
        if result.quality_metrics:
            quality_lines.append(f"  • Overall Quality: {result.quality_metrics.overall_quality:.2f}")
            quality_lines.append(f"  • Reliability: {result.quality_metrics.reliability_score:.2f}")
            quality_lines.append(f"  • Consistency: {result.quality_metrics.consistency_score:.2f}")
            quality_lines.append(f"  • Validation: {'Passed' if result.quality_metrics.validation_passed else 'Failed'}")
        else:
            quality_lines.append("  • Quality metrics not available")
        
        # Insights and recommendations
        if result.data_insights:
            quality_lines.append("\nINSIGHTS:")
            for insight in result.data_insights[:3]:  # Limit to 3
                quality_lines.append(f"  • {insight}")
        
        if result.recommendations:
            quality_lines.append("\nRECOMMENDATIONS:")
            for rec in result.recommendations[:3]:  # Limit to 3
                quality_lines.append(f"  • {rec}")
        
        return "\n".join(quality_lines)