#!/usr/bin/env python3
"""
Quick test script for the IFC JSON Chunking API.
"""

import asyncio
import aiohttp
import sys
import time
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

async def test_api():
    """Test the API endpoints."""
    
    base_url = "http://localhost:8001"
    
    async with aiohttp.ClientSession() as session:
        try:
            # Test health endpoint
            print("🔍 Testing health endpoint...")
            async with session.get(f"{base_url}/api/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Health check passed: {data}")
                else:
                    print(f"❌ Health check failed: {response.status}")
                    return False
            
            # Test root endpoint
            print("🔍 Testing root endpoint...")
            async with session.get(f"{base_url}/") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Root endpoint passed: {data}")
                else:
                    print(f"❌ Root endpoint failed: {response.status}")
            
            return True
            
        except aiohttp.ClientError as e:
            print(f"❌ Connection error: {e}")
            return False

def main():
    """Run the API test."""
    print("🧪 Testing IFC JSON Chunking API")
    
    try:
        result = asyncio.run(test_api())
        if result:
            print("✅ API test completed successfully!")
            return 0
        else:
            print("❌ API test failed!")
            return 1
    except Exception as e:
        print(f"❌ Test error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())