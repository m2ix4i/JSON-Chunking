"""
Result validation system for query processing.

This module provides comprehensive validation of query results
including completeness, accuracy, and consistency checks.
"""

import re
from typing import Any, Dict, List, Optional, Set, Tuple
from dataclasses import dataclass
from enum import Enum

import structlog

from ..query.types import QueryResult, QueryIntent, ChunkResult

logger = structlog.get_logger(__name__)


class ValidationSeverity(Enum):
    """Severity levels for validation issues."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ValidationIssue:
    """Individual validation issue."""
    
    code: str
    severity: ValidationSeverity
    message: str
    field: Optional[str] = None
    chunk_id: Optional[str] = None
    suggestion: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "code": self.code,
            "severity": self.severity.value,
            "message": self.message,
            "field": self.field,
            "chunk_id": self.chunk_id,
            "suggestion": self.suggestion
        }


@dataclass
class ValidationResult:
    """Result of validation process."""
    
    is_valid: bool
    overall_score: float  # 0.0 to 1.0
    issues: List[ValidationIssue]
    
    # Quality metrics
    completeness_score: float = 0.0
    accuracy_score: float = 0.0
    consistency_score: float = 0.0
    relevance_score: float = 0.0
    
    # Statistics
    total_checks: int = 0
    passed_checks: int = 0
    warnings: int = 0
    errors: int = 0
    
    def __post_init__(self):
        """Calculate derived metrics."""
        self.warnings = len([i for i in self.issues if i.severity == ValidationSeverity.WARNING])
        self.errors = len([i for i in self.issues if i.severity in [ValidationSeverity.ERROR, ValidationSeverity.CRITICAL]])
    
    @property
    def has_critical_issues(self) -> bool:
        """Check if there are critical validation issues."""
        return any(issue.severity == ValidationSeverity.CRITICAL for issue in self.issues)
    
    @property
    def pass_rate(self) -> float:
        """Calculate check pass rate."""
        return (self.passed_checks / self.total_checks) if self.total_checks > 0 else 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "is_valid": self.is_valid,
            "overall_score": self.overall_score,
            "completeness_score": self.completeness_score,
            "accuracy_score": self.accuracy_score,
            "consistency_score": self.consistency_score,
            "relevance_score": self.relevance_score,
            "total_checks": self.total_checks,
            "passed_checks": self.passed_checks,
            "pass_rate": self.pass_rate,
            "warnings": self.warnings,
            "errors": self.errors,
            "has_critical_issues": self.has_critical_issues,
            "issues": [issue.to_dict() for issue in self.issues]
        }


class ResultValidator:
    """
    Comprehensive result validation system.
    
    Validates query results for completeness, accuracy, consistency,
    and relevance with intent-specific validation rules.
    """
    
    def __init__(self):
        """Initialize result validator."""
        # Validation thresholds
        self.min_confidence_threshold = 0.3
        self.min_completeness_threshold = 0.5
        self.min_consistency_threshold = 0.6
        
        # Intent-specific validation rules
        self._intent_validators = {
            QueryIntent.QUANTITY: self._validate_quantity_result,
            QueryIntent.COMPONENT: self._validate_component_result,
            QueryIntent.MATERIAL: self._validate_material_result,
            QueryIntent.SPATIAL: self._validate_spatial_result,
            QueryIntent.COST: self._validate_cost_result,
            QueryIntent.RELATIONSHIP: self._validate_relationship_result,
            QueryIntent.PROPERTY: self._validate_property_result
        }
        
        logger.info("ResultValidator initialized")
    
    def validate_result(self, result: QueryResult) -> ValidationResult:
        """
        Validate a query result comprehensively.
        
        Args:
            result: Query result to validate
            
        Returns:
            ValidationResult with detailed analysis
        """
        issues = []
        total_checks = 0
        passed_checks = 0
        
        logger.debug(
            "Starting result validation",
            query_id=result.query_id,
            intent=result.intent.value
        )
        
        # Basic structural validation
        structural_issues, struct_total, struct_passed = self._validate_structure(result)
        issues.extend(structural_issues)
        total_checks += struct_total
        passed_checks += struct_passed
        
        # Content validation
        content_issues, content_total, content_passed = self._validate_content(result)
        issues.extend(content_issues)
        total_checks += content_total
        passed_checks += content_passed
        
        # Intent-specific validation
        intent_issues, intent_total, intent_passed = self._validate_intent_specific(result)
        issues.extend(intent_issues)
        total_checks += intent_total
        passed_checks += intent_passed
        
        # Performance validation
        perf_issues, perf_total, perf_passed = self._validate_performance(result)
        issues.extend(perf_issues)
        total_checks += perf_total
        passed_checks += perf_passed
        
        # Calculate quality scores
        completeness_score = self._calculate_completeness_score(result, issues)
        accuracy_score = self._calculate_accuracy_score(result, issues)
        consistency_score = self._calculate_consistency_score(result, issues)
        relevance_score = self._calculate_relevance_score(result, issues)
        
        # Calculate overall score
        overall_score = (
            completeness_score * 0.3 +
            accuracy_score * 0.3 +
            consistency_score * 0.2 +
            relevance_score * 0.2
        )
        
        # Determine if result is valid
        critical_issues = [i for i in issues if i.severity == ValidationSeverity.CRITICAL]
        is_valid = (
            len(critical_issues) == 0 and
            overall_score >= 0.5 and
            completeness_score >= self.min_completeness_threshold
        )
        
        validation_result = ValidationResult(
            is_valid=is_valid,
            overall_score=overall_score,
            issues=issues,
            completeness_score=completeness_score,
            accuracy_score=accuracy_score,
            consistency_score=consistency_score,
            relevance_score=relevance_score,
            total_checks=total_checks,
            passed_checks=passed_checks
        )
        
        logger.info(
            "Result validation completed",
            query_id=result.query_id,
            is_valid=is_valid,
            overall_score=overall_score,
            issues_count=len(issues)
        )
        
        return validation_result
    
    def _validate_structure(self, result: QueryResult) -> Tuple[List[ValidationIssue], int, int]:
        """Validate basic structural requirements."""
        issues = []
        total_checks = 8
        passed_checks = 0
        
        # Check required fields
        if not result.query_id:
            issues.append(ValidationIssue(
                code="STRUCT_001",
                severity=ValidationSeverity.CRITICAL,
                message="Missing query_id",
                field="query_id"
            ))
        else:
            passed_checks += 1
        
        if not result.original_query:
            issues.append(ValidationIssue(
                code="STRUCT_002",
                severity=ValidationSeverity.CRITICAL,
                message="Missing original_query",
                field="original_query"
            ))
        else:
            passed_checks += 1
        
        if not result.answer:
            issues.append(ValidationIssue(
                code="STRUCT_003",
                severity=ValidationSeverity.ERROR,
                message="Empty answer field",
                field="answer",
                suggestion="Ensure query processing generates meaningful response"
            ))
        else:
            passed_checks += 1
        
        # Check numeric fields
        if result.total_chunks < 0:
            issues.append(ValidationIssue(
                code="STRUCT_004",
                severity=ValidationSeverity.ERROR,
                message="Invalid total_chunks value",
                field="total_chunks"
            ))
        else:
            passed_checks += 1
        
        if result.successful_chunks < 0 or result.successful_chunks > result.total_chunks:
            issues.append(ValidationIssue(
                code="STRUCT_005",
                severity=ValidationSeverity.ERROR,
                message="Invalid successful_chunks value",
                field="successful_chunks"
            ))
        else:
            passed_checks += 1
        
        if result.processing_time < 0:
            issues.append(ValidationIssue(
                code="STRUCT_006",
                severity=ValidationSeverity.WARNING,
                message="Invalid processing_time value",
                field="processing_time"
            ))
        else:
            passed_checks += 1
        
        if not 0 <= result.confidence_score <= 1:
            issues.append(ValidationIssue(
                code="STRUCT_007",
                severity=ValidationSeverity.WARNING,
                message="Confidence score out of valid range (0-1)",
                field="confidence_score"
            ))
        else:
            passed_checks += 1
        
        # Check chunk results consistency
        if len(result.chunk_results) != result.total_chunks:
            issues.append(ValidationIssue(
                code="STRUCT_008",
                severity=ValidationSeverity.WARNING,
                message="Chunk results count doesn't match total_chunks",
                field="chunk_results",
                suggestion="Verify chunk processing completion"
            ))
        else:
            passed_checks += 1
        
        return issues, total_checks, passed_checks
    
    def _validate_content(self, result: QueryResult) -> Tuple[List[ValidationIssue], int, int]:
        """Validate content quality and completeness."""
        issues = []
        total_checks = 6
        passed_checks = 0
        
        # Check answer length and quality
        if len(result.answer.strip()) < 10:
            issues.append(ValidationIssue(
                code="CONTENT_001",
                severity=ValidationSeverity.WARNING,
                message="Answer appears too short",
                field="answer",
                suggestion="Ensure comprehensive response generation"
            ))
        else:
            passed_checks += 1
        
        # Check for placeholder or error content
        error_indicators = ["error", "failed", "unavailable", "not found", "keine daten"]
        if any(indicator in result.answer.lower() for indicator in error_indicators):
            issues.append(ValidationIssue(
                code="CONTENT_002",
                severity=ValidationSeverity.WARNING,
                message="Answer contains error indicators",
                field="answer"
            ))
        else:
            passed_checks += 1
        
        # Check chunk result quality
        failed_chunks = [r for r in result.chunk_results if r.status != "completed"]
        if len(failed_chunks) > result.total_chunks * 0.5:
            issues.append(ValidationIssue(
                code="CONTENT_003",
                severity=ValidationSeverity.ERROR,
                message="More than 50% of chunks failed processing",
                field="chunk_results",
                suggestion="Review chunk processing pipeline for issues"
            ))
        else:
            passed_checks += 1
        
        # Check confidence levels
        low_confidence_chunks = [
            r for r in result.chunk_results 
            if r.confidence_score < self.min_confidence_threshold
        ]
        if len(low_confidence_chunks) > result.total_chunks * 0.3:
            issues.append(ValidationIssue(
                code="CONTENT_004",
                severity=ValidationSeverity.WARNING,
                message="Many chunks have low confidence scores",
                field="chunk_results",
                suggestion="Review prompt quality and chunk content"
            ))
        else:
            passed_checks += 1
        
        # Check for content diversity
        if result.chunk_results:
            unique_contents = set(r.content[:100] for r in result.chunk_results if r.content)
            if len(unique_contents) < max(1, len(result.chunk_results) * 0.3):
                issues.append(ValidationIssue(
                    code="CONTENT_005",
                    severity=ValidationSeverity.INFO,
                    message="Limited content diversity across chunks",
                    field="chunk_results",
                    suggestion="Review chunk segmentation strategy"
                ))
            else:
                passed_checks += 1
        else:
            passed_checks += 1
        
        # Check aggregated data presence
        if not result.aggregated_data:
            issues.append(ValidationIssue(
                code="CONTENT_006",
                severity=ValidationSeverity.INFO,
                message="No aggregated data available",
                field="aggregated_data"
            ))
        else:
            passed_checks += 1
        
        return issues, total_checks, passed_checks
    
    def _validate_intent_specific(self, result: QueryResult) -> Tuple[List[ValidationIssue], int, int]:
        """Validate result based on specific query intent."""
        validator = self._intent_validators.get(result.intent)
        
        if validator:
            return validator(result)
        else:
            # Generic validation for unknown intents
            return [], 1, 1
    
    def _validate_quantity_result(self, result: QueryResult) -> Tuple[List[ValidationIssue], int, int]:
        """Validate quantity-specific results."""
        issues = []
        total_checks = 3
        passed_checks = 0
        
        # Check for numeric data in answer
        numbers = re.findall(r'\d+(?:\.\d+)?', result.answer)
        if not numbers:
            issues.append(ValidationIssue(
                code="QUANTITY_001",
                severity=ValidationSeverity.WARNING,
                message="No numeric values found in quantity query answer",
                field="answer",
                suggestion="Ensure quantitative analysis produces numeric results"
            ))
        else:
            passed_checks += 1
        
        # Check for units
        unit_patterns = [r'\b(kubikmeter|m³|cbm|quadratmeter|m²|qm|meter|m|stück|anzahl)\b']
        has_units = any(re.search(pattern, result.answer.lower()) for pattern in unit_patterns)
        if not has_units:
            issues.append(ValidationIssue(
                code="QUANTITY_002",
                severity=ValidationSeverity.INFO,
                message="No measurement units detected in quantity answer",
                field="answer",
                suggestion="Include appropriate units in quantitative responses"
            ))
        else:
            passed_checks += 1
        
        # Check aggregated data for quantities
        if result.aggregated_data and "quantities" not in result.aggregated_data:
            issues.append(ValidationIssue(
                code="QUANTITY_003",
                severity=ValidationSeverity.INFO,
                message="No structured quantity data in aggregated results",
                field="aggregated_data"
            ))
        else:
            passed_checks += 1
        
        return issues, total_checks, passed_checks
    
    def _validate_component_result(self, result: QueryResult) -> Tuple[List[ValidationIssue], int, int]:
        """Validate component-specific results."""
        issues = []
        total_checks = 2
        passed_checks = 0
        
        # Check for component terminology
        component_terms = ["türen", "fenster", "wände", "stützen", "träger", "component", "element"]
        has_components = any(term in result.answer.lower() for term in component_terms)
        if not has_components:
            issues.append(ValidationIssue(
                code="COMPONENT_001",
                severity=ValidationSeverity.WARNING,
                message="No component terminology found in component query answer",
                field="answer"
            ))
        else:
            passed_checks += 1
        
        # Check for structured component data
        if result.aggregated_data and "components" not in result.aggregated_data:
            issues.append(ValidationIssue(
                code="COMPONENT_002",
                severity=ValidationSeverity.INFO,
                message="No structured component data in aggregated results",
                field="aggregated_data"
            ))
        else:
            passed_checks += 1
        
        return issues, total_checks, passed_checks
    
    def _validate_material_result(self, result: QueryResult) -> Tuple[List[ValidationIssue], int, int]:
        """Validate material-specific results."""
        issues = []
        total_checks = 2
        passed_checks = 0
        
        # Check for material terminology
        material_terms = ["beton", "stahl", "holz", "glas", "material", "baustoff"]
        has_materials = any(term in result.answer.lower() for term in material_terms)
        if not has_materials:
            issues.append(ValidationIssue(
                code="MATERIAL_001",
                severity=ValidationSeverity.WARNING,
                message="No material terminology found in material query answer",
                field="answer"
            ))
        else:
            passed_checks += 1
        
        # Check for material properties
        property_terms = ["eigenschaft", "dichte", "festigkeit", "property", "characteristic"]
        has_properties = any(term in result.answer.lower() for term in property_terms)
        if not has_properties:
            issues.append(ValidationIssue(
                code="MATERIAL_002",
                severity=ValidationSeverity.INFO,
                message="No material property information detected",
                field="answer"
            ))
        else:
            passed_checks += 1
        
        return issues, total_checks, passed_checks
    
    def _validate_spatial_result(self, result: QueryResult) -> Tuple[List[ValidationIssue], int, int]:
        """Validate spatial-specific results."""
        issues = []
        total_checks = 2
        passed_checks = 0
        
        # Check for spatial terminology
        spatial_terms = ["raum", "stock", "etage", "geschoss", "bereich", "zone", "location"]
        has_spatial = any(term in result.answer.lower() for term in spatial_terms)
        if not has_spatial:
            issues.append(ValidationIssue(
                code="SPATIAL_001",
                severity=ValidationSeverity.WARNING,
                message="No spatial terminology found in spatial query answer", 
                field="answer"
            ))
        else:
            passed_checks += 1
        
        # Check for location identifiers
        location_patterns = [r'\br\d+\b', r'\b\d+\.\s*stock\b', r'\betage\s*\d+\b']
        has_locations = any(re.search(pattern, result.answer.lower()) for pattern in location_patterns)
        if not has_locations:
            issues.append(ValidationIssue(
                code="SPATIAL_002",
                severity=ValidationSeverity.INFO,
                message="No specific location identifiers detected",
                field="answer"
            ))
        else:
            passed_checks += 1
        
        return issues, total_checks, passed_checks
    
    def _validate_cost_result(self, result: QueryResult) -> Tuple[List[ValidationIssue], int, int]:
        """Validate cost-specific results."""
        issues = []
        total_checks = 2
        passed_checks = 0
        
        # Check for cost terminology
        cost_terms = ["kosten", "preis", "euro", "€", "budget", "cost", "price"]
        has_costs = any(term in result.answer.lower() for term in cost_terms)
        if not has_costs:
            issues.append(ValidationIssue(
                code="COST_001",
                severity=ValidationSeverity.WARNING,
                message="No cost terminology found in cost query answer",
                field="answer"
            ))
        else:
            passed_checks += 1
        
        # Check for numeric cost values
        cost_patterns = [r'\d+(?:\.\d+)?\s*(?:euro|€|\$)', r'€\s*\d+', r'\d+\s*€']
        has_cost_values = any(re.search(pattern, result.answer.lower()) for pattern in cost_patterns)
        if not has_cost_values:
            issues.append(ValidationIssue(
                code="COST_002",
                severity=ValidationSeverity.INFO,
                message="No specific cost values detected",
                field="answer"
            ))
        else:
            passed_checks += 1
        
        return issues, total_checks, passed_checks
    
    def _validate_relationship_result(self, result: QueryResult) -> Tuple[List[ValidationIssue], int, int]:
        """Validate relationship-specific results."""
        issues = []
        total_checks = 1
        passed_checks = 0
        
        # Check for relationship terminology
        relation_terms = ["verbindung", "beziehung", "zwischen", "relationship", "connection"]
        has_relations = any(term in result.answer.lower() for term in relation_terms)
        if not has_relations:
            issues.append(ValidationIssue(
                code="RELATION_001",
                severity=ValidationSeverity.WARNING,
                message="No relationship terminology found in relationship query answer",
                field="answer"
            ))
        else:
            passed_checks += 1
        
        return issues, total_checks, passed_checks
    
    def _validate_property_result(self, result: QueryResult) -> Tuple[List[ValidationIssue], int, int]:
        """Validate property-specific results."""
        issues = []
        total_checks = 1
        passed_checks = 0
        
        # Check for property terminology
        property_terms = ["eigenschaft", "attribut", "parameter", "wert", "property", "attribute"]
        has_properties = any(term in result.answer.lower() for term in property_terms)
        if not has_properties:
            issues.append(ValidationIssue(
                code="PROPERTY_001",
                severity=ValidationSeverity.WARNING,
                message="No property terminology found in property query answer",
                field="answer"
            ))
        else:
            passed_checks += 1
        
        return issues, total_checks, passed_checks
    
    def _validate_performance(self, result: QueryResult) -> Tuple[List[ValidationIssue], int, int]:
        """Validate performance aspects."""
        issues = []
        total_checks = 3
        passed_checks = 0
        
        # Check processing time
        if result.processing_time > 300:  # 5 minutes
            issues.append(ValidationIssue(
                code="PERF_001",
                severity=ValidationSeverity.WARNING,
                message="Processing time exceeds recommended threshold (5 minutes)",
                field="processing_time",
                suggestion="Optimize query processing pipeline"
            ))
        else:
            passed_checks += 1
        
        # Check success rate
        if result.success_rate < 70:
            issues.append(ValidationIssue(
                code="PERF_002",
                severity=ValidationSeverity.ERROR,
                message="Low chunk processing success rate",
                field="success_rate",
                suggestion="Review chunk processing errors"
            ))
        else:
            passed_checks += 1
        
        # Check token efficiency
        if result.total_chunks > 0:
            avg_tokens_per_chunk = result.total_tokens / result.total_chunks
            if avg_tokens_per_chunk > 10000:  # High token usage
                issues.append(ValidationIssue(
                    code="PERF_003",
                    severity=ValidationSeverity.INFO,
                    message="High average token usage per chunk",
                    field="total_tokens",
                    suggestion="Consider prompt optimization"
                ))
            else:
                passed_checks += 1
        else:
            passed_checks += 1
        
        return issues, total_checks, passed_checks
    
    def _calculate_completeness_score(self, result: QueryResult, issues: List[ValidationIssue]) -> float:
        """Calculate completeness score."""
        # Base score from success rate
        base_score = result.success_rate / 100
        
        # Penalties for missing content
        content_penalties = 0.0
        for issue in issues:
            if issue.code.startswith("CONTENT_") and issue.severity in [ValidationSeverity.ERROR, ValidationSeverity.CRITICAL]:
                content_penalties += 0.1
        
        return max(0.0, base_score - content_penalties)
    
    def _calculate_accuracy_score(self, result: QueryResult, issues: List[ValidationIssue]) -> float:
        """Calculate accuracy score."""
        # Base score from confidence
        base_score = result.confidence_score
        
        # Penalties for accuracy issues
        accuracy_penalties = 0.0
        for issue in issues:
            if issue.severity == ValidationSeverity.CRITICAL:
                accuracy_penalties += 0.2
            elif issue.severity == ValidationSeverity.ERROR:
                accuracy_penalties += 0.1
        
        return max(0.0, base_score - accuracy_penalties)
    
    def _calculate_consistency_score(self, result: QueryResult, issues: List[ValidationIssue]) -> float:
        """Calculate consistency score."""
        # Base score from structural validity
        structural_issues = [i for i in issues if i.code.startswith("STRUCT_")]
        if not structural_issues:
            base_score = 1.0
        else:
            error_issues = [i for i in structural_issues if i.severity in [ValidationSeverity.ERROR, ValidationSeverity.CRITICAL]]
            base_score = max(0.0, 1.0 - len(error_issues) * 0.15)
        
        return base_score
    
    def _calculate_relevance_score(self, result: QueryResult, issues: List[ValidationIssue]) -> float:
        """Calculate relevance score."""
        # Base score from intent-specific validation
        intent_issues = [i for i in issues if i.code.startswith(result.intent.value.upper())]
        if not intent_issues:
            base_score = 1.0
        else:
            warning_issues = [i for i in intent_issues if i.severity == ValidationSeverity.WARNING]
            base_score = max(0.0, 1.0 - len(warning_issues) * 0.1)
        
        return base_score