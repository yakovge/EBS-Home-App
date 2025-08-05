"""
Validation utilities for request data and common fields.
Centralizes validation logic to avoid duplication.
"""

import re
from typing import Dict, Any, List, Optional
from datetime import date, datetime
from ..utils.exceptions import ValidationError


def validate_email(email: str) -> bool:
    """
    Validate email format.
    Returns True if valid, raises ValidationError if not.
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValidationError("Invalid email format")
    return True


def validate_date_range(start_date: date, end_date: date, max_days: int = 30) -> bool:
    """
    Validate date range for bookings.
    Checks that dates are valid and within allowed range.
    """
    if start_date >= end_date:
        raise ValidationError("End date must be after start date")
    
    # Allow bookings from today onwards (not just future dates)
    if start_date < date.today():
        raise ValidationError("Start date cannot be in the past")
    
    if (end_date - start_date).days > max_days:
        raise ValidationError(f"Date range cannot exceed {max_days} days")
    
    return True


def validate_request_data(data: Optional[Dict[str, Any]], 
                         schema: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate request data against a schema.
    Schema format:
    {
        'field_name': {
            'type': type,
            'required': bool,
            'min_length': int (for strings),
            'max_length': int (for strings),
            'min_value': number (for numbers),
            'max_value': number (for numbers),
            'choices': list (for enums),
            'schema': dict (for nested objects)
        }
    }
    """
    if data is None:
        raise ValidationError("No data provided")
    
    validated_data = {}
    errors = {}
    
    for field_name, rules in schema.items():
        value = data.get(field_name)
        
        # Check required fields
        if rules.get('required', False) and value is None:
            errors[field_name] = f"{field_name} is required"
            continue
        
        # Skip optional fields if not provided, or use default value
        if value is None:
            if 'default' in rules:
                validated_data[field_name] = rules['default']
            continue
        
        # Type validation
        expected_type = rules.get('type')
        if expected_type and not isinstance(value, expected_type):
            errors[field_name] = f"{field_name} must be of type {expected_type.__name__}"
            continue
        
        # String validation
        if expected_type == str:
            if 'min_length' in rules and len(value) < rules['min_length']:
                errors[field_name] = f"{field_name} must be at least {rules['min_length']} characters"
                continue
            if 'max_length' in rules and len(value) > rules['max_length']:
                errors[field_name] = f"{field_name} must not exceed {rules['max_length']} characters"
                continue
        
        # Number validation
        if expected_type in (int, float):
            if 'min_value' in rules and value < rules['min_value']:
                errors[field_name] = f"{field_name} must be at least {rules['min_value']}"
                continue
            if 'max_value' in rules and value > rules['max_value']:
                errors[field_name] = f"{field_name} must not exceed {rules['max_value']}"
                continue
        
        # Enum validation
        if 'choices' in rules and value not in rules['choices']:
            errors[field_name] = f"{field_name} must be one of: {', '.join(rules['choices'])}"
            continue
        
        # Nested object validation
        if 'schema' in rules and isinstance(value, dict):
            try:
                validated_data[field_name] = validate_request_data(value, rules['schema'])
                continue
            except ValidationError as e:
                errors[field_name] = str(e)
                continue
        
        validated_data[field_name] = value
    
    if errors:
        raise ValidationError("Validation failed", details=errors)
    
    return validated_data


def validate_photo_data(photos: List[Dict[str, Any]], 
                       required_types: Dict[str, int]) -> bool:
    """
    Validate photo data for exit checklist.
    Ensures all required photo types and counts are present.
    """
    photo_counts = {}
    
    for photo in photos:
        if 'photo_type' not in photo or 'photo_url' not in photo or 'notes' not in photo:
            raise ValidationError("Each photo must have photo_type, photo_url, and notes")
        
        photo_type = photo['photo_type']
        if photo_type not in required_types:
            raise ValidationError(f"Invalid photo type: {photo_type}")
        
        if len(photo['notes']) < 5:
            raise ValidationError(f"Photo notes must be at least 5 characters for {photo_type}")
        
        photo_counts[photo_type] = photo_counts.get(photo_type, 0) + 1
    
    # Check all required types have correct count
    for photo_type, required_count in required_types.items():
        actual_count = photo_counts.get(photo_type, 0)
        if actual_count < required_count:
            raise ValidationError(
                f"Missing {required_count - actual_count} {photo_type} photo(s)"
            )
    
    return True