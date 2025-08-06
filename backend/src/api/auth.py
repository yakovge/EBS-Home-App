"""
Authentication API endpoints.
Handles Google sign-in, device verification, and session management.
"""

from flask import Blueprint, request, jsonify, current_app
from typing import Dict, Any

from ..services.auth_service import AuthService
from ..services.user_service import UserService
from ..middleware.auth import require_auth
from ..utils.validators import validate_request_data
from ..utils.exceptions import ValidationError, AuthenticationError

auth_bp = Blueprint('auth', __name__)
auth_service = AuthService()
user_service = UserService()


@auth_bp.route('/login', methods=['POST'])
def login():
    print("=== LOGIN ENDPOINT REACHED ===")
    """
    Login endpoint for Google authentication.
    Expects: { token: string, device_info: { device_id, device_name, platform } }
    Returns: { user: User, session_token: string }
    """
    print("=== LOGIN REQUEST RECEIVED ===")
    print(f"Request method: {request.method}")
    print(f"Request content type: {request.content_type}")
    print(f"Request data exists: {request.json is not None}")
    
    try:
        data = validate_request_data(request.json, {
            'token': {'type': str, 'required': True},
            'device_info': {
                'type': dict,
                'required': True,
                'schema': {
                    'device_id': {'type': str, 'required': True},
                    'device_name': {'type': str, 'required': True},
                    'platform': {'type': str, 'required': True}
                }
            }
        })
        
        # Debug: Log the received token (first 20 chars only for security)
        token_preview = data['token'][:20] + "..." if len(data['token']) > 20 else data['token']
        print(f"DEBUG: Received token preview: {token_preview}")
        print(f"DEBUG: Token length: {len(data['token'])}")
        
        # Verify Google token
        firebase_user = auth_service.verify_google_token(data['token'])
        
        # Get or create user
        user = user_service.get_or_create_user(
            email=firebase_user['email'],
            name=firebase_user.get('name', firebase_user['email'].split('@')[0]),
            firebase_uid=firebase_user['uid']
        )
        
        # Check device authorization
        device_info = data['device_info']
        if not auth_service.verify_device(user, device_info['device_id']):
            return jsonify({
                'error': 'Device not authorized',
                'message': 'You can only login from one device. Please use your registered device.'
            }), 403
        
        # Update device info
        user_service.update_user_device(user.id, device_info)
        
        # Create session
        session_token = auth_service.create_session(user.id)
        
        return jsonify({
            'user': user.to_dict(),
            'session_token': session_token
        }), 200
        
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except AuthenticationError as e:
        # All authentication errors should be 400 (client error), not 500 (server error)
        return jsonify({'error': 'Authentication error', 'message': str(e)}), 400
    except ValueError as e:
        return jsonify({'error': 'Authentication error', 'message': str(e)}), 400
    except Exception as e:
        # Detailed error logging for debugging
        import traceback
        error_details = traceback.format_exc()
        print(f"CRITICAL LOGIN ERROR: {str(e)}")
        print(f"FULL TRACEBACK: {error_details}")
        current_app.logger.error(f"Login error: {str(e)}")
        current_app.logger.error(f"Full traceback: {error_details}")
        return jsonify({'error': 'Login failed', 'message': str(e), 'traceback': error_details}), 500


@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout(current_user):
    """
    Logout endpoint to invalidate session.
    """
    try:
        auth_service.invalidate_session(current_user.id)
        return jsonify({'message': 'Logged out successfully'}), 200
    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({'error': 'Logout failed', 'message': str(e)}), 500


@auth_bp.route('/verify', methods=['GET'])
def verify_session():
    """
    Verify current session is valid.
    Returns current user data if session is valid.
    This endpoint does NOT use @require_auth to avoid circular dependency.
    """
    try:
        # Extract token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'valid': False,
                'error': 'No valid authorization header'
            }), 401
        
        token = auth_header.split(' ')[1]
        
        # Verify session token directly (not through middleware)
        user_id = auth_service.verify_session(token)
        if not user_id:
            return jsonify({
                'valid': False,
                'error': 'Invalid session token'
            }), 401
        
        # Get user data
        user = user_service.get_user_by_id(user_id)
        if not user or not user.is_active:
            return jsonify({
                'valid': False,
                'error': 'User not found or inactive'
            }), 401
        
        return jsonify({
            'valid': True,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Session verification error: {str(e)}")
        return jsonify({
            'valid': False,
            'error': 'Session verification failed'
        }), 401


@auth_bp.route('/refresh', methods=['POST'])
@require_auth
def refresh_token(current_user):
    """
    Refresh session token.
    """
    try:
        new_token = auth_service.refresh_session(current_user.id)
        return jsonify({'session_token': new_token}), 200
    except Exception as e:
        current_app.logger.error(f"Token refresh error: {str(e)}")
        return jsonify({'error': 'Token refresh failed', 'message': str(e)}), 500