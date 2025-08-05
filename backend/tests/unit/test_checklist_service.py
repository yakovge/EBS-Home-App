"""
Unit tests for checklist service.
Tests the new text-only functionality and existing photo functionality.
"""

import pytest
from unittest.mock import Mock, patch
from src.services.checklist_service import ChecklistService
from src.models.checklist import ExitChecklist, ChecklistPhoto, PhotoType
from src.models.user import User
from src.models.booking import Booking
from datetime import date, timedelta


class TestChecklistService:
    """Test ChecklistService with new text-only functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Mock the repository classes before they are instantiated
        self.checklist_repo_mock = Mock()
        self.booking_repo_mock = Mock()
        self.user_repo_mock = Mock()
        
        with patch('src.services.checklist_service.ChecklistRepository', return_value=self.checklist_repo_mock), \
             patch('src.services.checklist_service.BookingRepository', return_value=self.booking_repo_mock), \
             patch('src.services.checklist_service.UserRepository', return_value=self.user_repo_mock):
            self.service = ChecklistService()
            self.service.checklist_repository = self.checklist_repo_mock
            self.service.booking_repository = self.booking_repo_mock
            self.service.user_repository = self.user_repo_mock
    
    def test_add_text_only_entry_success(self):
        """Test successfully adding a text-only entry (no photo)."""
        # Setup mocks
        mock_checklist = ExitChecklist(
            user_id='user-123',
            user_name='Test User',
            booking_id='booking-123',
            id='checklist-123'
        )
        self.service.checklist_repository.get_checklist_by_id.return_value = mock_checklist
        self.service.checklist_repository.add_photo_to_checklist.return_value = True
        
        # Add text-only entry
        success = self.service.add_entry_to_checklist(
            checklist_id='checklist-123',
            photo_type='refrigerator',
            notes='Refrigerator is clean and empty',
            photo_url=None  # No photo URL - text only
        )
        
        # Verify
        assert success is True
        
        # Verify repository was called with correct data
        self.service.checklist_repository.add_photo_to_checklist.assert_called_once()
        call_args = self.service.checklist_repository.add_photo_to_checklist.call_args[0]
        
        assert call_args[0] == 'checklist-123'
        entry_data = call_args[1]
        assert entry_data['photo_type'] == 'refrigerator'
        assert entry_data['notes'] == 'Refrigerator is clean and empty'
        assert entry_data['photo_url'] is None
        assert entry_data['order'] == 1
    
    def test_add_entry_with_photo_success(self):
        """Test successfully adding an entry with a photo."""
        # Setup mocks
        mock_checklist = ExitChecklist(
            user_id='user-123',
            user_name='Test User',
            booking_id='booking-123',
            id='checklist-123'
        )
        self.service.checklist_repository.get_checklist_by_id.return_value = mock_checklist
        self.service.checklist_repository.add_photo_to_checklist.return_value = True
        
        # Add entry with photo
        success = self.service.add_entry_to_checklist(
            checklist_id='checklist-123',
            photo_type='freezer',
            notes='Freezer is defrosted and clean',
            photo_url='https://example.com/freezer.jpg'
        )
        
        # Verify
        assert success is True
        
        # Verify repository was called with correct data
        call_args = self.service.checklist_repository.add_photo_to_checklist.call_args[0]
        entry_data = call_args[1]
        assert entry_data['photo_url'] == 'https://example.com/freezer.jpg'
        assert entry_data['notes'] == 'Freezer is defrosted and clean'
    
    def test_submit_checklist_text_only_success(self):
        """Test submitting a checklist with only text entries."""
        # Create checklist with text-only entries for all categories
        mock_checklist = ExitChecklist(
            user_id='user-123',
            user_name='Test User',
            booking_id=None,  # Test standalone checklist
            id='checklist-123'
        )
        
        # Add text-only entries for all required categories
        text_entries = [
            ChecklistPhoto(PhotoType.REFRIGERATOR, "Refrigerator is clean and empty"),
            ChecklistPhoto(PhotoType.FREEZER, "Freezer is defrosted and clean"),
            ChecklistPhoto(PhotoType.CLOSET, "All closets are organized and tidy")
        ]
        
        for entry in text_entries:
            mock_checklist.add_photo(entry)
        
        # Setup mocks
        self.service.checklist_repository.get_checklist_by_id.return_value = mock_checklist
        self.service.checklist_repository.submit_checklist.return_value = True
        self.service.booking_repository.mark_exit_checklist_completed.return_value = True
        
        # Submit checklist
        success = self.service.submit_checklist('checklist-123')
        
        # Verify
        assert success is True
        self.service.checklist_repository.submit_checklist.assert_called_once_with('checklist-123')
        # No booking to mark as completed since booking_id is None
        self.service.booking_repository.mark_exit_checklist_completed.assert_not_called()
    
    def test_submit_checklist_missing_category_fails(self):
        """Test submitting a checklist with missing required categories fails."""
        # Create checklist with only refrigerator entry (missing freezer and closet)
        mock_checklist = ExitChecklist(
            user_id='user-123',
            user_name='Test User',
            booking_id='booking-123',
            id='checklist-123'
        )
        
        # Add only refrigerator entry
        mock_checklist.add_photo(
            ChecklistPhoto(PhotoType.REFRIGERATOR, "Refrigerator is clean and empty")
        )
        
        # Setup mocks
        self.service.checklist_repository.get_checklist_by_id.return_value = mock_checklist
        
        # Submit checklist - should fail validation
        with pytest.raises(ValueError, match="Checklist validation failed"):
            self.service.submit_checklist('checklist-123')
        
        # Verify repository methods were not called
        self.service.checklist_repository.submit_checklist.assert_not_called()
        self.service.booking_repository.mark_exit_checklist_completed.assert_not_called()
    
    def test_submit_checklist_short_notes_fails(self):
        """Test submitting a checklist with short notes fails."""
        # Create checklist with short notes
        mock_checklist = ExitChecklist(
            user_id='user-123',
            user_name='Test User',
            booking_id='booking-123',
            id='checklist-123'
        )
        
        # Add entries with short notes
        entries = [
            ChecklistPhoto(PhotoType.REFRIGERATOR, "OK"),  # Too short
            ChecklistPhoto(PhotoType.FREEZER, "Good notes here"),
            ChecklistPhoto(PhotoType.CLOSET, "Also good notes here")
        ]
        
        for entry in entries:
            mock_checklist.add_photo(entry)
        
        # Setup mocks
        self.service.checklist_repository.get_checklist_by_id.return_value = mock_checklist
        
        # Submit checklist - should fail validation
        with pytest.raises(ValueError, match="Checklist validation failed"):
            self.service.submit_checklist('checklist-123')
        
        # Verify repository methods were not called
        self.service.checklist_repository.submit_checklist.assert_not_called()
        self.service.booking_repository.mark_exit_checklist_completed.assert_not_called()
    
    def test_backward_compatibility_add_photo(self):
        """Test that the old add_photo_to_checklist method still works."""
        # Setup mocks
        mock_checklist = ExitChecklist(
            user_id='user-123',
            user_name='Test User',
            booking_id='booking-123',
            id='checklist-123'
        )
        self.service.checklist_repository.get_checklist_by_id.return_value = mock_checklist
        self.service.checklist_repository.add_photo_to_checklist.return_value = True
        
        # Use old method
        success = self.service.add_photo_to_checklist(
            checklist_id='checklist-123',
            photo_type='closet',
            photo_url='https://example.com/closet.jpg',
            notes='Closet is organized'
        )
        
        # Verify
        assert success is True
        
        # Verify it calls through to the new method
        call_args = self.service.checklist_repository.add_photo_to_checklist.call_args[0]
        entry_data = call_args[1]
        assert entry_data['photo_url'] == 'https://example.com/closet.jpg'
        assert entry_data['notes'] == 'Closet is organized'
    
    def test_create_checklist_without_booking(self):
        """Test creating a standalone checklist without a booking."""
        # Setup mocks
        mock_user = User('test@example.com', 'Test User', 'family_member', 'en', 'user-123')
        self.service.user_repository.get_by_id.return_value = mock_user
        self.service.checklist_repository.create_checklist.return_value = 'checklist-456'
        
        # Create checklist without booking
        result = self.service.create_checklist(
            user_id='user-123',
            booking_id=None
        )
        
        # Verify
        assert result == 'checklist-456'
        
        # Verify repository was called with correct data
        self.service.checklist_repository.create_checklist.assert_called_once()
        call_args = self.service.checklist_repository.create_checklist.call_args[0][0]
        
        assert call_args['user_id'] == 'user-123'
        assert call_args['user_name'] == 'Test User'
        assert call_args['booking_id'] is None
        assert call_args['photos'] == []
        
        # Verify booking repository was not called
        self.service.booking_repository.get_booking_by_id.assert_not_called()