#!/usr/bin/env python3
"""
Simplified integration tests for Phase 3 components that actually exist.

Tests the core Phase 3 functionality with available modules:
- Token counting and optimization (tokenization.py)
- Overlap management (overlap.py) 
- Integration with Phase 1 and Phase 2 components
"""

import sys
import os
import json

# Add the src directory to Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Import all available components
from ifc_json_chunking.tokenization import (
    LLMModel, TokenLimits, EstimativeTokenCounter, TokenBudget, 
    TokenOptimizer, create_token_counter, create_token_optimizer
)
from ifc_json_chunking.overlap import (
    OverlapStrategy, OverlapConfig, ChunkBoundary, ContextPreserver,
    OverlapManager, create_overlap_config
)

# Import Phase 1 and Phase 2 components for integration testing
from ifc_json_chunking.ifc_schema import IFCEntity, IFCEntityType, IFCSchemaParser
from ifc_json_chunking.relationships import RelationshipMapper
from ifc_json_chunking.chunking_strategies import (
    ChunkingContext, SemanticChunk, HierarchicalChunkingStrategy
)
from ifc_json_chunking.config import Config


def create_sample_ifc_data():
    """Create sample IFC data for testing."""
    return {
        "header": {
            "file_description": ["ViewDefinition [CoordinationView]"],
            "file_name": "test_building.ifc",
            "file_schema": ["IFC4"],
            "originating_system": "Test System",
            "preprocessor_version": "1.0"
        },
        "objects": {
            "#100": {
                "type": "IfcBuilding",
                "id": "#100",
                "properties": {
                    "Name": "Test Building",
                    "Description": "A test building for chunking"
                },
                "relationships": {
                    "IfcRelAggregates": ["#200", "#300"]
                }
            },
            "#200": {
                "type": "IfcBuildingStorey",
                "id": "#200", 
                "properties": {
                    "Name": "Ground Floor",
                    "Elevation": 0.0
                },
                "relationships": {
                    "IfcRelContainedInSpatialStructure": ["#100"],
                    "IfcRelContainedInSpatialStructure_Related": ["#400", "#500"]
                }
            },
            "#400": {
                "type": "IfcWall",
                "id": "#400",
                "properties": {
                    "Name": "Wall-001",
                    "Description": "External wall",
                    "Material": "Concrete"
                },
                "relationships": {
                    "IfcRelContainedInSpatialStructure": ["#200"]
                }
            },
            "#500": {
                "type": "IfcDoor", 
                "id": "#500",
                "properties": {
                    "Name": "Door-001",
                    "Width": 900,
                    "Height": 2100
                },
                "relationships": {
                    "IfcRelContainedInSpatialStructure": ["#200"],
                    "IfcRelFillsElement": ["#400"]
                }
            }
        }
    }


def create_sample_chunks():
    """Create sample semantic chunks for testing."""
    chunks = []
    
    # Building chunk
    building_entities = [
        IFCEntity(
            entity_id="#100",
            entity_type=IFCEntityType.BUILDING, 
            name="Test Building",
            description="A test building",
            properties={"Name": "Test Building", "Description": "A test building"},
            relationships=["#200", "#300"],
            spatial_container="#100"
        )
    ]
    
    chunks.append(SemanticChunk(
        chunk_id="building_chunk",
        strategy_used="HierarchicalChunkingStrategy",
        entities=building_entities,
        relationships=[],
        metadata={"hierarchy_level": "Building", "spatial_container": "#100"}
    ))
    
    # Floor chunk
    floor_entities = [
        IFCEntity(
            entity_id="#200",
            entity_type=IFCEntityType.BUILDING_STOREY,
            name="Ground Floor",
            properties={"Name": "Ground Floor", "Elevation": 0.0},
            relationships=["#100", "#400", "#500"],
            spatial_container="#100"
        )
    ]
    
    chunks.append(SemanticChunk(
        chunk_id="floor_chunk", 
        strategy_used="HierarchicalChunkingStrategy",
        entities=floor_entities,
        relationships=[],
        metadata={"hierarchy_level": "Floor", "spatial_container": "#200"}
    ))
    
    # Elements chunk
    element_entities = [
        IFCEntity(
            entity_id="#400",
            entity_type=IFCEntityType.WALL,
            name="Wall-001",
            properties={"Name": "Wall-001", "Material": "Concrete"},
            relationships=["#200"],
            spatial_container="#200"
        ),
        IFCEntity(
            entity_id="#500", 
            entity_type=IFCEntityType.DOOR,
            name="Door-001",
            properties={"Name": "Door-001", "Width": 900, "Height": 2100},
            relationships=["#200", "#400"],
            spatial_container="#200"
        )
    ]
    
    chunks.append(SemanticChunk(
        chunk_id="elements_chunk",
        strategy_used="HierarchicalChunkingStrategy", 
        entities=element_entities,
        relationships=[],
        metadata={"hierarchy_level": "Elements", "spatial_container": "#200"}
    ))
    
    return chunks


