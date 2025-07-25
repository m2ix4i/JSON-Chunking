# Multi-stage Dockerfile for IFC JSON Chunking System
FROM python:3.13-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        git \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry==1.7.1

# Configure Poetry
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VENV_IN_PROJECT=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

# Set work directory
WORKDIR /app

# Copy Poetry files
COPY pyproject.toml poetry.lock* ./

# Development stage
FROM base as development

# Install dependencies (including dev dependencies)
RUN poetry install --with dev,test && rm -rf $POETRY_CACHE_DIR

# Copy source code
COPY . .

# Create non-root user for development
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port for development server
EXPOSE 8000

# Default command for development
CMD ["poetry", "run", "python", "-m", "ifc_json_chunking"]

# Production stage
FROM base as production

# Install only production dependencies
RUN poetry install --only=main && rm -rf $POETRY_CACHE_DIR

# Copy source code
COPY src ./src
COPY README.md ./

# Create non-root user for production
RUN useradd --create-home --shell /bin/bash --no-user-group app \
    && chown -R app:app /app
USER app

# Expose port for production
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Production command
CMD ["poetry", "run", "ifc-chunking", "serve"]

# Testing stage
FROM development as testing

# Run tests
RUN poetry run pytest --cov=src/ifc_json_chunking --cov-report=xml

# Linting stage  
FROM development as linting

# Run linting and formatting checks
RUN poetry run black --check . \
    && poetry run isort --check-only . \
    && poetry run mypy src/ \
    && poetry run ruff check .