"""
Utilities package containing shared helper functions and configurations.
"""

from .firebase_config import initialize_firebase, get_firestore_client, get_storage_client
from .validators import validate_request_data, validate_email, validate_date_range
from .exceptions import (
    AppException, 
    AuthenticationError, 
    DeviceNotAuthorizedError,
    ValidationError,
    ResourceNotFoundError,
    ConflictError
)

__all__ = [
    'initialize_firebase',
    'get_firestore_client',
    'get_storage_client',
    'validate_request_data',
    'validate_email',
    'validate_date_range',
    'AppException',
    'AuthenticationError',
    'DeviceNotAuthorizedError',
    'ValidationError',
    'ResourceNotFoundError',
    'ConflictError'
]