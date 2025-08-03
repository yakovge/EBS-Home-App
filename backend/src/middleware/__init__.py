"""
Middleware package containing Flask middleware components.
Handles authentication, error handling, and request processing.
"""

from .auth import require_auth, setup_auth_middleware
from .error_handler import register_error_handlers

__all__ = [
    'require_auth',
    'setup_auth_middleware',
    'register_error_handlers'
]