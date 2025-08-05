"""
Unit tests for service classes.
Tests business logic and service layer functionality.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta

from src.services.auth_service import AuthService
from src.utils.exceptions import AuthenticationError, DeviceNotAuthorizedError


class TestAuthService:
    """Test cases for AuthService."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Mock the repository classes before they are instantiated
        self.user_repo_mock = Mock()
        
        with patch('src.services.auth_service.UserRepository', return_value=self.user_repo_mock):
            self.auth_service = AuthService()
    
    def test_auth_service_creation(self):
        """Test creating AuthService instance."""
        assert self.auth_service.service_name == "AuthService"
        assert self.auth_service.token_expiry_hours == 24
    
    @patch('src.services.auth_service.firebase_auth.verify_id_token')
    def test_verify_google_token_success(self, mock_verify):
        """Test successful Google token verification."""
        # Mock Firebase Auth response
        mock_verify.return_value = {
            'uid': 'firebase-uid-123',
            'email': 'test@example.com',
            'name': 'Test User'
        }
        
        result = self.auth_service.verify_google_token('valid-token')
        
        assert result['uid'] == 'firebase-uid-123'
        assert result['email'] == 'test@example.com'
        mock_verify.assert_called_once_with('valid-token')
    
    @patch('src.services.auth_service.firebase_auth.verify_id_token')
    def test_verify_google_token_failure(self, mock_verify):
        """Test Google token verification failure."""
        # Mock Firebase Auth exception
        mock_verify.side_effect = Exception("Invalid token")
        
        with pytest.raises(AuthenticationError, match="Invalid Google token"):
            self.auth_service.verify_google_token('invalid-token')
    
    def test_verify_device_first_login(self, sample_user):
        """Test device verification for first-time login."""
        # User has no current device
        assert sample_user.current_device is None
        
        result = self.auth_service.verify_device(sample_user, "new-device-123")
        
        assert result is True
    
    def test_verify_device_same_device(self, sample_user, sample_device):
        """Test device verification for same device."""
        # Set user's current device
        sample_user.set_device(sample_device)
        
        result = self.auth_service.verify_device(sample_user, sample_device.device_id)
        
        assert result is True
    
    def test_verify_device_different_device(self, sample_user, sample_device):
        """Test device verification for different device (currently disabled)."""
        # Set user's current device
        sample_user.set_device(sample_device)
        
        result = self.auth_service.verify_device(sample_user, "different-device")
        
        # Note: Device restriction is temporarily disabled for testing/development
        # Should return False when re-enabled for production
        assert result is True
    
    def test_create_session(self):
        """Test JWT session token creation."""
        token = self.auth_service.create_session("user-123")
        
        assert isinstance(token, str)
        assert len(token) > 50  # JWT tokens are long
    
    @patch('src.services.auth_service.jwt.decode')
    def test_verify_session_valid(self, mock_decode):
        """Test valid session verification."""
        mock_decode.return_value = {
            'user_id': 'user-123',
            'exp': datetime.utcnow() + timedelta(hours=1)
        }
        
        user_id = self.auth_service.verify_session('valid-token')
        
        assert user_id == 'user-123'
    
    @patch('src.services.auth_service.jwt.decode')
    def test_verify_session_expired(self, mock_decode):
        """Test expired session verification."""
        from jwt import ExpiredSignatureError
        mock_decode.side_effect = ExpiredSignatureError("Token expired")
        
        with pytest.raises(AuthenticationError, match="Session expired"):
            self.auth_service.verify_session('expired-token')
    
    def test_validate_data_success(self):
        """Test successful data validation."""
        data = {
            'token': 'valid-token',
            'device_info': {
                'device_id': 'device-123',
                'device_name': 'Test Device',
                'platform': 'Windows'
            }
        }
        
        result = self.auth_service.validate_data(data)
        assert result is True
    
    def test_validate_data_missing_token(self):
        """Test data validation failure for missing token."""
        data = {
            'device_info': {
                'device_id': 'device-123',
                'device_name': 'Test Device',
                'platform': 'Windows'
            }
        }
        
        with pytest.raises(ValueError, match="Missing required field: token"):
            self.auth_service.validate_data(data)
    
    def test_validate_data_missing_device_info(self):
        """Test data validation failure for missing device info."""
        data = {
            'token': 'valid-token',
            'device_info': {
                'device_name': 'Test Device',
                'platform': 'Windows'
                # Missing device_id
            }
        }
        
        with pytest.raises(ValueError, match="Missing device info field: device_id"):
            self.auth_service.validate_data(data)