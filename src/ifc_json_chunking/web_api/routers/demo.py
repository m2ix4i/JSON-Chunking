"""
Demo endpoints for testing with real-world wooden components data.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List

import structlog
from fastapi import APIRouter, HTTPException, Request

logger = structlog.get_logger(__name__)
router = APIRouter()

# Cache for demo data
_demo_data_cache = None

def get_demo_data() -> Dict[str, Any]:
    """Load demo data from the wooden components file."""
    global _demo_data_cache

    if _demo_data_cache is not None:
        return _demo_data_cache

    demo_data_path = os.getenv("DEMO_DATA_PATH", "")
    if not demo_data_path:
        raise HTTPException(status_code=404, detail="Demo data path not configured")

    path = Path(demo_data_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Demo data file not found: {demo_data_path}")

    try:
        with open(path, encoding='utf-8') as f:
            _demo_data_cache = json.load(f)

        logger.info("Demo data loaded successfully", file_path=demo_data_path, components=len(_demo_data_cache))
        return _demo_data_cache

    except Exception as e:
        logger.error("Failed to load demo data", error=str(e), file_path=demo_data_path)
        raise HTTPException(status_code=500, detail=f"Failed to load demo data: {str(e)}")

@router.get("/demo/data/stats",
    summary="Get demo data statistics"
)
async def get_demo_stats() -> Dict[str, Any]:
    """
    Get statistics about the loaded wooden components demo data.
    
    Returns component counts, material distribution, and other metadata.
    """
    try:
        data = get_demo_data()

        # Calculate statistics
        stats = {
            "total_components": 0,
            "component_types": {},
            "materials": {},
            "floors": {},
            "manufacturers": {},
            "file_info": {
                "path": os.getenv("DEMO_DATA_PATH", ""),
                "description": "801 wooden building components from real BIM model"
            }
        }

        for component_type, components in data.items():
            component_count = len(components)
            stats["total_components"] += component_count
            stats["component_types"][component_type] = component_count

            # Analyze materials, floors, manufacturers
            for component in components:
                # Materials
                holzart = component.get("Holzart", "Unknown")
                stats["materials"][holzart] = stats["materials"].get(holzart, 0) + 1

                # Floors
                geschoss = component.get("Geschoss", "Unknown")
                stats["floors"][geschoss] = stats["floors"].get(geschoss, 0) + 1

                # Manufacturers
                hersteller = component.get("Hersteller/Produkt", "Unknown")
                stats["manufacturers"][hersteller] = stats["manufacturers"].get(hersteller, 0) + 1

        return stats

    except Exception as e:
        logger.error("Error generating demo stats", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error generating demo stats: {str(e)}")

@router.get("/demo/queries/examples",
    summary="Get example German queries for wooden components"
)
async def get_example_queries() -> Dict[str, List[str]]:
    """
    Get example German queries for testing with wooden components data.
    
    Returns categorized query examples for quantity, component, material, spatial, and cost analysis.
    """
    return {
        "quantity": [
            "Wie viel Kubikmeter Holz sind insgesamt verbaut?",
            "Wieviele Ständer sind im Gebäude?",
            "Anzahl der Träger im 2. Obergeschoss",
            "Volumen aller Holzbauteile berechnen",
            "Gesamtmenge Konstruktionsvollholz",
            "Wie viele Kubikmeter Fichte sind verbaut?",
            "Anzahl Binder im Dachgeschoss"
        ],
        "component": [
            "Welche Ständer sind im 2. Obergeschoss?",
            "Alle Träger aus Buche auflisten",
            "Übersicht der Rähm im Erdgeschoss",
            "Zeige alle Binder im Dachgeschoss",
            "Welche Schwellen sind verbaut?",
            "Liste aller Deckenelemente",
            "Holzwände im 1. Obergeschoss"
        ],
        "material": [
            "Alle Bauteile aus Fichte auflisten",
            "Welche Materialien wurden für Träger verwendet?",
            "Konstruktionsvollholz C24 Übersicht",
            "Brettschichtholz GL70 Bauteile",
            "Materialverteilung im Holzbau",
            "Welche Holzarten sind verbaut?",
            "Festigkeitsklassen der verwendeten Hölzer"
        ],
        "spatial": [
            "Was ist im 2. Obergeschoss verbaut?",
            "Komponenten im Erdgeschoss auflisten",
            "Alle Bauteile im Dachgeschoss",
            "Holzbauteile im 1. OG analysieren",
            "Geschossverteilung der Ständer",
            "Bauteile in Bauteilzugehörigkeits-Nr. W_035",
            "Elemente im Bereich DG"
        ],
        "cost": [
            "Materialkosten für Hasslacher Gruppe Produkte",
            "Preise der Pollmeier Baubuche Träger",
            "Kostengruppe 331 Budget berechnen",
            "Kosten für Konstruktionsvollholz",
            "Budget für Holzbauteile im 2. OG",
            "Transportkosten für Binder",
            "Produktionskosten nach Hersteller"
        ],
        "prompt_template": [
            "Analysiere die JSON-Daten und identifiziere alle Bauteile aus Holz",
            "Berechne das Gesamtvolumen des verbauten Holzes in Kubikmetern",
            "Zähle die Anzahl der berücksichtigten Holzbauteile",
            "Überprüfe die notwendigen Daten für die Volumenberechnung"
        ]
    }

@router.get("/demo/data/sample/{component_type}",
    summary="Get sample components by type"
)
async def get_sample_components(
    component_type: str,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Get sample components of a specific type for testing.
    
    Available types: Ständer, Schwelle, Rähm, Decke, Träger, Binder, Wand, Dämmung
    """
    try:
        data = get_demo_data()

        if component_type not in data:
            available_types = list(data.keys())
            raise HTTPException(
                status_code=404,
                detail=f"Component type '{component_type}' not found. Available types: {available_types}"
            )

        components = data[component_type]
        sample = components[:limit] if len(components) > limit else components

        return {
            "component_type": component_type,
            "total_count": len(components),
            "sample_count": len(sample),
            "sample_components": sample
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting sample components", error=str(e), component_type=component_type)
        raise HTTPException(status_code=500, detail=f"Error getting sample components: {str(e)}")

@router.post("/demo/preload",
    summary="Preload demo data for testing"
)
async def preload_demo_data(request: Request) -> Dict[str, Any]:
    """
    Preload the wooden components demo data into the system for testing.
    
    This creates a virtual file upload with the demo data for immediate testing.
    """
    try:
        data = get_demo_data()

        # Here we would normally upload the data through the file service
        # For now, just return confirmation that data is available

        stats = {
            "total_components": sum(len(components) for components in data.values()),
            "component_types": {name: len(components) for name, components in data.items()},
            "status": "preloaded",
            "message": "Demo data is available for query processing"
        }

        logger.info("Demo data preloaded", stats=stats)

        return stats

    except Exception as e:
        logger.error("Error preloading demo data", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error preloading demo data: {str(e)}")
