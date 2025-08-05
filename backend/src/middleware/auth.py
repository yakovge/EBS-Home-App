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

print("MIDDLEWARE: Initializing auth_service...")
try:
    auth_service = AuthService()
    print("MIDDLEWARE: auth_service initialized successfully")
except Exception as e:
    print(f"MIDDLEWARE: auth_service initialization failed: {e}")
    import traceback
    print(f"MIDDLEWARE: auth_service traceback: {traceback.format_exc()}")
    auth_service = None

print("MIDDLEWARE: Initializing user_service...")
try:
    user_service = UserService()
    print("MIDDLEWARE: user_service initialized successfully")
except Exception as e:
    print(f"MIDDLEWARE: user_service initialization failed: {e}")
    import traceback
    print(f"MIDDLEWARE: user_service traceback: {traceback.format_exc()}")
    user_service = None


def setup_auth_middleware(app):
    """
    Setup authentication middleware for the Flask app.
    Adds before_request handler to process auth tokens.
    """
    
    @app.before_request
    def load_user():
        """Load user from auth token if present."""
        print(f"=== MIDDLEWARE: {request.method} {request.path} ===")
        print(f"MIDDLEWARE: Setting g.current_user = None")
        g.current_user = None
        
        # Skip auth for public endpoints
        if request.endpoint in ['auth.login', 'health_check']:
            print(f"MIDDLEWARE: Skipping auth for public endpoint: {request.endpoint}")
            return
        
        # Extract token from Authorization header
        auth_header = request.headers.get('Authorization')
        print(f"MIDDLEWARE: Auth header: {auth_header[:50] if auth_header else 'None'}...")
        if not auth_header or not auth_header.startswith('Bearer '):
            print("MIDDLEWARE: No valid auth header, skipping user load")
            return
        
        try:
            if auth_service is None:
                print("MIDDLEWARE ERROR: auth_service is None (failed to initialize)")
                return
            if user_service is None:
                print("MIDDLEWARE ERROR: user_service is None (failed to initialize)")
                return
                
            token = auth_header.split(' ')[1]
            print(f"MIDDLEWARE: Extracted token: {token[:20]}...")
            
            try:
                print("MIDDLEWARE: Calling auth_service.verify_session...")
                session_data = auth_service.verify_session(token)
                print(f"MIDDLEWARE: Session data: {session_data}")
            except Exception as e:
                print(f"MIDDLEWARE: verify_session failed: {e}")
                raise e
            
            if session_data:
                # Handle both string user_id and dict response
                if isinstance(session_data, dict):
                    user_id = session_data.get('user_id')
                    print(f"MIDDLEWARE: Got user_id from dict: {user_id}")
                else:
                    user_id = session_data
                    print(f"MIDDLEWARE: Got user_id directly: {user_id}")
                    
                if user_id:
                    try:
                        print(f"MIDDLEWARE: Calling user_service.get_user_by_id({user_id})...")
                        user = user_service.get_user_by_id(user_id)
                        print(f"MIDDLEWARE: User object: {user}")
                        print(f"MIDDLEWARE: User type: {type(user)}")
                    except Exception as e:
                        print(f"MIDDLEWARE: get_user_by_id failed: {e}")
                        raise e
                    
                    if user:
                        try:
                            print(f"MIDDLEWARE: User is_active: {user.is_active}")
                            print(f"MIDDLEWARE: User id: {getattr(user, 'id', 'NO_ID')}")
                            if user and user.is_active:
                                g.current_user = user
                                print(f"MIDDLEWARE: Successfully set g.current_user = {user}")
                            else:
                                print("MIDDLEWARE: User not found or not active")
                        except Exception as e:
                            print(f"MIDDLEWARE: User object access failed: {e}")
                            raise e
                    else:
                        print("MIDDLEWARE: User is None")
                else:
                    print("MIDDLEWARE: No user_id found in session data")
            else:
                print("MIDDLEWARE: No session data returned")
                    
        except Exception as e:
            print(f"MIDDLEWARE ERROR: {str(e)}")
            print(f"MIDDLEWARE ERROR TYPE: {type(e)}")
            import traceback
            print(f"MIDDLEWARE TRACEBACK: {traceback.format_exc()}")
            current_app.logger.error(f"Auth middleware error: {str(e)}")


def require_auth(f: Callable) -> Callable:
    """
    Decorator to require authentication for an endpoint.
    Passes current_user as first argument to decorated function.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        print(f"REQUIRE_AUTH: Checking auth for {f.__name__}")
        print(f"REQUIRE_AUTH: hasattr(g, 'current_user'): {hasattr(g, 'current_user')}")
        if hasattr(g, 'current_user'):
            print(f"REQUIRE_AUTH: g.current_user: {g.current_user}")
        else:
            print("REQUIRE_AUTH: g.current_user not set")
        
        try:
            if not hasattr(g, 'current_user') or g.current_user is None:
                print("REQUIRE_AUTH: Authentication failed - no user")
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Please login to access this resource'
                }), 401
            
            print(f"REQUIRE_AUTH: Authentication successful, calling {f.__name__}")
            return f(g.current_user, *args, **kwargs)
        except Exception as e:
            print(f"REQUIRE_AUTH ERROR: {str(e)}")
            import traceback
            print(f"REQUIRE_AUTH TRACEBACK: {traceback.format_exc()}")
            return jsonify({
                'error': 'Authentication error',
                'message': str(e)
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