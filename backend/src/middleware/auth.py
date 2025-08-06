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

# Initialize services with proper error handling
auth_service = None
user_service = None

def get_auth_service():
    """Get or create auth service instance"""
    global auth_service
    if auth_service is None:
        try:
            auth_service = AuthService()
            print("Auth service initialized successfully")
        except Exception as e:
            print(f"Failed to initialize auth service: {e}")
            raise
    return auth_service

def get_user_service():
    """Get or create user service instance"""
    global user_service
    if user_service is None:
        try:
            user_service = UserService()
            print("User service initialized successfully")
        except Exception as e:
            print(f"Failed to initialize user service: {e}")
            raise
    return user_service

# Initialize services immediately
try:
    auth_service = AuthService()
    user_service = UserService()
    print("Auth services initialized successfully on import")
except Exception as e:
    print(f"Failed to initialize auth services on import: {e}")
    # Services will be lazily initialized


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
        if request.endpoint in ['auth.login', 'health_check', 'auth.verify_session']:
            return
        
        # Extract token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return
        
        try:
            # Get services (lazy initialization if needed)
            try:
                auth_svc = get_auth_service()
                user_svc = get_user_service()
            except Exception as e:
                current_app.logger.error(f"Failed to get auth services: {e}")
                return
                
            token = auth_header.split(' ')[1]
            current_app.logger.info(f"Verifying token: {token[:20]}...")
            
            # Verify session token
            user_id = auth_svc.verify_session(token)
            current_app.logger.info(f"Token verification result: user_id={user_id}")
            if not user_id:
                current_app.logger.warning("Token verification failed - no user_id")
                return
            
            # Get user data
            user = user_svc.get_user_by_id(user_id)
            current_app.logger.info(f"User lookup result: {user.name if user else 'None'}")
            if user and user.is_active:
                g.current_user = user
                current_app.logger.info(f"User authenticated successfully: {user.name}")
                    
        except AuthenticationError:
            # Expected auth failures - don't log as errors
            pass
        except Exception as e:
            current_app.logger.error(f"Auth middleware error: {str(e)}")


def require_auth(f: Callable) -> Callable:
    """
    Decorator to require authentication for an endpoint.
    Passes current_user as first argument to decorated function.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            if not hasattr(g, 'current_user') or g.current_user is None:
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Please login to access this resource'
                }), 401
            
            return f(g.current_user, *args, **kwargs)
        except Exception as e:
            current_app.logger.error(f"Auth decorator error in {f.__name__}: {str(e)}")
            return jsonify({
                'error': 'Authentication error',
                'message': 'Failed to process authenticated request'
            }), 500
    
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