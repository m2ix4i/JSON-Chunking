#!/usr/bin/env python3
"""
Quick test script for the FastAPI backend.

Run with: python test_api.py
"""

import asyncio
import uvicorn
from src.ifc_json_chunking.web_api.main import app

async def test_api():
    """Test the API endpoints manually."""
    print("🚀 Starting FastAPI test server...")
    print("📖 API Documentation: http://localhost:8000/api/docs")
    print("🔍 Health Check: http://localhost:8000/api/health")
    print("📱 Root Endpoint: http://localhost:8000/")
    print("\n⚡ Server starting on http://localhost:8000")
    
    # Start the server
    config = uvicorn.Config(
        app, 
        host="0.0.0.0", 
        port=8000, 
        log_level="info",
        reload=True
    )
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    asyncio.run(test_api())