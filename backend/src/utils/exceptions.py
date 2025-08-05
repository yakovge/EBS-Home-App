"""
Custom exception classes for the EBS Home application.
Provides specific error types for better error handling and debugging.
"""


class AppException(Exception):
    """Base exception class for all application exceptions."""
    
    def __init__(self, message: str, status_code: int = 500, details: dict = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class AuthenticationError(AppException):
    """Raised when authentication fails."""
    
    def __init__(self, message: str = "Authentication failed", details: dict = None):
        super().__init__(message, status_code=401, details=details)


class DeviceNotAuthorizedError(AppException):
    """Raised when user tries to login from unauthorized device."""
    
    def __init__(self, message: str = "Device not authorized", details: dict = None):
        super().__init__(message, status_code=403, details=details)


class ValidationError(AppException):
    """Raised when input validation fails."""
    
    def __init__(self, message: str = "Validation failed", details: dict = None):
        super().__init__(message, status_code=400, details=details)


class ResourceNotFoundError(AppException):
    """Raised when requested resource is not found."""
    
    def __init__(self, resource: str, resource_id: str = None):
        message = f"{resource} not found"
        if resource_id:
            message += f": {resource_id}"
        super().__init__(message, status_code=404)


class ConflictError(AppException):
    """Raised when there's a conflict (e.g., overlapping bookings)."""
    
    def __init__(self, message: str = "Resource conflict", details: dict = None):
        super().__init__(message, status_code=409, details=details)


class PermissionDeniedError(AppException):
    """Raised when user doesn't have permission for an action."""
    
    def __init__(self, message: str = "Permission denied", details: dict = None):
        super().__init__(message, status_code=403, details=details)


class APIError(AppException):
    """Raised when API operations fail."""
    
    def __init__(self, message: str = "API operation failed", status_code: int = 500, details: dict = None):
        super().__init__(message, status_code=status_code, details=details)