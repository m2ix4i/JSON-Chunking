#!/usr/bin/env python3
"""
Simple server startup script for IFC JSON Chunking API.

This script starts the FastAPI application with appropriate settings
for development testing with real-world wooden components data.
"""

import uvicorn
import os
import sys
from pathlib import Path

# Add src to Python path for development
project_root = Path(__file__).parent
src_path = project_root / "src"
sys.path.insert(0, str(src_path))

def main():
    """Start the FastAPI development server."""
    
    # Configuration
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    debug = os.getenv("DEBUG", "true").lower() == "true"
    
    print("🚀 Starting IFC JSON Chunking API Server")
    print(f"📍 Host: {host}")
    print(f"🔌 Port: {port}")
    print(f"🐛 Debug Mode: {debug}")
    print(f"📊 API Docs: http://localhost:{port}/api/docs")
    print(f"📚 ReDoc: http://localhost:{port}/api/redoc")
    print()
    
    # Check for Gemini API key
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if not gemini_key or gemini_key == "your_gemini_api_key_here":
        print("⚠️  Warning: GEMINI_API_KEY not set in .env file")
        print("   Add your Gemini API key to .env for query processing functionality")
        print()
    
    # Check for demo data
    demo_data_path = os.getenv("DEMO_DATA_PATH", "")
    if demo_data_path and Path(demo_data_path).exists():
        print(f"✅ Demo data found: {demo_data_path}")
        print("   801 wooden building components available for testing")
        print()
    else:
        print("⚠️  Demo data not found - upload functionality will still work")
        print()
    
    try:
        # Start the server
        uvicorn.run(
            "ifc_json_chunking.web_api.main:app",
            host=host,
            port=port,
            reload=debug,
            reload_dirs=["src"] if debug else None,
            access_log=debug,
            log_level="debug" if debug else "info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())