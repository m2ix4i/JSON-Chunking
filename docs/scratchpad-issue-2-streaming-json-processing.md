# Scratchpad: Issue #2 - Streaming JSON Processing Engine

**Issue Link**: https://github.com/m2ix4i/JSON-Chunking/issues/2

## Issue Summary
Implement a memory-efficient streaming JSON parser capable of handling large IFC building data files (GB-sized) without loading everything into memory, with memory usage under 500MB regardless of file size.

## Analysis

### Current State Assessment
- **Project Foundation**: ✅ Complete (Issue #1 resolved)
- **ChunkingEngine**: 🔄 Exists but only placeholder implementations
- **JSON Dependencies**: 🔄 `ujson` available for fast processing, need `ijson` for streaming
- **Testing Framework**: ✅ pytest configured with coverage
- **Memory Monitoring**: ❌ Not implemented
- **Progress Tracking**: ❌ Not implemented
- **Error Recovery**: ❌ Not implemented

### Technical Requirements Analysis
1. **Streaming Parser**: Use `ijson.parse()` for token-by-token processing
2. **Memory Management**: <500MB RAM usage with memory monitoring and GC triggers
3. **Progress Tracking**: Real-time percentage completion feedback
4. **Error Recovery**: Graceful handling of malformed JSON sections
5. **Validation**: JSON schema validation for IFC data structures
6. **Performance**: Process 1GB file in <5 minutes
7. **File Support**: Compressed and uncompressed JSON files

### Current Codebase Context
- `src/ifc_json_chunking/core.py`: `ChunkingEngine` with placeholder `process_file()` and `create_chunks()`
- `src/ifc_json_chunking/config.py`: Configuration system ready for extension
- `src/ifc_json_chunking/exceptions.py`: Custom exception hierarchy available
- Dependencies: `ujson` ✅, `ijson` ❌ (needs addition)

## Implementation Plan

### Phase 1: Dependencies and Core Infrastructure (Day 1)
1. **Add Streaming Dependencies**
   - Add `ijson ^3.2.0` to pyproject.toml  
   - Add `psutil ^5.9.0` for memory monitoring
   - Update dependencies: `poetry install`

2. **Create Streaming Parser Module**
   - Create `src/ifc_json_chunking/streaming.py`
   - Implement `StreamingJSONParser` class with ijson integration
   - Add memory monitoring utilities with psutil

3. **Progress Tracking Infrastructure**
   - Create `src/ifc_json_chunking/progress.py`
   - Implement `ProgressTracker` class for file processing progress
   - Add percentage completion calculation based on file position

### Phase 2: Core Streaming Implementation (Day 2-3)
4. **Streaming JSON Parser Implementation**
   - State machine for tracking JSON structure depth
   - Token-by-token processing with ijson.parse()
   - Memory usage monitoring with automatic GC triggers
   - Support for both compressed (.gz) and uncompressed files

5. **JSON Validation System**
   - Create `src/ifc_json_chunking/validation.py`
   - Implement schema validation for IFC JSON structures
   - Detailed error reporting with line/position information
   - Support for partial validation during streaming

6. **Error Recovery Mechanisms**
   - Implement robust error handling in streaming parser
   - Skip malformed sections while continuing processing
   - Log detailed error context for debugging
   - Graceful degradation strategies

### Phase 3: Integration and Enhancement (Day 3-4)
7. **Update ChunkingEngine**
   - Replace placeholder implementations in `core.py`
   - Integrate streaming parser into `process_file()` method
   - Add progress callbacks and memory monitoring
   - Implement chunking logic using streaming data

8. **Configuration Extensions**
   - Add streaming-specific settings to `Config` class
   - Memory limits, buffer sizes, validation options
   - Progress reporting intervals, error recovery settings

### Phase 4: Testing and Documentation (Day 4-5)  
9. **Comprehensive Test Suite**
   - Unit tests for `StreamingJSONParser` with various JSON structures
   - Memory usage tests with large file scenarios
   - Progress tracking tests with mocked file operations
   - Error recovery tests with malformed JSON files
   - Performance benchmarks (1GB file processing target)

10. **Documentation and Examples**
    - Update docstrings for all new classes and methods
    - Add usage examples for streaming parser configuration
    - Document memory optimization strategies
    - Performance tuning guidelines

## Technical Implementation Details

### Core Classes Design

#### StreamingJSONParser
```python
class StreamingJSONParser:
    def __init__(self, config: Config, progress_tracker: ProgressTracker = None)
    async def parse_file(self, file_path: Path) -> AsyncIterator[Tuple[str, Any]]
    def get_memory_usage(self) -> int
    def trigger_garbage_collection(self) -> None
```

#### ProgressTracker
```python
class ProgressTracker:
    def __init__(self, total_size: int)
    def update(self, bytes_processed: int) -> None
    def get_percentage(self) -> float
    def get_eta(self) -> Optional[timedelta]
```

#### JSON Validator
```python
class IFCJSONValidator:
    def __init__(self, schema_path: Optional[Path] = None)
    def validate_structure(self, json_path: str, value: Any) -> ValidationResult
    def validate_partial(self, partial_data: Dict[str, Any]) -> List[ValidationError]
```

### Memory Management Strategy
- Monitor memory usage every 1000 parsed tokens
- Trigger `gc.collect()` when usage exceeds 80% of limit (400MB)
- Use generator patterns to avoid loading full data structures
- Implement sliding window for large nested structures

### Performance Optimizations
- Use `ujson` for final value parsing of complex objects
- Implement configurable buffer sizes for file I/O
- Add optional parallel processing for independent JSON objects
- Use memory mapping for very large files when beneficial

## Acceptance Criteria Mapping
- [x] **Dependencies**: Add ijson for streaming parser → Phase 1, Step 1
- [x] **Memory Management**: <500MB usage with monitoring → Phase 1, Step 2 & Phase 2, Step 4
- [x] **Progress Tracking**: Percentage completion → Phase 1, Step 3
- [x] **JSON Validation**: Schema validation with error reporting → Phase 2, Step 5
- [x] **Nested Structures**: Support for IFC JSON complexity → Phase 2, Step 4
- [x] **Error Recovery**: Graceful handling of corruption → Phase 2, Step 6
- [x] **Performance**: 1GB file in <5 minutes → Phase 2, Step 4 + optimizations
- [x] **Testing**: Unit tests for all scenarios → Phase 4, Step 9
- [x] **Documentation**: Configuration and usage docs → Phase 4, Step 10

## Risk Mitigation
- **Memory Leaks**: Implement comprehensive memory monitoring and testing
- **Performance**: Profile with actual large IFC files, optimize hot paths
- **Compatibility**: Test with various IFC JSON structures and schema versions
- **Error Handling**: Extensive testing with malformed and edge-case files

## Success Metrics
- Memory usage stays under 500MB for files of any size
- Processing speed: >200MB/minute for typical IFC JSON files
- Error recovery: Continue processing with <10% data loss on partial corruption
- Test coverage: >90% for streaming components
- Documentation: Complete API docs with working examples

## Next Steps
1. Create feature branch `feature/issue-2-streaming-json-processing`
2. Implement Phase 1 components with individual commits
3. Test each phase thoroughly before proceeding
4. Benchmark performance with large test files
5. Create comprehensive PR with detailed testing evidence

## Dependencies & Blockers
- **Dependency**: Issue #1 (Project Foundation) ✅ Complete
- **External**: Need access to large IFC JSON files for realistic testing
- **Technical**: May need to optimize ijson for very large nested structures

## Estimated Timeline
- **Phase 1**: 1 day (Dependencies + Infrastructure)
- **Phase 2**: 2 days (Core Implementation)  
- **Phase 3**: 1 day (Integration)
- **Phase 4**: 1 day (Testing + Documentation)
- **Total**: 5 days with buffer for optimization and testing