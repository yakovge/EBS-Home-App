"""
Unit tests for data models.
Tests model validation, serialization, and business logic.
"""

import pytest
from datetime import date, datetime, timedelta

from src.models.user import User, UserDevice
from src.models.maintenance import MaintenanceRequest, MaintenanceStatus
from src.models.booking import Booking
from src.models.checklist import ExitChecklist, ChecklistPhoto, PhotoType


class TestUser:
    """Test cases for User model."""
    
    def test_user_creation(self):
        """Test creating a user with valid data."""
        user = User(
            email="test@example.com",
            name="Test User",
            role="family_member"
        )
        
        assert user.email == "test@example.com"
        assert user.name == "Test User"
        assert user.role == "family_member"
        assert user.preferred_language == "en"
        assert user.is_active is True
        assert user.is_yaffa is False
        assert user.is_maintenance_person is False
    
    def test_user_validation_invalid_email(self):
        """Test user validation fails with invalid email."""
        user = User(
            email="invalid-email",
            name="Test User"
        )
        
        with pytest.raises(ValueError, match="Invalid email address"):
            user.validate()
    
    def test_user_validation_invalid_name(self):
        """Test user validation fails with invalid name."""
        user = User(
            email="test@example.com",
            name="T"  # Too short
        )
        
        with pytest.raises(ValueError, match="Name must be at least 2 characters"):
            user.validate()
    
    def test_user_validation_invalid_role(self):
        """Test user validation fails with invalid role."""
        user = User(
            email="test@example.com",
            name="Test User",
            role="invalid_role"
        )
        
        with pytest.raises(ValueError, match="Invalid role"):
            user.validate()
    
    def test_user_can_login_from_device_no_current_device(self):
        """Test user can login when no current device is set."""
        user = User(email="test@example.com", name="Test User")
        
        assert user.can_login_from_device("any-device-id") is True
    
    def test_user_can_login_from_same_device(self):
        """Test user can login from same device."""
        user = User(email="test@example.com", name="Test User")
        device = UserDevice("device-123", "Test Device", "Windows")
        user.set_device(device)
        
        assert user.can_login_from_device("device-123") is True
    
    def test_user_cannot_login_from_different_device(self):
        """Test user cannot login from different device."""
        user = User(email="test@example.com", name="Test User")
        device = UserDevice("device-123", "Test Device", "Windows")
        user.set_device(device)
        
        assert user.can_login_from_device("different-device") is False
    
    def test_user_to_dict(self):
        """Test user serialization to dictionary."""
        user = User(
            email="test@example.com",
            name="Test User",
            role="admin",
            id="user-123"
        )
        user.is_yaffa = True
        
        data = user.to_dict()
        
        assert data['email'] == "test@example.com"
        assert data['name'] == "Test User"
        assert data['role'] == "admin"
        assert data['is_yaffa'] is True
        assert data['id'] == "user-123"  # ID is included in to_dict
    
    def test_user_from_dict(self):
        """Test user deserialization from dictionary."""
        data = {
            'email': "test@example.com",
            'name': "Test User",
            'role': "maintenance",
            'is_maintenance_person': True,
            'id': "user-123"
        }
        
        user = User.from_dict(data)
        
        assert user.email == "test@example.com"
        assert user.name == "Test User"
        assert user.role == "maintenance"
        assert user.is_maintenance_person is True


class TestMaintenanceRequest:
    """Test cases for MaintenanceRequest model."""
    
    def test_maintenance_request_creation(self):
        """Test creating a maintenance request."""
        request = MaintenanceRequest(
            reporter_id="user-123",
            reporter_name="Test User",
            description="Broken faucet in kitchen",
            location="Kitchen",
            photo_urls=["https://example.com/photo.jpg"]
        )
        
        assert request.reporter_id == "user-123"
        assert request.description == "Broken faucet in kitchen"
        assert request.status == MaintenanceStatus.PENDING
        assert request.assigned_to_id is None
        assert request.resolution_date is None
    
    def test_maintenance_request_validation_short_description(self):
        """Test validation fails with short description."""
        request = MaintenanceRequest(
            reporter_id="user-123",
            reporter_name="Test User",
            description="Short",  # Too short
            location="Kitchen",
            photo_urls=["https://example.com/photo.jpg"]
        )
        
        with pytest.raises(ValueError, match="Description must be at least 10 characters"):
            request.validate()
    
    def test_maintenance_request_validation_no_photos(self):
        """Test validation fails with no photos."""
        request = MaintenanceRequest(
            reporter_id="user-123",
            reporter_name="Test User",
            description="This is a valid description",
            location="Kitchen",
            photo_urls=[]  # No photos
        )
        
        with pytest.raises(ValueError, match="At least one photo is required"):
            request.validate()
    
    def test_maintenance_request_assign(self):
        """Test assigning maintenance request to user."""
        request = MaintenanceRequest(
            reporter_id="user-123",
            reporter_name="Test User",
            description="This is a valid description",
            location="Kitchen",
            photo_urls=["https://example.com/photo.jpg"]
        )
        
        request.assign_to("maintenance-user", "Maintenance Person")
        
        assert request.assigned_to_id == "maintenance-user"
        assert request.assigned_to_name == "Maintenance Person"
        assert request.status == MaintenanceStatus.IN_PROGRESS
    
    def test_maintenance_request_complete(self):
        """Test completing maintenance request."""
        request = MaintenanceRequest(
            reporter_id="user-123",
            reporter_name="Test User",
            description="This is a valid description",
            location="Kitchen",
            photo_urls=["https://example.com/photo.jpg"]
        )
        
        request.complete("Fixed the faucet successfully")
        
        assert request.status == MaintenanceStatus.COMPLETED
        assert request.resolution_notes == "Fixed the faucet successfully"
        assert request.resolution_date is not None


