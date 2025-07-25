#!/usr/bin/env python3
"""
Example usage of the IFC JSON Chunking query processing system.

This example demonstrates the complete workflow from loading IFC data
to processing German building industry queries with intelligent orchestration.
"""

import asyncio
import json
from pathlib import Path
from typing import List

# Import the query processing system
from src.ifc_json_chunking import (
    ChunkingEngine,
    Config,
    QueryProcessor,
    QueryRequest,
    QueryIntent,
    ProgressEvent,
    TemporaryStorage,
    QueryCache
)
from src.ifc_json_chunking.llm.types import LLMConfig, RateLimitConfig


async def main():
    """Demonstrate query processing workflow."""
    print("🏗️  IFC JSON Chunking - Query Processing Example")
    print("=" * 60)
    
    # Configuration
    config = Config(
        gemini_api_key="your-gemini-api-key-here",  # Replace with actual key
        target_llm_model="gemini-2.5-pro",
        max_concurrent_requests=10,
        rate_limit_rpm=60,
        enable_caching=True
    )
    
    print(f"✅ Configuration loaded")
    print(f"   Model: {config.target_llm_model}")
    print(f"   Max concurrent: {config.max_concurrent_requests}")
    print()
    
    # Initialize components
    print("🔧 Initializing components...")
    
    # Create chunking engine for data preparation
    chunking_engine = ChunkingEngine(config)
    
    # Create LLM configuration
    llm_config = LLMConfig(
        api_key=config.gemini_api_key,
        model=config.target_llm_model,
        max_tokens=8000,
        timeout=config.request_timeout
    )
    
    # Create rate limiting configuration
    rate_limit_config = RateLimitConfig(
        requests_per_minute=config.rate_limit_rpm,
        max_concurrent=config.max_concurrent_requests
    )
    
    # Initialize query processor
    query_processor = QueryProcessor(
        config=config,
        llm_config=llm_config,
        rate_limit_config=rate_limit_config
    )
    
    # Initialize storage and caching
    temp_storage = TemporaryStorage()
    query_cache = QueryCache()
    
    print("✅ Components initialized")
    print()
    
    # Sample IFC data (simplified for demonstration)
    sample_ifc_data = {
        "building_elements": [
            {
                "id": "wall_001",
                "type": "IfcWall",
                "material": "concrete",
                "volume": 25.5,
                "location": {"floor": 1, "room": "R101"},
                "properties": {
                    "thickness": 0.3,
                    "height": 3.0,
                    "length": 8.5,
                    "fire_resistance": "R90"
                }
            },
            {
                "id": "slab_001", 
                "type": "IfcSlab",
                "material": "concrete",
                "volume": 45.2,
                "location": {"floor": 1},
                "properties": {
                    "thickness": 0.25,
                    "area": 180.8,
                    "load_bearing": True
                }
            },
            {
                "id": "column_001",
                "type": "IfcColumn", 
                "material": "steel",
                "volume": 2.1,
                "location": {"floor": 1, "room": "R101"},
                "properties": {
                    "cross_section": "HEB300",
                    "height": 3.0,
                    "load_capacity": 1500
                }
            },
            {
                "id": "door_001",
                "type": "IfcDoor",
                "material": "wood",
                "location": {"floor": 2, "room": "R201"},
                "properties": {
                    "width": 0.9,
                    "height": 2.1,
                    "fire_rating": "T30"
                }
            },
            {
                "id": "window_001",
                "type": "IfcWindow",
                "material": "glass",
                "location": {"floor": 2, "room": "R201"},
                "properties": {
                    "width": 1.5,
                    "height": 1.2,
                    "glazing_type": "double"
                }
            }
        ],
        "building_info": {
            "total_floors": 2,
            "total_area": 500.0,
            "construction_year": 2023,
            "building_type": "office"
        }
    }
    
    print("📊 Sample IFC Data:")
    print(f"   Building Elements: {len(sample_ifc_data['building_elements'])}")
    print(f"   Building Type: {sample_ifc_data['building_info']['building_type']}")
    print(f"   Total Floors: {sample_ifc_data['building_info']['total_floors']}")
    print()
    
    # Chunk the data
    print("🔄 Chunking IFC data...")
    chunks = await chunking_engine.chunk_json_async(
        json_data=sample_ifc_data,
        chunking_strategy="hierarchical"
    )
    
    print(f"✅ Created {len(chunks)} chunks")
    for i, chunk in enumerate(chunks):
        print(f"   Chunk {i+1}: {chunk.chunk_type.value} - {len(str(chunk.content))} chars")
    print()
    
    # Define test queries in German (building industry focused)
    test_queries = [
        {
            "query": "Wie viel Kubikmeter Beton sind verbaut?",
            "intent": QueryIntent.QUANTITY,
            "description": "Quantity query - concrete volume"
        },
        {
            "query": "Welche Türen sind im 2. Stock?", 
            "intent": QueryIntent.COMPONENT,
            "description": "Component query - doors on floor 2"
        },
        {
            "query": "Alle Betonelemente auflisten",
            "intent": QueryIntent.MATERIAL,
            "description": "Material query - concrete elements"
        },
        {
            "query": "Was ist in Raum R201?",
            "intent": QueryIntent.SPATIAL,
            "description": "Spatial query - room contents"
        }
    ]
    
    # Process each query
    for i, query_info in enumerate(test_queries, 1):
        print(f"🔍 Query {i}: {query_info['description']}")
        print(f"   German: {query_info['query']}")
        print(f"   Expected Intent: {query_info['intent'].value}")
        print()
        
        # Track progress
        progress_events = []
        
        def progress_callback(event: ProgressEvent):
            progress_events.append(event)
            print(f"   📈 Progress: {event.message} ({event.progress_percentage:.1f}%)")
        
        try:
            # Check cache first
            cached_result = query_cache.get(query_info['query'], query_info['intent'])
            
            if cached_result:
                print("   💾 Found cached result!")
                result = cached_result
            else:
                print("   🚀 Processing query...")
                
                # Create query request
                request = QueryRequest(
                    query=query_info['query'],
                    chunks=chunks,
                    intent_hint=query_info['intent'],
                    progress_callback=progress_callback,
                    max_concurrent=5,
                    cache_results=True
                )
                
                # Process the query
                result = await query_processor.process_request(request)
                
                # Cache the result
                query_cache.put(
                    query=query_info['query'],
                    intent=query_info['intent'],
                    result=result,
                    ttl_seconds=3600  # 1 hour
                )
                
                # Store in temporary storage
                await temp_storage.store_query_result(
                    query_id=result.query_id,
                    result=result,
                    ttl_seconds=7200  # 2 hours
                )
            
            # Display results
            print()
            print("   📋 Results:")
            print(f"      Query ID: {result.query_id}")
            print(f"      Intent: {result.intent.value}")
            print(f"      Status: {result.status.value}")
            print(f"      Confidence: {result.confidence_score:.2f}")
            print(f"      Processing Time: {result.processing_time:.1f}s")
            print(f"      Success Rate: {result.success_rate:.1f}%")
            print(f"      Chunks Processed: {result.successful_chunks}/{result.total_chunks}")
            print(f"      Tokens Used: {result.total_tokens}")
            print(f"      Estimated Cost: ${result.total_cost:.4f}")
            print()
            print(f"   💬 Answer:")
            print(f"      {result.answer}")
            print()
            
            # Show chunk results summary
            if result.chunk_results:
                print("   📄 Chunk Results Summary:")
                for j, chunk_result in enumerate(result.chunk_results):
                    status_emoji = "✅" if chunk_result.status == "completed" else "❌"
                    print(f"      {status_emoji} Chunk {j+1}: {chunk_result.status} "
                          f"(confidence: {chunk_result.confidence_score:.2f}, "
                          f"tokens: {chunk_result.tokens_used})")
                print()
            
            # Show progress events summary
            if progress_events:
                print(f"   📊 Progress Events: {len(progress_events)} events tracked")
                for event in progress_events:
                    print(f"      • {event.event_type.value}: {event.message}")
                print()
        
        except Exception as e:
            print(f"   ❌ Error processing query: {str(e)}")
            print()
        
        print("-" * 60)
        print()
    
    # Show system statistics
    print("📈 System Statistics:")
    print()
    
    # Cache statistics
    cache_stats = query_cache.get_stats()
    print("💾 Cache Performance:")
    print(f"   Total Entries: {cache_stats['total_entries']}")
    print(f"   Hit Rate: {cache_stats['hit_rate_percent']:.1f}%")
    print(f"   Total Hits: {cache_stats['total_hits']}")
    print(f"   Total Misses: {cache_stats['total_misses']}")
    print(f"   Time Saved: {cache_stats['estimated_time_saved_seconds']:.1f}s")
    print()
    
    # Storage statistics
    storage_stats = await temp_storage.get_stats()
    print("💿 Storage Statistics:")
    print(f"   Backend: {storage_stats['backend']}")
    print(f"   Total Entries: {storage_stats['total_entries']}")
    print()
    
    # Health check
    print("🏥 Health Check:")
    health_status = await query_processor.health_check()
    for component, status in health_status.items():
        status_emoji = "✅" if status else "❌"
        print(f"   {status_emoji} {component}: {'Healthy' if status else 'Unhealthy'}")
    print()
    
    # Cleanup
    print("🧹 Cleaning up...")
    await query_processor.close()
    await temp_storage.close()
    
    print("✅ Example completed successfully!")


