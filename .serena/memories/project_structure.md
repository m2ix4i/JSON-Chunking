# Project Structure Overview

## Directory Layout
```
JSON-Chunking/
├── src/ifc_json_chunking/          # Main package source code
│   ├── __init__.py                 # Package initialization with exports
│   ├── config.py                   # Configuration management with dataclass
│   ├── core.py                     # Core chunking engine
│   └── exceptions.py               # Custom exception hierarchy
├── tests/                          # Test directory (currently minimal)
│   └── __init__.py                 # Test package initialization
├── docs/                           # Documentation
│   └── scratchpad-issue-1-project-foundation.md
├── .claude/                        # Claude configuration
├── .serena/                        # Serena MCP configuration
├── pyproject.toml                  # Poetry configuration and tool settings
├── Dockerfile                      # Multi-stage Docker build
└── docker-compose.yml              # Development environment orchestration
```

## Core Modules

### src/ifc_json_chunking/config.py
- `Config` dataclass with environment-based configuration
- Handles chunking settings, processing, storage, and logging
- Validation and file-based config loading support
- Environment variables integration

### src/ifc_json_chunking/core.py  
- `ChunkingEngine` class (implementation in progress)
- Main processing logic for IFC JSON chunking

### src/ifc_json_chunking/exceptions.py
- Custom exception hierarchy:
  - `IFCChunkingError` (base)
  - `ConfigurationError`
  - `ProcessingError` 
  - `ChunkingError`
  - `ValidationError`
  - `StorageError`
  - `TimeoutError`

### src/ifc_json_chunking/__init__.py
- Package metadata exports (`__version__`, `__author__`, `__email__`)
- Public API surface via `__all__`

## Configuration Files

### pyproject.toml
- Poetry dependency management
- Tool configurations (black, isort, mypy, pytest, coverage, ruff)
- Project metadata and build settings
- Development, testing, and optional dependencies

### Dockerfile
- Multi-stage build (base → development → production → testing → linting)
- Poetry-based dependency management
- Non-root user configuration
- Health checks and proper CMD setup

### docker-compose.yml
- Development stack with PostgreSQL and Redis
- Service profiles for different environments
- Volume management and networking
- Optional monitoring with Prometheus/Grafana

## Missing Components (Not Yet Implemented)
- CLI module (`cli.py`) - referenced in pyproject.toml scripts
- Comprehensive test suite
- README.md
- GitHub Actions CI/CD
- Pre-commit configuration