# Contributing to IFC JSON Chunking System

Thank you for your interest in contributing to the IFC JSON Chunking System! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Python 3.9 or higher
- Poetry for dependency management
- Git for version control
- Docker (optional, for containerized development)

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/JSON-Chunking.git
   cd JSON-Chunking
   ```

2. **Install development dependencies**
   ```bash
   make install-dev
   # or manually:
   poetry install --with dev,test
   poetry run pre-commit install
   ```

3. **Verify setup**
   ```bash
   make test
   make lint
   ```

## 📋 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or for bug fixes:
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Follow the existing code style and patterns
- Add tests for new functionality
- Update documentation as needed
- Keep commits atomic and well-described

### 3. Run Quality Checks

```bash
# Run all quality checks
make validate

# Individual checks
make format      # Format code with Black and isort
make lint        # Run linting with ruff and mypy
make test        # Run test suite
make test-cov    # Run tests with coverage
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add new chunking strategy for large files"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request through GitHub.

## 🎯 Contribution Types

### Bug Fixes
- Fix existing functionality that isn't working correctly
- Include test cases that reproduce the bug
- Update documentation if the fix changes behavior

### New Features
- Add new functionality that extends the system capabilities
- Include comprehensive tests
- Update documentation and examples
- Consider backward compatibility

### Documentation
- Improve existing documentation
- Add examples and tutorials
- Fix typos and formatting issues
- Translate documentation

### Performance Improvements
- Optimize existing algorithms
- Reduce memory usage
- Improve processing speed
- Include benchmarks to demonstrate improvements

## 📝 Code Standards

### Python Style Guide

We follow PEP 8 with some modifications:

- **Line Length**: 100 characters (configured in pyproject.toml)
- **String Quotes**: Use double quotes for strings
- **Import Sorting**: Use isort with Black-compatible settings
- **Type Hints**: Include type annotations for all public functions

### Code Quality Tools

The project uses several tools to maintain code quality:

- **Black**: Code formatting
- **isort**: Import sorting
- **ruff**: Fast Python linter
- **mypy**: Static type checking
- **bandit**: Security vulnerability scanning
- **pytest**: Testing framework

### Pre-commit Hooks

Pre-commit hooks automatically run quality checks:

```bash
# Install hooks (done automatically with make install-dev)
poetry run pre-commit install

# Run hooks manually
poetry run pre-commit run --all-files
```

## 🧪 Testing Guidelines

### Test Categories

- **Unit Tests**: Fast, isolated tests for individual components
- **Integration Tests**: Tests that verify component interactions
- **Performance Tests**: Benchmarks and performance validation
- **Security Tests**: Security vulnerability testing

### Writing Tests

```python
import pytest
from pathlib import Path

from ifc_json_chunking import ChunkingEngine, Config


class TestChunkingEngine:
    @pytest.mark.unit
    def test_initialization(self):
        """Test that ChunkingEngine initializes correctly."""
        config = Config(chunk_size_mb=5)
        engine = ChunkingEngine(config)
        assert engine.config.chunk_size_mb == 5

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_file_processing(self, sample_ifc_file):
        """Test end-to-end file processing."""
        engine = ChunkingEngine()
        result = await engine.process_file(sample_ifc_file)
        assert result["status"] == "processed"
```

### Test Fixtures

Use fixtures for common test data and setup:

```python
@pytest.fixture
def sample_config():
    """Provide a test-safe configuration."""
    return Config(
        chunk_size_mb=1,
        max_workers=1,
        environment="testing"
    )
```

## 📚 Documentation

### Docstring Style

Use Google-style docstrings:

```python
def process_chunks(data: Dict[str, Any], chunk_size: int) -> List[Dict[str, Any]]:
    """
    Process data into chunks of specified size.
    
    Args:
        data: The input data to be chunked
        chunk_size: Maximum size of each chunk in bytes
        
    Returns:
        List of data chunks with metadata
        
    Raises:
        ChunkingError: If chunking fails due to invalid data
    """
```

### README Updates

When adding new features:

1. Update the features list
2. Add usage examples
3. Update configuration options
4. Add to the roadmap if applicable

## 🚨 Issue Reporting

### Bug Reports

Include the following information:

- Python version and operating system
- Package version
- Minimal code example that reproduces the issue
- Full error traceback
- Expected vs. actual behavior

### Feature Requests

Include:

- Clear description of the proposed feature
- Use case and motivation
- Possible implementation approach
- Any breaking changes

## 🔄 Release Process

### Version Numbering

We use Semantic Versioning (SemVer):

- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Release Checklist

1. Update version in `pyproject.toml`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Create release PR
5. Tag release after merge
6. GitHub Actions handles PyPI and Docker publishing

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different opinions and approaches

### Communication

- Use clear, descriptive commit messages
- Provide context in PR descriptions
- Respond to feedback promptly
- Ask questions when unsure

## 🛠️ Advanced Topics

### Adding New Dependencies

1. Use Poetry to add dependencies:
   ```bash
   poetry add new-package
   # or for development dependencies:
   poetry add --group dev new-package
   ```

2. Update the relevant dependency groups in `pyproject.toml`
3. Test that the new dependency works in CI
4. Document any new configuration options

### Performance Considerations

- Profile code before optimizing
- Include benchmarks for performance changes
- Consider memory usage in addition to speed
- Test with realistic data sizes

### Security Considerations

- Never commit secrets or credentials
- Use `bandit` to scan for security issues
- Consider input validation for user data
- Follow security best practices for file handling

## 📞 Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check the README and code documentation first

## 🙏 Recognition

Contributors are recognized in:

- `CONTRIBUTORS.md` file
- Release notes for significant contributions
- GitHub contributor statistics

Thank you for contributing to the IFC JSON Chunking System! 🎉