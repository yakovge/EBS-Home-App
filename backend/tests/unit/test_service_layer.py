"""
Unit tests for service layer.
Tests business logic, validation, and service interactions.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import date, datetime
from src.services.maintenance_service import MaintenanceService
from src.services.booking_service import BookingService
from src.models.user import User
from src.models.maintenance import MaintenanceRequest, MaintenanceStatus
from src.models.booking import Booking
from src.utils.exceptions import ConflictError


class TestMaintenanceService:
    """Test MaintenanceService business logic."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Mock the repository classes before they are instantiated
        self.maintenance_repo_mock = Mock()
        self.user_repo_mock = Mock()
        
        with patch('src.services.maintenance_service.MaintenanceRepository', return_value=self.maintenance_repo_mock), \
             patch('src.services.maintenance_service.UserRepository', return_value=self.user_repo_mock):
            self.service = MaintenanceService()
            self.service.maintenance_repository = self.maintenance_repo_mock
            self.service.user_repository = self.user_repo_mock
        
    def test_create_maintenance_request_success(self):
        """Test successful maintenance request creation."""
        # Setup mocks
        mock_user = User('test@example.com', 'Test User', 'family_member', 'en', 'user-123')
        self.service.user_repository.get_by_id.return_value = mock_user
        self.service.maintenance_repository.create_maintenance_request.return_value = 'request-id-123'
        
        # Execute
        result = self.service.create_maintenance_request(
            user_id='user-123',
            description='Water leak in bathroom sink',
            location='Bathroom',
            photo_urls=['http://example.com/photo1.jpg', 'http://example.com/photo2.jpg']
        )
        
        # Verify
        assert result == 'request-id-123'
        
        # Verify repository was called with correct data
        self.service.maintenance_repository.create_maintenance_request.assert_called_once()
        call_args = self.service.maintenance_repository.create_maintenance_request.call_args[0][0]
        
        assert call_args['reporter_id'] == 'user-123'
        assert call_args['reporter_name'] == 'Test User'
        assert call_args['description'] == 'Water leak in bathroom sink'
        assert call_args['location'] == 'Bathroom'
        assert call_args['photo_urls'] == ['http://example.com/photo1.jpg', 'http://example.com/photo2.jpg']
        assert call_args['status'] == 'pending'
        assert call_args['maintenance_notified'] == False
        assert call_args['yaffa_notified'] == False
        
    def test_create_maintenance_request_user_not_found(self):
        """Test maintenance request creation when user doesn't exist."""
        # Setup mocks
        self.service.user_repository.get_by_id.return_value = None
        
        # Execute & Verify
        with pytest.raises(ValueError, match="Failed to validate user"):
            self.service.create_maintenance_request(
                user_id='user-123',
                description='Test description',
                location='Kitchen',
                photo_urls=['http://example.com/photo.jpg']
            )
            
        # Verify repository was not called
        self.service.maintenance_repository.create_maintenance_request.assert_not_called()
        
    def test_create_maintenance_request_without_photos(self):
        """Test successful maintenance request creation without photos."""
        # Setup mocks
        mock_user = User('test@example.com', 'Test User', 'family_member', 'en', 'user-123')
        self.service.user_repository.get_by_id.return_value = mock_user
        self.service.maintenance_repository.create_maintenance_request.return_value = 'request-id-456'
        
        # Execute with empty photo_urls
        result = self.service.create_maintenance_request(
            user_id='user-123',
            description='Water leak in bathroom sink needs fixing',
            location='Bathroom',
            photo_urls=[]
        )
        
        # Verify
        assert result == 'request-id-456'
        
        # Verify repository was called with correct data (empty photos)
        self.service.maintenance_repository.create_maintenance_request.assert_called_once()
        call_args = self.service.maintenance_repository.create_maintenance_request.call_args[0][0]
        
        assert call_args['reporter_id'] == 'user-123'
        assert call_args['reporter_name'] == 'Test User'
        assert call_args['description'] == 'Water leak in bathroom sink needs fixing'
        assert call_args['location'] == 'Bathroom'
        assert call_args['photo_urls'] == []
        assert call_args['status'] == 'pending'
        assert call_args['maintenance_notified'] == False
        assert call_args['yaffa_notified'] == False
        
    @pytest.mark.parametrize("user_id,description,location,photo_urls,expected_error", [
        ('', 'Valid description here', 'Kitchen', ['http://example.com/photo.jpg'], "User ID is required"),
        ('user-123', 'Short', 'Kitchen', ['http://example.com/photo.jpg'], "Description must be at least 10 characters long"),
        ('user-123', 'Valid description here', 'K', ['http://example.com/photo.jpg'], "Location must be at least 2 characters long"),
    ])
    def test_create_maintenance_request_validation_errors(self, user_id, description, location, photo_urls, expected_error):
        """Test various validation errors for maintenance request creation."""
        with pytest.raises(ValueError, match=expected_error):
            self.service.create_maintenance_request(
                user_id=user_id,
                description=description,
                location=location,
                photo_urls=photo_urls
            )
    
    def test_create_maintenance_request_repository_error(self):
        """Test handling of repository errors."""
        # Setup mocks
        mock_user = User('test@example.com', 'Test User', 'family_member', 'en', 'user-123')
        self.service.user_repository.get_by_id.return_value = mock_user
        self.service.maintenance_repository.create_maintenance_request.side_effect = Exception("Database error")
        
        # Execute & Verify
        with pytest.raises(Exception, match="Failed to create maintenance request"):
            self.service.create_maintenance_request(
                user_id='user-123',
                description='Valid description here',
                location='Kitchen',
                photo_urls=['http://example.com/photo.jpg']
            )


