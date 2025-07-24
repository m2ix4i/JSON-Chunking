# Technology Stack

## Package Management
- **Poetry**: Modern Python dependency management and packaging
- **pyproject.toml**: Project configuration and metadata

## Core Dependencies
- **Python**: 3.9+ with async support
- **aiofiles**: Async file I/O operations
- **aiohttp**: Async HTTP client/server
- **pydantic**: Data validation and settings management  
- **structlog**: Structured logging
- **typer**: CLI framework
- **rich**: Rich terminal output
- **ujson**: Fast JSON processing
- **python-dotenv**: Environment variable management

## Development Dependencies
- **Testing**: pytest, pytest-asyncio, pytest-cov, pytest-mock, pytest-xdist
- **Code Quality**: black, isort, mypy, ruff
- **Pre-commit**: pre-commit hooks
- **Documentation**: sphinx, sphinx-rtd-theme, myst-parser
- **Development Tools**: ipython, ipdb

## Infrastructure
- **Docker**: Multi-stage containerization (development/production/testing/linting)
- **Docker Compose**: Local development environment
- **PostgreSQL**: Metadata storage
- **Redis**: Caching and task queues
- **Prometheus + Grafana**: Monitoring (optional)

## Optional Features
- **asyncio-mqtt**: MQTT messaging support

## Target Environment
- **OS**: OS Independent (with macOS Darwin development environment)
- **Deployment**: Docker containers
- **Database**: PostgreSQL with Redis caching