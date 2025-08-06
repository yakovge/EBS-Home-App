"""
Tests to verify that model to_dict() methods include all necessary fields for API responses.
These tests would have caught the missing 'id' field issues that caused runtime problems.
"""

import pytest
from datetime import date, datetime
from src.models.user import User
from src.models.booking import Booking
from src.models.maintenance import MaintenanceRequest
from src.models.checklist import ExitChecklist, ChecklistPhoto, PhotoType


class TestModelToDictCompleteness:
    """Test that all models properly serialize to dictionaries with required fields."""
    
    def test_user_to_dict_includes_id(self):
        """Test that User model to_dict includes id field."""
        user = User('test@example.com', 'Test User', 'family_member', 'en')
        user.id = 'user-123'  # Simulate ID set by repository
        
        data = user.to_dict()
        
        assert 'id' in data
        assert data['id'] == 'user-123'
        assert 'email' in data
        assert 'name' in data
        assert data['email'] == 'test@example.com'
        assert data['name'] == 'Test User'
    
    def test_booking_to_dict_includes_id(self):
        """Test that Booking model to_dict includes id field."""
        booking = Booking(
            user_id='user-123',
            user_name='Test User',
            start_date=date(2025, 12, 15),
            end_date=date(2025, 12, 17),
            notes='Test booking'
        )
        booking.id = 'booking-456'  # Simulate ID set by repository
        
        data = booking.to_dict()
        
        assert 'id' in data
        assert data['id'] == 'booking-456'
        assert 'user_id' in data
        assert 'user_name' in data
        assert 'start_date' in data
        assert 'end_date' in data
        assert data['user_id'] == 'user-123'
        assert data['user_name'] == 'Test User'
    
    def test_maintenance_request_to_dict_includes_id(self):
        """Test that MaintenanceRequest model to_dict includes id field."""
        request = MaintenanceRequest(
            reporter_id='user-123',
            reporter_name='Test User',
            description='Kitchen sink is leaking',
            location='Kitchen',
            photo_urls=['https://example.com/photo1.jpg']
        )
        request.id = 'maintenance-789'  # Simulate ID set by repository
        
        data = request.to_dict()
        
        assert 'id' in data
        assert data['id'] == 'maintenance-789'
        assert 'reporter_id' in data
        assert 'description' in data
        assert 'location' in data
        assert 'status' in data
        assert data['reporter_id'] == 'user-123'
        assert data['description'] == 'Kitchen sink is leaking'
        assert data['status'] == 'pending'  # Default status
    
    def test_exit_checklist_to_dict_includes_id(self):
        """Test that ExitChecklist model to_dict includes id field."""
        checklist = ExitChecklist(
            user_id='user-123',
            user_name='Test User',
            booking_id='booking-456',
            id='checklist-999'
        )
        
        # Add some entries
        entry = ChecklistPhoto(PhotoType.REFRIGERATOR, 'Fridge is clean')
        checklist.add_photo(entry)
        
        data = checklist.to_dict()
        
        assert 'id' in data
        assert data['id'] == 'checklist-999'
        assert 'user_id' in data
        assert 'user_name' in data
        assert 'photos' in data
        assert len(data['photos']) == 1
        assert data['user_id'] == 'user-123'
        assert data['user_name'] == 'Test User'
    
    def test_checklist_photo_to_dict_structure(self):
        """Test that ChecklistPhoto to_dict has correct structure for frontend grouping."""
        photo = ChecklistPhoto(
            photo_type=PhotoType.REFRIGERATOR,
            notes='Refrigerator is clean and empty',
            photo_url='https://example.com/fridge.jpg'
        )
        
        data = photo.to_dict()
        
        # Check fields needed for frontend grouping
        assert 'photo_type' in data
        assert 'notes' in data
        assert 'photo_url' in data
        assert 'created_at' in data
        
        # Check values
        assert data['photo_type'] == 'refrigerator'  # Should be string, not enum
        assert data['notes'] == 'Refrigerator is clean and empty'
        assert data['photo_url'] == 'https://example.com/fridge.jpg'
        assert data['created_at'] is not None
    
    def test_api_response_structure_simulation(self):
        """
        Simulate the complete API response flow to catch serialization issues.
        This test mimics what happens in the real application.
        """
        # Create models as they would be created in the repository
        booking = Booking(
            user_id='user-123',
            user_name='Test User',
            start_date=date(2025, 12, 15),
            end_date=date(2025, 12, 17),
            notes='Test booking'
        )
        booking.id = 'booking-456'  # Repository sets this
        
        maintenance = MaintenanceRequest(
            reporter_id='user-123',
            reporter_name='Test User',
            description='Kitchen sink issue',
            location='Kitchen',
            photo_urls=['https://example.com/photo.jpg']
        )
        maintenance.id = 'maintenance-789'  # Repository sets this
        
        checklist = ExitChecklist(
            user_id='user-123',
            user_name='Test User',
            booking_id='booking-456'
        )
        checklist.id = 'checklist-999'  # Repository sets this
        
        # Add checklist entries
        fridge_entry = ChecklistPhoto(PhotoType.REFRIGERATOR, 'Fridge is clean')
        freezer_entry = ChecklistPhoto(PhotoType.FREEZER, 'Freezer is empty')
        checklist.add_photo(fridge_entry)
        checklist.add_photo(freezer_entry)
        
        # Simulate API response serialization (what the API endpoints do)
        booking_response = booking.to_dict()
        maintenance_response = maintenance.to_dict()
        checklist_response = checklist.to_dict()
        
        # Test that frontend can get required fields
        # Booking
        assert 'id' in booking_response  # Needed for cancellation
        assert booking_response['id'] is not None
        
        # Maintenance
        assert 'id' in maintenance_response  # Needed for "Mark as Fixed"
        assert maintenance_response['id'] is not None
        assert 'status' in maintenance_response
        assert maintenance_response['status'] == 'pending'
        
        # Checklist
        assert 'id' in checklist_response  # Needed for modal operations
        assert checklist_response['id'] is not None
        assert 'photos' in checklist_response
        assert len(checklist_response['photos']) == 2
        
        # Test checklist entry grouping (simulates frontend logic)
        photos = checklist_response['photos']
        entries_by_type = {}
        
        for entry in photos:
            photo_type = entry['photo_type']
            if photo_type not in entries_by_type:
                entries_by_type[photo_type] = []
            entries_by_type[photo_type].append(entry)
        
        # This should work without showing "No entries"
        assert 'refrigerator' in entries_by_type
        assert 'freezer' in entries_by_type
        assert len(entries_by_type['refrigerator']) == 1
        assert len(entries_by_type['freezer']) == 1
        
        # Test the exact frontend condition that was failing
        for entry_type in ['refrigerator', 'freezer', 'closet']:
            has_entries = entry_type in entries_by_type and len(entries_by_type[entry_type]) > 0
            
            if entry_type in ['refrigerator', 'freezer']:
                assert has_entries, f"Should show entries for {entry_type}"
            else:
                assert not has_entries, f"Should show 'No entries' for {entry_type}"
    
    def test_service_cancel_booking_return_type(self):
        """Test that cancel_booking service returns proper type for API usage."""
        from src.services.booking_service import BookingService
        from unittest.mock import Mock
        
        service = BookingService()
        service.booking_repository = Mock()
        
        # Test successful cancellation
        mock_booking = Booking(
            user_id='user-123',
            user_name='Test User',
            start_date=date(2025, 12, 15),
            end_date=date(2025, 12, 17),
            notes='Test booking'
        )
        mock_booking.id = 'booking-456'
        
        service.booking_repository.cancel_booking.return_value = True
        service.booking_repository.get_booking_by_id.return_value = mock_booking
        
        result = service.cancel_booking('booking-456')
        
        # Should return a Booking object, not boolean
        assert result is not None
        assert hasattr(result, 'to_dict')  # Must have to_dict for API response
        
        # Test failed cancellation
        service.booking_repository.cancel_booking.return_value = False
        result = service.cancel_booking('booking-456')
        
        assert result is None  # Should return None for failure, not False
    
    def test_all_required_fields_present_for_frontend(self):
        """Test that all models include fields required by frontend components."""
        # Create realistic models
        booking = Booking(
            user_id='user-123',
            user_name='Test User',
            start_date=date(2025, 12, 15),
            end_date=date(2025, 12, 17),
            notes='Test booking'
        )
        booking.id = 'booking-456'
        
        maintenance = MaintenanceRequest(
            reporter_id='user-123',
            reporter_name='Test User',
            description='Test issue',
            location='Kitchen',
            photo_urls=['https://example.com/photo.jpg']
        )
        maintenance.id = 'maintenance-789'
        
        checklist = ExitChecklist(
            user_id='user-123',
            user_name='Test User',
            booking_id='booking-456'
        )
        checklist.id = 'checklist-999'
        
        # Test that serialized data has all fields needed by frontend
        booking_data = booking.to_dict()
        maintenance_data = maintenance.to_dict()
        checklist_data = checklist.to_dict()
        
        # Required for frontend operations
        required_booking_fields = ['id', 'user_id', 'user_name', 'start_date', 'end_date', 'is_cancelled']
        required_maintenance_fields = ['id', 'reporter_name', 'description', 'location', 'status', 'photo_urls']
        required_checklist_fields = ['id', 'user_name', 'photos', 'is_complete']
        
        for field in required_booking_fields:
            assert field in booking_data, f"Booking missing required field: {field}"
        
        for field in required_maintenance_fields:
            assert field in maintenance_data, f"Maintenance missing required field: {field}"
        
        for field in required_checklist_fields:
            assert field in checklist_data, f"Checklist missing required field: {field}"