"""
Comprehensive auth diagnostics tests to help debug auth issues quickly.
These tests provide detailed error information when auth breaks.
"""

import json
import pytest
from unittest.mock import patch, MagicMock

from tests.test_base import TestBase


class TestAuthDiagnostics(TestBase):
    """Diagnostic tests for authentication system."""
    
    def get_auth_headers(self, token='valid-token'):
        """Get headers with authorization token."""
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def test_auth_endpoint_reachable(self, client):
        """Test if auth endpoint is reachable (basic connectivity)."""
        response = client.post('/api/auth/login')
        # Should get 400 (validation error) or 415 (unsupported media type) not 404/500 - proves endpoint exists
        assert response.status_code in [400, 401, 415], f"Auth endpoint not reachable: {response.status_code}"
    
    def test_cors_headers_present(self, client):
        """Test if CORS headers are properly set."""
        response = client.options('/api/auth/login', headers={'Origin': 'http://localhost:3003'})
        assert 'Access-Control-Allow-Origin' in response.headers
        assert 'Access-Control-Allow-Methods' in response.headers
    
    @patch('src.services.auth_service.firebase_auth.verify_id_token')
    def test_firebase_service_mock(self, mock_verify_token, client):
        """Test if Firebase token verification can be mocked (proves service layer works)."""
        mock_verify_token.return_value = {
            'uid': 'test-uid',
            'email': 'test@example.com',
            'name': 'Test User'
        }
        
        data = {
            'token': 'fake-firebase-token',
            'device_info': {
                'device_id': 'test-device',
                'device_name': 'Test Device',
                'platform': 'web'
            }
        }
        
        response = client.post('/api/auth/login', 
                             data=json.dumps(data), 
                             headers={'Content-Type': 'application/json'})
        
        # Should not be 500 - proves Firebase service integration works
        assert response.status_code != 500, f"Firebase service integration broken: {response.data.decode()}"
    
    def test_user_service_methods_exist(self, client):
        """Test if user service methods exist and are callable."""
        from src.services.user_service import UserService
        
        user_service = UserService()
        
        # Check critical methods exist
        assert hasattr(user_service, 'get_or_create_user'), "get_or_create_user method missing"
        assert hasattr(user_service, 'update_user_device'), "update_user_device method missing"
        assert hasattr(user_service.user_repository, 'get_by_id'), "repository get_by_id method missing"
        assert hasattr(user_service.user_repository, 'get_by_firebase_uid'), "repository get_by_firebase_uid method missing"
    
    def test_repository_inheritance(self, client):
        """Test if repository inheritance is working correctly."""
        from src.repositories.user_repository import UserRepository
        from src.repositories.base_repository import BaseRepository
        
        repo = UserRepository()
        
        # Check inheritance
        assert isinstance(repo, BaseRepository), "UserRepository doesn't inherit from BaseRepository"
        assert hasattr(repo, 'get_by_id'), "BaseRepository methods not inherited"
        assert hasattr(repo, 'create'), "BaseRepository create method not inherited"
    
    def test_model_creation(self, client):
        """Test if User model can be created without errors."""
        from src.models.user import User
        
        user = User(
            email='test@example.com',
            name='Test User',
            role='family_member',
            preferred_language='en'
        )
        
        assert user.email == 'test@example.com'
        assert user.is_valid()
    
    def test_firebase_initialization(self, client):
        """Test if Firebase is properly initialized."""
        from src.utils.firebase_config import get_firestore_client, get_auth_client
        
        firestore_client = get_firestore_client()
        auth_client = get_auth_client()
        
        assert firestore_client is not None, "Firestore client not initialized"
        assert auth_client is not None, "Firebase Auth client not initialized"
    
    def test_validation_working(self, client):
        """Test if request validation is working (should catch bad requests)."""
        # Missing required fields
        response = client.post('/api/auth/login',
                             data=json.dumps({}),
                             headers={'Content-Type': 'application/json'})
        
        assert response.status_code == 400, "Validation not working - should reject empty data"
        
        # Missing device_info
        response = client.post('/api/auth/login',
                             data=json.dumps({'token': 'test'}),
                             headers={'Content-Type': 'application/json'})
        
        assert response.status_code == 400, "Validation not working - should require device_info"
    
    def test_error_handling_structure(self, client):
        """Test if error responses have proper structure."""
        response = client.post('/api/auth/login',
                             data=json.dumps({}),
                             headers={'Content-Type': 'application/json'})
        
        data = json.loads(response.data)
        assert 'error' in data, "Error response missing 'error' field"
        assert 'message' in data, "Error response missing 'message' field"
    
    @patch('src.services.auth_service.firebase_auth.verify_id_token')
    @patch('src.services.user_service.UserRepository.get_by_firebase_uid')
    @patch('src.services.user_service.UserRepository.create')
    def test_full_auth_flow_mock(self, mock_create, mock_get_by_uid, mock_verify_token, client):
        """Test complete authentication flow with all external dependencies mocked."""
        # Mock Firebase token verification
        mock_verify_token.return_value = {
            'uid': 'firebase-uid-123',
            'email': 'test@example.com',
            'name': 'Test User'
        }
        
        # Mock no existing user (new user creation)
        mock_get_by_uid.return_value = None
        
        # Mock user creation
        mock_create.return_value = 'user-id-123'
        
        data = {
            'token': 'valid-firebase-token',
            'device_info': {
                'device_id': 'device-123',
                'device_name': 'Test Device',
                'platform': 'web'
            }
        }
        
        response = client.post('/api/auth/login',
                             data=json.dumps(data),
                             headers={'Content-Type': 'application/json'})
        
        # Should succeed with all mocks in place
        if response.status_code != 200:
            print(f"Full auth flow failed: {response.data.decode()}")
            
        assert response.status_code == 200, f"Full auth flow broken: {response.data.decode()}"
        
        response_data = json.loads(response.data)
        assert 'user' in response_data, "Response missing user data"
        assert 'session_token' in response_data, "Response missing session token"