"""
Integration tests for authentication API endpoints.
Tests the complete auth flow including middleware and error handling.
"""

import pytest
import json
from unittest.mock import patch, Mock

from app import create_app


class TestAuthAPI:
    """Integration tests for authentication endpoints."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask application."""
        app = create_app()
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    @patch('src.services.auth_service.firebase_auth.verify_id_token')
    @patch('src.services.user_service.UserService.get_or_create_user')
    def test_login_success(self, mock_get_user, mock_verify_token, client):
        """Test successful login flow."""
        # Mock Firebase token verification
        mock_verify_token.return_value = {
            'uid': 'firebase-uid-123',
            'email': 'test@example.com',
            'name': 'Test User'
        }
        
        # Mock user service
        mock_user = Mock()
        mock_user.id = 'user-123'
        mock_user.to_dict.return_value = {
            'id': 'user-123',
            'email': 'test@example.com',
            'name': 'Test User'
        }
        mock_get_user.return_value = mock_user
        
        # Test data
        data = {
            'token': 'valid-google-token',
            'device_info': {
                'device_id': 'device-123',
                'device_name': 'Test Device',
                'platform': 'Windows'
            }
        }
        
        response = client.post(
            '/api/auth/login',
            data=json.dumps(data),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'user' in data
        assert 'session_token' in data
        assert data['user']['email'] == 'test@example.com'
    
    def test_login_missing_token(self, client):
        """Test login fails with missing token."""
        data = {
            'device_info': {
                'device_id': 'device-123',
                'device_name': 'Test Device',
                'platform': 'Windows'
            }
        }
        
        response = client.post(
            '/api/auth/login',
            data=json.dumps(data),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Validation error' in data['error']
    
    def test_login_missing_device_info(self, client):
        """Test login fails with missing device info."""
        data = {
            'token': 'valid-google-token'
        }
        
        response = client.post(
            '/api/auth/login',
            data=json.dumps(data),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    @patch('src.services.auth_service.firebase_auth.verify_id_token')
    def test_login_invalid_token(self, mock_verify_token, client):
        """Test login fails with invalid Google token."""
        # Mock Firebase token verification failure
        mock_verify_token.side_effect = Exception("Invalid token")
        
        data = {
            'token': 'invalid-google-token',
            'device_info': {
                'device_id': 'device-123',
                'device_name': 'Test Device',
                'platform': 'Windows'
            }
        }
        
        response = client.post(
            '/api/auth/login',
            data=json.dumps(data),
            content_type='application/json'
        )
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_logout_without_auth(self, client):
        """Test logout fails without authentication."""
        response = client.post('/api/auth/logout')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Authentication required' in data['message']
    
    @patch('src.services.auth_service.AuthService.verify_session')
    @patch('src.services.user_service.UserService.get_user_by_id')
    def test_verify_session_valid(self, mock_get_user, mock_verify_session, client):
        """Test session verification with valid token."""
        # Mock auth service
        mock_verify_session.return_value = 'user-123'
        
        # Mock user service
        mock_user = Mock()
        mock_user.is_active = True
        mock_user.to_dict.return_value = {
            'id': 'user-123',
            'email': 'test@example.com'
        }
        mock_get_user.return_value = mock_user
        
        response = client.get(
            '/api/auth/verify',
            headers={'Authorization': 'Bearer valid-token'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['valid'] is True
        assert 'user' in data
    
    def test_verify_session_no_token(self, client):
        """Test session verification without token."""
        response = client.get('/api/auth/verify')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data