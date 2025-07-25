# Task Completion Checklist

## Code Quality Requirements
When completing any coding task, ensure the following steps are completed:

### 1. Code Formatting and Style
- [ ] Run `poetry run black .` - Code formatting
- [ ] Run `poetry run isort .` - Import sorting
- [ ] Verify line length ≤ 100 characters
- [ ] Check docstrings follow Google style

### 2. Type Checking and Linting  
- [ ] Run `poetry run mypy src/` - Static type checking (must pass)
- [ ] Run `poetry run ruff check .` - Linting (must pass with no violations)
- [ ] Ensure all functions have proper type hints
- [ ] Add `# type: ignore` comments only when absolutely necessary with explanation

### 3. Testing Requirements
- [ ] Run `poetry run pytest` - All tests must pass
- [ ] Maintain ≥80% test coverage (`--cov-fail-under=80`)
- [ ] Add unit tests for new functions/classes
- [ ] Add integration tests for new features
- [ ] Test both success and error scenarios

### 4. Documentation
- [ ] Update docstrings for modified functions/classes
- [ ] Add type hints to all new functions
- [ ] Update `__all__` exports in `__init__.py` if needed
- [ ] Update README.md if public API changes

### 5. Configuration Validation
- [ ] Ensure environment variables are properly handled
- [ ] Validate configuration in `Config` class if settings added
- [ ] Test with different environment configurations

### 6. Error Handling
- [ ] Use appropriate custom exceptions from `exceptions.py`
- [ ] Add structured logging for important operations
- [ ] Ensure graceful error handling and proper error messages

### 7. Pre-commit Validation
```bash
# Run complete validation before commit
poetry run black --check . && \
poetry run isort --check-only . && \
poetry run mypy src/ && \
poetry run ruff check . && \
poetry run pytest --cov=src/ifc_json_chunking --cov-fail-under=80
```

### 8. Docker Validation (Optional but Recommended)
- [ ] Test with `docker-compose --profile testing up test`
- [ ] Verify lint stage passes: `docker-compose --profile linting up lint`

## Acceptance Criteria
- All quality checks pass without warnings or errors
- Test coverage maintained at ≥80%
- No new linting violations introduced
- Type checking passes completely
- Documentation is updated and accurate