def example_sync_usage():
    """Demonstrate synchronous usage patterns."""
    print("\n🔧 Synchronous Usage Examples:")
    print("=" * 40)
    
    # Initialize components (sync)
    config = Config()
    
    # Intent classification (sync)
    from src.ifc_json_chunking.orchestration import IntentClassifier
    classifier = IntentClassifier()
    
    queries = [
        "Wie viel Beton ist verbaut?",
        "Welche Türen sind im Gebäude?",
        "Material der Stützen",
        "Was ist in Raum R101?",
        "Kosten für Stahlträger"
    ]
    
    print("🎯 Intent Classification Results:")
    for query in queries:
        result = classifier.classify_intent(query)
        print(f"   '{query}'")
        print(f"   → Intent: {result.intent.value} (confidence: {result.confidence:.2f})")
        print(f"   → Patterns: {result.matched_patterns[:2]}")  # Show first 2 patterns
        print()
    
    # Pattern examples
    print("📝 Pattern Examples by Intent:")
    for intent in [QueryIntent.QUANTITY, QueryIntent.COMPONENT, QueryIntent.MATERIAL]:
        examples = classifier.get_pattern_examples(intent)
        print(f"   {intent.value.upper()}:")
        for example in examples:
            print(f"      • {example}")
        print()


if __name__ == "__main__":
    print("🏗️  IFC JSON Chunking - Query Processing System")
    print("   Advanced example with German building industry queries")
    print()
    
    # Run synchronous examples first
    example_sync_usage()
    
    # Run main async example
    asyncio.run(main())