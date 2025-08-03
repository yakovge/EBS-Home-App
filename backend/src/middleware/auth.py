"""
Authentication middleware for protecting API endpoints.
Verifies JWT tokens and loads current user.
"""

from functools import wraps
from flask import request, jsonify, g, current_app
from typing import Optional, Callable

from ..services.auth_service import AuthService
from ..services.user_service import UserService
from ..utils.exceptions import AuthenticationError


auth_service = AuthService()
user_service = UserService()


def setup_auth_middleware(app):
    """
    Setup authentication middleware for the Flask app.
    Adds before_request handler to process auth tokens.
    """
    
    @app.before_request
    def load_user():
        """Load user from auth token if present."""
        g.current_user = None
        
        # Skip auth for public endpoints
        if request.endpoint in ['auth.login', 'health_check']:
            return
        
        # Extract token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return
        
        try:
            token = auth_header.split(' ')[1]
            user_id = auth_service.verify_session(token)
            
            if user_id:
                user = user_service.get_user_by_id(user_id)
                if user and user.is_active:
                    g.current_user = user
                    
        except Exception as e:
            current_app.logger.error(f"Auth middleware error: {str(e)}")


def require_auth(f: Callable) -> Callable:
    """
    Decorator to require authentication for an endpoint.
    Passes current_user as first argument to decorated function.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(g, 'current_user') or g.current_user is None:
            return jsonify({
                'error': 'Authentication required',
                'message': 'Please login to access this resource'
            }), 401
        
        return f(g.current_user, *args, **kwargs)
    
    return decorated_function


def require_role(role: str) -> Callable:
    """
    Decorator to require specific role for an endpoint.
    Must be used after @require_auth.
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            if current_user.role != role:
                return jsonify({
                    'error': 'Permission denied',
                    'message': f'This action requires {role} role'
                }), 403
            
            return f(current_user, *args, **kwargs)
        
        return decorated_function
    
    return decorator


def require_maintenance_person(f: Callable) -> Callable:
    """
    Decorator to require user to be maintenance person.
    Must be used after @require_auth.
    """
    @wraps(f)
    def decorated_function(current_user, *args, **kwargs):
        if not current_user.is_maintenance_person:
            return jsonify({
                'error': 'Permission denied',
                'message': 'This action requires maintenance person privileges'
            }), 403
        
        return f(current_user, *args, **kwargs)
    
    return decorated_function