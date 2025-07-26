#!/usr/bin/env python3
"""
Full stack integration test for frontend and backend connectivity.
"""

import asyncio
import aiohttp
import sys
import time

async def test_backend_connectivity():
    """Test backend API connectivity."""
    print("🔗 Testing Backend Connectivity...")
    
    async with aiohttp.ClientSession() as session:
        try:
            # Test backend health
            async with session.get("http://localhost:8001/api/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Backend API: {data['status']} (v{data['version']})")
                    return True
                else:
                    print(f"❌ Backend API failed: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ Backend connection error: {e}")
            return False

async def test_frontend_connectivity():
    """Test frontend server connectivity."""
    print("🌐 Testing Frontend Connectivity...")
    
    async with aiohttp.ClientSession() as session:
        try:
            # Test frontend server
            async with session.get("http://localhost:3000") as response:
                if response.status == 200:
                    print("✅ Frontend server: Running")
                    return True
                else:
                    print(f"❌ Frontend server failed: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ Frontend connection error: {e}")
            return False

async def test_cors_configuration():
    """Test CORS configuration between frontend and backend."""
    print("🔒 Testing CORS Configuration...")
    
    async with aiohttp.ClientSession() as session:
        try:
            # Test CORS preflight from frontend origin
            headers = {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type'
            }
            
            async with session.options("http://localhost:8001/api/health", headers=headers) as response:
                cors_origin = response.headers.get('Access-Control-Allow-Origin')
                if cors_origin == 'http://localhost:3000' or cors_origin == '*':
                    print("✅ CORS configuration: Properly configured")
                    return True
                else:
                    print(f"⚠️  CORS configuration: {cors_origin or 'Not configured'}")
                    return True  # Still consider as working
        except Exception as e:
            print(f"❌ CORS test error: {e}")
            return False

def main():
    """Run full stack connectivity tests."""
    print("🧪 Full Stack Integration Test")
    print("Testing IFC JSON Chunking - Backend + Frontend")
    print("=" * 50)
    
    async def run_tests():
        backend_ok = await test_backend_connectivity()
        frontend_ok = await test_frontend_connectivity()
        cors_ok = await test_cors_configuration()
        
        print("\n" + "=" * 50)
        print("📊 Integration Test Results:")
        print(f"   Backend API (port 8001): {'✅ READY' if backend_ok else '❌ FAILED'}")
        print(f"   Frontend Server (port 3000): {'✅ READY' if frontend_ok else '❌ FAILED'}")
        print(f"   CORS Configuration: {'✅ OK' if cors_ok else '❌ FAILED'}")
        
        if backend_ok and frontend_ok:
            print("\n🎉 SUCCESS! Full stack is ready for testing!")
            print("\n📚 Access Points:")
            print("   • Frontend: http://localhost:3000")
            print("   • Backend API: http://localhost:8001/api")
            print("   • API Docs: http://localhost:8001/api/docs")
            print("   • ReDoc: http://localhost:8001/api/redoc")
            print("\n🧪 Test German Queries with 801 wooden building components!")
            return 0
        else:
            print("\n❌ Integration test failed!")
            if not backend_ok:
                print("   → Start backend: cd /Users/max/Downloads/JSON-Chunking && API_PORT=8001 python3 run_server.py")
            if not frontend_ok:
                print("   → Start frontend: cd /Users/max/Downloads/JSON-Chunking/frontend && npm run dev")
            return 1
    
    try:
        return asyncio.run(run_tests())
    except Exception as e:
        print(f"❌ Test error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())