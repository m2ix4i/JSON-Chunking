"""
Result validator for aggregated data validation.

This module provides validation capabilities for aggregated results,
ensuring data integrity and quality before final output.
"""

from typing import Any, Dict, List, Tuple

import structlog

from ...types.aggregation_types import QualityMetrics, ValidationLevel

logger = structlog.get_logger(__name__)


class ResultValidator:
    """
    Validates aggregated results for quality and consistency.
    
    Performs validation checks on aggregated data to ensure
    reliability and accuracy of final results.
    """

    def __init__(self, validation_level: ValidationLevel = ValidationLevel.STANDARD):
        """Initialize result validator."""
        self.validation_level = validation_level
        logger.info("ResultValidator initialized", validation_level=validation_level.value)

    async def validate_results(
        self,
        aggregated_data: Dict[str, Any],
        quality_metrics: QualityMetrics
    ) -> Tuple[bool, List[str]]:
        """
        Validate aggregated results.
        
        Args:
            aggregated_data: Aggregated data to validate
            quality_metrics: Quality metrics for validation
            
        Returns:
            Tuple of (validation_passed, validation_issues)
        """
        validation_issues = []

        # Basic quality checks
        if quality_metrics.confidence_score < 0.3:
            validation_issues.append("Low confidence score")

        if quality_metrics.completeness_score < 0.5:
            validation_issues.append("Low completeness score")

        # Data consistency checks
        if not aggregated_data:
            validation_issues.append("No aggregated data")

        validation_passed = len(validation_issues) == 0

        return validation_passed, validation_issues
