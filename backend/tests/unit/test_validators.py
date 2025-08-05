"""
Unit tests for validation utilities.
Tests input validation and data sanitization functions.
"""

import pytest
from datetime import date, timedelta

from src.utils.validators import (
    validate_email,
    validate_date_range,
    validate_request_data,
    validate_photo_data
)
from src.utils.exceptions import ValidationError


class TestEmailValidation:
    """Test cases for email validation."""
    
    def test_validate_email_valid(self):
        """Test validation of valid email addresses."""
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "firstname+lastname@company.org",
            "user123@test-domain.com"
        ]
        
        for email in valid_emails:
            assert validate_email(email) is True
    
    def test_validate_email_invalid(self):
        """Test validation of invalid email addresses."""
        invalid_emails = [
            "invalid-email",
            "@domain.com",
            "user@",
            "user space@domain.com",
            "user@domain",
            ""
        ]
        
        for email in invalid_emails:
            with pytest.raises(ValidationError, match="Invalid email format"):
                validate_email(email)


class TestDateRangeValidation:
    """Test cases for date range validation."""
    
    def test_validate_date_range_valid(self):
        """Test validation of valid date ranges."""
        start_date = date.today() + timedelta(days=1)
        end_date = date.today() + timedelta(days=3)
        
        assert validate_date_range(start_date, end_date) is True
    
    def test_validate_date_range_end_before_start(self):
        """Test validation fails when end date is before start date."""
        start_date = date.today() + timedelta(days=3)
        end_date = date.today() + timedelta(days=1)
        
        with pytest.raises(ValidationError, match="End date must be after start date"):
            validate_date_range(start_date, end_date)
    
    def test_validate_date_range_past_start(self):
        """Test validation fails with past start date."""
        start_date = date.today() - timedelta(days=1)
        end_date = date.today() + timedelta(days=1)
        
        with pytest.raises(ValidationError, match="Start date cannot be in the past"):
            validate_date_range(start_date, end_date)
    
    def test_validate_date_range_too_long(self):
        """Test validation fails with date range too long."""
        start_date = date.today() + timedelta(days=1)
        end_date = date.today() + timedelta(days=35)  # More than 30 days
        
        with pytest.raises(ValidationError, match="Date range cannot exceed 30 days"):
            validate_date_range(start_date, end_date)
    
    def test_validate_date_range_custom_max_days(self):
        """Test validation with custom max days limit."""
        start_date = date.today() + timedelta(days=1)
        end_date = date.today() + timedelta(days=8)  # 7 days
        
        # Should pass with 10 day limit
        assert validate_date_range(start_date, end_date, max_days=10) is True
        
        # Should fail with 5 day limit
        with pytest.raises(ValidationError, match="Date range cannot exceed 5 days"):
            validate_date_range(start_date, end_date, max_days=5)


class TestRequestDataValidation:
    """Test cases for request data validation."""
    
    def test_validate_request_data_valid(self):
        """Test validation of valid request data."""
        data = {
            'name': 'John Doe',
            'email': 'john@example.com',
            'age': 25,
            'role': 'admin'
        }
        
        schema = {
            'name': {'type': str, 'required': True, 'min_length': 2},
            'email': {'type': str, 'required': True},
            'age': {'type': int, 'required': False, 'min_value': 18},
            'role': {'type': str, 'required': True, 'choices': ['admin', 'user']}
        }
        
        result = validate_request_data(data, schema)
        
        assert result['name'] == 'John Doe'
        assert result['email'] == 'john@example.com'
        assert result['age'] == 25
        assert result['role'] == 'admin'
    
    def test_validate_request_data_missing_required(self):
        """Test validation fails with missing required field."""
        data = {
            'name': 'John Doe'
            # Missing required email
        }
        
        schema = {
            'name': {'type': str, 'required': True},
            'email': {'type': str, 'required': True}
        }
        
        with pytest.raises(ValidationError, match="Validation failed"):
            validate_request_data(data, schema)
    
    def test_validate_request_data_wrong_type(self):
        """Test validation fails with wrong data type."""
        data = {
            'name': 'John Doe',
            'age': 'twenty-five'  # Should be int
        }
        
        schema = {
            'name': {'type': str, 'required': True},
            'age': {'type': int, 'required': True}
        }
        
        with pytest.raises(ValidationError, match="Validation failed"):
            validate_request_data(data, schema)
    
    def test_validate_request_data_string_length(self):
        """Test validation of string length constraints."""
        data = {
            'short_name': 'A',  # Too short
            'long_name': 'A' * 101  # Too long
        }
        
        schema = {
            'short_name': {'type': str, 'required': True, 'min_length': 2},
            'long_name': {'type': str, 'required': True, 'max_length': 100}
        }
        
        with pytest.raises(ValidationError, match="Validation failed"):
            validate_request_data(data, schema)
    
    def test_validate_request_data_number_range(self):
        """Test validation of number range constraints."""
        data = {
            'too_small': 5,   # Below minimum
            'too_large': 150  # Above maximum
        }
        
        schema = {
            'too_small': {'type': int, 'required': True, 'min_value': 10},
            'too_large': {'type': int, 'required': True, 'max_value': 100}
        }
        
        with pytest.raises(ValidationError, match="Validation failed"):
            validate_request_data(data, schema)
    
    def test_validate_request_data_choices(self):
        """Test validation of choice constraints."""
        data = {
            'invalid_choice': 'maybe'  # Not in choices
        }
        
        schema = {
            'invalid_choice': {'type': str, 'required': True, 'choices': ['yes', 'no']}
        }
        
        with pytest.raises(ValidationError, match="Validation failed"):
            validate_request_data(data, schema)
    
    def test_validate_request_data_nested_object(self):
        """Test validation of nested object data."""
        data = {
            'user': {
                'name': 'John Doe',
                'email': 'john@example.com'
            }
        }
        
        schema = {
            'user': {
                'type': dict,
                'required': True,
                'schema': {
                    'name': {'type': str, 'required': True},
                    'email': {'type': str, 'required': True}
                }
            }
        }
        
        result = validate_request_data(data, schema)
        
        assert result['user']['name'] == 'John Doe'
        assert result['user']['email'] == 'john@example.com'
    
    def test_validate_request_data_no_data(self):
        """Test validation fails with no data provided."""
        schema = {
            'name': {'type': str, 'required': True}
        }
        
        with pytest.raises(ValidationError, match="No data provided"):
            validate_request_data(None, schema)
    
    def test_validate_request_data_default_values(self):
        """Test validation with default values for missing fields."""
        schema = {
            'name': {'type': str, 'required': True},
            'tags': {'type': list, 'required': False, 'default': []},
            'count': {'type': int, 'required': False, 'default': 0}
        }
        
        # Test with missing optional fields - should use defaults
        data = {'name': 'test'}
        result = validate_request_data(data, schema)
        
        assert result['name'] == 'test'
        assert result['tags'] == []
        assert result['count'] == 0
        
        # Test with provided optional fields - should use provided values
        data = {'name': 'test', 'tags': ['tag1'], 'count': 5}
        result = validate_request_data(data, schema)
        
        assert result['name'] == 'test'
        assert result['tags'] == ['tag1']
        assert result['count'] == 5


