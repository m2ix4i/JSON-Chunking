# Code Style and Conventions

## Formatting Standards
- **Line Length**: 100 characters (configured in black and isort)
- **Code Formatter**: Black with Python 3.9+ target
- **Import Sorting**: isort with black profile
- **Multi-line Output**: 3 (Vertical Hanging Indent)
- **Trailing Commas**: Enabled for better diffs

## Type Checking (mypy)
- **Python Version**: 3.9
- **Strict Settings**: 
  - `disallow_untyped_defs = true`
  - `disallow_incomplete_defs = true` 
  - `check_untyped_defs = true`
  - `disallow_untyped_decorators = true`
  - `no_implicit_optional = true`
- **Warnings**: return_any, unused_configs, redundant_casts, unused_ignores, no_return, unreachable
- **Test Overrides**: Tests allow untyped defs for flexibility

## Linting (ruff)
- **Target Version**: Python 3.9
- **Selected Rules**: E (pycodestyle errors), W (warnings), F (pyflakes), I (isort), B (bugbear), C4 (comprehensions), UP (pyupgrade)
- **Ignored**: E501 (line length handled by black), B008 (function calls in defaults), C901 (complexity)

## Documentation Standards
- **Docstrings**: Google-style docstrings expected
- **Type Hints**: Required for all function signatures
- **Module Docstrings**: Required for all modules
- **Class Documentation**: Required with purpose and key attributes

## Project Structure
- **Source**: `src/ifc_json_chunking/` package layout
- **Tests**: `tests/` directory with pytest
- **Documentation**: `docs/` directory 
- **Package Name**: Snake case (`ifc_json_chunking`)
- **Module Organization**: Domain-driven with clear separation of concerns

## File Naming
- **Python Files**: Snake case (e.g., `config.py`, `core.py`)
- **Test Files**: `test_*.py` or `*_test.py` patterns
- **Package Init**: `__init__.py` files with explicit exports via `__all__`

## Import Conventions
- **Source Paths**: ["src", "tests"] for isort
- **Trailing Commas**: Required in multi-line imports
- **Line Wrapping**: Use parentheses with proper indentation