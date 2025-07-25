# IFC JSON Chunking System

[![CI Pipeline](https://github.com/m2ix4i/JSON-Chunking/workflows/CI%20Pipeline/badge.svg)](https://github.com/m2ix4i/JSON-Chunking/actions)
[![codecov](https://codecov.io/gh/m2ix4i/JSON-Chunking/branch/main/graph/badge.svg)](https://codecov.io/gh/m2ix4i/JSON-Chunking)
[![PyPI version](https://badge.fury.io/py/ifc-json-chunking.svg)](https://badge.fury.io/py/ifc-json-chunking)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance Python package for processing and chunking Industry Foundation Classes (IFC) data in JSON format for efficient storage, retrieval, and analysis.

## 🏗️ Overview

The IFC JSON Chunking System is designed to handle large IFC (Industry Foundation Classes) files in JSON format by breaking them down into manageable chunks. This approach enables:

- **Efficient Processing**: Handle large BIM datasets without memory constraints
- **Scalable Storage**: Distribute data across multiple storage systems
- **Fast Retrieval**: Access specific building components without loading entire files
- **Parallel Processing**: Leverage multi-core systems for improved performance

## ✨ Features

- 🚀 **High Performance**: Async processing with configurable parallelism
- 📦 **Flexible Chunking**: Configurable chunk sizes and overlap strategies
- 🔧 **Modern Architecture**: Built with Python 3.9+ and modern async patterns
- 🛡️ **Robust Error Handling**: Comprehensive exception handling and logging
- 🐳 **Docker Support**: Full containerization for easy deployment
- 📊 **Monitoring Ready**: Structured logging and metrics integration
- 🧪 **Well Tested**: Comprehensive test suite with >80% coverage
- 📚 **Type Safe**: Full type annotations and mypy support

## 🚀 Quick Start

### Installation

```bash
# Using pip
pip install ifc-json-chunking

# Using Poetry
poetry add ifc-json-chunking

# Development installation
git clone https://github.com/m2ix4i/JSON-Chunking.git
cd JSON-Chunking
make install-dev
```

### Basic Usage

```python
import asyncio
from pathlib import Path
from ifc_json_chunking import ChunkingEngine, Config

async def main():
    # Configure the chunking engine
    config = Config(
        chunk_size_mb=10,
        max_chunks=1000,
        overlap_percentage=0.1
    )
    
    # Initialize the engine
    engine = ChunkingEngine(config)
    
    # Process an IFC JSON file
    file_path = Path("building_model.json")
    metadata = await engine.process_file(file_path)
    
    print(f"Processed {metadata['chunks_created']} chunks")
    print(f"Processing time: {metadata['processing_time_ms']}ms")

# Run the async function
asyncio.run(main())
```

### Command Line Interface

```bash
# Process a single file
ifc-chunking process building_model.json --output ./chunks --chunk-size 5

# Start web service
ifc-chunking serve --host 0.0.0.0 --port 8000

# Validate IFC JSON structure
ifc-chunking validate building_model.json

# Show configuration
ifc-chunking config-show
```

## 🛠️ Development Setup

### Prerequisites

- Python 3.9 or higher
- Poetry (recommended) or pip
- Docker (optional, for containerized development)

### Local Development

```bash
# Clone the repository
git clone https://github.com/m2ix4i/JSON-Chunking.git
cd JSON-Chunking

# Install dependencies
make install-dev

# Run tests
make test

# Run quality checks
make lint

# Format code
make format

# Start development server
make serve
```

### Using Docker

```bash
# Start development environment
make docker-dev

# Run tests in Docker
make docker-test

# Build production image
make docker-build
```

## 📋 Configuration

The system supports configuration through environment variables, configuration files, or programmatic setup:

### Environment Variables

```bash
export CHUNK_SIZE_MB=10
export MAX_CHUNKS=1000
export OVERLAP_PERCENTAGE=0.1
export MAX_WORKERS=4
export LOG_LEVEL=INFO
export ENVIRONMENT=production
```

### Configuration File

```json
{
  "chunk_size_mb": 10,
  "max_chunks": 1000,
  "overlap_percentage": 0.1,
  "max_workers": 4,
  "timeout_seconds": 300,
  "log_level": "INFO",
  "environment": "production"
}
```

### Programmatic Configuration

```python
from ifc_json_chunking import Config

config = Config(
    chunk_size_mb=20,
    max_chunks=500,
    overlap_percentage=0.15,
    max_workers=8,
    output_directory=Path("./output"),
    log_level="DEBUG"
)
```

## 🏗️ Architecture

### Core Components

- **ChunkingEngine**: Main processing engine for IFC JSON files
- **Config**: Configuration management with validation
- **Logging**: Structured logging with JSON output support
- **CLI**: Command-line interface with rich output
- **Exceptions**: Comprehensive error handling hierarchy

### Processing Pipeline

1. **Input Validation**: Verify file format and structure
2. **Configuration**: Load and validate processing parameters
3. **Chunking Strategy**: Determine optimal chunk boundaries
4. **Parallel Processing**: Distribute work across workers
5. **Output Generation**: Create organized chunk files
6. **Metadata**: Generate processing metadata and statistics

## 🧪 Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
make test

# Run with coverage
make test-cov

# Run specific test categories
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m "not slow"    # Exclude slow tests
```

### Test Categories

- **Unit Tests**: Fast, isolated component testing
- **Integration Tests**: Database and service integration
- **Performance Tests**: Benchmarking and performance validation
- **Security Tests**: Vulnerability and security scanning

## 📊 Performance

### Benchmarks

- **Small Files** (<10MB): ~100ms processing time
- **Medium Files** (10-100MB): ~1-5s processing time
- **Large Files** (>100MB): Scales linearly with worker count

### Optimization Features

- Async I/O for non-blocking file operations
- Configurable worker pools for parallel processing
- Memory-efficient streaming for large files
- Intelligent caching for repeated operations

## 🐳 Docker Support

### Development

```bash
# Start development environment
docker-compose up -d

# Run tests
docker-compose --profile testing up test

# Run linting
docker-compose --profile linting up lint
```

### Production

```bash
# Build production image
docker build --target production -t ifc-json-chunking:latest .

# Run production container
docker run -p 8000:8000 \
  -e ENVIRONMENT=production \
  -e LOG_LEVEL=INFO \
  ifc-json-chunking:latest
```

## 📈 Monitoring

### Logging

The system provides structured logging with:

- JSON format for machine parsing
- Contextual information for debugging
- Performance metrics and timing
- Security event tracking
- Audit trail for compliance

### Metrics

- Processing time per file
- Chunk creation statistics
- Memory usage patterns
- Error rates and types
- System resource utilization

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and quality checks (`make validate`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- Follow PEP 8 style guidelines
- Include type annotations
- Write comprehensive tests
- Update documentation
- Add changelog entries

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [IFC Schema](https://www.buildingsmart.org/standards/bsi-standards/industry-foundation-classes/) - Industry Foundation Classes specification
- [buildingSMART](https://www.buildingsmart.org/) - Open BIM standards organization
- Python community for excellent async and typing support

## 📞 Support

- **Documentation**: [https://github.com/m2ix4i/JSON-Chunking/docs](https://github.com/m2ix4i/JSON-Chunking/docs)
- **Issues**: [GitHub Issues](https://github.com/m2ix4i/JSON-Chunking/issues)
- **Discussions**: [GitHub Discussions](https://github.com/m2ix4i/JSON-Chunking/discussions)

## 🗺️ Roadmap

### Version 0.2.0
- [ ] Advanced chunking strategies
- [ ] Database integration
- [ ] REST API endpoints
- [ ] Real-time streaming support

### Version 0.3.0
- [ ] Distributed processing
- [ ] Cloud storage integration
- [ ] Advanced analytics
- [ ] Web-based management interface

### Version 1.0.0
- [ ] Production-ready stability
- [ ] Enterprise features
- [ ] Performance optimizations
- [ ] Comprehensive documentation

---

**Built with ❤️ for the BIM and construction industry**
