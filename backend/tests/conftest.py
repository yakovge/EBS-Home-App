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
    # Mock Firebase components before importing
    with patch('src.utils.firebase_config.initialize_firebase'), \
         patch('src.utils.firebase_config.get_firestore_client') as mock_firestore, \
         patch('firebase_admin.credentials.Certificate'), \
         patch('firebase_admin.initialize_app'):
        
        # Configure mock Firestore client
        mock_client = Mock()
        mock_firestore.return_value = mock_client
        
        # Import and create the app
        from app import create_app
        app = create_app()
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
    
    # Add entries for all required categories (photos are now optional)
    entries = [
        ChecklistPhoto(PhotoType.REFRIGERATOR, "Fridge contents noted and clean", "https://example.com/fridge1.jpg", 1),
        ChecklistPhoto(PhotoType.FREEZER, "Freezer contents noted and clean", "https://example.com/freezer1.jpg", 2),
        ChecklistPhoto(PhotoType.CLOSET, "All closets organized and clean", "https://example.com/closet1.jpg", 3),
    ]
    
    for entry in entries:
        checklist.add_photo(entry)
    
    return checklist


@pytest.fixture(autouse=True)
def mock_firebase_config():
    """Automatically mock Firebase configuration for all tests."""
    with patch('src.utils.firebase_config.initialize_firebase'), \
         patch('src.utils.firebase_config.get_firestore_client') as mock_firestore, \
         patch('firebase_admin.credentials.Certificate'), \
         patch('firebase_admin.initialize_app'), \
         patch('google.cloud.firestore_v1.Client'):
        
        # Configure mock Firestore client
        mock_client = Mock()
        mock_firestore.return_value = mock_client
        yield mock_client