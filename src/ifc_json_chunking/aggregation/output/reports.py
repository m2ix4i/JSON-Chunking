"""
Report generation for enhanced query results.

This module provides comprehensive report generation capabilities
for different analysis types and audiences.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog

from ...query.types import QueryIntent
from ...types.aggregation_types import EnhancedQueryResult, QualityMetrics
from .formatter import OutputFormatter

logger = structlog.get_logger(__name__)


class ReportType:
    """Available report types."""
    EXECUTIVE = "executive"
    TECHNICAL = "technical"
    SUMMARY = "summary" 
    DETAILED = "detailed"


class ReportGenerator:
    """
    Generates structured reports for enhanced query results.
    
    Provides different report types for various audiences including
    executive summaries, technical reports, and detailed analysis.
    """
    
    def __init__(self):
        """Initialize report generator with formatter."""
        self.formatter = OutputFormatter()
        
        # Report generators by type
        self.generators = {
            ReportType.EXECUTIVE: self._generate_executive_report,
            ReportType.TECHNICAL: self._generate_technical_report,
            ReportType.SUMMARY: self._generate_summary_report,
            ReportType.DETAILED: self._generate_detailed_report
        }
        
        logger.debug("ReportGenerator initialized")
    
    def generate_report(
        self,
        result: EnhancedQueryResult,
        report_type: str = ReportType.TECHNICAL,
        include_raw_data: bool = False,
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """
        Generate comprehensive report for enhanced query result.
        
        Args:
            result: Enhanced query result to report on
            report_type: Type of report to generate
            include_raw_data: Include raw extracted data
            include_metadata: Include processing metadata
            
        Returns:
            Generated report as dictionary
        """
        try:
            logger.info(
                "Generating report",
                query_id=result.query_id,
                report_type=report_type,
                intent=result.intent.value
            )
            
            # Get appropriate report generator
            generator = self.generators.get(report_type, self._generate_technical_report)
            
            # Generate report
            report = generator(result, include_raw_data, include_metadata)
            
            # Add common metadata
            report.update({
                "report_metadata": {
                    "generated_at": datetime.now().isoformat(),
                    "report_type": report_type,
                    "query_id": result.query_id,
                    "generator_version": "1.0.0"
                }
            })
            
            logger.debug(
                "Report generated successfully",
                query_id=result.query_id,
                report_type=report_type,
                sections=len(report)
            )
            
            return report
            
        except Exception as e:
            logger.error(
                "Failed to generate report",
                query_id=result.query_id,
                report_type=report_type,
                error=str(e)
            )
            return self._generate_error_report(result, str(e))
    
    def _generate_executive_report(
        self,
        result: EnhancedQueryResult,
        include_raw_data: bool,
        include_metadata: bool
    ) -> Dict[str, Any]:
        """Generate executive summary report."""
        report = {
            "report_type": "Executive Summary", 
            "title": f"IFC Analysis: {result.original_query}",
            "executive_summary": self._create_executive_summary(result),
            "key_findings": self._extract_key_findings(result),
            "recommendations": result.recommendations[:5] if result.recommendations else [],
            "quality_assessment": self._create_quality_summary(result),
            "business_impact": self._assess_business_impact(result)
        }
        
        return report
    
    def _generate_technical_report(
        self,
        result: EnhancedQueryResult,
        include_raw_data: bool,
        include_metadata: bool
    ) -> Dict[str, Any]:
        """Generate technical analysis report."""
        # Use formatter for structured data
        formatted_data = self.formatter.format_result(result, "structured")
        
        report = {
            "report_type": "Technical Analysis",
            "title": f"Technical Analysis: {result.original_query}",
            "analysis_overview": self._create_analysis_overview(result),
            "methodology": self._describe_methodology(result),
            "results": formatted_data.get("main_results", {}),
            "quality_analysis": self._create_detailed_quality_analysis(result),
            "conflict_analysis": self._analyze_conflicts(result),
            "data_sources": self._summarize_data_sources(result),
            "technical_insights": result.data_insights or [],
            "recommendations": result.recommendations or [],
            "limitations": self._identify_limitations(result)
        }
        
        if include_raw_data and result.extracted_data:
            report["raw_data"] = [
                {
                    "chunk_id": data.chunk_id,
                    "entities": data.entities[:5],  # Limit for size
                    "quantities": data.quantities,
                    "extraction_confidence": data.extraction_confidence
                }
                for data in result.extracted_data[:10]  # Limit to 10 chunks
            ]
        
        if include_metadata and result.aggregation_metadata:
            report["processing_metadata"] = {
                "strategy_used": result.aggregation_metadata.strategy_used.value,
                "algorithms": result.aggregation_metadata.algorithms_used,
                "validation_level": result.aggregation_metadata.validation_level.value,
                "processing_time": result.aggregation_metadata.processing_time,
                "quality_checks": result.aggregation_metadata.quality_checks_performed
            }
        
        return report
    
    def _generate_summary_report(
        self,
        result: EnhancedQueryResult,
        include_raw_data: bool,
        include_metadata: bool
    ) -> Dict[str, Any]:
        """Generate concise summary report."""
        formatted_data = self.formatter.format_result(result, "summary")
        
        report = {
            "report_type": "Summary Report",
            "title": f"Analysis Summary: {result.original_query}",
            "summary": formatted_data.get("executive_summary", ""),
            "key_results": self._extract_key_results(result),
            "quality_indicators": formatted_data.get("quality_indicators", {}),
            "processing_summary": {
                "chunks_processed": result.total_chunks,
                "success_rate": f"{result.successful_chunks/result.total_chunks:.1%}" if result.total_chunks > 0 else "0%",
                "processing_time": f"{result.processing_time:.2f}s",
                "confidence": f"{result.confidence_score:.1%}"
            }
        }
        
        return report
    
    def _generate_detailed_report(
        self,
        result: EnhancedQueryResult,
        include_raw_data: bool,
        include_metadata: bool
    ) -> Dict[str, Any]:
        """Generate comprehensive detailed report."""
        formatted_data = self.formatter.format_result(result, "json")
        
        report = {
            "report_type": "Detailed Analysis",
            "title": f"Comprehensive Analysis: {result.original_query}",
            "analysis_overview": self._create_analysis_overview(result),
            "methodology": self._describe_methodology(result),
            "detailed_results": formatted_data.get("data", {}),
            "statistical_analysis": self._perform_statistical_analysis(result),
            "quality_analysis": self._create_detailed_quality_analysis(result),
            "conflict_resolution": self._detail_conflict_resolution(result),
            "data_validation": self._validate_results(result),
            "uncertainty_analysis": self._analyze_uncertainty(result),
            "recommendations": result.recommendations or [],
            "appendices": self._create_appendices(result)
        }
        
        if include_raw_data:
            report["raw_data"] = self._compile_raw_data(result)
        
        if include_metadata:
            report["processing_metadata"] = self._compile_processing_metadata(result)
        
        return report
    
    def _create_executive_summary(self, result: EnhancedQueryResult) -> str:
        """Create executive summary."""
        intent_desc = {
            QueryIntent.QUANTITY: "quantitative analysis",
            QueryIntent.COMPONENT: "component analysis", 
            QueryIntent.MATERIAL: "material analysis",
            QueryIntent.SPATIAL: "spatial analysis",
            QueryIntent.COST: "cost analysis"
        }.get(result.intent, "analysis")
        
        quality_level = (
            "high" if result.confidence_score > 0.8 else
            "moderate" if result.confidence_score > 0.6 else
            "low"
        )
        
        summary = (
            f"This {intent_desc} of '{result.original_query}' processed "
            f"{result.total_chunks} data sources with {result.successful_chunks} successful extractions. "
            f"The analysis achieved {quality_level} confidence ({result.confidence_score:.1%}) "
            f"with {result.completeness_score:.1%} data completeness."
        )
        
        if result.conflicts_detected:
            resolved_pct = len(result.conflicts_resolved) / len(result.conflicts_detected) * 100
            summary += f" {len(result.conflicts_detected)} data conflicts were identified and {resolved_pct:.0f}% were successfully resolved."
        
        return summary
    
    def _extract_key_findings(self, result: EnhancedQueryResult) -> List[str]:
        """Extract key findings for executive report."""
        findings = []
        
        # Add intent-specific findings
        if result.intent == QueryIntent.QUANTITY and 'quantitative' in result.structured_output:
            quant_data = result.structured_output['quantitative']
            if quant_data:
                findings.append(f"Identified {len(quant_data)} quantitative measures")
        
        elif result.intent == QueryIntent.COMPONENT and 'entities' in result.structured_output:
            entity_data = result.structured_output['entities']
            if entity_data.get('total_entities', 0) > 0:
                findings.append(f"Cataloged {entity_data['total_entities']} building components")
        
        # Add quality findings
        if result.quality_metrics and result.quality_metrics.validation_passed:
            findings.append("Analysis passed all validation criteria")
        
        if result.quality_metrics and result.quality_metrics.overall_quality > 0.8:
            findings.append("High-quality results with strong data consistency")
        
        # Add conflict resolution findings
        if result.conflicts_resolved:
            findings.append(f"Successfully resolved {len(result.conflicts_resolved)} data inconsistencies")
        
        return findings[:5]  # Limit to top 5 findings
    
    def _create_quality_summary(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Create quality assessment summary."""
        if not result.quality_metrics:
            return {"status": "Quality metrics unavailable"}
        
        qm = result.quality_metrics
        return {
            "overall_rating": self._get_quality_rating(qm.overall_quality),
            "confidence": f"{qm.confidence_score:.1%}",
            "completeness": f"{qm.completeness_score:.1%}",
            "consistency": f"{qm.consistency_score:.1%}",
            "reliability": f"{qm.reliability_score:.1%}",
            "validation_status": "PASSED" if qm.validation_passed else "FAILED"
        }
    
    def _assess_business_impact(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Assess business impact for executive report."""
        impact = {
            "data_quality": "High" if result.confidence_score > 0.8 else "Moderate" if result.confidence_score > 0.6 else "Low",
            "decision_support": "Strong" if result.quality_metrics and result.quality_metrics.validation_passed else "Limited",
            "risk_factors": []
        }
        
        # Identify risk factors
        if result.uncertainty_factors:
            impact["risk_factors"].extend(result.uncertainty_factors[:3])
        
        if result.conflicts_detected and len(result.conflicts_resolved) < len(result.conflicts_detected):
            unresolved = len(result.conflicts_detected) - len(result.conflicts_resolved)
            impact["risk_factors"].append(f"{unresolved} unresolved data conflicts")
        
        return impact
    
    def _create_analysis_overview(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Create analysis overview section."""
        return {
            "query": result.original_query,
            "intent": result.intent.value,
            "data_sources": result.total_chunks,
            "successful_sources": result.successful_chunks,
            "processing_time": f"{result.processing_time:.2f} seconds",
            "analysis_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    
    def _describe_methodology(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Describe analysis methodology."""
        methodology = {
            "approach": "7-phase advanced aggregation pipeline",
            "phases": [
                "Data extraction from IFC chunks",
                "Data normalization and standardization", 
                "Conflict detection across sources",
                "Conflict resolution using evidence-based strategies",
                "Statistical aggregation by query type",
                "Quality assessment and validation",
                "Result synthesis and enhancement"
            ]
        }
        
        if result.aggregation_metadata:
            methodology["algorithms_used"] = result.aggregation_metadata.algorithms_used
            methodology["validation_level"] = result.aggregation_metadata.validation_level.value
        
        return methodology
    
    def _create_detailed_quality_analysis(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Create detailed quality analysis."""
        if not result.quality_metrics:
            return {"status": "Quality metrics unavailable"}
        
        qm = result.quality_metrics
        return {
            "overall_quality": {
                "score": qm.overall_quality,
                "rating": self._get_quality_rating(qm.overall_quality),
                "interpretation": self._interpret_quality_score(qm.overall_quality)
            },
            "component_scores": {
                "confidence": {"score": qm.confidence_score, "interpretation": "Data reliability"},
                "completeness": {"score": qm.completeness_score, "interpretation": "Data coverage"},
                "consistency": {"score": qm.consistency_score, "interpretation": "Cross-source agreement"},
                "reliability": {"score": qm.reliability_score, "interpretation": "Source trustworthiness"}
            },
            "validation": {
                "status": "PASSED" if qm.validation_passed else "FAILED",
                "criteria": "Confidence ≥50%, Consistency ≥70%, Unresolved conflicts ≤2"
            },
            "uncertainty_analysis": {
                "uncertainty_level": qm.uncertainty_level,
                "factors": result.uncertainty_factors or []
            }
        }
    
    def _analyze_conflicts(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Analyze conflicts and resolutions."""
        if not result.conflicts_detected:
            return {"status": "No conflicts detected"}
        
        conflict_types = {}
        for conflict in result.conflicts_detected:
            ctype = conflict.conflict_type.value
            conflict_types[ctype] = conflict_types.get(ctype, 0) + 1
        
        resolution_rate = len(result.conflicts_resolved) / len(result.conflicts_detected) * 100
        
        return {
            "total_conflicts": len(result.conflicts_detected),
            "resolved_conflicts": len(result.conflicts_resolved),
            "resolution_rate": f"{resolution_rate:.1f}%",
            "conflict_types": conflict_types,
            "resolution_strategies": [
                res.strategy.value for res in result.conflicts_resolved[:5]
            ]
        }
    
    def _summarize_data_sources(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Summarize data sources."""
        return {
            "total_chunks": result.total_chunks,
            "successful_chunks": result.successful_chunks,
            "failed_chunks": result.failed_chunks,
            "success_rate": f"{result.successful_chunks/result.total_chunks:.1%}" if result.total_chunks > 0 else "0%",
            "average_confidence": f"{sum(data.extraction_confidence for data in result.extracted_data)/len(result.extracted_data):.1%}" if result.extracted_data else "N/A"
        }
    
    def _identify_limitations(self, result: EnhancedQueryResult) -> List[str]:
        """Identify analysis limitations."""
        limitations = []
        
        if result.failed_chunks > 0:
            limitations.append(f"{result.failed_chunks} data sources failed processing")
        
        if result.confidence_score < 0.7:
            limitations.append("Lower confidence due to data quality issues")
        
        if result.conflicts_detected and len(result.conflicts_resolved) < len(result.conflicts_detected):
            unresolved = len(result.conflicts_detected) - len(result.conflicts_resolved)
            limitations.append(f"{unresolved} data conflicts remain unresolved")
        
        if result.quality_metrics and result.quality_metrics.completeness_score < 0.8:
            limitations.append("Analysis may be incomplete due to sparse data")
        
        return limitations
    
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
    
    def _interpret_quality_score(self, score: float) -> str:
        """Interpret quality score."""
        if score >= 0.8:
            return "High-quality results suitable for decision making"
        elif score >= 0.6:
            return "Moderate quality results, use with caution"
        else:
            return "Low quality results, additional validation recommended"
    
    def _extract_key_results(self, result: EnhancedQueryResult) -> List[str]:
        """Extract key results for summary."""
        results = []
        
        if result.structured_output:
            if 'quantitative' in result.structured_output:
                quant_count = len(result.structured_output['quantitative'])
                results.append(f"{quant_count} quantitative measures identified")
            
            if 'entities' in result.structured_output:
                entity_count = result.structured_output['entities'].get('total_entities', 0)
                if entity_count > 0:
                    results.append(f"{entity_count} entities cataloged")
        
        if result.data_insights:
            results.extend(result.data_insights[:2])
        
        return results[:4]  # Limit to 4 key results
    
    def _perform_statistical_analysis(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Perform statistical analysis for detailed report."""
        stats = {"status": "No statistical analysis available"}
        
        if result.extracted_data and result.intent == QueryIntent.QUANTITY:
            # Analyze quantitative data statistics
            all_quantities = {}
            for data in result.extracted_data:
                for key, value in data.quantities.items():
                    if isinstance(value, (int, float)):
                        if key not in all_quantities:
                            all_quantities[key] = []
                        all_quantities[key].append(value)
            
            if all_quantities:
                stats = {"quantity_statistics": {}}
                for key, values in all_quantities.items():
                    if len(values) > 1:
                        import statistics
                        stats["quantity_statistics"][key] = {
                            "count": len(values),
                            "mean": statistics.mean(values),
                            "median": statistics.median(values),
                            "std_dev": statistics.stdev(values) if len(values) > 1 else 0,
                            "min": min(values),
                            "max": max(values)
                        }
        
        return stats
    
    def _detail_conflict_resolution(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Detail conflict resolution process."""
        if not result.conflicts_resolved:
            return {"status": "No conflicts required resolution"}
        
        resolution_details = []
        for resolution in result.conflicts_resolved[:5]:  # Limit to 5 examples
            resolution_details.append({
                "conflict_type": resolution.conflict.conflict_type.value,
                "resolution_strategy": resolution.strategy.value,
                "confidence": resolution.confidence,
                "reasoning": resolution.reasoning
            })
        
        return {
            "resolution_examples": resolution_details,
            "total_resolved": len(result.conflicts_resolved)
        }
    
    def _validate_results(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Validate analysis results."""
        validation = {
            "validation_performed": bool(result.quality_metrics),
            "validation_passed": result.quality_metrics.validation_passed if result.quality_metrics else False
        }
        
        if result.quality_metrics:
            validation.update({
                "confidence_threshold": "≥50%",
                "consistency_threshold": "≥70%", 
                "conflict_threshold": "≤2 unresolved",
                "actual_confidence": f"{result.quality_metrics.confidence_score:.1%}",
                "actual_consistency": f"{result.quality_metrics.consistency_score:.1%}",
                "unresolved_conflicts": len(result.conflicts_detected) - len(result.conflicts_resolved)
            })
        
        return validation
    
    def _analyze_uncertainty(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Analyze uncertainty factors."""
        uncertainty = {
            "uncertainty_level": result.quality_metrics.uncertainty_level if result.quality_metrics else "Unknown",
            "uncertainty_sources": result.uncertainty_factors or [],
            "impact_assessment": "Low" if result.confidence_score > 0.8 else "Moderate" if result.confidence_score > 0.6 else "High"
        }
        
        return uncertainty
    
    def _create_appendices(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Create report appendices."""
        appendices = {}
        
        if result.aggregation_metadata:
            appendices["processing_details"] = {
                "algorithms": result.aggregation_metadata.algorithms_used,
                "processing_time": result.aggregation_metadata.processing_time,
                "validation_checks": result.aggregation_metadata.quality_checks_performed
            }
        
        if result.data_insights:
            appendices["additional_insights"] = result.data_insights
        
        return appendices
    
    def _compile_raw_data(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Compile raw data for detailed report."""
        if not result.extracted_data:
            return {"status": "No raw data available"}
        
        return {
            "extraction_summary": {
                "total_chunks": len(result.extracted_data),
                "average_confidence": sum(d.extraction_confidence for d in result.extracted_data) / len(result.extracted_data),
                "quality_distribution": {
                    "high": len([d for d in result.extracted_data if d.data_quality == "high"]),
                    "medium": len([d for d in result.extracted_data if d.data_quality == "medium"]),
                    "low": len([d for d in result.extracted_data if d.data_quality == "low"])
                }
            },
            "sample_extractions": [
                {
                    "chunk_id": data.chunk_id,
                    "confidence": data.extraction_confidence,
                    "entities_count": len(data.entities),
                    "quantities_count": len(data.quantities)
                }
                for data in result.extracted_data[:10]
            ]
        }
    
    def _compile_processing_metadata(self, result: EnhancedQueryResult) -> Dict[str, Any]:
        """Compile processing metadata."""
        if not result.aggregation_metadata:
            return {"status": "No processing metadata available"}
        
        am = result.aggregation_metadata
        return {
            "aggregation_strategy": am.strategy_used.value,
            "processing_timeline": {
                "total_time": am.processing_time,
                "chunks_processed": am.chunks_processed,
                "processing_rate": f"{am.chunks_processed/am.processing_time:.1f} chunks/second" if am.processing_time > 0 else "N/A"
            },
            "quality_assurance": {
                "validation_level": am.validation_level.value,
                "checks_performed": am.quality_checks_performed,
                "conflicts_handled": {
                    "detected": am.conflicts_detected,
                    "resolved": am.conflicts_resolved
                }
            },
            "algorithms": am.algorithms_used
        }
    
    def _generate_error_report(self, result: EnhancedQueryResult, error: str) -> Dict[str, Any]:
        """Generate error report when main generation fails."""
        return {
            "report_type": "Error Report",
            "error": f"Failed to generate report: {error}",
            "query_id": result.query_id,
            "query": result.original_query,
            "basic_info": {
                "chunks_processed": result.total_chunks,
                "successful_chunks": result.successful_chunks,
                "confidence": result.confidence_score
            },
            "generated_at": datetime.now().isoformat()
        }