class TestBooking:
    """Test cases for Booking model."""
    
    def test_booking_creation(self):
        """Test creating a booking."""
        start_date = date.today() + timedelta(days=1)
        end_date = date.today() + timedelta(days=3)
        
        booking = Booking(
            user_id="user-123",
            user_name="Test User",
            start_date=start_date,
            end_date=end_date,
            notes="Family vacation"
        )
        
        assert booking.user_id == "user-123"
        assert booking.start_date == start_date
        assert booking.end_date == end_date
        assert booking.is_cancelled is False
        assert booking.exit_checklist_completed is False
    
    def test_booking_validation_end_before_start(self):
        """Test validation fails when end date is before start date."""
        start_date = date.today() + timedelta(days=3)
        end_date = date.today() + timedelta(days=1)  # Before start
        
        booking = Booking(
            user_id="user-123",
            user_name="Test User",
            start_date=start_date,
            end_date=end_date
        )
        
        with pytest.raises(ValueError, match="End date must be after start date"):
            booking.validate()
    
    def test_booking_validation_past_date(self):
        """Test validation fails with past date."""
        start_date = date.today() - timedelta(days=1)  # Past date
        end_date = date.today() + timedelta(days=1)
        
        booking = Booking(
            user_id="user-123",
            user_name="Test User",
            start_date=start_date,
            end_date=end_date
        )
        
        with pytest.raises(ValueError, match="Cannot create booking in the past"):
            booking.validate()
    
    def test_booking_overlaps_with(self):
        """Test booking overlap detection."""
        # First booking: days 1-3
        booking1 = Booking(
            user_id="user-123",
            user_name="User 1",
            start_date=date.today() + timedelta(days=1),
            end_date=date.today() + timedelta(days=3)
        )
        
        # Overlapping booking: days 2-4
        booking2 = Booking(
            user_id="user-456",
            user_name="User 2",
            start_date=date.today() + timedelta(days=2),
            end_date=date.today() + timedelta(days=4)
        )
        
        # Non-overlapping booking: days 4-6
        booking3 = Booking(
            user_id="user-789",
            user_name="User 3",
            start_date=date.today() + timedelta(days=4),
            end_date=date.today() + timedelta(days=6)
        )
        
        assert booking1.overlaps_with(booking2) is True
        assert booking1.overlaps_with(booking3) is False
    
    def test_booking_is_ending_today(self):
        """Test checking if booking ends today."""
        booking = Booking(
            user_id="user-123",
            user_name="Test User",
            start_date=date.today() - timedelta(days=1),
            end_date=date.today()  # Ends today
        )
        
        assert booking.is_ending_today() is True


class TestExitChecklist:
    """Test cases for ExitChecklist model."""
    
    def test_checklist_creation(self):
        """Test creating an exit checklist."""
        checklist = ExitChecklist(
            user_id="user-123",
            user_name="Test User",
            booking_id="booking-123"
        )
        
        assert checklist.user_id == "user-123"
        assert checklist.booking_id == "booking-123"
        assert checklist.is_complete is False
        assert len(checklist.photos) == 0
    
    def test_checklist_add_photo(self):
        """Test adding photos to checklist."""
        checklist = ExitChecklist(
            user_id="user-123",
            user_name="Test User",
            booking_id="booking-123"
        )
        
        photo = ChecklistPhoto(
            PhotoType.REFRIGERATOR,
            "https://example.com/fridge.jpg",
            "Fridge is clean and organized"
        )
        
        checklist.add_photo(photo)
        
        assert len(checklist.photos) == 1
        assert checklist.photos[0].photo_type == PhotoType.REFRIGERATOR
    
    def test_checklist_validation_missing_photos(self):
        """Test validation fails with missing required photos."""
        checklist = ExitChecklist(
            user_id="user-123",
            user_name="Test User",
            booking_id="booking-123"
        )
        
        # Add only one refrigerator photo (need 2)
        photo = ChecklistPhoto(
            PhotoType.REFRIGERATOR,
            "https://example.com/fridge.jpg",
            "Fridge photo"
        )
        checklist.add_photo(photo)
        
        with pytest.raises(ValueError, match="Missing 1 refrigerator photo"):
            checklist.validate()
    
    def test_checklist_validation_short_notes(self):
        """Test validation fails with short photo notes."""
        checklist = ExitChecklist(
            user_id="user-123",
            user_name="Test User",
            booking_id="booking-123"
        )
        
        photo = ChecklistPhoto(
            PhotoType.REFRIGERATOR,
            "https://example.com/fridge.jpg",
            "OK"  # Too short
        )
        checklist.add_photo(photo)
        
        with pytest.raises(ValueError, match="Photo notes must be at least 5 characters"):
            checklist.validate()
    
    def test_checklist_submit_success(self, sample_checklist):
        """Test successful checklist submission."""
        sample_checklist.submit()
        
        assert sample_checklist.is_complete is True
        assert sample_checklist.submitted_at is not None
    
    def test_checklist_get_photos_by_type(self, sample_checklist):
        """Test getting photos by type."""
        fridge_photos = sample_checklist.get_photos_by_type(PhotoType.REFRIGERATOR)
        closet_photos = sample_checklist.get_photos_by_type(PhotoType.CLOSET)
        
        assert len(fridge_photos) == 2
        assert len(closet_photos) == 3