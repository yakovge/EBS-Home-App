"""
Pytest configuration and shared fixtures for backend tests.
"""

import pytest
import os
from unittest.mock import Mock, patch
from flask import Flask

from src.models.user import User, UserDevice
from src.models.maintenance import MaintenanceRequest, MaintenanceStatus
from src.models.booking import Booking
from src.models.checklist import ExitChecklist, ChecklistPhoto, PhotoType


@pytest.fixture
def app():
    """Create and configure a test Flask application."""
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test-secret-key'
    return app


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture
def mock_firestore():
    """Mock Firestore client for testing."""
    with patch('src.utils.firebase_config.get_firestore_client') as mock:
        mock_client = Mock()
        mock.return_value = mock_client
        yield mock_client


@pytest.fixture
def sample_user():
    """Create a sample user for testing."""
    return User(
        email="test@example.com",
        name="Test User",
        role="family_member",
        preferred_language="en",
        id="test-user-id"
    )


@pytest.fixture
def sample_device():
    """Create a sample device for testing."""
    return UserDevice(
        device_id="test-device-123",
        device_name="Test Device",
        platform="Windows"
    )


@pytest.fixture
def sample_maintenance_request():
    """Create a sample maintenance request for testing."""
    return MaintenanceRequest(
        reporter_id="test-user-id",
        reporter_name="Test User",
        description="Test maintenance issue description",
        location="Kitchen",
        photo_urls=["https://example.com/photo1.jpg"],
        id="test-maintenance-id"
    )


@pytest.fixture
def sample_booking():
    """Create a sample booking for testing."""
    from datetime import date, timedelta
    
    return Booking(
        user_id="test-user-id",
        user_name="Test User",
        start_date=date.today() + timedelta(days=1),
        end_date=date.today() + timedelta(days=3),
        notes="Test booking notes",
        id="test-booking-id"
    )


@pytest.fixture
def sample_checklist():
    """Create a sample exit checklist for testing."""
    checklist = ExitChecklist(
        user_id="test-user-id",
        user_name="Test User",
        booking_id="test-booking-id",
        id="test-checklist-id"
    )
    
    # Add required photos
    photos = [
        ChecklistPhoto(PhotoType.REFRIGERATOR, "https://example.com/fridge1.jpg", "Fridge contents noted", 1),
        ChecklistPhoto(PhotoType.REFRIGERATOR, "https://example.com/fridge2.jpg", "Fridge clean", 2),
        ChecklistPhoto(PhotoType.FREEZER, "https://example.com/freezer1.jpg", "Freezer contents noted", 1),
        ChecklistPhoto(PhotoType.FREEZER, "https://example.com/freezer2.jpg", "Freezer clean", 2),
        ChecklistPhoto(PhotoType.CLOSET, "https://example.com/closet1.jpg", "Closet 1 organized", 1),
        ChecklistPhoto(PhotoType.CLOSET, "https://example.com/closet2.jpg", "Closet 2 organized", 2),
        ChecklistPhoto(PhotoType.CLOSET, "https://example.com/closet3.jpg", "Closet 3 organized", 3),
    ]
    
    for photo in photos:
        checklist.add_photo(photo)
    
    return checklist


@pytest.fixture(autouse=True)
def mock_firebase_config():
    """Automatically mock Firebase configuration for all tests."""
    with patch('src.utils.firebase_config.initialize_firebase'):
        yield