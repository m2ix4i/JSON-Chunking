"""
Output formatter for aggregated results.

This module provides structured output formatting for different query types
and result presentation formats.
"""

from typing import Any, Dict, List

import structlog

from ...query.types import QueryIntent
from ...types.aggregation_types import EnhancedQueryResult

logger = structlog.get_logger(__name__)


class OutputFormatter:
    """
    Formats aggregated results for different query types and output formats.
    
    Provides query-type-specific formatting and multiple output formats
    including JSON, structured text, and summary formats.
    """

    def __init__(self):
        """Initialize output formatter."""
        self.formatters = {
            QueryIntent.QUANTITY: self._format_quantity_results,
            QueryIntent.COMPONENT: self._format_component_results,
            QueryIntent.MATERIAL: self._format_material_results,
            QueryIntent.SPATIAL: self._format_spatial_results,
            QueryIntent.COST: self._format_cost_results
        }

        logger.debug("OutputFormatter initialized")

    def format_result(
        self,
        enhanced_result: EnhancedQueryResult,
        output_format: str = "structured"
    ) -> Dict[str, Any]:
        """
        Format enhanced query result based on intent and output format.
        
        Args:
            enhanced_result: Enhanced query result to format
            output_format: Output format ('json', 'structured', 'summary')
            
        Returns:
            Formatted result dictionary
        """
        intent = enhanced_result.intent

        # Get intent-specific formatter
        formatter = self.formatters.get(intent, self._format_generic_results)

        # Format based on intent
        formatted_data = formatter(enhanced_result)

        # Apply output format
        if output_format == "json":
            return self._format_as_json(formatted_data, enhanced_result)
        elif output_format == "summary":
            return self._format_as_summary(formatted_data, enhanced_result)
        else:  # structured (default)
            return self._format_as_structured(formatted_data, enhanced_result)

    def _format_quantity_results(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Format quantity-focused results."""
        formatted = {
            "type": "quantity_analysis",
            "quantities": {},
            "totals": {},
            "statistics": {}
        }

        # Extract quantitative data
        if 'quantitative' in result.structured_output:
            quant_data = result.structured_output['quantitative']
            for key, value in quant_data.items():
                if isinstance(value, dict) and 'value' in value:
                    formatted["quantities"][key] = {
                        "value": value['value'],
                        "unit": value.get('unit', ''),
                        "confidence": value.get('confidence', 0.0),
                        "source_count": value.get('source_count', 1)
                    }

        # Add aggregated totals
        if result.extracted_data:
            all_quantities = {}
            for data in result.extracted_data:
                for key, value in data.quantities.items():
                    if key not in all_quantities:
                        all_quantities[key] = []
                    if isinstance(value, (int, float)):
                        all_quantities[key].append(value)

            for key, values in all_quantities.items():
                if values:
                    formatted["totals"][key] = {
                        "sum": sum(values),
                        "average": sum(values) / len(values),
                        "count": len(values),
                        "min": min(values),
                        "max": max(values)
                    }

        return formatted

    def _format_component_results(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Format component-focused results."""
        formatted = {
            "type": "component_analysis",
            "components": [],
            "component_types": {},
            "relationships": []
        }

        # Extract component data
        if result.extracted_data:
            all_entities = []
            for data in result.extracted_data:
                all_entities.extend(data.entities)

            # Group by component type
            type_groups = {}
            for entity in all_entities:
                entity_type = entity.get('type', 'unknown')
                if entity_type not in type_groups:
                    type_groups[entity_type] = []
                type_groups[entity_type].append(entity)

            formatted["component_types"] = {
                t: len(entities) for t, entities in type_groups.items()
            }

            # Add detailed components
            for entity in all_entities[:20]:  # Limit to 20 for output size
                formatted["components"].append({
                    "type": entity.get('type', 'unknown'),
                    "name": entity.get('name', ''),
                    "id": entity.get('entity_id', ''),
                    "properties": entity.get('properties', {})
                })

        return formatted

    def _format_material_results(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Format material-focused results."""
        formatted = {
            "type": "material_analysis",
            "materials": [],
            "material_properties": {},
            "specifications": {}
        }

        # Extract material data from properties
        if result.extracted_data:
            all_properties = {}
            for data in result.extracted_data:
                for key, value in data.properties.items():
                    if 'material' in key.lower() or 'composition' in key.lower():
                        all_properties[key] = value

            formatted["material_properties"] = all_properties

        return formatted

    def _format_spatial_results(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Format spatial-focused results."""
        formatted = {
            "type": "spatial_analysis",
            "locations": [],
            "spatial_hierarchy": {},
            "relationships": []
        }

        # Extract spatial data
        if result.extracted_data:
            spatial_entities = []
            for data in result.extracted_data:
                for entity in data.entities:
                    if any(spatial_term in str(entity).lower()
                          for spatial_term in ['room', 'floor', 'zone', 'space', 'location']):
                        spatial_entities.append(entity)

            formatted["locations"] = spatial_entities[:15]  # Limit output

        return formatted

    def _format_cost_results(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Format cost-focused results."""
        formatted = {
            "type": "cost_analysis",
            "cost_breakdown": {},
            "totals": {},
            "estimates": {}
        }

        # Extract cost-related quantities
        if result.extracted_data:
            cost_data = {}
            for data in result.extracted_data:
                for key, value in data.quantities.items():
                    if any(cost_term in key.lower()
                          for cost_term in ['cost', 'price', 'budget', 'estimate']):
                        cost_data[key] = value

            formatted["cost_breakdown"] = cost_data

        return formatted

    def _format_generic_results(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Format generic results for unknown intents."""
        return {
            "type": "generic_analysis",
            "data": result.structured_output,
            "entities": len(result.extracted_data) if result.extracted_data else 0,
            "conflicts": len(result.conflicts_detected),
            "quality": result.quality_metrics.overall_quality if result.quality_metrics else 0.0
        }

    def _format_as_json(self, data: Dict[str, Any], result: EnhancedQueryResult) -> Dict[str, Any]:
        """Format as JSON with metadata."""
        return {
            "format": "json",
            "query_id": result.query_id,
            "intent": result.intent.value,
            "timestamp": None,  # Would add current timestamp
            "data": data,
            "metadata": {
                "confidence": result.confidence_score,
                "completeness": result.completeness_score,
                "conflicts_detected": len(result.conflicts_detected),
                "conflicts_resolved": len(result.conflicts_resolved),
                "processing_time": result.processing_time
            }
        }

    def _format_as_structured(self, data: Dict[str, Any], result: EnhancedQueryResult) -> Dict[str, Any]:
        """Format as structured output with insights."""
        return {
            "format": "structured",
            "summary": self._generate_summary(result),
            "main_results": data,
            "insights": result.data_insights,
            "recommendations": result.recommendations,
            "quality_assessment": {
                "overall_quality": result.quality_metrics.overall_quality if result.quality_metrics else 0.0,
                "confidence": result.confidence_score,
                "completeness": result.completeness_score,
                "validation_passed": result.quality_metrics.validation_passed if result.quality_metrics else False
            },
            "uncertainty_factors": result.uncertainty_factors
        }

    def _format_as_summary(self, data: Dict[str, Any], result: EnhancedQueryResult) -> Dict[str, Any]:
        """Format as executive summary."""
        return {
            "format": "summary",
            "executive_summary": self._generate_executive_summary(result),
            "key_findings": self._extract_key_findings(data, result),
            "quality_indicators": {
                "reliability": self._assess_reliability(result),
                "completeness": f"{result.completeness_score:.1%}",
                "confidence": f"{result.confidence_score:.1%}"
            },
            "recommendations": result.recommendations[:3]  # Top 3 recommendations
        }

    def _generate_summary(self, result: EnhancedQueryResult) -> str:
        """Generate a summary of the analysis."""
        intent_names = {
            QueryIntent.QUANTITY: "Quantitative Analysis",
            QueryIntent.COMPONENT: "Component Analysis",
            QueryIntent.MATERIAL: "Material Analysis",
            QueryIntent.SPATIAL: "Spatial Analysis",
            QueryIntent.COST: "Cost Analysis"
        }

        intent_name = intent_names.get(result.intent, "General Analysis")

        summary_parts = [
            f"{intent_name} completed for query: '{result.original_query}'",
            f"Processed {result.total_chunks} chunks with {result.successful_chunks} successful",
            f"Overall quality score: {result.quality_metrics.overall_quality:.2f}" if result.quality_metrics else "Quality assessment unavailable"
        ]

        if result.conflicts_detected:
            summary_parts.append(f"Detected and resolved {len(result.conflicts_resolved)} of {len(result.conflicts_detected)} conflicts")

        return ". ".join(summary_parts) + "."

    def _generate_executive_summary(self, result: EnhancedQueryResult) -> str:
        """Generate executive summary."""
        quality_level = "high" if result.confidence_score > 0.8 else "moderate" if result.confidence_score > 0.5 else "low"

        return (
            f"Analysis of '{result.original_query}' completed with {quality_level} confidence. "
            f"Results are based on {result.successful_chunks} successful data sources with "
            f"{result.completeness_score:.1%} completeness."
        )

    def _extract_key_findings(self, data: Dict[str, Any], result: EnhancedQueryResult) -> List[str]:
        """Extract key findings from the analysis."""
        findings = []

        # Add data-specific findings
        if data.get("type") == "quantity_analysis" and data.get("totals"):
            findings.append(f"Identified {len(data['totals'])} quantitative measures")

        if data.get("type") == "component_analysis" and data.get("component_types"):
            top_type = max(data["component_types"], key=data["component_types"].get)
            findings.append(f"Most common component type: {top_type}")

        # Add quality findings
        if result.quality_metrics and result.quality_metrics.validation_passed:
            findings.append("Results passed validation criteria")

        if result.conflicts_resolved:
            findings.append(f"Successfully resolved {len(result.conflicts_resolved)} data conflicts")

        return findings[:5]  # Limit to 5 key findings

    def _assess_reliability(self, result: EnhancedQueryResult) -> str:
        """Assess overall reliability."""
        if result.quality_metrics:
            score = result.quality_metrics.reliability_score
            if score > 0.8:
                return "High"
            elif score > 0.6:
                return "Moderate"
            else:
                return "Low"
        return "Unknown"
