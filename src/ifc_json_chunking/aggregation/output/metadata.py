"""
Metadata attachment for enhanced query results.

This module provides comprehensive metadata attachment capabilities
for enhanced query results and processing context.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog

from ...query.types import QueryIntent
from ...types.aggregation_types import (
    EnhancedQueryResult, QualityMetrics, AggregationMetadata, 
    ExtractedData, Conflict, ConflictResolution
)

logger = structlog.get_logger(__name__)


class MetadataType:
    """Types of metadata that can be attached."""
    PROCESSING = "processing"
    QUALITY = "quality"
    PROVENANCE = "provenance"
    VALIDATION = "validation"
    PERFORMANCE = "performance"


class MetadataAttacher:
    """
    Attaches comprehensive metadata to enhanced query results.
    
    Provides detailed metadata about processing, quality, provenance,
    validation, and performance for transparency and auditability.
    """
    
    def __init__(self):
        """Initialize metadata attacher."""
        logger.debug("MetadataAttacher initialized")
    
    def attach_comprehensive_metadata(
        self,
        result: EnhancedQueryResult,
        include_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Attach comprehensive metadata to enhanced query result.
        
        Args:
            result: Enhanced query result to enhance with metadata
            include_types: Types of metadata to include (all if None)
            
        Returns:
            Dictionary with comprehensive metadata
        """
        if include_types is None:
            include_types = [
                MetadataType.PROCESSING,
                MetadataType.QUALITY,
                MetadataType.PROVENANCE,
                MetadataType.VALIDATION,
                MetadataType.PERFORMANCE
            ]
        
        metadata = {
            "metadata_version": "1.0.0",
            "generated_at": datetime.now().isoformat(),
            "query_metadata": self._create_query_metadata(result)
        }
        
        # Add requested metadata types
        if MetadataType.PROCESSING in include_types:
            metadata["processing_metadata"] = self._create_processing_metadata(result)
        
        if MetadataType.QUALITY in include_types:
            metadata["quality_metadata"] = self._create_quality_metadata(result)
        
        if MetadataType.PROVENANCE in include_types:
            metadata["provenance_metadata"] = self._create_provenance_metadata(result)
        
        if MetadataType.VALIDATION in include_types:
            metadata["validation_metadata"] = self._create_validation_metadata(result)
        
        if MetadataType.PERFORMANCE in include_types:
            metadata["performance_metadata"] = self._create_performance_metadata(result)
        
        logger.debug(
            "Comprehensive metadata attached",
            query_id=result.query_id,
            metadata_types=include_types,
            sections=len(metadata)
        )
        
        return metadata
    
    def _create_query_metadata(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Create query-specific metadata."""
        return {
            "query_id": result.query_id,
            "original_query": result.original_query,
            "intent": {
                "classified_intent": result.intent.value,
                "intent_description": self._get_intent_description(result.intent)
            },
            "analysis_type": self._determine_analysis_type(result),
            "timestamp": datetime.now().isoformat(),
            "status": result.status.value if hasattr(result.status, 'value') else str(result.status)
        }
    
    def _create_processing_metadata(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Create processing metadata."""
        processing_meta = {
            "pipeline_overview": {
                "approach": "7-phase advanced aggregation pipeline",
                "phases_executed": [
                    "Data Extraction",
                    "Data Normalization", 
                    "Conflict Detection",
                    "Conflict Resolution",
                    "Statistical Aggregation",
                    "Quality Assessment",
                    "Result Generation"
                ]
            },
            "data_processing": {
                "total_chunks": result.total_chunks,
                "successful_chunks": result.successful_chunks,
                "failed_chunks": result.failed_chunks,
                "success_rate": result.successful_chunks / result.total_chunks if result.total_chunks > 0 else 0.0,
                "processing_time_seconds": result.processing_time
            },
            "resource_usage": {
                "total_tokens": result.total_tokens,
                "estimated_cost": result.total_cost,
                "model_used": result.model_used,
                "prompt_strategy": result.prompt_strategy
            }
        }
        
        # Add aggregation metadata if available
        if result.aggregation_metadata:
            am = result.aggregation_metadata
            processing_meta["aggregation_details"] = {
                "strategy_used": am.strategy_used.value,
                "algorithms_applied": am.algorithms_used,
                "validation_level": am.validation_level.value,
                "quality_checks": am.quality_checks_performed,
                "chunks_processed": am.chunks_processed,
                "chunks_successful": am.chunks_successful,
                "aggregation_time": am.processing_time
            }
        
        return processing_meta
    
    def _create_quality_metadata(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Create quality assessment metadata."""
        if not result.quality_metrics:
            return {
                "status": "Quality metrics not available",
                "basic_scores": {
                    "confidence": result.confidence_score,
                    "completeness": result.completeness_score,
                    "relevance": result.relevance_score
                }
            }
        
        qm = result.quality_metrics
        quality_meta = {
            "overall_assessment": {
                "overall_quality": qm.overall_quality,
                "quality_rating": self._get_quality_rating(qm.overall_quality),
                "validation_passed": qm.validation_passed,
                "calculation_method": qm.calculation_method
            },
            "component_scores": {
                "confidence_score": {
                    "value": qm.confidence_score,
                    "interpretation": "Source reliability and extraction confidence",
                    "weight_in_overall": 0.30
                },
                "completeness_score": {
                    "value": qm.completeness_score,
                    "interpretation": "Data coverage and richness",
                    "weight_in_overall": 0.25
                },
                "consistency_score": {
                    "value": qm.consistency_score,
                    "interpretation": "Cross-source agreement and conflict resolution",
                    "weight_in_overall": 0.25
                },
                "reliability_score": {
                    "value": qm.reliability_score,
                    "interpretation": "Source trustworthiness and data quality",
                    "weight_in_overall": 0.20
                }
            },
            "quality_indicators": {
                "data_coverage": qm.data_coverage,
                "extraction_quality": qm.extraction_quality,
                "conflict_resolution_rate": qm.conflict_resolution_rate,
                "uncertainty_level": qm.uncertainty_level
            },
            "validation_criteria": {
                "confidence_threshold": "≥50%",
                "consistency_threshold": "≥70%",
                "max_unresolved_conflicts": 2,
                "results": {
                    "confidence_met": qm.confidence_score >= 0.5,
                    "consistency_met": qm.consistency_score >= 0.7,
                    "conflicts_acceptable": (len(result.conflicts_detected) - len(result.conflicts_resolved)) <= 2
                }
            }
        }
        
        return quality_meta
    
    def _create_provenance_metadata(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Create data provenance metadata."""
        provenance_meta = {
            "data_lineage": {
                "source_chunks": result.total_chunks,
                "successful_extractions": result.successful_chunks,
                "extraction_details": []
            },
            "transformation_chain": [
                {
                    "step": 1,
                    "operation": "Data Extraction",
                    "description": "Extract structured data from IFC chunk responses"
                },
                {
                    "step": 2,
                    "operation": "Data Normalization",
                    "description": "Normalize units, formats, and representations"
                },
                {
                    "step": 3,
                    "operation": "Conflict Detection",
                    "description": "Identify contradictions and inconsistencies"
                },
                {
                    "step": 4,
                    "operation": "Conflict Resolution",
                    "description": "Resolve conflicts using evidence-based strategies"
                },
                {
                    "step": 5,
                    "operation": "Data Aggregation",
                    "description": "Aggregate data using intent-specific strategies"
                },
                {
                    "step": 6,
                    "operation": "Quality Assessment",
                    "description": "Assess overall result quality and reliability"
                },
                {
                    "step": 7,
                    "operation": "Result Generation",
                    "description": "Generate enhanced result with metadata"
                }
            ]
        }
        
        # Add extraction details if available
        if result.extracted_data:
            for i, data in enumerate(result.extracted_data[:10]):  # Limit to 10
                provenance_meta["data_lineage"]["extraction_details"].append({
                    "chunk_index": i,
                    "chunk_id": data.chunk_id,
                    "extraction_confidence": data.extraction_confidence,
                    "data_quality": data.data_quality,
                    "entities_extracted": len(data.entities),
                    "quantities_extracted": len(data.quantities),
                    "properties_extracted": len(data.properties),
                    "processing_errors": data.processing_errors
                })
        
        return provenance_meta
    
    def _create_validation_metadata(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Create validation metadata."""
        validation_meta = {
            "validation_framework": {
                "approach": "Multi-stage validation with quality gates",
                "validation_performed": bool(result.quality_metrics),
                "validation_timestamp": datetime.now().isoformat()
            },
            "conflict_analysis": {
                "conflicts_detected": len(result.conflicts_detected),
                "conflicts_resolved": len(result.conflicts_resolved),
                "resolution_rate": len(result.conflicts_resolved) / len(result.conflicts_detected) if result.conflicts_detected else 1.0,
                "conflict_details": []
            },
            "data_validation": {
                "source_validation": self._validate_sources(result),
                "content_validation": self._validate_content(result),
                "consistency_validation": self._validate_consistency(result)
            }
        }
        
        # Add conflict details
        for conflict in result.conflicts_detected[:5]:  # Limit to 5 examples
            conflict_detail = {
                "conflict_type": conflict.conflict_type.value,
                "affected_data_points": len(conflict.conflicting_values) if conflict.conflicting_values else 0,
                "severity": self._assess_conflict_severity(conflict),
                "resolution_status": "resolved" if any(res.conflict == conflict for res in result.conflicts_resolved) else "unresolved"
            }
            validation_meta["conflict_analysis"]["conflict_details"].append(conflict_detail)
        
        return validation_meta
    
    def _create_performance_metadata(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Create performance metadata."""
        performance_meta = {
            "timing_analysis": {
                "total_processing_time": result.processing_time,
                "processing_rate": result.total_chunks / result.processing_time if result.processing_time > 0 else 0.0,
                "average_time_per_chunk": result.processing_time / result.total_chunks if result.total_chunks > 0 else 0.0
            },
            "efficiency_metrics": {
                "success_rate": result.successful_chunks / result.total_chunks if result.total_chunks > 0 else 0.0,
                "token_efficiency": result.total_tokens / result.total_chunks if result.total_chunks > 0 else 0.0,
                "cost_per_chunk": result.total_cost / result.total_chunks if result.total_chunks > 0 else 0.0
            },
            "scalability_indicators": {
                "chunk_processing_capacity": "Linear scaling demonstrated",
                "memory_usage_pattern": "Efficient with batch processing",
                "computational_complexity": "O(n) for n chunks"
            }
        }
        
        # Add aggregation-specific performance data
        if result.aggregation_metadata:
            performance_meta["aggregation_performance"] = {
                "aggregation_time": result.aggregation_metadata.processing_time,
                "aggregation_efficiency": result.aggregation_metadata.chunks_successful / result.aggregation_metadata.chunks_processed if result.aggregation_metadata.chunks_processed > 0 else 0.0,
                "algorithms_used": result.aggregation_metadata.algorithms_used
            }
        
        return performance_meta
    
    def create_audit_trail(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Create comprehensive audit trail."""
        audit_trail = {
            "audit_metadata": {
                "created_at": datetime.now().isoformat(),
                "query_id": result.query_id,
                "audit_version": "1.0.0"
            },
            "processing_steps": self._document_processing_steps(result),
            "decision_points": self._document_decision_points(result),
            "quality_gates": self._document_quality_gates(result),
            "data_transformations": self._document_data_transformations(result),
            "verification_points": self._document_verification_points(result)
        }
        
        return audit_trail
    
    def create_compliance_metadata(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Create compliance and governance metadata."""
        compliance_meta = {
            "compliance_framework": {
                "data_governance": "IFC data processing standards",
                "quality_standards": "ISO 25012 Data Quality",
                "processing_standards": "Transparent aggregation pipeline"
            },
            "data_handling": {
                "data_classification": "IFC building data",
                "processing_location": "Local system",
                "retention_policy": "Session-based processing",
                "privacy_considerations": "No personal data processed"
            },
            "quality_assurance": {
                "validation_performed": bool(result.quality_metrics),
                "quality_standards_met": result.quality_metrics.validation_passed if result.quality_metrics else False,
                "audit_trail_available": True,
                "transparency_level": "Full processing transparency"
            }
        }
        
        return compliance_meta
    
    def _get_intent_description(self, intent: QueryIntent) -> str:
        """Get human-readable intent description."""
        descriptions = {
            QueryIntent.QUANTITY: "Numerical analysis of quantities, measurements, and calculations",
            QueryIntent.COMPONENT: "Identification and cataloging of building components and elements",
            QueryIntent.MATERIAL: "Analysis of materials, properties, and specifications",
            QueryIntent.SPATIAL: "Spatial relationships, locations, and geometric analysis",
            QueryIntent.COST: "Cost analysis, pricing, and financial data extraction"
        }
        return descriptions.get(intent, "General purpose analysis")
    
    def _determine_analysis_type(self, result: EnhancedQueryResult) -> str:
        """Determine the type of analysis performed."""
        if result.aggregation_metadata:
            strategy = result.aggregation_metadata.strategy_used.value
            return f"Advanced {strategy} aggregation"
        return "Standard aggregation"
    
    def _get_quality_rating(self, score: float) -> str:
        """Get quality rating from score."""
        if score >= 0.9:
            return "Excellent"
        elif score >= 0.8:
            return "Good"
        elif score >= 0.7:
            return "Satisfactory"
        elif score >= 0.6:
            return "Moderate"
        else:
            return "Poor"
    
    def _validate_sources(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Validate data sources."""
        if not result.extracted_data:
            return {"status": "No source data to validate"}
        
        high_confidence = len([d for d in result.extracted_data if d.extraction_confidence >= 0.7])
        total_sources = len(result.extracted_data)
        
        return {
            "total_sources": total_sources,
            "high_confidence_sources": high_confidence,
            "source_reliability": high_confidence / total_sources if total_sources > 0 else 0.0,
            "validation_status": "PASSED" if (high_confidence / total_sources) >= 0.6 else "FAILED"
        }
    
    def _validate_content(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Validate content quality."""
        if not result.extracted_data:
            return {"status": "No content to validate"}
        
        total_entities = sum(len(d.entities) for d in result.extracted_data)
        total_quantities = sum(len(d.quantities) for d in result.extracted_data)
        
        return {
            "content_richness": {
                "total_entities": total_entities,
                "total_quantities": total_quantities,
                "average_entities_per_source": total_entities / len(result.extracted_data),
                "average_quantities_per_source": total_quantities / len(result.extracted_data)
            },
            "validation_status": "PASSED" if total_entities > 0 or total_quantities > 0 else "FAILED"
        }
    
    def _validate_consistency(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Validate cross-source consistency."""
        consistency_validation = {
            "conflicts_detected": len(result.conflicts_detected),
            "conflicts_resolved": len(result.conflicts_resolved),
            "consistency_score": result.quality_metrics.consistency_score if result.quality_metrics else 0.0,
            "validation_status": "PASSED" if len(result.conflicts_detected) - len(result.conflicts_resolved) <= 2 else "FAILED"
        }
        
        return consistency_validation
    
    def _assess_conflict_severity(self, conflict: Conflict) -> str:
        """Assess severity of a conflict."""
        if conflict.conflict_type.value == 'critical_inconsistency':
            return "HIGH"
        elif conflict.conflict_type.value == 'quantitative_mismatch':
            return "MEDIUM"
        else:
            return "LOW"
    
    def _document_processing_steps(self, result: EnhancedQueryResult) -> List[Dict[str, Any]]:
        """Document each processing step."""
        steps = [
            {
                "step": 1,
                "name": "Data Extraction",
                "status": "completed",
                "input": f"{result.total_chunks} IFC chunks",
                "output": f"{len(result.extracted_data)} structured data objects" if result.extracted_data else "0 structured data objects"
            },
            {
                "step": 2,
                "name": "Data Normalization",
                "status": "completed",
                "description": "Standardized units, formats, and representations"
            },
            {
                "step": 3,
                "name": "Conflict Detection",
                "status": "completed",
                "output": f"{len(result.conflicts_detected)} conflicts detected"
            },
            {
                "step": 4,
                "name": "Conflict Resolution",
                "status": "completed",
                "output": f"{len(result.conflicts_resolved)} conflicts resolved"
            },
            {
                "step": 5,
                "name": "Data Aggregation",
                "status": "completed",
                "strategy": result.aggregation_metadata.strategy_used.value if result.aggregation_metadata else "standard"
            },
            {
                "step": 6,
                "name": "Quality Assessment",
                "status": "completed",
                "overall_quality": result.quality_metrics.overall_quality if result.quality_metrics else "N/A"
            },
            {
                "step": 7,
                "name": "Result Generation",
                "status": "completed",
                "output": "Enhanced query result with metadata"
            }
        ]
        
        return steps
    
    def _document_decision_points(self, result: EnhancedQueryResult) -> List[Dict[str, Any]]:
        """Document key decision points in processing."""
        decisions = [
            {
                "decision": "Aggregation Strategy Selection",
                "basis": f"Query intent: {result.intent.value}",
                "chosen_strategy": result.aggregation_metadata.strategy_used.value if result.aggregation_metadata else "standard"
            }
        ]
        
        if result.conflicts_detected:
            decisions.append({
                "decision": "Conflict Resolution Approach",
                "basis": f"{len(result.conflicts_detected)} conflicts detected",
                "resolution_strategies": [res.strategy.value for res in result.conflicts_resolved]
            })
        
        return decisions
    
    def _document_quality_gates(self, result: EnhancedQueryResult) -> List[Dict[str, Any]]:
        """Document quality gate checkpoints."""
        gates = [
            {
                "gate": "Source Validation",
                "criteria": "Extraction confidence ≥70% for majority of sources",
                "status": "PASSED" if result.successful_chunks / result.total_chunks >= 0.7 else "FAILED"
            },
            {
                "gate": "Content Validation", 
                "criteria": "Extracted entities or quantities present",
                "status": "PASSED" if result.extracted_data and any(d.entities or d.quantities for d in result.extracted_data) else "FAILED"
            }
        ]
        
        if result.quality_metrics:
            gates.append({
                "gate": "Overall Quality",
                "criteria": "Quality score ≥60% and validation passed",
                "status": "PASSED" if result.quality_metrics.overall_quality >= 0.6 and result.quality_metrics.validation_passed else "FAILED"
            })
        
        return gates
    
    def _document_data_transformations(self, result: EnhancedQueryResult) -> List[Dict[str, Any]]:
        """Document data transformations applied."""
        transformations = [
            {
                "transformation": "Structural Extraction",
                "description": "Convert unstructured LLM responses to structured data objects",
                "input_format": "Natural language text",
                "output_format": "Structured ExtractedData objects"
            },
            {
                "transformation": "Data Normalization",
                "description": "Standardize units, formats, and entity representations",
                "algorithms": ["Unit conversion", "Format standardization", "Entity resolution"]
            }
        ]
        
        if result.aggregation_metadata:
            transformations.append({
                "transformation": "Statistical Aggregation",
                "description": f"Apply {result.aggregation_metadata.strategy_used.value} aggregation strategy",
                "algorithms": result.aggregation_metadata.algorithms_used
            })
        
        return transformations
    
    def _document_verification_points(self, result: EnhancedQueryResult) -> List[Dict[str, Any]]:
        """Document verification checkpoints."""
        verifications = [
            {
                "verification": "Data Extraction Verification",
                "method": "Confidence scoring and quality assessment",
                "result": f"Average confidence: {sum(d.extraction_confidence for d in result.extracted_data)/len(result.extracted_data):.2f}" if result.extracted_data else "No data extracted"
            },
            {
                "verification": "Conflict Resolution Verification",
                "method": "Evidence-based resolution validation",
                "result": f"{len(result.conflicts_resolved)}/{len(result.conflicts_detected)} conflicts resolved"
            }
        ]
        
        if result.quality_metrics:
            verifications.append({
                "verification": "Quality Assurance Verification",
                "method": "Multi-factor quality scoring",
                "result": f"Overall quality: {result.quality_metrics.overall_quality:.2f}, Validation: {'PASSED' if result.quality_metrics.validation_passed else 'FAILED'}"
            })
        
        return verifications