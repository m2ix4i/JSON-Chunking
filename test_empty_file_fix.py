#!/usr/bin/env python3
"""
Simple test to verify empty file handling in core functionality.
This helps identify the actual issue without running the full test suite.
"""

import asyncio
import json
import tempfile
from pathlib import Path
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from ifc_json_chunking.core import ChunkingEngine
from ifc_json_chunking.config import Config


async def test_empty_file_scenarios():
    """Test different empty file scenarios."""
    print("Testing empty file handling...")
    
    config = Config(log_level="ERROR")  # Reduce noise
    engine = ChunkingEngine(config)
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        
        # Test 1: Completely empty file (0 bytes)
        empty_file = tmp_path / "empty.json"
        empty_file.touch()
        
        print(f"Test 1: Processing completely empty file ({empty_file.stat().st_size} bytes)")
        try:
            result = await engine.process_file(empty_file)
            print(f"✅ Empty file processed successfully: {result}")
        except Exception as e:
            print(f"❌ Empty file processing failed: {e}")
        
        # Test 2: File with empty JSON object
        empty_json_file = tmp_path / "empty_json.json"
        with open(empty_json_file, 'w') as f:
            json.dump({}, f)
        
        print(f"Test 2: Processing empty JSON object ({empty_json_file.stat().st_size} bytes)")
        try:
            result = await engine.process_file(empty_json_file)
            print(f"✅ Empty JSON processed successfully: {result}")
        except Exception as e:
            print(f"❌ Empty JSON processing failed: {e}")
        
        # Test 3: File with just whitespace
        whitespace_file = tmp_path / "whitespace.json"
        with open(whitespace_file, 'w') as f:
            f.write("   \n  \t  \n")
        
        print(f"Test 3: Processing whitespace-only file ({whitespace_file.stat().st_size} bytes)")
        try:
            result = await engine.process_file(whitespace_file)
            print(f"✅ Whitespace file processed successfully: {result}")
        except Exception as e:
            print(f"❌ Whitespace file processing failed: {e}")
            
        # Test 4: File with invalid JSON
        invalid_json_file = tmp_path / "invalid.json"
        with open(invalid_json_file, 'w') as f:
            f.write("{ invalid json")
        
        print(f"Test 4: Processing invalid JSON file ({invalid_json_file.stat().st_size} bytes)")
        try:
            result = await engine.process_file(invalid_json_file)
            print(f"⚠️ Invalid JSON processed unexpectedly: {result}")
        except Exception as e:
            print(f"✅ Invalid JSON correctly failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_empty_file_scenarios())