class TestPhotoDataValidation:
    """Test cases for photo data validation."""
    
    def test_validate_photo_data_valid(self):
        """Test validation of valid photo data."""
        photos = [
            {
                'photo_type': 'refrigerator',
                'photo_url': 'https://example.com/fridge1.jpg',
                'notes': 'Fridge is clean and organized'
            },
            {
                'photo_type': 'refrigerator',
                'photo_url': 'https://example.com/fridge2.jpg',
                'notes': 'Fridge contents documented'
            },
            {
                'photo_type': 'freezer',
                'photo_url': 'https://example.com/freezer1.jpg',
                'notes': 'Freezer is defrosted and clean'
            },
            {
                'photo_type': 'freezer',
                'photo_url': 'https://example.com/freezer2.jpg',
                'notes': 'Freezer contents documented'
            }
        ]
        
        required_types = {
            'refrigerator': 2,
            'freezer': 2
        }
        
        assert validate_photo_data(photos, required_types) is True
    
    def test_validate_photo_data_missing_fields(self):
        """Test validation fails with missing photo fields."""
        photos = [
            {
                'photo_type': 'refrigerator',
                # Missing photo_url and notes
            }
        ]
        
        required_types = {'refrigerator': 1}
        
        with pytest.raises(ValidationError, match="Each photo must have photo_type, photo_url, and notes"):
            validate_photo_data(photos, required_types)
    
    def test_validate_photo_data_invalid_type(self):
        """Test validation fails with invalid photo type."""
        photos = [
            {
                'photo_type': 'invalid_type',
                'photo_url': 'https://example.com/photo.jpg',
                'notes': 'Valid notes here'
            }
        ]
        
        required_types = {'refrigerator': 1}
        
        with pytest.raises(ValidationError, match="Invalid photo type: invalid_type"):
            validate_photo_data(photos, required_types)
    
    def test_validate_photo_data_short_notes(self):
        """Test validation fails with short photo notes."""
        photos = [
            {
                'photo_type': 'refrigerator',
                'photo_url': 'https://example.com/photo.jpg',
                'notes': 'OK'  # Too short
            }
        ]
        
        required_types = {'refrigerator': 1}
        
        with pytest.raises(ValidationError, match="Photo notes must be at least 5 characters"):
            validate_photo_data(photos, required_types)
    
    def test_validate_photo_data_insufficient_count(self):
        """Test validation fails with insufficient photo count."""
        photos = [
            {
                'photo_type': 'refrigerator',
                'photo_url': 'https://example.com/photo.jpg',
                'notes': 'Valid notes here'
            }
            # Need 2 refrigerator photos but only have 1
        ]
        
        required_types = {'refrigerator': 2}
        
        with pytest.raises(ValidationError, match="Missing 1 refrigerator photo"):
            validate_photo_data(photos, required_types)