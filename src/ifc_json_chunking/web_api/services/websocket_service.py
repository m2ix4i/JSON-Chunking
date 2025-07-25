"""
WebSocket service for managing real-time connections and broadcasting.
"""

import asyncio
import json
import time
from typing import Dict, Any, List, Set
from fastapi import WebSocket
import structlog

logger = structlog.get_logger(__name__)

class WebSocketService:
    """Service for managing WebSocket connections and message broadcasting."""
    
    def __init__(self):
        """Initialize WebSocket service."""
        # Active connections by query ID
        self._connections: Dict[str, Set[WebSocket]] = {}
        
        # Connection metadata
        self._connection_info: Dict[WebSocket, Dict[str, Any]] = {}
        
        # Message history for connection recovery
        self._message_history: Dict[str, List[Dict[str, Any]]] = {}
        self._max_history_size = 50
    
    async def connect(self, query_id: str, websocket: WebSocket) -> None:
        """
        Register a new WebSocket connection for a query.
        
        Args:
            query_id: Query ID to associate with connection
            websocket: WebSocket connection object
        """
        # Initialize query connections if not exists
        if query_id not in self._connections:
            self._connections[query_id] = set()
        
        # Add connection
        self._connections[query_id].add(websocket)
        
        # Store connection metadata
        self._connection_info[websocket] = {
            "query_id": query_id,
            "connected_at": time.time(),
            "last_activity": time.time()
        }
        
        logger.info(
            "WebSocket connection registered",
            query_id=query_id,
            total_connections=len(self._connections[query_id])
        )
        
        # Send recent message history if available
        await self._send_message_history(query_id, websocket)
    
    async def disconnect(self, query_id: str, websocket: WebSocket) -> None:
        """
        Unregister a WebSocket connection.
        
        Args:
            query_id: Query ID associated with connection
            websocket: WebSocket connection object
        """
        # Remove from connections
        if query_id in self._connections:
            self._connections[query_id].discard(websocket)
            
            # Clean up empty query sets
            if not self._connections[query_id]:
                del self._connections[query_id]
        
        # Remove connection metadata
        self._connection_info.pop(websocket, None)
        
        logger.info(
            "WebSocket connection unregistered",
            query_id=query_id,
            remaining_connections=len(self._connections.get(query_id, []))
        )
    
    async def broadcast_to_query(self, query_id: str, message: Dict[str, Any]) -> int:
        """
        Broadcast message to all connections for a specific query.
        
        Args:
            query_id: Query ID to broadcast to
            message: Message to broadcast
            
        Returns:
            Number of connections message was sent to
        """
        if query_id not in self._connections:
            return 0
        
        # Add timestamp to message
        message_with_timestamp = {
            **message,
            "timestamp": time.time(),
            "query_id": query_id
        }
        
        # Store in message history
        await self._store_message_history(query_id, message_with_timestamp)
        
        # Broadcast to all connections
        connections = list(self._connections[query_id])  # Create copy to avoid modification during iteration
        sent_count = 0
        
        for websocket in connections:
            try:
                await websocket.send_json(message_with_timestamp)
                sent_count += 1
                
                # Update last activity
                if websocket in self._connection_info:
                    self._connection_info[websocket]["last_activity"] = time.time()
                    
            except Exception as e:
                logger.warning(
                    "Failed to send message to WebSocket",
                    query_id=query_id,
                    error=str(e)
                )
                
                # Remove broken connection
                await self.disconnect(query_id, websocket)
        
        logger.debug(
            "Message broadcasted to query connections",
            query_id=query_id,
            message_type=message.get("type", "unknown"),
            connections_reached=sent_count
        )
        
        return sent_count
    
    async def handle_client_message(
        self,
        query_id: str,
        websocket: WebSocket,
        message: Dict[str, Any]
    ) -> None:
        """
        Handle incoming message from client.
        
        Args:
            query_id: Query ID associated with connection
            websocket: WebSocket connection
            message: Message from client
        """
        message_type = message.get("type", "unknown")
        
        logger.debug(
            "Received client message",
            query_id=query_id,
            message_type=message_type
        )
        
        try:
            if message_type == "ping":
                # Respond to ping with pong
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": time.time()
                })
                
            elif message_type == "cancel":
                # Handle query cancellation request
                await self._handle_cancel_request(query_id, websocket)
                
            elif message_type == "subscribe_updates":
                # Handle subscription to specific update types
                await self._handle_subscription_request(query_id, websocket, message)
                
            else:
                # Unknown message type
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                })
            
            # Update last activity
            if websocket in self._connection_info:
                self._connection_info[websocket]["last_activity"] = time.time()
                
        except Exception as e:
            logger.error(
                "Error handling client message",
                query_id=query_id,
                message_type=message_type,
                error=str(e)
            )
            
            await websocket.send_json({
                "type": "error",
                "message": f"Failed to handle message: {str(e)}"
            })
    
    async def _handle_cancel_request(self, query_id: str, websocket: WebSocket) -> None:
        """Handle query cancellation request."""
        # This would integrate with the query service to actually cancel the query
        await websocket.send_json({
            "type": "cancel_requested",
            "query_id": query_id,
            "message": "Cancellation request received"
        })
        
        # Broadcast cancellation to all connections for this query
        await self.broadcast_to_query(query_id, {
            "type": "query_cancelled",
            "message": "Query was cancelled by user request"
        })
    
    async def _handle_subscription_request(
        self,
        query_id: str,
        websocket: WebSocket,
        message: Dict[str, Any]
    ) -> None:
        """Handle subscription to specific update types."""
        update_types = message.get("update_types", [])
        
        # Store subscription preferences in connection metadata
        if websocket in self._connection_info:
            self._connection_info[websocket]["subscriptions"] = update_types
        
        await websocket.send_json({
            "type": "subscription_confirmed",
            "update_types": update_types,
            "message": f"Subscribed to {len(update_types)} update types"
        })
    
    async def _store_message_history(self, query_id: str, message: Dict[str, Any]) -> None:
        """Store message in history for connection recovery."""
        if query_id not in self._message_history:
            self._message_history[query_id] = []
        
        self._message_history[query_id].append(message)
        
        # Trim history to max size
        if len(self._message_history[query_id]) > self._max_history_size:
            self._message_history[query_id] = self._message_history[query_id][-self._max_history_size:]
    
    async def _send_message_history(self, query_id: str, websocket: WebSocket) -> None:
        """Send recent message history to newly connected client."""
        if query_id in self._message_history:
            history = self._message_history[query_id]
            
            if history:
                try:
                    await websocket.send_json({
                        "type": "message_history",
                        "messages": history[-10:],  # Send last 10 messages
                        "message": f"Sending {len(history[-10:])} recent messages"
                    })
                except Exception as e:
                    logger.warning(
                        "Failed to send message history",
                        query_id=query_id,
                        error=str(e)
                    )
    
    async def get_connection_stats(self) -> Dict[str, Any]:
        """Get statistics about active connections."""
        total_connections = sum(len(connections) for connections in self._connections.values())
        
        # Calculate connection details
        connection_details = []
        for query_id, connections in self._connections.items():
            connection_details.append({
                "query_id": query_id,
                "connection_count": len(connections),
                "message_history_size": len(self._message_history.get(query_id, []))
            })
        
        return {
            "active_connections": total_connections,
            "total_queries": len(self._connections),
            "connection_details": connection_details,
            "average_connections_per_query": total_connections / len(self._connections) if self._connections else 0
        }
    
    async def cleanup_stale_connections(self, max_idle_minutes: int = 30) -> int:
        """Clean up stale connections that haven't been active."""
        cutoff_time = time.time() - (max_idle_minutes * 60)
        cleaned_count = 0
        
        # Find stale connections
        stale_connections = []
        for websocket, info in self._connection_info.items():
            if info["last_activity"] < cutoff_time:
                stale_connections.append((websocket, info["query_id"]))
        
        # Remove stale connections
        for websocket, query_id in stale_connections:
            try:
                await websocket.close()
            except:
                pass  # Connection might already be closed
            
            await self.disconnect(query_id, websocket)
            cleaned_count += 1
        
        if cleaned_count > 0:
            logger.info("Cleaned up stale WebSocket connections", count=cleaned_count)
        
        return cleaned_count
    
    async def cleanup_old_message_history(self, max_age_hours: int = 24) -> int:
        """Clean up old message history."""
        cutoff_time = time.time() - (max_age_hours * 3600)
        cleaned_count = 0
        
        for query_id in list(self._message_history.keys()):
            messages = self._message_history[query_id]
            
            # Remove old messages
            new_messages = [
                msg for msg in messages
                if msg.get("timestamp", 0) >= cutoff_time
            ]
            
            if len(new_messages) != len(messages):
                self._message_history[query_id] = new_messages
                cleaned_count += len(messages) - len(new_messages)
            
            # Remove empty history
            if not new_messages:
                del self._message_history[query_id]
        
        if cleaned_count > 0:
            logger.info("Cleaned up old message history", messages_removed=cleaned_count)
        
        return cleaned_count