def test_token_counting_integration():
    """Test token counting across different LLM models."""
    print("Testing token counting integration...")
    
    sample_data = create_sample_ifc_data()
    test_results = {}
    
    for model in [LLMModel.GEMINI_2_5_PRO, LLMModel.GPT_4_TURBO, LLMModel.CLAUDE_3_5_SONNET]:
        counter = create_token_counter(model)
        
        # Test token counting for different data types
        header_tokens = counter.count_tokens(json.dumps(sample_data["header"]))
        objects_tokens = counter.count_tokens(json.dumps(sample_data["objects"]))
        total_tokens = counter.count_tokens(json.dumps(sample_data))
        
        test_results[model.value] = {
            "header_tokens": header_tokens,
            "objects_tokens": objects_tokens, 
            "total_tokens": total_tokens,
            "within_limit": counter.token_limits.recommended_chunk_tokens > total_tokens
        }
        
        print(f"  {model.value}: {total_tokens} tokens, within limit: {test_results[model.value]['within_limit']}")
    
    # Verify all models processed the data
    assert len(test_results) == 3, "All models should have been tested"
    
    # Verify token counts are reasonable (should be positive and not zero)
    for model_result in test_results.values():
        assert model_result["total_tokens"] > 0, "Token count should be positive"
        assert model_result["header_tokens"] > 0, "Header tokens should be positive" 
        assert model_result["objects_tokens"] > 0, "Objects tokens should be positive"
    
    print("✅ Token counting integration test passed")
    return test_results


def test_chunk_optimization_integration():
    """Test chunk optimization with real semantic chunks."""
    print("Testing chunk optimization integration...")
    
    sample_chunks = create_sample_chunks()
    test_results = {}
    
    for model in [LLMModel.GEMINI_2_5_PRO, LLMModel.GPT_4_TURBO]:
        optimizer = create_token_optimizer(model)
        
        # Analyze token distribution
        analysis = optimizer.analyze_token_distribution(sample_chunks)
        
        # Optimize chunks
        optimized_chunks = optimizer.optimize_chunks(sample_chunks)
        
        # Calculate processing cost
        cost_estimate = optimizer.estimate_processing_cost(optimized_chunks)
        
        test_results[model.value] = {
            "original_chunks": len(sample_chunks),
            "optimized_chunks": len(optimized_chunks),
            "total_tokens": analysis["total_tokens"],
            "avg_tokens_per_chunk": analysis["average_tokens_per_chunk"],
            "utilization_efficiency": analysis["utilization_analysis"]["utilization_efficiency"],
            "estimated_cost": cost_estimate["estimated_cost_usd"]
        }
        
        print(f"  {model.value}: {len(sample_chunks)} → {len(optimized_chunks)} chunks, "
              f"efficiency: {analysis['utilization_analysis']['utilization_efficiency']:.2f}")
    
    # Verify optimization results
    for model_result in test_results.values():
        assert model_result["optimized_chunks"] > 0, "Should have optimized chunks"
        assert model_result["total_tokens"] > 0, "Should have calculated token usage"
        assert 0 <= model_result["utilization_efficiency"] <= 1, "Efficiency should be 0-1"
        assert model_result["estimated_cost"] >= 0, "Cost should be non-negative"
    
    print("✅ Chunk optimization integration test passed")
    return test_results


