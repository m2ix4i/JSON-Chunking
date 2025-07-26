# Development Scripts

This directory contains development and testing scripts used during the development process.

## Files

- `debug_intent_test.py` - Quick debug script for intent classifier pattern matching
- `test_api.py` - Manual FastAPI backend testing script
- `test_phase1_simple.py` - Phase 1 IFC Schema implementation validation
- `test_phase2_chunking_strategies.py` - Phase 2 chunking strategies testing
- `test_phase3_integration.py` - Phase 3 integration testing
- `test_phase3_simplified.py` - Simplified Phase 3 testing
- `test_advanced_aggregation_integration.py` - Advanced aggregation testing

## Usage

These scripts are intended for development and manual testing purposes. For proper test execution, use the official test suite in the `tests/` directory:

```bash
# Run official tests
pytest tests/

# Run specific development script
python dev-scripts/test_api.py
```

## Note

These scripts were moved from the project root to keep the main directory clean. They are preserved for historical reference and potential future use during development.