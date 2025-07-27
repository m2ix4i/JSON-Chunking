"""
WebSocket endpoints for real-time progress tracking.
"""

import json
from typing import Any, Dict

import structlog
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from ..services.websocket_service import WebSocketService

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize WebSocket service
websocket_service = WebSocketService()

@router.websocket("/ws/{query_id}")
async def websocket_endpoint(websocket: WebSocket, query_id: str):
    """
    WebSocket endpoint for real-time query progress updates.
    
    Connect to receive live updates during query processing:
    - Progress percentage and current step
    - Status changes and error messages
    - Chunk processing completion events
    - Final results notification
    
    Send messages:
    - {"type": "cancel"} to cancel query processing
    - {"type": "ping"} for connection health check
    """
    await websocket.accept()
    logger.info("WebSocket connection established", query_id=query_id)

    try:
        # Register connection
        await websocket_service.connect(query_id, websocket)

        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "query_id": query_id,
            "message": "WebSocket verbunden - bereit für Echtzeit-Updates"
        })

        # Listen for client messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)

                await websocket_service.handle_client_message(
                    query_id, websocket, message
                )

            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON message format"
                })
            except Exception as e:
                logger.error("Error handling client message",
                           query_id=query_id, error=str(e))
                await websocket.send_json({
                    "type": "error",
                    "message": f"Message handling error: {str(e)}"
                })

    except WebSocketDisconnect:
        logger.info("WebSocket connection closed", query_id=query_id)
    except Exception as e:
        logger.error("WebSocket error", query_id=query_id, error=str(e))
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Connection error: {str(e)}"
            })
        except:
            pass  # Connection might already be closed
    finally:
        # Clean up connection
        await websocket_service.disconnect(query_id, websocket)

@router.get("/ws/connections",
    summary="Get active WebSocket connections"
)
async def get_active_connections() -> Dict[str, Any]:
    """
    Get information about active WebSocket connections.
    
    Returns statistics about current connections for monitoring.
    """
    try:
        stats = await websocket_service.get_connection_stats()

        return {
            "active_connections": stats["active_connections"],
            "total_queries": stats["total_queries"],
            "connection_details": stats["connection_details"]
        }

    except Exception as e:
        logger.error("Error getting connection stats", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error retrieving connection stats: {str(e)}")

@router.post("/ws/{query_id}/broadcast",
    summary="Broadcast message to query WebSocket connections"
)
async def broadcast_to_query(
    query_id: str,
    message: Dict[str, Any]
) -> Dict[str, str]:
    """
    Broadcast message to all WebSocket connections for a specific query.
    
    Useful for administrative notifications or system updates.
    """
    try:
        connections_notified = await websocket_service.broadcast_to_query(
            query_id, message
        )

        logger.info("Message broadcasted to query connections",
                   query_id=query_id, connections=connections_notified)

        return {
            "query_id": query_id,
            "status": "broadcasted",
            "connections_notified": str(connections_notified)
        }

    except Exception as e:
        logger.error("Error broadcasting message", query_id=query_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error broadcasting message: {str(e)}")
