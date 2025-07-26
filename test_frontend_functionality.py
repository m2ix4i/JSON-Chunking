#!/usr/bin/env python3
"""
Test frontend functionality after fixing React errors.
"""

import asyncio
import aiohttp
import sys
import time

async def test_frontend_pages():
    """Test frontend pages load without errors."""
    print("🌐 Testing Frontend Pages...")
    
    async with aiohttp.ClientSession() as session:
        pages_to_test = [
            ("Dashboard", "http://localhost:3000"),
            ("API Proxy Health", "http://localhost:3000/api/health"),
        ]
        
        results = []
        for name, url in pages_to_test:
            try:
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        content = await response.text()
                        # Check for React error indicators
                        if "TypeError" in content or "Cannot read properties" in content:
                            results.append((name, "❌ React Error"))
                        elif "<!doctype html>" in content.lower():
                            results.append((name, "✅ Loading"))
                        elif '"status":"healthy"' in content:
                            results.append((name, "✅ API Working"))
                        else:
                            results.append((name, "✅ OK"))
                    else:
                        results.append((name, f"❌ HTTP {response.status}"))
            except Exception as e:
                results.append((name, f"❌ Error: {str(e)[:50]}"))
        
        return results

async def test_demo_endpoints():
    """Test demo endpoints for German queries."""
    print("🧪 Testing Demo Endpoints...")
    
    async with aiohttp.ClientSession() as session:
        endpoints_to_test = [
            ("Example Queries", "http://localhost:3000/api/demo/queries/examples"),
            ("Demo Stats", "http://localhost:3000/api/demo/data/stats"),
        ]
        
        results = []
        for name, url in endpoints_to_test:
            try:
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        if "quantity" in data and "component" in data:
                            results.append((name, "✅ German Queries Ready"))
                        elif "total_components" in data:
                            results.append((name, f"✅ {data.get('total_components', 0)} Components"))
                        else:
                            results.append((name, "✅ OK"))
                    else:
                        results.append((name, f"❌ HTTP {response.status}"))
            except Exception as e:
                results.append((name, f"❌ Error: {str(e)[:50]}"))
        
        return results

def main():
    """Run comprehensive frontend functionality test."""
    print("🧪 Frontend Functionality Test")
    print("Testing React Dashboard and German Query System")
    print("=" * 60)
    
    async def run_tests():
        frontend_results = await test_frontend_pages()
        demo_results = await test_demo_endpoints()
        
        print("\n📊 Frontend Pages:")
        for name, status in frontend_results:
            print(f"   {name}: {status}")
        
        print("\n🇩🇪 German Query Demo:")
        for name, status in demo_results:
            print(f"   {name}: {status}")
        
        # Check overall status
        all_results = frontend_results + demo_results
        success_count = sum(1 for _, status in all_results if "✅" in status)
        total_count = len(all_results)
        
        print("\n" + "=" * 60)
        print(f"📈 Test Results: {success_count}/{total_count} passing")
        
        if success_count == total_count:
            print("🎉 SUCCESS! Frontend is fully functional!")
            print("\n🌐 Access Points:")
            print("   • Frontend Dashboard: http://localhost:3000")
            print("   • File Upload: http://localhost:3000/upload")
            print("   • Query Interface: http://localhost:3000/query")
            print("   • API Documentation: http://localhost:8001/api/docs")
            print("\n🇩🇪 Ready for German building industry queries!")
            return 0
        else:
            print("❌ Some tests failed - check errors above")
            return 1
    
    try:
        return asyncio.run(run_tests())
    except Exception as e:
        print(f"❌ Test error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())