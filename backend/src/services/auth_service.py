"""
Authentication service handling user login, device verification, and sessions.
Implements single device login restriction per PRD requirements.
"""

import os
import jwt
import firebase_admin.auth as firebase_auth
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from .base_service import BaseService
from ..models.user import User, UserDevice
from ..repositories.user_repository import UserRepository
from ..utils.exceptions import AuthenticationError, DeviceNotAuthorizedError


class AuthService(BaseService):
    """
    Service handling all authentication-related operations.
    Manages Google sign-in, device restrictions, and JWT sessions.
    """
    
    def __init__(self):
        super().__init__('AuthService')
        self.user_repository = UserRepository()
        self.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key')
        self.token_expiry_hours = 24
    
    def verify_google_token(self, id_token: str) -> Dict[str, Any]:
        """
        Verify Google ID token using Firebase Auth.
        Returns decoded token data with user info.
        """
        try:
            decoded_token = firebase_auth.verify_id_token(id_token)
            self.log_info("Google token verified", user_id=decoded_token.get('uid'))
            return decoded_token
        except Exception as e:
            self.log_error("Google token verification failed", error=e)
            raise AuthenticationError("Invalid Google token")
    
    def verify_device(self, user: User, device_id: str) -> bool:
        """
        Check if user can login from the given device.
        Implements single device restriction.
        """
        if not user.current_device:
            # First time login, device is allowed
            return True
        
        # Check if it's the same device
        is_authorized = user.can_login_from_device(device_id)
        
        if not is_authorized:
            self.log_warning(
                "Device authorization failed",
                user_id=user.id,
                current_device=user.current_device.device_id,
                attempted_device=device_id
            )
        
        return is_authorized
    
    def create_session(self, user_id: str) -> str:
        """
        Create JWT session token for authenticated user.
        """
        payload = {
            'user_id': user_id,
            'exp': datetime.utcnow() + timedelta(hours=self.token_expiry_hours),
            'iat': datetime.utcnow()
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm='HS256')
        self.log_info("Session created", user_id=user_id)
        return token
    
    def verify_session(self, token: str) -> Optional[str]:
        """
        Verify JWT session token and return user_id if valid.
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=['HS256'])
            return payload.get('user_id')
        except jwt.ExpiredSignatureError:
            self.log_warning("Session token expired")
            raise AuthenticationError("Session expired")
        except jwt.InvalidTokenError as e:
            self.log_error("Invalid session token", error=e)
            raise AuthenticationError("Invalid session")
    
    def refresh_session(self, user_id: str) -> str:
        """
        Create new session token for user (refresh).
        """
        return self.create_session(user_id)
    
    def invalidate_session(self, user_id: str) -> None:
        """
        Invalidate user session (logout).
        In production, this would also blacklist the token.
        """
        self.log_info("Session invalidated", user_id=user_id)
        # In production, add token to blacklist in Redis/cache
    
    def validate_data(self, data: Dict[str, Any]) -> bool:
        """Validate authentication data."""
        required_fields = ['token', 'device_info']
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")
        
        device_info = data.get('device_info', {})
        device_fields = ['device_id', 'device_name', 'platform']
        for field in device_fields:
            if field not in device_info:
                raise ValueError(f"Missing device info field: {field}")
        
        return True