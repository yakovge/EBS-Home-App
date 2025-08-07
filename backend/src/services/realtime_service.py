"""
Real-time notification service using WebSockets.
Manages WebSocket connections and real-time event broadcasting.
"""

from typing import Dict, List, Optional, Any
from flask_socketio import SocketIO, emit, join_room, leave_room
from threading import Lock
import time
import json
from datetime import datetime

from ..models.user import User
from ..repositories.user_repository import UserRepository


class RealtimeService:
    """Service for managing real-time WebSocket connections and notifications."""
    
    def __init__(self):
        self.socketio: Optional[SocketIO] = None
        self.user_sessions: Dict[str, Dict[str, Any]] = {}  # user_id -> session_info
        self.session_users: Dict[str, str] = {}  # session_id -> user_id
        self.active_connections: Dict[str, List[str]] = {}  # user_id -> [session_ids]
        self.lock = Lock()
        self.user_repository = UserRepository()
    
    def init_app(self, app, socketio: SocketIO):
        """Initialize the real-time service with Flask app and SocketIO instance."""
        self.socketio = socketio
        
        # Register SocketIO event handlers
        @socketio.on('connect')
        def handle_connect(auth):
            """Handle client connection."""
            try:
                print(f"Client connecting: {auth}")
                session_id = self._get_session_id()
                
                # Extract user authentication info
                user_id = None
                if auth and isinstance(auth, dict):
                    user_id = auth.get('user_id')
                    token = auth.get('token')
                    
                    if user_id and token:
                        # Validate user session (simplified)
                        user = self.user_repository.get_by_id(user_id)
                        if user:
                            self._add_user_session(user_id, session_id, {
                                'connected_at': datetime.now().isoformat(),
                                'last_seen': datetime.now().isoformat(),
                                'user_info': {
                                    'id': user.id,
                                    'name': user.name,
                                    'email': user.email
                                }
                            })
                            
                            # Join user-specific room
                            join_room(f"user_{user_id}")
                            
                            # Join role-specific rooms
                            if user.isYaffa:
                                join_room("yaffa_notifications")
                            if user.isMaintenancePerson:
                                join_room("maintenance_notifications")
                            
                            # Send welcome message
                            emit('connected', {
                                'message': 'Connected to real-time notifications',
                                'user_id': user_id,
                                'timestamp': datetime.now().isoformat()
                            })
                            
                            print(f"User {user_id} connected via WebSocket")
                        else:
                            print(f"Invalid user {user_id} attempted to connect")
                            return False
                    else:
                        print("Client connected without proper authentication")
                        return False
                else:
                    print("Client connected without authentication data")
                    return False
                    
            except Exception as e:
                print(f"Error handling WebSocket connection: {e}")
                return False
        
        @socketio.on('disconnect')
        def handle_disconnect():
            """Handle client disconnection."""
            try:
                session_id = self._get_session_id()
                user_id = self.session_users.get(session_id)
                
                if user_id:
                    self._remove_user_session(user_id, session_id)
                    print(f"User {user_id} disconnected from WebSocket")
                else:
                    print("Unknown session disconnected")
                    
            except Exception as e:
                print(f"Error handling WebSocket disconnection: {e}")
        
        @socketio.on('ping')
        def handle_ping():
            """Handle ping for keepalive."""
            emit('pong', {'timestamp': datetime.now().isoformat()})
        
        @socketio.on('join_notifications')
        def handle_join_notifications(data):
            """Handle request to join specific notification channels."""
            try:
                session_id = self._get_session_id()
                user_id = self.session_users.get(session_id)
                
                if not user_id:
                    emit('error', {'message': 'Not authenticated'})
                    return
                
                channels = data.get('channels', []) if isinstance(data, dict) else []
                valid_channels = ['bookings', 'maintenance', 'general']
                
                for channel in channels:
                    if channel in valid_channels:
                        join_room(f"channel_{channel}")
                
                emit('joined_channels', {
                    'channels': channels,
                    'timestamp': datetime.now().isoformat()
                })
                
            except Exception as e:
                print(f"Error handling join_notifications: {e}")
                emit('error', {'message': 'Failed to join channels'})
    
    def _get_session_id(self) -> str:
        """Get current session ID from Flask-SocketIO."""
        from flask_socketio import request
        return request.sid
    
    def _add_user_session(self, user_id: str, session_id: str, session_info: Dict[str, Any]):
        """Add a user session to tracking."""
        with self.lock:
            # Track session -> user mapping
            self.session_users[session_id] = user_id
            
            # Track user -> sessions mapping
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(session_id)
            
            # Store session info
            self.user_sessions[f"{user_id}_{session_id}"] = session_info
    
    def _remove_user_session(self, user_id: str, session_id: str):
        """Remove a user session from tracking."""
        with self.lock:
            # Remove session -> user mapping
            self.session_users.pop(session_id, None)
            
            # Remove from user -> sessions mapping
            if user_id in self.active_connections:
                self.active_connections[user_id] = [
                    sid for sid in self.active_connections[user_id] 
                    if sid != session_id
                ]
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            # Remove session info
            session_key = f"{user_id}_{session_id}"
            self.user_sessions.pop(session_key, None)
    
    def broadcast_to_user(self, user_id: str, event: str, data: Dict[str, Any]) -> bool:
        """
        Broadcast a real-time notification to a specific user.
        
        Args:
            user_id: Target user ID
            event: Event name
            data: Event data
            
        Returns:
            bool: True if message was sent to at least one session
        """
        if not self.socketio:
            print("SocketIO not initialized")
            return False
        
        try:
            # Add timestamp to data
            data['timestamp'] = datetime.now().isoformat()
            
            # Emit to user-specific room
            self.socketio.emit(event, data, room=f"user_{user_id}")
            
            # Check if user has active connections
            has_active_sessions = user_id in self.active_connections and self.active_connections[user_id]
            
            if has_active_sessions:
                print(f"Real-time notification sent to user {user_id}: {event}")
                return True
            else:
                print(f"User {user_id} has no active WebSocket connections")
                return False
                
        except Exception as e:
            print(f"Error broadcasting to user {user_id}: {e}")
            return False
    
    def broadcast_to_role(self, role: str, event: str, data: Dict[str, Any]) -> bool:
        """
        Broadcast a notification to all users with a specific role.
        
        Args:
            role: Target role ('yaffa', 'maintenance', etc.)
            event: Event name
            data: Event data
            
        Returns:
            bool: True if message was broadcast
        """
        if not self.socketio:
            print("SocketIO not initialized")
            return False
        
        try:
            # Add timestamp to data
            data['timestamp'] = datetime.now().isoformat()
            
            # Map roles to room names
            room_mapping = {
                'yaffa': 'yaffa_notifications',
                'maintenance': 'maintenance_notifications'
            }
            
            room = room_mapping.get(role)
            if not room:
                print(f"Unknown role: {role}")
                return False
            
            # Emit to role-specific room
            self.socketio.emit(event, data, room=room)
            
            print(f"Real-time notification broadcast to role {role}: {event}")
            return True
            
        except Exception as e:
            print(f"Error broadcasting to role {role}: {e}")
            return False
    
    def broadcast_to_all(self, event: str, data: Dict[str, Any]) -> bool:
        """
        Broadcast a notification to all connected users.
        
        Args:
            event: Event name
            data: Event data
            
        Returns:
            bool: True if message was broadcast
        """
        if not self.socketio:
            print("SocketIO not initialized")
            return False
        
        try:
            # Add timestamp to data
            data['timestamp'] = datetime.now().isoformat()
            
            # Emit to all connected clients
            self.socketio.emit(event, data)
            
            print(f"Real-time notification broadcast to all users: {event}")
            return True
            
        except Exception as e:
            print(f"Error broadcasting to all users: {e}")
            return False
    
    def get_active_users(self) -> List[Dict[str, Any]]:
        """
        Get list of currently active users.
        
        Returns:
            List of active user information
        """
        active_users = []
        
        with self.lock:
            for user_id, session_ids in self.active_connections.items():
                if session_ids:  # Has active sessions
                    # Get user info from any session
                    session_key = f"{user_id}_{session_ids[0]}"
                    session_info = self.user_sessions.get(session_key, {})
                    
                    active_users.append({
                        'user_id': user_id,
                        'session_count': len(session_ids),
                        'user_info': session_info.get('user_info', {}),
                        'connected_at': session_info.get('connected_at'),
                        'last_seen': session_info.get('last_seen')
                    })
        
        return active_users
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """
        Get connection statistics.
        
        Returns:
            Dictionary with connection statistics
        """
        with self.lock:
            return {
                'total_users': len(self.active_connections),
                'total_sessions': len(self.session_users),
                'users_with_multiple_sessions': len([
                    user_id for user_id, sessions in self.active_connections.items()
                    if len(sessions) > 1
                ])
            }
    
    def is_user_online(self, user_id: str) -> bool:
        """
        Check if a user is currently online.
        
        Args:
            user_id: User ID to check
            
        Returns:
            bool: True if user has active connections
        """
        return user_id in self.active_connections and bool(self.active_connections[user_id])


# Global real-time service instance
realtime_service = RealtimeService()