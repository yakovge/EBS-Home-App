"""
Comprehensive integration tests to verify all reported issues are fixed.
These tests verify the complete workflows that were reported as broken.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import date, datetime
from src.services.booking_service import BookingService
from src.services.maintenance_service import MaintenanceService
from src.services.checklist_service import ChecklistService
from src.models.user import User
from src.models.booking import Booking
from src.models.maintenance import MaintenanceRequest, MaintenanceStatus
from src.models.checklist import ExitChecklist, ChecklistPhoto, PhotoType
from src.utils.exceptions import ConflictError


class TestComprehensiveFixes:
    """Comprehensive tests for all reported issue fixes."""

    def test_booking_conflict_detection_fix(self):
        """
        Test that booking conflict detection is working correctly.
        This was the "Failed to check booking availability" issue.
        """
        # Mock the repository with proper date handling
        mock_repo = Mock()
        mock_user_repo = Mock()
        
        # Create existing booking that should conflict
        existing_booking = Booking(
            user_id='other-user',
            user_name='Other User',
            start_date=date(2025, 12, 15),
            end_date=date(2025, 12, 18),
            notes='Existing booking'
        )
        
        with patch('src.services.booking_service.BookingRepository') as mock_booking_repo_class, \
             patch('src.services.booking_service.UserRepository') as mock_user_repo_class:
            
            booking_service = BookingService()
            booking_service.booking_repository = mock_repo
            booking_service.user_repository = mock_user_repo
            
            # Setup mocks
            mock_user = User('test@example.com', 'Test User', 'family_member', 'en')
            mock_user_repo.get_by_id.return_value = mock_user
            
            # Mock conflict detection - should find the conflicting booking
            mock_repo.get_conflicting_bookings.return_value = [existing_booking]
            
            # Test that conflict is properly detected
            with pytest.raises(ConflictError) as exc_info:
                booking_service.create_booking(
                    user_id='test-user',
                    start_date='2025-12-16',  # Overlaps with existing booking
                    end_date='2025-12-17',
                    notes='Test booking'
                )
            
            assert 'Booking conflicts with existing bookings' in str(exc_info.value)
            assert 'Other User' in str(exc_info.value)
            
            # Verify the repository was called with correct date format
            mock_repo.get_conflicting_bookings.assert_called_once_with(
                '2025-12-16',  # String format
                '2025-12-17',  # String format
            )
    
    def test_booking_no_conflict_success(self):
        """Test that booking creation succeeds when no conflicts exist."""
        mock_repo = Mock()
        mock_user_repo = Mock()
        
        with patch('src.services.booking_service.BookingRepository') as mock_booking_repo_class, \
             patch('src.services.booking_service.UserRepository') as mock_user_repo_class:
            
            booking_service = BookingService()
            booking_service.booking_repository = mock_repo
            booking_service.user_repository = mock_user_repo
            
            # Setup mocks
            mock_user = User('test@example.com', 'Test User', 'family_member', 'en')
            mock_user_repo.get_by_id.return_value = mock_user
            
            # No conflicts
            mock_repo.get_conflicting_bookings.return_value = []
            mock_repo.create_booking.return_value = 'booking-123'
            
            # Test successful booking creation
            result = booking_service.create_booking(
                user_id='test-user',
                start_date='2025-12-20',
                end_date='2025-12-22',
                notes='Test booking'
            )
            
            assert result == 'booking-123'
    
    def test_maintenance_reopen_functionality(self):
        """
        Test that maintenance requests can be reopened (marked as unfixed).
        This addresses the "need 'unfixed' option for maintenance" issue.
        """
        mock_repo = Mock()
        mock_user_repo = Mock()
        
        with patch('src.services.maintenance_service.MaintenanceRepository') as mock_maintenance_repo_class, \
             patch('src.services.maintenance_service.UserRepository') as mock_user_repo_class:
            
            maintenance_service = MaintenanceService()
            maintenance_service.maintenance_repository = mock_repo
            maintenance_service.user_repository = mock_user_repo
            
            # Mock successful reopen
            mock_repo.reopen_maintenance_request.return_value = True
            
            # Test reopening a maintenance request
            result = maintenance_service.reopen_maintenance_request(
                request_id='maintenance-123',
                reopen_reason='Issue not fully resolved',
                reopened_by_id='user-456',
                reopened_by_name='Test User'
            )
            
            assert result is True
            
            # Verify repository method was called with correct parameters
            mock_repo.reopen_maintenance_request.assert_called_once_with(
                'maintenance-123',
                'Issue not fully resolved',
                'user-456',
                'Test User'
            )
    
    def test_checklist_entry_data_structure(self):
        """
        Test that checklist entries have the correct data structure for frontend display.
        This addresses the "No entries for refrigerator" issue.
        """
        # Create checklist with realistic entries
        checklist = ExitChecklist(
            user_id='test-user',
            user_name='Test User',
            booking_id='booking-123',
            id='checklist-456'
        )
        
        # Add text-only entry
        text_entry = ChecklistPhoto(PhotoType.REFRIGERATOR, 'Refrigerator is clean and empty')
        checklist.add_photo(text_entry)
        
        # Add photo entry
        photo_entry = ChecklistPhoto(
            PhotoType.FREEZER,
            'Freezer contents documented',
            'https://storage.firebase.com/freezer_photo.jpg'
        )
        checklist.add_photo(photo_entry)
        
        # Add multiple entries for same category
        another_fridge_entry = ChecklistPhoto(PhotoType.REFRIGERATOR, 'Additional refrigerator check')
        checklist.add_photo(another_fridge_entry)
        
        # Get the data structure that would be sent to frontend
        checklist_data = checklist.to_dict()
        
        # Verify structure
        assert 'photos' in checklist_data
        assert len(checklist_data['photos']) == 3
        
        # Test frontend grouping logic (what happens in ChecklistDetailModal)
        photos = checklist_data['photos']
        entries_by_type = {}
        
        for entry in photos:
            photo_type = entry['photo_type']
            if photo_type not in entries_by_type:
                entries_by_type[photo_type] = []
            entries_by_type[photo_type].append(entry)
        
        # Verify the grouping that was causing "No entries" issues
        for entry_type in ['refrigerator', 'freezer', 'closet']:
            # This is the exact condition used in the frontend
            has_entries = entry_type in entries_by_type and len(entries_by_type[entry_type]) > 0
            
            if entry_type in ['refrigerator', 'freezer']:
                assert has_entries, f"Should show entries for {entry_type}"
                assert entries_by_type[entry_type], f"Entries array should not be falsy for {entry_type}"
            else:
                assert not has_entries, f"Should show 'No entries' for {entry_type}"
        
        # Verify data integrity
        assert len(entries_by_type['refrigerator']) == 2
        assert len(entries_by_type['freezer']) == 1
        
        # Check that all entries have required fields
        for entries in entries_by_type.values():
            for entry in entries:
                assert 'photo_type' in entry
                assert 'notes' in entry
                assert 'created_at' in entry
                assert entry['notes']  # Notes should not be empty
    
    def test_maintenance_photo_data_structure(self):
        """
        Test that maintenance requests have correct photo URL structure.
        This addresses maintenance photo viewing issues.
        """
        # Create maintenance request with photos
        request = MaintenanceRequest(
            reporter_id='user-123',
            reporter_name='Test User',
            description='Kitchen sink is leaking badly',
            location='Kitchen',
            photo_urls=[
                'https://storage.firebase.com/maintenance/photo1.jpg',
                'https://storage.firebase.com/maintenance/photo2.jpg'
            ]
        )
        
        # Get data structure sent to frontend
        request_data = request.to_dict()
        
        # Verify photo structure
        assert 'photo_urls' in request_data
        assert isinstance(request_data['photo_urls'], list)
        assert len(request_data['photo_urls']) == 2
        
        # Test the frontend condition for showing photo button
        has_photos = request_data['photo_urls'] and len(request_data['photo_urls']) > 0
        assert has_photos, "Should show photo viewing button"
        
        # Verify photo URLs are valid strings
        for photo_url in request_data['photo_urls']:
            assert isinstance(photo_url, str)
            assert photo_url.startswith('https://')
    
    def test_comprehensive_workflow_integration(self):
        """
        Test a complete workflow covering all the major functionality.
        """
        # Test data
        user_id = 'test-user'
        user_name = 'Test User'
        
        # 1. Create a booking (should succeed with no conflicts)
        with patch('src.services.booking_service.BookingRepository') as mock_booking_repo, \
             patch('src.services.booking_service.UserRepository') as mock_user_repo:
            
            booking_service = BookingService()
            booking_service.booking_repository = Mock()
            booking_service.user_repository = Mock()
            
            mock_user = User('test@example.com', user_name, 'family_member', 'en')
            booking_service.user_repository.get_by_id.return_value = mock_user
            booking_service.booking_repository.get_conflicting_bookings.return_value = []
            booking_service.booking_repository.create_booking.return_value = 'booking-123'
            
            booking_id = booking_service.create_booking(
                user_id=user_id,
                start_date='2025-12-25',
                end_date='2025-12-27',
                notes='Holiday booking'
            )
            assert booking_id == 'booking-123'
        
        # 2. Create a maintenance request
        with patch('src.services.maintenance_service.MaintenanceRepository') as mock_maintenance_repo, \
             patch('src.services.maintenance_service.UserRepository') as mock_user_repo:
            
            maintenance_service = MaintenanceService()
            maintenance_service.maintenance_repository = Mock()
            maintenance_service.user_repository = Mock()
            
            maintenance_service.user_repository.get_by_id.return_value = mock_user
            maintenance_service.maintenance_repository.create_maintenance_request.return_value = 'maintenance-456'
            
            maintenance_id = maintenance_service.create_maintenance_request(
                user_id=user_id,
                description='Air conditioning not working properly',
                location='Living Room',
                photo_urls=['https://storage.firebase.com/maintenance/ac_issue.jpg']
            )
            assert maintenance_id == 'maintenance-456'
        
        # 3. Create an exit checklist
        with patch('src.services.checklist_service.ChecklistRepository') as mock_checklist_repo, \
             patch('src.services.checklist_service.UserRepository') as mock_user_repo, \
             patch('src.services.checklist_service.BookingRepository') as mock_booking_repo:
            
            checklist_service = ChecklistService()
            checklist_service.checklist_repository = Mock()
            checklist_service.user_repository = Mock()
            checklist_service.booking_repository = Mock()
            
            checklist_service.user_repository.get_by_id.return_value = mock_user
            checklist_service.checklist_repository.create_checklist.return_value = 'checklist-789'
            
            checklist_id = checklist_service.create_checklist(
                user_id=user_id,
                booking_id=booking_id
            )
            assert checklist_id == 'checklist-789'
        
        # All operations should succeed without errors
        assert booking_id
        assert maintenance_id  
        assert checklist_id