class TestBookingService:
    """Test BookingService business logic."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Mock the repository classes before they are instantiated
        self.booking_repo_mock = Mock()
        self.user_repo_mock = Mock()
        
        with patch('src.services.booking_service.BookingRepository', return_value=self.booking_repo_mock), \
             patch('src.services.booking_service.UserRepository', return_value=self.user_repo_mock):
            self.service = BookingService()
            self.service.booking_repository = self.booking_repo_mock
            self.service.user_repository = self.user_repo_mock
        
    def test_create_booking_success(self):
        """Test successful booking creation."""
        # Setup mocks
        mock_user = User('test@example.com', 'Test User', 'family_member', 'en', 'user-123')
        self.service.user_repository.get_by_id.return_value = mock_user
        self.service.booking_repository.get_conflicting_bookings.return_value = []
        self.service.booking_repository.create_booking.return_value = 'booking-id-123'
        
        # Execute (future date)
        future_start = date(2025, 12, 15).isoformat()
        future_end = date(2025, 12, 17).isoformat()
        
        result = self.service.create_booking(
            user_id='user-123',
            start_date=future_start,
            end_date=future_end,
            notes='Weekend getaway'
        )
        
        # Verify
        assert result == 'booking-id-123'
        
        # Verify repository was called with correct data
        self.service.booking_repository.create_booking.assert_called_once()
        call_args = self.service.booking_repository.create_booking.call_args[0][0]
        
        assert call_args['user_id'] == 'user-123'
        assert call_args['user_name'] == 'Test User'
        assert call_args['start_date'] == future_start
        assert call_args['end_date'] == future_end
        assert call_args['notes'] == 'Weekend getaway'
        
    def test_create_booking_conflict_detection(self):
        """Test booking conflict detection."""
        # Setup mocks
        mock_user = User('test@example.com', 'Test User', 'family_member', 'en', 'user-123')
        self.service.user_repository.get_by_id.return_value = mock_user
        
        # Mock conflicting booking
        conflicting_booking = Booking(
            user_id='user-456',
            user_name='Other User',
            start_date=date(2025, 12, 14),
            end_date=date(2025, 12, 18),
            notes='Existing booking'
        )
        self.service.booking_repository.get_conflicting_bookings.return_value = [conflicting_booking]
        
        # Execute & Verify
        with pytest.raises(ConflictError, match="Booking conflicts with existing bookings: Other User \\(2025-12-14 - 2025-12-18\\)"):
            self.service.create_booking(
                user_id='user-123',
                start_date='2025-12-15',
                end_date='2025-12-17',
                notes='Conflicting booking'
            )
            
        # Verify create_booking was not called
        self.service.booking_repository.create_booking.assert_not_called()
    
    @pytest.mark.parametrize("user_id,start_date,end_date,expected_error", [
        ('', '2025-12-15', '2025-12-17', "User ID is required"),
        ('user-123', 'invalid-date', '2025-12-17', "Invalid date format. Use YYYY-MM-DD"),
        ('user-123', '2025-12-17', '2025-12-15', "End date must be after start date"),
        ('user-123', '2020-01-01', '2020-01-03', "Cannot create bookings for past dates"),
        ('user-123', '2025-12-01', '2026-01-05', "Booking duration cannot exceed 30 days"),
    ])
    def test_create_booking_validation_errors(self, user_id, start_date, end_date, expected_error):
        """Test various validation errors for booking creation."""
        with pytest.raises(ValueError, match=expected_error):
            self.service.create_booking(
                user_id=user_id,
                start_date=start_date,
                end_date=end_date
            )
    
    def test_create_booking_user_not_found(self):
        """Test booking creation when user doesn't exist."""
        # Setup mocks
        self.service.user_repository.get_by_id.return_value = None
        
        # Execute & Verify
        with pytest.raises(ValueError, match="Failed to validate user"):
            self.service.create_booking(
                user_id='user-123',
                start_date='2025-12-15',
                end_date='2025-12-17'
            )
    
    def test_create_booking_repository_error(self):
        """Test handling of repository errors."""
        # Setup mocks
        mock_user = User('test@example.com', 'Test User', 'family_member', 'en', 'user-123')
        self.service.user_repository.get_by_id.return_value = mock_user
        self.service.booking_repository.get_conflicting_bookings.side_effect = Exception("Database error")
        
        # Execute & Verify
        with pytest.raises(Exception, match="Failed to check booking availability"):
            self.service.create_booking(
                user_id='user-123',
                start_date='2025-12-15',
                end_date='2025-12-17'
            )


