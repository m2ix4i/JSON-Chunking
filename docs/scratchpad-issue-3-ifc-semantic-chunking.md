# Scratchpad: Issue #3 - IFC-Aware Semantic Chunking System

**Issue Link**: https://github.com/m2ix4i/JSON-Chunking/issues/3

## Issue Summary
Implement intelligent chunking strategies that preserve IFC building component relationships and maintain semantic context for optimal LLM processing, with support for multiple chunking strategies and token optimization.

## Analysis

### Current State Assessment
- **Foundation**: ✅ Complete (Issue #1 - project setup, dependencies, CI/CD)
- **Streaming**: ✅ Complete (Issue #2 - `StreamingJSONParser`, `MemoryMonitor`, `ProgressTracker`)
- **Basic Validation**: ✅ Available (`StreamingValidator` with basic IFC structure checks)
- **Core Integration**: ✅ Available (`ChunkingEngine` with streaming integration)
- **IFC Schema Intelligence**: ❌ **MISSING** - No understanding of building hierarchies
- **Semantic Chunking**: ❌ **MISSING** - No intelligent chunking strategies
- **Token Optimization**: ❌ **MISSING** - No LLM-specific token counting
- **Overlap Management**: ❌ **MISSING** - No context preservation mechanisms

### Technical Requirements Analysis
1. **IFC Schema Awareness**: Understand building component hierarchies (Building → Floor → Room → Components)
2. **Relationship Preservation**: Maintain IFC entity relationships (composition, assignment, connectivity)
3. **Multiple Chunking Strategies**: Hierarchical, Discipline-based, Entity-based, Property-based, Geometric
4. **Token Optimization**: Dynamic sizing for Gemini 2.5 Pro context limits
5. **Overlap Mechanisms**: Intelligent boundary detection with context preservation
6. **Performance**: Chunk 100MB file in <30 seconds
7. **Configurability**: Configurable chunking strategies via settings

### Existing Codebase Assets
- `src/ifc_json_chunking/streaming.py`: `StreamingJSONParser`, `MemoryMonitor`, `StreamingValidator`
- `src/ifc_json_chunking/progress.py`: `ProgressTracker`, `FileProgressTracker`
- `src/ifc_json_chunking/core.py`: `ChunkingEngine` with streaming integration
- `src/ifc_json_chunking/config.py`: Configuration system ready for extension
- `src/ifc_json_chunking/exceptions.py`: Custom exception hierarchy

## Implementation Plan

### Phase 1: IFC Schema Understanding (Day 1-2)

#### Step 1: IFC Schema Parser Module
- **File**: `src/ifc_json_chunking/ifc_schema.py`
- **Classes**: 
  - `IFCEntity`: Represent individual IFC entities with type, properties, relationships
  - `IFCSchemaParser`: Parse and understand IFC entity types and their relationships
  - `IFCHierarchy`: Represent building hierarchy (Site → Building → Floor → Room → Elements)

#### Step 2: Relationship Mapping System
- **File**: `src/ifc_json_chunking/relationships.py`
- **Classes**:
  - `RelationshipType`: Enum for different IFC relationship types
  - `EntityRelationship`: Represent relationships between entities
  - `RelationshipMapper`: Build and query entity relationship graphs
  - `RelationshipGraph`: Graph structure for efficient relationship queries

#### Step 3: Building Hierarchy Builder
- **Enhancement**: Extend `IFCSchemaParser` to build spatial hierarchies
- **Features**: 
  - Parse spatial containment relationships (IfcRelContainedInSpatialStructure)
  - Build hierarchical tree: Site → Building → Storey → Space → Elements
  - Support multiple buildings and complex spatial structures

### Phase 2: Semantic Chunking Strategies (Day 2-4)

#### Step 4: Chunking Strategy Framework
- **File**: `src/ifc_json_chunking/chunking_strategies.py`
- **Classes**:
  - `ChunkingStrategy` (ABC): Abstract base class for all chunking strategies
  - `ChunkingContext`: Context information for chunking decisions
  - `SemanticChunk`: Enhanced chunk with semantic metadata and relationships

#### Step 5: Hierarchical Chunking Strategy
- **Class**: `HierarchicalChunkingStrategy`
- **Logic**: 
  - Group by spatial hierarchy levels (Building → Floor → Room → Components)
  - Respect containment relationships
  - Configurable hierarchy depth limits
  - Preserve parent-child relationships across chunks

#### Step 6: Discipline-Based Chunking Strategy  
- **Class**: `DisciplineBasedChunkingStrategy`
- **Logic**:
  - Separate by building disciplines (Architectural, Structural, MEP)
  - Use IFC entity types to determine discipline
  - Configurable discipline definitions
  - Handle multi-discipline elements appropriately

#### Step 7: Entity-Based Chunking Strategy
- **Class**: `EntityBasedChunkingStrategy`
- **Logic**:
  - Group related building elements (walls, doors, windows)
  - Use relationship analysis for grouping decisions
  - Maintain functional relationships (door-wall, window-wall)
  - Configurable entity grouping rules

#### Step 8: Property-Based Chunking Strategy
- **Class**: `PropertyBasedChunkingStrategy`
- **Logic**:
  - Group by material types, classifications, specifications
  - Use IFC property sets and material definitions
  - Configurable property-based grouping criteria
  - Support for custom property filtering

#### Step 9: Geometric Chunking Strategy
- **Class**: `GeometricChunkingStrategy` 
- **Logic**:
  - Group by spatial relationships and proximity
  - Use geometric placement information
  - Configurable spatial proximity thresholds
  - Handle complex geometric relationships

### Phase 3: Token Optimization & Overlap Management (Day 4-5)

#### Step 10: Token Counting System
- **File**: `src/ifc_json_chunking/tokenization.py`
- **Classes**:
  - `TokenCounter`: Count tokens for different LLM models
  - `LLMModel`: Enum for supported models (Gemini 2.5 Pro, GPT-4, etc.)
  - `TokenOptimizer`: Optimize chunk sizes based on token limits
  - `TokenBudget`: Manage token allocation across chunks

#### Step 11: Overlap Management System
- **File**: `src/ifc_json_chunking/overlap.py`
- **Classes**:
  - `OverlapStrategy`: Different approaches to chunk overlap
  - `ContextPreserver`: Preserve semantic context at boundaries
  - `OverlapManager`: Coordinate overlap creation and management
  - `ChunkBoundary`: Represent and analyze chunk boundaries

#### Step 12: Chunk Validation & Integrity
- **File**: `src/ifc_json_chunking/validation.py`
- **Classes**:
  - `SemanticValidator`: Validate chunk semantic integrity
  - `RelationshipValidator`: Ensure no broken entity references
  - `ChunkValidator`: Comprehensive chunk validation
  - `ValidationReport`: Detailed validation results

#### Step 13: Quality Metrics System
- **File**: `src/ifc_json_chunking/metrics.py`
- **Classes**:
  - `CoherenceMetric`: Measure chunk semantic coherence
  - `CompletenessMetric`: Measure relationship completeness
  - `QualityScorer`: Overall chunk quality assessment
  - `MetricsCollector`: Collect and analyze chunking metrics

### Phase 4: Integration & Performance (Day 5-6)

#### Step 14: Strategy Configuration System
- **Enhancement**: Extend `Config` class with chunking strategy settings
- **Features**:
  - Configurable strategy selection and parameters
  - Strategy priority and fallback mechanisms
  - Performance tuning parameters
  - Environment-specific optimizations

#### Step 15: Semantic Chunking Engine
- **File**: `src/ifc_json_chunking/semantic_engine.py`
- **Classes**:
  - `SemanticChunkingEngine`: Orchestrate all chunking strategies
  - `StrategySelector`: Choose optimal strategy for given data
  - `ChunkingOrchestrator`: Coordinate multiple strategies
  - `PerformanceMonitor`: Monitor and optimize performance

#### Step 16: Performance Optimization
- **Enhancements**:
  - Parallel processing of independent chunks
  - Efficient relationship graph algorithms
  - Memory-optimized data structures
  - Streaming-compatible chunk generation

#### Step 17: Integration with Existing Core
- **Enhancement**: Update `ChunkingEngine` to use semantic strategies
- **Changes**:
  - Replace basic chunking with semantic chunking
  - Integrate strategy selection logic
  - Add semantic metadata to chunks
  - Maintain backward compatibility

### Phase 5: Testing & Documentation (Day 6-7)

#### Step 18: Comprehensive Test Suite
- **Files**:
  - `tests/test_ifc_schema.py`: IFC schema parsing and hierarchy tests
  - `tests/test_relationships.py`: Relationship mapping and graph tests
  - `tests/test_chunking_strategies.py`: All chunking strategy tests
  - `tests/test_tokenization.py`: Token counting and optimization tests
  - `tests/test_overlap.py`: Overlap management tests
  - `tests/test_semantic_validation.py`: Semantic validation tests
  - `tests/test_performance.py`: Performance benchmark tests

#### Step 19: Integration Tests
- **Files**:
  - `tests/test_semantic_integration.py`: End-to-end semantic chunking tests
  - `tests/test_large_files.py`: Large file processing tests (100MB requirement)
  - `tests/test_strategy_combinations.py`: Multiple strategy combination tests

#### Step 20: Documentation
- **Files**:
  - Update `README.md` with semantic chunking capabilities
  - Create `docs/semantic-chunking-guide.md`
  - Create `docs/strategy-selection-guide.md`
  - Update API documentation for all new modules

## Technical Implementation Details

### Core Class Architecture

#### IFC Schema Understanding
```python
@dataclass
class IFCEntity:
    entity_id: str
    entity_type: str
    properties: Dict[str, Any]
    relationships: List[EntityRelationship]
    spatial_container: Optional[str]
    geometry: Optional[Dict[str, Any]]

class IFCSchemaParser:
    def parse_entities(self, json_stream) -> Iterator[IFCEntity]
    def build_hierarchy(self, entities: List[IFCEntity]) -> IFCHierarchy
    def extract_relationships(self, entities: List[IFCEntity]) -> RelationshipGraph
```

#### Chunking Strategy Framework
```python
class ChunkingStrategy(ABC):
    @abstractmethod
    async def chunk_entities(self, entities: List[IFCEntity], context: ChunkingContext) -> List[SemanticChunk]
    
    def calculate_chunk_size(self, chunk: SemanticChunk) -> int
    def estimate_tokens(self, chunk: SemanticChunk, model: LLMModel) -> int
    def validate_chunk(self, chunk: SemanticChunk) -> ValidationReport
```

#### Semantic Chunk Enhanced Structure
```python
@dataclass
class SemanticChunk:
    chunk_id: str
    strategy_used: str
    entities: List[IFCEntity]
    relationships: List[EntityRelationship]
    spatial_context: Optional[SpatialContext]
    discipline: Optional[str]
    properties_summary: Dict[str, Any]
    token_count: Dict[LLMModel, int]
    overlap_info: OverlapInfo
    quality_metrics: QualityMetrics
    metadata: Dict[str, Any]
```

### Token Optimization Strategy
- **Model-Specific Limits**: Gemini 2.5 Pro (2M tokens), GPT-4 (128K tokens)
- **Dynamic Sizing**: Adjust chunk size based on content complexity and model limits
- **Content Prioritization**: Preserve high-importance relationships in smaller chunks
- **Overflow Handling**: Split large entities across chunks with proper context preservation

### Overlap Management Approach
- **Semantic Boundaries**: Prefer entity boundaries over arbitrary size limits
- **Context Preservation**: Include related entities in overlapping regions
- **Configurable Overlap**: 10-20% overlap with semantic relevance weighting
- **Boundary Detection**: Identify natural breaking points in building hierarchy

### Performance Optimization Targets
- **Processing Speed**: 100MB file in <30 seconds
- **Memory Usage**: <500MB regardless of file size (inherited from streaming)
- **Chunk Quality**: >90% relationship preservation across chunks
- **Token Efficiency**: >95% of target token limit utilization

## Acceptance Criteria Mapping

- [x] **IFC schema parser and relationship mapper** → Phase 1 (Steps 1-3)
- [x] **Hierarchical chunking algorithm implementation** → Phase 2 (Step 5)
- [x] **Discipline-based chunking with configurable categories** → Phase 2 (Step 6)
- [x] **Entity relationship preservation across chunk boundaries** → Phase 2 (Step 7) + Phase 3 (Steps 11-12)
- [x] **Token counting and optimization for Gemini 2.5 Pro limits** → Phase 3 (Step 10)
- [x] **Overlap mechanism with configurable percentage (10-20%)** → Phase 3 (Step 11)
- [x] **Chunk validation ensuring no broken entity references** → Phase 3 (Step 12)
- [x] **Performance benchmarks (chunk 100MB file in <30 seconds)** → Phase 4 (Step 16) + Phase 5 (Step 19)
- [x] **Configurable chunking strategies via settings** → Phase 4 (Step 14)
- [x] **Unit tests for different IFC data structures** → Phase 5 (Step 18)
- [x] **Documentation for chunking algorithm selection** → Phase 5 (Step 20)

## Risk Mitigation

### Complexity Management
- **Incremental Implementation**: Build and test each strategy independently
- **Strategy Isolation**: Ensure strategies can work independently and in combination
- **Fallback Mechanisms**: Default to simpler strategies if complex ones fail

### Performance Risks
- **Memory Usage**: Leverage existing streaming architecture to maintain <500MB limit
- **Processing Speed**: Use parallel processing and efficient graph algorithms
- **Scalability**: Test with various file sizes and complexity levels

### Quality Assurance
- **Relationship Integrity**: Comprehensive validation of entity references
- **Semantic Coherence**: Automated quality metrics for chunk coherence
- **Edge Case Handling**: Extensive testing with complex IFC structures

### Integration Complexity
- **Backward Compatibility**: Maintain existing API while adding semantic features
- **Configuration Complexity**: Provide sensible defaults with advanced customization
- **Strategy Conflicts**: Clear precedence rules for conflicting strategies

## Success Metrics

### Functional Requirements
- **Strategy Coverage**: 5 distinct chunking strategies implemented and tested
- **Relationship Preservation**: >95% of entity relationships maintained across chunks
- **Token Optimization**: Chunks within 90-100% of target token limits
- **Overlap Quality**: Semantic relevance score >0.8 for overlapped content

### Performance Requirements  
- **Processing Speed**: 100MB file processed in <30 seconds
- **Memory Efficiency**: <500MB RAM usage maintained
- **Quality Metrics**: >90% chunk coherence score
- **Configuration Flexibility**: All strategies configurable via settings

### Quality Requirements
- **Test Coverage**: >95% for all semantic chunking modules
- **Documentation**: Complete API docs and strategy selection guides
- **Validation**: Zero broken entity references in generated chunks
- **Error Handling**: Graceful degradation for malformed or incomplete IFC data

## Dependencies & Integration

### Dependencies
- **Complete**: Issue #1 (Project Foundation) ✅
- **Complete**: Issue #2 (Streaming JSON Processing) ✅  
- **External**: Large IFC test files for performance validation
- **Optional**: IFC schema definitions for enhanced validation

### Integration Points
- **ChunkingEngine**: Enhance with semantic strategy selection
- **StreamingValidator**: Extend with semantic validation capabilities
- **Config**: Add semantic chunking configuration options
- **CLI**: Add strategy selection and configuration options

## Next Steps
1. Create feature branch `feature/issue-3-ifc-semantic-chunking`
2. Implement Phase 1 (IFC Schema Understanding) with individual commits
3. Test each component thoroughly before proceeding to next phase
4. Performance benchmark against 100MB requirement early in Phase 4
5. Create comprehensive PR with semantic chunking examples and benchmarks

## Estimated Timeline
- **Phase 1**: 2 days (IFC Schema Understanding)
- **Phase 2**: 2 days (Chunking Strategies Implementation)  
- **Phase 3**: 2 days (Token Optimization & Overlap)
- **Phase 4**: 1 day (Integration & Performance)
- **Phase 5**: 1 day (Testing & Documentation)
- **Total**: 8 days with buffer for optimization and comprehensive testing

This implementation will transform the basic chunking system into an intelligent, IFC-aware semantic chunking engine capable of preserving building relationships and optimizing for LLM processing.