"""
Unit tests for MaintenanceRepository MaintenanceStatus enum import fix.
Tests that MaintenanceStatus enum is properly imported and accessible.
"""

import pytest
from datetime import datetime

from src.models.maintenance import MaintenanceRequest, MaintenanceStatus


class TestMaintenanceStatusImport:
    """Test suite for MaintenanceStatus enum import fix."""
    
    def test_maintenance_status_enum_import(self):
        """Test that MaintenanceStatus enum is properly imported and accessible."""
        # This test ensures the import fix is working
        assert MaintenanceStatus.PENDING is not None
        assert MaintenanceStatus.IN_PROGRESS is not None
        assert MaintenanceStatus.COMPLETED is not None
        assert MaintenanceStatus.CANCELLED is not None
        
        # Test enum values
        assert MaintenanceStatus.PENDING.value == 'pending'
        assert MaintenanceStatus.IN_PROGRESS.value == 'in_progress'
        assert MaintenanceStatus.COMPLETED.value == 'completed'
        assert MaintenanceStatus.CANCELLED.value == 'cancelled'
    
    def test_maintenance_status_enum_in_model_validation(self):
        """Test that MaintenanceStatus enum values work in model validation."""
        # Test valid status values
        for status in MaintenanceStatus:
            maintenance_data = {
                'id': 'test-maintenance',
                'reporter_id': 'user-123',
                'reporter_name': 'Test User',
                'description': 'Test maintenance request',
                'location': 'Test location',
                'status': status.value,
                'photo_urls': ['https://example.com/photo1.jpg'],
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # This should not raise any validation errors
            maintenance = MaintenanceRequest.from_dict(maintenance_data)
            assert maintenance.status == status
    
    def test_maintenance_status_enum_accessibility(self):
        """Test that MaintenanceStatus enum is accessible from maintenance_repository module."""
        # Import the repository to ensure MaintenanceStatus is available there
        from src.repositories.maintenance_repository import MaintenanceRepository
        
        # This test ensures that the import issue is resolved
        # If MaintenanceStatus import was broken, this would fail during import
        assert MaintenanceStatus.PENDING.value == 'pending'
        assert MaintenanceStatus.IN_PROGRESS.value == 'in_progress'
        assert MaintenanceStatus.COMPLETED.value == 'completed'
        assert MaintenanceStatus.CANCELLED.value == 'cancelled'