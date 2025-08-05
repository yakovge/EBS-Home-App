"""
Integration tests for checklist photo upload functionality.
Tests the complete checklist photo upload flow from API to Firebase Storage.
"""

import io
import json
import pytest
from unittest.mock import patch, MagicMock

from tests.test_base import TestBase


class TestChecklistPhotoUpload(TestBase):
    """Test checklist photo upload API endpoint."""

    def get_auth_headers(self, token='valid-token'):
        """Get headers with authorization token."""
        return {
            'Authorization': f'Bearer {token}',
        }

    def create_test_image(self):
        """Create a test image file for upload."""
        # Create a simple 1x1 pixel PNG image
        image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82'
        return io.BytesIO(image_data)

    @patch('src.services.storage_service.StorageService.upload_checklist_photo')
    @patch('src.services.auth_service.AuthService.verify_session')
    @patch('src.services.user_service.UserRepository.get_by_id')
    def test_upload_checklist_photo_success(self, mock_get_user, mock_verify_session, mock_upload_photo, client):
        """Test successful checklist photo upload."""
        # Mock user
        mock_user = MagicMock()
        mock_user.id = 'user-123'
        mock_user.name = 'Test User'
        mock_get_user.return_value = mock_user
        
        # Mock session verification
        mock_verify_session.return_value = 'user-123'
        
        # Mock storage service
        mock_upload_photo.return_value = 'https://storage.googleapis.com/test-bucket/checklist-photo.jpg'
        
        # Create test image
        test_image = self.create_test_image()
        
        # Upload photo
        response = client.post(
            '/api/checklists/upload-photo',
            data={
                'photo': (test_image, 'test_photo.png'),
                'photo_type': 'refrigerator',
                'checklist_id': 'test-checklist-123'
            },
            headers=self.get_auth_headers(),
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'photo_url' in data
        assert data['photo_url'] == 'https://storage.googleapis.com/test-bucket/checklist-photo.jpg'
        assert data['photo_type'] == 'refrigerator'
        assert data['message'] == 'Photo uploaded successfully'
        
        # Verify storage service was called correctly
        mock_upload_photo.assert_called_once()
        call_args = mock_upload_photo.call_args
        assert call_args[1]['user_id'] == 'user-123'
        assert call_args[1]['checklist_id'] == 'test-checklist-123'
        assert call_args[1]['photo_type'] == 'refrigerator'
        assert call_args[1]['filename'] == 'test_photo.png'

    @patch('src.services.auth_service.AuthService.verify_session')
    @patch('src.services.user_service.UserRepository.get_by_id')
    def test_upload_checklist_photo_no_file(self, mock_get_user, mock_verify_session, client):
        """Test upload without photo file."""
        # Mock user and session
        mock_user = MagicMock()
        mock_user.id = 'user-123'
        mock_get_user.return_value = mock_user
        mock_verify_session.return_value = 'user-123'
        
        response = client.post(
            '/api/checklists/upload-photo',
            data={'photo_type': 'refrigerator'},
            headers=self.get_auth_headers(),
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'No photo file provided'

    @patch('src.services.auth_service.AuthService.verify_session')
    @patch('src.services.user_service.UserRepository.get_by_id')
    def test_upload_checklist_photo_no_photo_type(self, mock_get_user, mock_verify_session, client):
        """Test upload without photo_type."""
        # Mock user and session
        mock_user = MagicMock()
        mock_user.id = 'user-123'
        mock_get_user.return_value = mock_user
        mock_verify_session.return_value = 'user-123'
        
        test_image = self.create_test_image()
        
        response = client.post(
            '/api/checklists/upload-photo',
            data={'photo': (test_image, 'test_photo.png')},
            headers=self.get_auth_headers(),
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'photo_type is required'

    @patch('src.services.auth_service.AuthService.verify_session')
    @patch('src.services.user_service.UserRepository.get_by_id')
    def test_upload_checklist_photo_invalid_photo_type(self, mock_get_user, mock_verify_session, client):
        """Test upload with invalid photo_type."""
        # Mock user and session
        mock_user = MagicMock()
        mock_user.id = 'user-123'
        mock_get_user.return_value = mock_user
        mock_verify_session.return_value = 'user-123'
        
        test_image = self.create_test_image()
        
        response = client.post(
            '/api/checklists/upload-photo',
            data={
                'photo': (test_image, 'test_photo.png'),
                'photo_type': 'invalid_type'
            },
            headers=self.get_auth_headers(),
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid photo_type' in data['error']
        assert 'refrigerator' in data['error']
        assert 'freezer' in data['error']
        assert 'closet' in data['error']

    @patch('src.services.auth_service.AuthService.verify_session')
    @patch('src.services.user_service.UserRepository.get_by_id')
    def test_upload_checklist_photo_invalid_file_type(self, mock_get_user, mock_verify_session, client):
        """Test upload with invalid file type."""
        # Mock user and session
        mock_user = MagicMock()
        mock_user.id = 'user-123'
        mock_get_user.return_value = mock_user
        mock_verify_session.return_value = 'user-123'
        
        # Create a text file instead of image
        text_file = io.BytesIO(b'This is not an image')
        
        response = client.post(
            '/api/checklists/upload-photo',
            data={
                'photo': (text_file, 'test.txt'),
                'photo_type': 'refrigerator'
            },
            headers=self.get_auth_headers(),
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid file type' in data['error']

    @patch('src.services.storage_service.StorageService.upload_checklist_photo')
    @patch('src.services.auth_service.AuthService.verify_session')
    @patch('src.services.user_service.UserRepository.get_by_id')
    def test_upload_checklist_photo_storage_failure(self, mock_get_user, mock_verify_session, mock_upload_photo, client):
        """Test photo upload when storage service fails."""
        # Mock user and session
        mock_user = MagicMock()
        mock_user.id = 'user-123'
        mock_get_user.return_value = mock_user
        mock_verify_session.return_value = 'user-123'
        
        # Mock storage service failure
        mock_upload_photo.return_value = None
        
        # Create test image
        test_image = self.create_test_image()
        
        # Upload photo
        response = client.post(
            '/api/checklists/upload-photo',
            data={
                'photo': (test_image, 'test_photo.png'),
                'photo_type': 'freezer'
            },
            headers=self.get_auth_headers(),
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['error'] == 'Failed to upload photo'

    def test_upload_checklist_photo_requires_auth(self, client):
        """Test that checklist photo upload requires authentication."""
        test_image = self.create_test_image()
        
        response = client.post(
            '/api/checklists/upload-photo',
            data={
                'photo': (test_image, 'test_photo.png'),
                'photo_type': 'closet'
            },
            content_type='multipart/form-data'
        )
        
        # Should return 401 unauthorized
        assert response.status_code == 401

    @patch('src.services.storage_service.StorageService.upload_checklist_photo')
    @patch('src.services.auth_service.AuthService.verify_session')
    @patch('src.services.user_service.UserRepository.get_by_id')
    def test_upload_all_photo_types(self, mock_get_user, mock_verify_session, mock_upload_photo, client):
        """Test upload for all valid photo types."""
        # Mock user and session
        mock_user = MagicMock()
        mock_user.id = 'user-123'
        mock_get_user.return_value = mock_user
        mock_verify_session.return_value = 'user-123'
        
        # Mock storage service
        mock_upload_photo.return_value = 'https://storage.googleapis.com/test-bucket/photo.jpg'
        
        photo_types = ['refrigerator', 'freezer', 'closet']
        
        for photo_type in photo_types:
            test_image = self.create_test_image()
            
            response = client.post(
                '/api/checklists/upload-photo',
                data={
                    'photo': (test_image, f'{photo_type}_photo.png'),
                    'photo_type': photo_type
                },
                headers=self.get_auth_headers(),
                content_type='multipart/form-data'
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['photo_type'] == photo_type
            assert data['message'] == 'Photo uploaded successfully'