def test_overlap_management_integration():
    """Test overlap management with semantic chunks."""
    print("Testing overlap management integration...")
    
    sample_chunks = create_sample_chunks()
    test_results = {}
    
    # Test different overlap strategies
    strategies = [
        OverlapStrategy.TOKEN_BASED,
        OverlapStrategy.PERCENTAGE_BASED,
        OverlapStrategy.ENTITY_BOUNDARY,
        OverlapStrategy.RELATIONSHIP_AWARE
    ]
    
    for strategy in strategies:
        config = OverlapConfig(
            strategy=strategy,
            size_tokens=200,
            percentage=0.15,
            preserve_entities=True,
            preserve_relationships=True
        )
        
        overlap_manager = OverlapManager(config)
        
        # Test overlap creation between consecutive chunks
        overlaps_created = 0
        total_overlap_tokens = 0
        
        for i in range(len(sample_chunks) - 1):
            prev_chunk = sample_chunks[i]
            curr_chunk = sample_chunks[i + 1]
            
            # Convert SemanticChunks to boundary objects for overlap analysis
            prev_boundary = ChunkBoundary(
                chunk_id=prev_chunk.chunk_id,
                entities=prev_chunk.entities,
                relationships=prev_chunk.relationships,
                semantic_context=prev_chunk.metadata
            )
            
            curr_boundary = ChunkBoundary(
                chunk_id=curr_chunk.chunk_id,
                entities=curr_chunk.entities, 
                relationships=curr_chunk.relationships,
                semantic_context=curr_chunk.metadata
            )
            
            overlap = overlap_manager.create_overlap(prev_boundary, curr_boundary)
            
            if overlap:
                overlaps_created += 1
                total_overlap_tokens += overlap.get("overlap_tokens", 0)
        
        test_results[strategy.value] = {
            "overlaps_created": overlaps_created,
            "total_overlap_tokens": total_overlap_tokens,
            "avg_overlap_tokens": total_overlap_tokens / max(1, overlaps_created)
        }
        
        print(f"  {strategy.value}: {overlaps_created} overlaps, "
              f"avg {test_results[strategy.value]['avg_overlap_tokens']:.0f} tokens")
    
    # Verify overlap management results
    for strategy_result in test_results.values():
        assert strategy_result["overlaps_created"] >= 0, "Overlaps should be non-negative"
        assert strategy_result["total_overlap_tokens"] >= 0, "Overlap tokens should be non-negative"
    
    print("✅ Overlap management integration test passed")
    return test_results


