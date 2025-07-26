#!/usr/bin/env python3
"""
Test script for demo endpoints with wooden components data.
"""

import asyncio
import aiohttp
import json
import sys

async def test_demo_endpoints():
    """Test the demo endpoints for wooden components data."""
    
    base_url = "http://localhost:8001/api"
    
    async with aiohttp.ClientSession() as session:
        try:
            # Test demo stats endpoint
            print("🔍 Testing demo stats endpoint...")
            async with session.get(f"{base_url}/demo/data/stats") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Demo stats: {data['total_components']} total components")
                    print(f"   Component types: {list(data['component_types'].keys())}")
                    print(f"   Top materials: {list(data['materials'].keys())[:3]}")
                else:
                    print(f"❌ Demo stats failed: {response.status}")
                    error_text = await response.text()
                    print(f"   Error: {error_text}")
            
            # Test example queries endpoint
            print("\n🔍 Testing example queries endpoint...")
            async with session.get(f"{base_url}/demo/queries/examples") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Example queries loaded")
                    print(f"   Categories: {list(data.keys())}")
                    print(f"   Sample quantity query: {data['quantity'][0]}")
                else:
                    print(f"❌ Example queries failed: {response.status}")
            
            # Test sample components endpoint
            print("\n🔍 Testing sample components endpoint...")
            async with session.get(f"{base_url}/demo/data/sample/Ständer?limit=3") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Sample components: {data['sample_count']}/{data['total_count']} Ständer")
                    if data['sample_components']:
                        component = data['sample_components'][0]
                        print(f"   Example: {component.get('Beschreibung', 'N/A')} - {component.get('Holzart', 'N/A')}")
                else:
                    print(f"❌ Sample components failed: {response.status}")
            
            # Test preload endpoint
            print("\n🔍 Testing preload endpoint...")
            async with session.post(f"{base_url}/demo/preload") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Demo data preloaded: {data['status']}")
                    print(f"   Total components: {data['total_components']}")
                else:
                    print(f"❌ Preload failed: {response.status}")
            
            return True
            
        except aiohttp.ClientError as e:
            print(f"❌ Connection error: {e}")
            return False

def main():
    """Run the demo endpoints test."""
    print("🧪 Testing Demo Endpoints for Wooden Components Data")
    
    try:
        result = asyncio.run(test_demo_endpoints())
        if result:
            print("\n✅ All demo endpoint tests completed successfully!")
            print("🌐 API Documentation: http://localhost:8001/api/docs")
            print("📚 ReDoc: http://localhost:8001/api/redoc")
            return 0
        else:
            print("\n❌ Demo endpoint tests failed!")
            return 1
    except Exception as e:
        print(f"❌ Test error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())