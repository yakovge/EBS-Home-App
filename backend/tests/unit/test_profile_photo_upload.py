"""
Unit tests for profile photo upload functionality.
Tests the new profile photo upload endpoint and storage integration.
"""

import pytest
from unittest.mock import patch, MagicMock, Mock
from io import BytesIO
import json

from src.api.user import user_bp
from src.models.user import User
from src.services.storage_service import StorageService


class TestProfilePhotoUpload:
    """Test profile photo upload functionality."""

    @patch('src.api.user.storage_service')
    @patch('src.api.user.user_service')
    def test_upload_profile_photo_success(self, mock_user_service, mock_storage_service):
        """Test successful profile photo upload."""
        
        # Mock the storage service
        mock_storage_service.upload_profile_photo.return_value = 'https://example.com/profile/user123/photo.jpg'
        
        # Mock authentication
        mock_user = User({
            'id': 'user123',
            'name': 'Test User',
            'email': 'test@example.com',
            'role': 'family_member'
        })
        
        # Create a mock file
        mock_file = Mock()
        mock_file.filename = 'profile.jpg'
        mock_file.content_type = 'image/jpeg'
        mock_file.read.return_value = b'fake image data'
        mock_file.seek = Mock()
        mock_file.tell.return_value = 1024 * 1024  # 1MB file
        
        # Mock Flask request with file upload
        with patch('src.api.user.request') as mock_request:
            mock_request.files = {'photo': mock_file}
            
            with patch('src.api.user.current_app') as mock_app:
                mock_app.logger = Mock()
                
                # Import and call the endpoint function
                from src.api.user import upload_profile_photo
                
                # Mock current user
                with patch('src.middleware.auth.require_auth') as mock_auth:
                    # Call the endpoint function directly with mock user
                    result = upload_profile_photo(mock_user)
                    
                    # Verify the result
                    response_data, status_code = result
                    data = json.loads(response_data.data)
                    
                    assert status_code == 200
                    assert data['photo_url'] == 'https://example.com/profile/user123/photo.jpg'
                    assert data['message'] == 'Profile photo uploaded successfully'
                    
                    # Verify storage service was called
                    mock_storage_service.upload_profile_photo.assert_called_once_with(
                        user_id='user123',
                        file_bytes=b'fake image data',
                        filename='profile.jpg'
                    )

    @patch('src.api.user.storage_service')
    def test_upload_profile_photo_no_file(self, mock_storage_service):
        """Test profile photo upload with no file provided."""
        
        mock_user = User({
            'id': 'user123',
            'name': 'Test User',
            'email': 'test@example.com',
            'role': 'family_member'
        })
        
        # Mock Flask request with no file
        with patch('src.api.user.request') as mock_request:
            mock_request.files = {}
            
            from src.api.user import upload_profile_photo
            
            result = upload_profile_photo(mock_user)
            response_data, status_code = result
            data = json.loads(response_data.data)
            
            assert status_code == 400
            assert data['error'] == 'No photo file provided'

    @patch('src.api.user.storage_service')
    def test_upload_profile_photo_invalid_type(self, mock_storage_service):
        """Test profile photo upload with invalid file type."""
        
        mock_user = User({
            'id': 'user123',
            'name': 'Test User',
            'email': 'test@example.com',
            'role': 'family_member'
        })
        
        # Create a mock file with invalid type
        mock_file = Mock()
        mock_file.filename = 'document.pdf'
        mock_file.content_type = 'application/pdf'
        
        with patch('src.api.user.request') as mock_request:
            mock_request.files = {'photo': mock_file}
            
            from src.api.user import upload_profile_photo
            
            result = upload_profile_photo(mock_user)
            response_data, status_code = result
            data = json.loads(response_data.data)
            
            assert status_code == 400
            assert 'Invalid file type' in data['error']

    @patch('src.api.user.storage_service')
    def test_upload_profile_photo_file_too_large(self, mock_storage_service):
        """Test profile photo upload with file too large."""
        
        mock_user = User({
            'id': 'user123',
            'name': 'Test User',
            'email': 'test@example.com',
            'role': 'family_member'
        })
        
        # Create a mock file that's too large
        mock_file = Mock()
        mock_file.filename = 'large.jpg'
        mock_file.content_type = 'image/jpeg'
        mock_file.seek = Mock()
        mock_file.tell.return_value = 10 * 1024 * 1024  # 10MB file (too large)
        
        with patch('src.api.user.request') as mock_request:
            mock_request.files = {'photo': mock_file}
            
            from src.api.user import upload_profile_photo
            
            result = upload_profile_photo(mock_user)
            response_data, status_code = result
            data = json.loads(response_data.data)
            
            assert status_code == 400
            assert 'File size too large' in data['error']

    @patch('src.api.user.storage_service')
    def test_upload_profile_photo_storage_failure(self, mock_storage_service):
        """Test profile photo upload when storage fails."""
        
        # Mock storage service to return None (failure)
        mock_storage_service.upload_profile_photo.return_value = None
        
        mock_user = User({
            'id': 'user123',
            'name': 'Test User',
            'email': 'test@example.com',
            'role': 'family_member'
        })
        
        # Create a valid mock file
        mock_file = Mock()
        mock_file.filename = 'profile.jpg'
        mock_file.content_type = 'image/jpeg'
        mock_file.read.return_value = b'fake image data'
        mock_file.seek = Mock()
        mock_file.tell.return_value = 1024 * 1024  # 1MB file
        
        with patch('src.api.user.request') as mock_request:
            mock_request.files = {'photo': mock_file}
            
            with patch('src.api.user.current_app') as mock_app:
                mock_app.logger = Mock()
                
                from src.api.user import upload_profile_photo
                
                result = upload_profile_photo(mock_user)
                response_data, status_code = result
                data = json.loads(response_data.data)
                
                assert status_code == 500
                assert data['error'] == 'Failed to upload profile photo'

    def test_storage_service_profile_photo_upload(self):
        """Test StorageService profile photo upload method."""
        
        # Mock the Firebase storage client
        with patch('src.services.storage_service.get_storage_client') as mock_get_client:
            mock_bucket = Mock()
            mock_blob = Mock()
            mock_blob.public_url = 'https://example.com/profile/user123/photo.jpg'
            mock_bucket.blob.return_value = mock_blob
            mock_get_client.return_value = mock_bucket
            
            storage_service = StorageService()
            
            result = storage_service.upload_profile_photo(
                user_id='user123',
                file_bytes=b'fake image data',
                filename='profile.jpg'
            )
            
            assert result == 'https://example.com/profile/user123/photo.jpg'
            
            # Verify blob operations
            mock_blob.upload_from_string.assert_called_once_with(b'fake image data', content_type='image/jpeg')
            mock_blob.make_public.assert_called_once()

    def test_storage_service_profile_photo_upload_with_fallback(self):
        """Test StorageService profile photo upload with local storage fallback."""
        
        # Mock Firebase storage to fail
        with patch('src.services.storage_service.get_storage_client') as mock_get_client:
            mock_bucket = Mock()
            mock_blob = Mock()
            mock_blob.upload_from_string.side_effect = Exception("Storage unavailable")
            mock_bucket.blob.return_value = mock_blob
            mock_get_client.return_value = mock_bucket
            
            # Mock file system operations for local fallback
            with patch('builtins.open', create=True) as mock_open:
                with patch('src.services.storage_service.uuid.uuid4', return_value='test-uuid'):
                    storage_service = StorageService()
                    
                    result = storage_service.upload_profile_photo(
                        user_id='user123',
                        file_bytes=b'fake image data',
                        filename='profile.jpg'
                    )
                    
                    # Should return local URL as fallback
                    assert 'localhost:5000/api/uploads' in result
                    assert 'profiles' in result