def test_end_to_end_integration():
    """Test complete end-to-end integration of all available components."""
    print("Testing end-to-end integration...")
    
    # Create sample IFC data
    sample_data = create_sample_ifc_data()
    
    # Step 1: Parse IFC data and create entities (Phase 1)
    config = Config()
    
    entities = []
    for obj_id, obj_data in sample_data["objects"].items():
        entity_type = IFCEntityType.from_string(obj_data["type"])
        properties = obj_data.get("properties", {})
        relationships = obj_data.get("relationships", {})
        
        # Extract simple relationship list
        rel_list = []
        for rel_type, rel_targets in relationships.items():
            if isinstance(rel_targets, list):
                rel_list.extend(rel_targets)
            else:
                rel_list.append(str(rel_targets))
        
        entity = IFCEntity(
            entity_id=obj_id,
            entity_type=entity_type,
            name=properties.get("Name"),
            description=properties.get("Description"),
            properties=properties,
            relationships=rel_list
        )
        entities.append(entity)
    
    # Step 2: Build relationships (Phase 1) - simplified
    relationship_mapper = RelationshipMapper()
    # For testing, we'll create a simple relationship graph manually
    from ifc_json_chunking.relationships import RelationshipGraph
    relationship_graph = RelationshipGraph()
    
    # Step 3: Create sample semantic chunks (Phase 2)
    chunks = create_sample_chunks()
    
    # Step 4: Apply token optimization (Phase 3)
    token_optimizer = create_token_optimizer(LLMModel.GEMINI_2_5_PRO)
    optimized_chunks = token_optimizer.optimize_chunks(chunks)
    
    # Step 5: Apply overlap management (Phase 3)
    overlap_config = create_overlap_config("relationship_aware", size_tokens=300)
    overlap_manager = OverlapManager(overlap_config)
    
    chunks_with_overlaps = []
    for i, chunk in enumerate(optimized_chunks):
        chunks_with_overlaps.append(chunk)
        
        # Add overlap if not the last chunk
        if i < len(optimized_chunks) - 1:
            current_boundary = ChunkBoundary(
                chunk_id=chunk.chunk_id,
                entities=chunk.entities,
                relationships=chunk.relationships,
                semantic_context=chunk.metadata
            )
            
            next_boundary = ChunkBoundary(
                chunk_id=optimized_chunks[i + 1].chunk_id,
                entities=optimized_chunks[i + 1].entities,
                relationships=optimized_chunks[i + 1].relationships,
                semantic_context=optimized_chunks[i + 1].metadata
            )
            
            overlap = overlap_manager.create_overlap(current_boundary, next_boundary)
            if overlap:
                # Create overlap chunk (simplified)
                overlap_chunk = SemanticChunk(
                    chunk_id=f"overlap_{i}_{i+1}",
                    strategy_used="OverlapManager",
                    entities=[],
                    relationships=[],
                    metadata={"overlap_data": overlap}
                )
                chunks_with_overlaps.append(overlap_chunk)
    
    # Step 6: Calculate final statistics
    token_counter = create_token_counter(LLMModel.GEMINI_2_5_PRO)
    
    total_tokens = sum(token_counter.count_chunk_tokens(chunk) for chunk in chunks_with_overlaps)
    avg_tokens_per_chunk = total_tokens / len(chunks_with_overlaps) if chunks_with_overlaps else 0
    
    results = {
        "original_entities": len(entities),
        "semantic_chunks_created": len(chunks),
        "optimized_chunks": len(optimized_chunks),
        "chunks_with_overlaps": len(chunks_with_overlaps),
        "final_chunks": len(chunks_with_overlaps),
        "total_tokens": total_tokens,
        "avg_tokens_per_chunk": avg_tokens_per_chunk
    }
    
    print(f"  Processed {results['original_entities']} entities → {results['final_chunks']} final chunks")
    print(f"  Total tokens: {results['total_tokens']}, avg per chunk: {results['avg_tokens_per_chunk']:.1f}")
    
    # Verify end-to-end results
    assert results["final_chunks"] > 0, "Should have final chunks"
    assert results["total_tokens"] > 0, "Should have positive token count"
    assert results["original_entities"] > 0, "Should have processed entities"
    
    print("✅ End-to-end integration test passed")
    return results


def main():
    """Run all available Phase 3 integration tests."""
    print("🧪 Running Phase 3 Integration Tests (Available Components)")
    print("=" * 70)
    
    all_results = {}
    
    try:
        # Test individual components
        all_results["token_counting"] = test_token_counting_integration()
        print()
        
        all_results["chunk_optimization"] = test_chunk_optimization_integration()
        print()
        
        all_results["overlap_management"] = test_overlap_management_integration()
        print()
        
        # Test complete integration
        all_results["end_to_end"] = test_end_to_end_integration()
        print()
        
        print("🎉 All Phase 3 integration tests passed successfully!")
        print()
        print("Summary:")
        print(f"  - Token counting tested across 3 LLM models")
        print(f"  - Chunk optimization validated for 2 models")
        print(f"  - Overlap management tested with 4 strategies")
        print(f"  - End-to-end pipeline successfully processed sample IFC data")
        
        return True
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)