class TestServiceErrorHandling:
    """Test error handling across service layer."""
    
    def test_maintenance_service_user_repository_error(self):
        """Test handling of user repository errors in maintenance service."""
        maintenance_repo_mock = Mock()
        user_repo_mock = Mock()
        user_repo_mock.get_by_id.side_effect = Exception("User database error")
        
        with patch('src.services.maintenance_service.MaintenanceRepository', return_value=maintenance_repo_mock), \
             patch('src.services.maintenance_service.UserRepository', return_value=user_repo_mock):
            service = MaintenanceService()
        
            with pytest.raises(ValueError, match="Failed to validate user"):
                service.create_maintenance_request(
                    user_id='user-123',
                    description='Valid description here',
                    location='Kitchen',
                    photo_urls=['http://example.com/photo.jpg']
                )
    
    def test_booking_service_conflict_check_error(self):
        """Test handling of conflict check errors in booking service."""
        booking_repo_mock = Mock()
        user_repo_mock = Mock()
        
        mock_user = User('test@example.com', 'Test User', 'family_member', 'en', 'user-123')
        user_repo_mock.get_by_id.return_value = mock_user
        booking_repo_mock.get_conflicting_bookings.side_effect = Exception("Conflict check failed")
        
        with patch('src.services.booking_service.BookingRepository', return_value=booking_repo_mock), \
             patch('src.services.booking_service.UserRepository', return_value=user_repo_mock):
            service = BookingService()
            
            with pytest.raises(Exception, match="Failed to check booking availability"):
                service.create_booking(
                    user_id='user-123',
                    start_date='2025-12-15',
                    end_date='2025-12-17'
                )