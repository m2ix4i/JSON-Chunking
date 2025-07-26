# 🚀 IFC JSON Chunking - Deployment Guide

Your IFC JSON Chunking system is now ready for testing! This guide shows you how to start both backend and frontend servers.

## ✅ Quick Start (Localhost Testing)

### 1. Start Backend API Server

```bash
cd /Users/max/Downloads/JSON-Chunking
API_PORT=8001 DEMO_DATA_PATH="/Users/max/Downloads/BA Cursor Projekt/IDM_Holzbauteile_mapped_cleaned.json" python3 run_server.py
```

**Expected Output:**
```
🚀 Starting IFC JSON Chunking API Server
📍 Host: 0.0.0.0
🔌 Port: 8001
📊 API Docs: http://localhost:8001/api/docs
✅ Demo data found: 801 wooden building components available for testing
```

### 2. Start Frontend Development Server

```bash
cd /Users/max/Downloads/JSON-Chunking/frontend
npm run dev
```

**Expected Output:**
```
VITE v4.5.14  ready in 722 ms
➜  Local:   http://localhost:3000/
```

## 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | React web application |
| **Backend API** | http://localhost:8001/api | FastAPI REST endpoints |
| **API Documentation** | http://localhost:8001/api/docs | Interactive Swagger UI |
| **ReDoc** | http://localhost:8001/api/redoc | Alternative API docs |

## 🧪 Testing German Queries

### Demo Endpoints for Wooden Components Data

The system includes **801 real wooden building components** for testing:

1. **Statistics**: `GET /api/demo/data/stats`
   - Component counts by type (Ständer, Träger, Binder, etc.)
   - Material distribution (Fichte, Buche, etc.)
   - Floor distribution (EG, 1.OG, 2.OG, DG)

2. **Example Queries**: `GET /api/demo/queries/examples`
   - German quantity queries: "Wie viel Kubikmeter Holz sind insgesamt verbaut?"
   - Component queries: "Welche Ständer sind im 2. Obergeschoss?"
   - Material queries: "Alle Bauteile aus Fichte auflisten"
   - Spatial queries: "Was ist im 2. Obergeschoss verbaut?"

3. **Sample Data**: `GET /api/demo/data/sample/Ständer?limit=5`
   - Get sample components by type for testing

### Test Queries to Try

**Quantity Analysis:**
- "Wie viel Kubikmeter Holz sind insgesamt verbaut?"
- "Wieviele Ständer sind im Gebäude?"
- "Anzahl der Träger im 2. Obergeschoss"

**Component Analysis:**
- "Welche Ständer sind im 2. Obergeschoss?"
- "Alle Träger aus Buche auflisten"
- "Zeige alle Binder im Dachgeschoss"

**Material Analysis:**
- "Alle Bauteile aus Fichte auflisten"
- "Welche Materialien wurden für Träger verwendet?"
- "Konstruktionsvollholz C24 Übersicht"

## 🔧 Configuration

### Backend Configuration (.env)
```env
# API Configuration
API_HOST=0.0.0.0
API_PORT=8001

# Demo Data
DEMO_DATA_PATH=/Users/max/Downloads/BA Cursor Projekt/IDM_Holzbauteile_mapped_cleaned.json

# Optional: Add your Gemini API key for query processing
GEMINI_API_KEY=your_gemini_api_key_here
```

### Frontend Configuration (frontend/.env)
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8001/api
```

## 🛠️ Development Features

### Backend Features ✅
- FastAPI with automatic OpenAPI documentation
- Health monitoring and performance metrics
- File upload support for JSON data
- German query processing with intent classification
- Real-world wooden components demo data integration
- WebSocket support for real-time progress updates
- Comprehensive error handling and logging

### Frontend Features ✅
- React + TypeScript with Material-UI
- File drag-and-drop upload interface
- Query form with German language support
- Real-time query progress tracking
- Results visualization and export
- Responsive design for mobile and desktop
- Error handling and user notifications

## 📊 System Status

The deployment includes:

✅ **Phase 1**: Environment Setup & Dependencies  
✅ **Phase 2**: Backend API Launch  
✅ **Phase 3**: Frontend Development Setup  
✅ **Phase 4**: Integration Testing & Demo Setup  
✅ **Phase 5**: Production-Ready Deployment  

## 🚨 Troubleshooting

### Port Conflicts
If port 8001 is busy, change the port:
```bash
API_PORT=8002 python3 run_server.py
```
And update frontend/.env:
```env
VITE_API_BASE_URL=http://localhost:8002/api
```

### Demo Data Not Found
Ensure the path is correct:
```bash
ls -la "/Users/max/Downloads/BA Cursor Projekt/IDM_Holzbauteile_mapped_cleaned.json"
```

### Frontend Build Issues
Install missing dependencies:
```bash
cd frontend
npm install
```

## 🎯 Next Steps

1. **Test Basic Functionality**: Upload a JSON file and run queries
2. **Try German Queries**: Use the demo endpoints to test wooden components
3. **Explore API**: Check out the interactive docs at `/api/docs`
4. **Add Gemini API Key**: For full query processing capabilities
5. **Production Deployment**: Use Docker compose for production setup

---

**🎉 Your IFC JSON Chunking system is ready for testing!**

Access the frontend at **http://localhost:3000** and start exploring building data with German queries.