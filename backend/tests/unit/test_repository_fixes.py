"""
Unit tests specifically for recent repository fixes.
Tests the MaintenanceStatus import fix and other critical repository changes.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import date, datetime, timedelta

from src.models.maintenance import MaintenanceRequest, MaintenanceStatus
from src.models.booking import Booking
from src.models.checklist import ExitChecklist, ChecklistPhoto, PhotoType


class TestMaintenanceStatusImportFix:
    """Test that MaintenanceStatus enum is properly imported and accessible."""
    
    def test_maintenance_status_import_in_repository_module(self):
        """Test that MaintenanceStatus can be imported in repository context."""
        # This should not raise ImportError after our fix
        from src.repositories.maintenance_repository import MaintenanceRepository
        from src.models.maintenance import MaintenanceStatus
        
        # Test that the enum values are accessible
        assert MaintenanceStatus.PENDING is not None
        assert MaintenanceStatus.IN_PROGRESS is not None
        assert MaintenanceStatus.COMPLETED is not None
        
    def test_maintenance_request_with_status_enum(self):
        """Test that MaintenanceRequest can use MaintenanceStatus enum properly."""
        request = MaintenanceRequest(
            reporter_id='user-123',
            reporter_name='Test User',
            description='This is a valid maintenance description',
            location='Kitchen',
            photo_urls=[]
        )
        
        # Default status should be PENDING
        assert request.status == MaintenanceStatus.PENDING
        
        # Should be able to change status using enum
        request.assign_to('maintenance-user', 'Maintenance Person')
        assert request.status == MaintenanceStatus.IN_PROGRESS
        
        request.complete('Fixed successfully')
        assert request.status == MaintenanceStatus.COMPLETED


class TestPhotosOptionalFix:
    """Test that photos are now optional in maintenance requests and checklists."""
    
    def test_maintenance_request_without_photos_validation(self):
        """Test that maintenance request validates without photos."""
        request = MaintenanceRequest(
            reporter_id='user-123',
            reporter_name='Test User',
            description='This is a valid maintenance description without photos',
            location='Kitchen',
            photo_urls=[]  # Empty photo list should be valid
        )
        
        # Should validate successfully without photos
        assert request.validate() is True
        
    def test_maintenance_request_with_photos_validation(self):
        """Test that maintenance request still works with photos."""
        request = MaintenanceRequest(
            reporter_id='user-123',
            reporter_name='Test User',
            description='This is a valid maintenance description with photos',
            location='Kitchen',
            photo_urls=['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']
        )
        
        # Should validate successfully with photos
        assert request.validate() is True
        
    def test_checklist_text_only_entries(self):
        """Test that checklist accepts text-only entries without photos."""
        checklist = ExitChecklist(
            user_id='user-123',
            user_name='Test User',
            booking_id='booking-456'  
        )
        
        # Add text-only entries for all required categories
        text_entries = [
            ChecklistPhoto(PhotoType.REFRIGERATOR, 'Refrigerator is clean and empty'),
            ChecklistPhoto(PhotoType.FREEZER, 'Freezer is defrosted and clean'),
            ChecklistPhoto(PhotoType.CLOSET, 'All closets are organized and tidy')
        ]
        
        for entry in text_entries:
            checklist.add_photo(entry)
        
        # Should validate successfully with text-only entries
        assert checklist.validate() is True
        
        # Should be able to submit
        checklist.submit()
        assert checklist.is_complete is True


class TestBookingDateHandlingFix:
    """Test that booking date handling works properly."""
    
    def test_booking_creation_with_proper_dates(self):
        """Test booking creation with proper date handling."""
        start_date = date.today() + timedelta(days=1)
        end_date = date.today() + timedelta(days=3)
        
        booking = Booking(
            user_id='user-123',
            user_name='Test User',
            start_date=start_date,
            end_date=end_date,
            notes='Family vacation'
        )
        
        # Should validate successfully
        assert booking.validate() is True
        assert booking.start_date == start_date
        assert booking.end_date == end_date
        
    def test_booking_date_validation_errors(self):
        """Test that booking date validation still catches errors."""
        # End date before start date
        start_date = date.today() + timedelta(days=3)
        end_date = date.today() + timedelta(days=1)
        
        booking = Booking(
            user_id='user-123',
            user_name='Test User',
            start_date=start_date,
            end_date=end_date
        )
        
        with pytest.raises(ValueError, match="End date must be after start date"):
            booking.validate()
        
    def test_booking_past_date_validation(self):
        """Test that booking validation prevents past dates."""
        past_date = date.today() - timedelta(days=1)  
        future_date = date.today() + timedelta(days=1)
        
        booking = Booking(
            user_id='user-123',
            user_name='Test User',
            start_date=past_date,
            end_date=future_date
        )
        
        with pytest.raises(ValueError, match="Cannot create booking in the past"):
            booking.validate()


class TestChecklistOptionalBookingFix:
    """Test that checklists can be created without booking IDs."""
    
    def test_checklist_creation_without_booking(self):
        """Test creating checklist without booking_id (standalone checklist)."""
        checklist = ExitChecklist(
            user_id='user-123',
            user_name='Test User',
            booking_id=''  # Empty booking ID should be allowed
        )
        
        assert checklist.user_id == 'user-123'
        assert checklist.booking_id == ''
        assert checklist.is_complete is False
        
    def test_checklist_creation_with_booking(self):
        """Test creating checklist with booking_id (normal case)."""
        checklist = ExitChecklist(
            user_id='user-123',
            user_name='Test User',
            booking_id='booking-456'
        )
        
        assert checklist.user_id == 'user-123'
        assert checklist.booking_id == 'booking-456'
        assert checklist.is_complete is False


class TestValidatorDefaultValuesFix:
    """Test that validator supports default values in schema."""
    
    def test_validator_with_default_values(self):
        """Test validator handling of default values in schema."""
        from src.utils.validators import validate_request_data
        
        # Schema with default values (using actual Python types)
        schema = {
            'name': {'type': str, 'required': True},
            'role': {'type': str, 'default': 'family_member'},
            'is_active': {'type': bool, 'default': True}
        }
        
        # Data missing optional fields with defaults
        data = {
            'name': 'Test User'
            # role and is_active are missing but have defaults
        }
        
        result = validate_request_data(data, schema)
        
        # Should include default values
        assert result['name'] == 'Test User'
        assert result['role'] == 'family_member'
        assert result['is_active'] is True
        
    def test_validator_explicit_values_override_defaults(self):
        """Test that explicit values override defaults in validator."""
        from src.utils.validators import validate_request_data
        
        schema = {
            'name': {'type': str, 'required': True},
            'role': {'type': str, 'default': 'family_member'},
            'is_active': {'type': bool, 'default': True}
        }
        
        # Provide explicit values
        data = {
            'name': 'Test User',
            'role': 'admin',  # Override default
            'is_active': False  # Override default
        }
        
        result = validate_request_data(data, schema)
        
        # Should use provided values, not defaults
        assert result['name'] == 'Test User'
        assert result['role'] == 'admin'  # Not default
        assert result['is_active'] is False  # Not default