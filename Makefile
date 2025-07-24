# Makefile for IFC JSON Chunking System

.PHONY: help install install-dev clean lint format test test-cov test-watch build docker-build docker-run docs serve dev

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation
install: ## Install production dependencies
	poetry install --only=main

install-dev: ## Install all dependencies including dev
	poetry install --with dev,test
	poetry run pre-commit install

# Cleaning
clean: ## Clean build artifacts and cache files
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/
	rm -rf .pytest_cache/
	rm -rf .mypy_cache/
	rm -rf .coverage
	rm -rf htmlcov/
	rm -rf test-results/
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

# Code Quality
lint: ## Run all linting tools
	poetry run ruff check .
	poetry run mypy src/
	poetry run bandit -r src/
	poetry run pydocstyle src/

format: ## Format code with black and isort
	poetry run black .
	poetry run isort .

format-check: ## Check code formatting
	poetry run black --check .
	poetry run isort --check-only .

# Testing
test: ## Run tests
	poetry run pytest

test-cov: ## Run tests with coverage
	poetry run pytest --cov=src/ifc_json_chunking --cov-report=html --cov-report=term-missing

test-watch: ## Run tests in watch mode
	poetry run pytest-watch

test-fast: ## Run fast tests only
	poetry run pytest -m "not slow"

test-integration: ## Run integration tests only
	poetry run pytest -m integration

# Quality Gates
pre-commit: ## Run pre-commit hooks on all files
	poetry run pre-commit run --all-files

validate: format-check lint test ## Run all quality checks

# Build
build: clean ## Build package
	poetry build

build-docs: ## Build documentation
	cd docs && poetry run make html

# Docker
docker-build: ## Build Docker image
	docker build -t ifc-json-chunking .

docker-build-dev: ## Build development Docker image
	docker build --target development -t ifc-json-chunking:dev .

docker-run: ## Run Docker container
	docker run -p 8000:8000 ifc-json-chunking

docker-dev: ## Run development environment with docker-compose
	docker-compose up -d

docker-test: ## Run tests in Docker
	docker-compose --profile testing up --build test

docker-lint: ## Run linting in Docker
	docker-compose --profile linting up --build lint

docker-down: ## Stop docker-compose services
	docker-compose down

docker-clean: ## Clean Docker images and volumes
	docker-compose down -v --rmi all

# Development
dev: install-dev ## Set up development environment
	@echo "Development environment ready!"
	@echo "Run 'make serve' to start the development server"

serve: ## Start development server
	poetry run python -m ifc_json_chunking

watch: ## Start development server with auto-reload
	poetry run watchdog python -m ifc_json_chunking

# Database
db-migrate: ## Run database migrations
	@echo "Database migrations not implemented yet"

db-seed: ## Seed database with test data
	@echo "Database seeding not implemented yet"

# Documentation
docs: ## Generate documentation
	cd docs && poetry run sphinx-build -b html . _build/html

docs-serve: ## Serve documentation locally
	cd docs/_build/html && python -m http.server 8080

docs-clean: ## Clean documentation build
	cd docs && rm -rf _build/

# Release
version: ## Show current version
	poetry version

version-bump-patch: ## Bump patch version
	poetry version patch

version-bump-minor: ## Bump minor version
	poetry version minor

version-bump-major: ## Bump major version
	poetry version major

release: validate build ## Build and prepare for release
	@echo "Package built and ready for release!"
	@echo "Run 'poetry publish' to publish to PyPI"

# Monitoring
logs: ## View application logs
	docker-compose logs -f app

logs-db: ## View database logs
	docker-compose logs -f postgres

monitor: ## Start monitoring stack
	docker-compose --profile monitoring up -d

# Security
security-scan: ## Run security scans
	poetry run bandit -r src/
	poetry run safety check

# Performance
profile: ## Run performance profiling
	@echo "Performance profiling not implemented yet"

benchmark: ## Run benchmarks
	@echo "Benchmarks not implemented yet"

# Utilities
shell: ## Open development shell
	poetry shell

notebook: ## Start Jupyter notebook
	poetry run jupyter notebook

# Environment
env-check: ## Check environment setup
	@echo "Python version: $$(python --version)"
	@echo "Poetry version: $$(poetry --version)"
	@echo "Docker version: $$(docker --version)"
	@echo "Environment variables:"
	@env | grep -E "(ENVIRONMENT|LOG_LEVEL|DEBUG)" || echo "No relevant env vars set"