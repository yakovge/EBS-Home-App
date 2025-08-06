"""
Unit tests for authentication fixes.
Tests the new auth verification endpoint and middleware improvements.
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask, g
from src.api.auth import auth_bp, auth_service, user_service
from src.middleware.auth import setup_auth_middleware, require_auth
from src.models.user import User
from src.utils.exceptions import AuthenticationError


class TestAuthVerifyEndpoint:
    """Test the fixed /auth/verify endpoint (without circular dependency)."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.app = Flask(__name__)
        self.app.register_blueprint(auth_bp, url_prefix='/auth')
        self.client = self.app.test_client()
    
    @patch.object(auth_service, 'verify_session')
    @patch.object(user_service, 'get_user_by_id')
    def test_verify_session_success(self, mock_get_user, mock_verify):
        """Test successful session verification."""
        # Setup mocks
        mock_user = User('test@example.com', 'Test User', 'family_member', 'en', 'user-123')
        mock_user.is_active = True
        mock_verify.return_value = 'user-123'
        mock_get_user.return_value = mock_user
        
        # Make request with valid token
        response = self.client.get('/auth/verify', headers={
            'Authorization': 'Bearer valid-token-123'
        })
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert data['valid'] is True
        assert data['user']['id'] == 'user-123'
        assert data['user']['name'] == 'Test User'
        
        # Verify service calls
        mock_verify.assert_called_once_with('valid-token-123')
        mock_get_user.assert_called_once_with('user-123')
    
    def test_verify_session_no_header(self):
        """Test verification without authorization header."""
        response = self.client.get('/auth/verify')
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['valid'] is False
        assert 'No valid authorization header' in data['error']
    
    def test_verify_session_invalid_header(self):
        """Test verification with invalid authorization header."""
        response = self.client.get('/auth/verify', headers={
            'Authorization': 'InvalidFormat token'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['valid'] is False
        assert 'No valid authorization header' in data['error']
    
    @patch.object(auth_service, 'verify_session')
    def test_verify_session_invalid_token(self, mock_verify):
        """Test verification with invalid token."""
        mock_verify.side_effect = AuthenticationError("Invalid session")
        
        response = self.client.get('/auth/verify', headers={
            'Authorization': 'Bearer invalid-token'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['valid'] is False
        assert 'Session verification failed' in data['error']
    
    @patch.object(auth_service, 'verify_session')
    @patch.object(user_service, 'get_user_by_id')
    def test_verify_session_user_not_found(self, mock_get_user, mock_verify):
        """Test verification when user not found."""
        mock_verify.return_value = 'user-123'
        mock_get_user.return_value = None
        
        response = self.client.get('/auth/verify', headers={
            'Authorization': 'Bearer valid-token-123'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['valid'] is False
        assert 'User not found or inactive' in data['error']
    
    @patch.object(auth_service, 'verify_session')
    @patch.object(user_service, 'get_user_by_id')
    def test_verify_session_inactive_user(self, mock_get_user, mock_verify):
        """Test verification with inactive user."""
        mock_user = User('test@example.com', 'Test User', 'family_member', 'en', 'user-123')
        mock_user.is_active = False  # Inactive user
        mock_verify.return_value = 'user-123'
        mock_get_user.return_value = mock_user
        
        response = self.client.get('/auth/verify', headers={
            'Authorization': 'Bearer valid-token-123'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['valid'] is False
        assert 'User not found or inactive' in data['error']


class TestAuthMiddleware:
    """Test the improved authentication middleware."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.app = Flask(__name__)
        setup_auth_middleware(self.app)
        
        @self.app.route('/test')
        @require_auth
        def test_endpoint(current_user):
            return {'user_id': current_user.id, 'user_name': current_user.name}
        
        @self.app.route('/public')
        def public_endpoint():
            return {'message': 'public'}
        
        self.client = self.app.test_client()
    
    @patch('src.middleware.auth.auth_service')
    @patch('src.middleware.auth.user_service')
    def test_middleware_success(self, mock_user_service, mock_auth_service):
        """Test successful authentication through middleware."""
        # Setup mocks
        mock_user = User('test@example.com', 'Test User', 'family_member', 'en', 'user-123')
        mock_user.is_active = True
        mock_auth_service.verify_session.return_value = 'user-123'
        mock_user_service.get_user_by_id.return_value = mock_user
        
        # Test the full request flow
        response = self.client.get('/test', headers={
            'Authorization': 'Bearer valid-token'
        })
        
        # Should succeed with proper authentication
        assert response.status_code == 200
        data = response.get_json()
        assert data['user_id'] == 'user-123'
        assert data['user_name'] == 'Test User'
    
    def test_middleware_no_token(self):
        """Test middleware with no authorization token."""
        response = self.client.get('/test')
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['error'] == 'Authentication required'
    
    def test_middleware_public_endpoint(self):
        """Test middleware allows public endpoints."""
        response = self.client.get('/public')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'public'


class TestAuthServiceIntegration:
    """Integration tests for auth service methods."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # These would normally be integration tests with real Firebase
        # For now, we'll mock the dependencies
        pass
    
    @patch('src.services.auth_service.firebase_auth')
    def test_verify_google_token_success(self, mock_firebase_auth):
        """Test Google token verification success."""
        from src.services.auth_service import AuthService
        
        # Setup mock
        mock_firebase_auth.verify_id_token.return_value = {
            'uid': 'firebase-uid-123',
            'email': 'test@example.com',
            'name': 'Test User'
        }
        
        service = AuthService()
        result = service.verify_google_token('valid-google-token')
        
        assert result['uid'] == 'firebase-uid-123'
        assert result['email'] == 'test@example.com'
        assert result['name'] == 'Test User'
    
    @patch('src.services.auth_service.firebase_auth')
    def test_verify_google_token_failure(self, mock_firebase_auth):
        """Test Google token verification failure."""
        from src.services.auth_service import AuthService
        
        # Setup mock to raise exception
        mock_firebase_auth.verify_id_token.side_effect = Exception("Invalid token")
        
        service = AuthService()
        
        with pytest.raises(AuthenticationError) as exc_info:
            service.verify_google_token('invalid-google-token')
        
        assert "Invalid Google token" in str(exc_info.value)
    
    def test_create_and_verify_session(self):
        """Test JWT session creation and verification."""
        from src.services.auth_service import AuthService
        
        service = AuthService()
        
        # Create session
        token = service.create_session('user-123')
        assert token is not None
        assert len(token) > 0
        
        # Verify session
        user_id = service.verify_session(token)
        assert user_id == 'user-123'
    
    def test_verify_invalid_session(self):
        """Test verification of invalid session token."""
        from src.services.auth_service import AuthService
        
        service = AuthService()
        
        with pytest.raises(AuthenticationError):
            service.verify_session('invalid-token')