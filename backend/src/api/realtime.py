"""
Real-time notifications API endpoints.
Provides endpoints for managing WebSocket connections and sending real-time notifications.
"""

from flask import Blueprint, jsonify, request
from ..services.realtime_service import realtime_service
from ..middleware.auth import require_auth
from datetime import datetime

realtime_bp = Blueprint('realtime', __name__)


@realtime_bp.route('/connections', methods=['GET'])
@require_auth
def get_active_connections(current_user):
    """
    Get active WebSocket connections.
    
    Returns:
        JSON response with active connections and statistics
    """
    try:
        active_users = realtime_service.get_active_users()
        stats = realtime_service.get_connection_stats()
        
        response_data = {
            'active_users': active_users,
            'statistics': stats,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to get connections: {str(e)}',
            'active_users': [],
            'statistics': {
                'total_users': 0,
                'total_sessions': 0,
                'users_with_multiple_sessions': 0
            }
        }), 500


@realtime_bp.route('/broadcast/test', methods=['POST'])
@require_auth
def send_test_notification(current_user):
    """
    Send a test real-time notification.
    
    Body:
        {
            "target_type": "user" | "role" | "all",
            "target_id": "user_id" | "role_name" (optional for "all"),
            "message": "Test message",
            "title": "Test Title"
        }
    
    Returns:
        JSON response indicating success or failure
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        target_type = data.get('target_type', 'user')
        target_id = data.get('target_id')
        title = data.get('title', 'Test Notification')
        message = data.get('message', 'This is a test real-time notification')
        
        # Prepare notification data
        notification_data = {
            'type': 'test_notification',
            'title': title,
            'message': message,
            'sender': current_user.name,
            'timestamp': datetime.now().isoformat()
        }
        
        # Send based on target type
        success = False
        if target_type == 'user':
            if not target_id:
                return jsonify({'error': 'target_id is required for user notifications'}), 400
            success = realtime_service.broadcast_to_user(target_id, 'test_notification', notification_data)
        elif target_type == 'role':
            if not target_id:
                return jsonify({'error': 'target_id (role name) is required for role notifications'}), 400
            success = realtime_service.broadcast_to_role(target_id, 'test_notification', notification_data)
        elif target_type == 'all':
            success = realtime_service.broadcast_to_all('test_notification', notification_data)
        else:
            return jsonify({'error': 'Invalid target_type. Must be "user", "role", or "all"'}), 400
        
        if success:
            return jsonify({
                'message': 'Test notification sent successfully',
                'target_type': target_type,
                'target_id': target_id,
                'notification': notification_data
            }), 200
        else:
            return jsonify({
                'error': 'Failed to send test notification',
                'details': 'No active connections found or service unavailable'
            }), 503
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to send test notification: {str(e)}'
        }), 500


@realtime_bp.route('/user/<user_id>/online', methods=['GET'])
@require_auth
def check_user_online(current_user, user_id):
    """
    Check if a specific user is online.
    
    Args:
        user_id: User ID to check
    
    Returns:
        JSON response with online status
    """
    try:
        is_online = realtime_service.is_user_online(user_id)
        
        return jsonify({
            'user_id': user_id,
            'online': is_online,
            'checked_at': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to check user online status: {str(e)}',
            'user_id': user_id,
            'online': False
        }), 500


@realtime_bp.route('/health', methods=['GET'])
def realtime_health():
    """
    Get real-time service health status.
    
    Returns:
        JSON response with service health information
    """
    try:
        stats = realtime_service.get_connection_stats()
        
        # Check if SocketIO is initialized
        socketio_available = realtime_service.socketio is not None
        
        health_data = {
            'healthy': socketio_available,
            'socketio_available': socketio_available,
            'connection_stats': stats,
            'timestamp': datetime.now().isoformat()
        }
        
        status_code = 200 if socketio_available else 503
        return jsonify(health_data), status_code
        
    except Exception as e:
        return jsonify({
            'healthy': False,
            'socketio_available': False,
            'error': str(e),
            'connection_stats': {
                'total_users': 0,
                'total_sessions': 0,
                'users_with_multiple_sessions': 0
            }
        }), 500


@realtime_bp.route('/events', methods=['POST'])
@require_auth
def send_custom_event(current_user):
    """
    Send a custom real-time event.
    
    Body:
        {
            "event": "event_name",
            "target_type": "user" | "role" | "all",
            "target_id": "user_id" | "role_name" (optional for "all"),
            "data": {} // Custom event data
        }
    
    Returns:
        JSON response indicating success or failure
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        event_name = data.get('event')
        target_type = data.get('target_type', 'user')
        target_id = data.get('target_id')
        event_data = data.get('data', {})
        
        if not event_name:
            return jsonify({'error': 'event name is required'}), 400
        
        # Add metadata to event data
        event_data.update({
            'sender': current_user.name,
            'sender_id': current_user.id,
            'timestamp': datetime.now().isoformat()
        })
        
        # Send based on target type
        success = False
        if target_type == 'user':
            if not target_id:
                return jsonify({'error': 'target_id is required for user events'}), 400
            success = realtime_service.broadcast_to_user(target_id, event_name, event_data)
        elif target_type == 'role':
            if not target_id:
                return jsonify({'error': 'target_id (role name) is required for role events'}), 400
            success = realtime_service.broadcast_to_role(target_id, event_name, event_data)
        elif target_type == 'all':
            success = realtime_service.broadcast_to_all(event_name, event_data)
        else:
            return jsonify({'error': 'Invalid target_type. Must be "user", "role", or "all"'}), 400
        
        if success:
            return jsonify({
                'message': 'Custom event sent successfully',
                'event': event_name,
                'target_type': target_type,
                'target_id': target_id
            }), 200
        else:
            return jsonify({
                'error': 'Failed to send custom event',
                'details': 'No active connections found or service unavailable'
            }), 503
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to send custom event: {str(e)}'
        }), 500