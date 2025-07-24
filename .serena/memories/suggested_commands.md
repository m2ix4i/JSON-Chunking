# Suggested Commands for Development

## Package Management
```bash
# Install dependencies
poetry install

# Install with extras (MQTT support)
poetry install --extras mqtt

# Install development dependencies
poetry install --with dev,test

# Add new dependency
poetry add <package>

# Add development dependency  
poetry add --group dev <package>

# Update dependencies
poetry update

# Show dependency tree
poetry show --tree
```

## Code Quality Commands
```bash
# Format code
poetry run black .

# Sort imports
poetry run isort .

# Type checking
poetry run mypy src/

# Linting
poetry run ruff check .

# Run all quality checks
poetry run black --check . && poetry run isort --check-only . && poetry run mypy src/ && poetry run ruff check .
```

## Testing Commands
```bash
# Run all tests
poetry run pytest

# Run tests with coverage
poetry run pytest --cov=src/ifc_json_chunking

# Run specific test file
poetry run pytest tests/test_config.py

# Run tests with markers
poetry run pytest -m "not slow"
poetry run pytest -m integration
poetry run pytest -m unit

# Run tests in parallel
poetry run pytest -n auto
```

## Docker Commands
```bash
# Build and run development environment
docker-compose up --build

# Run specific services
docker-compose up app postgres redis

# Run tests in container
docker-compose --profile testing up test

# Run linting in container
docker-compose --profile linting up lint

# Run production build
docker-compose --profile production up production

# Clean up
docker-compose down -v
```

## CLI Commands (when implemented)
```bash
# Main CLI entry point
poetry run ifc-chunking --help

# Run as module
poetry run python -m ifc_json_chunking

# Serve mode (when implemented)
poetry run ifc-chunking serve
```

## Development Workflow
```bash
# Start development environment
docker-compose up -d postgres redis
poetry install --with dev,test

# Run quality checks before commit
poetry run black . && poetry run isort . && poetry run mypy src/ && poetry run ruff check . && poetry run pytest

# Pre-commit hooks (when configured)
pre-commit run --all-files
```