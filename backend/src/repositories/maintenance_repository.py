"""
Maintenance repository for handling maintenance request data operations.
Extends BaseRepository with maintenance-specific functionality.
"""

from typing import List, Optional
from datetime import datetime
from ..models.maintenance import MaintenanceRequest, MaintenanceStatus
from .base_repository import BaseRepository


class MaintenanceRepository(BaseRepository):
    """Repository for maintenance request operations."""
    
    def __init__(self):
        super().__init__('maintenance_requests', MaintenanceRequest)
    
    def create_maintenance_request(self, maintenance_data: dict) -> str:
        """
        Create a new maintenance request.
        
        Args:
            maintenance_data: Dictionary containing maintenance request data
            
        Returns:
            str: Document ID of the created request
        """
        # Create MaintenanceRequest model from dictionary
        maintenance_request = MaintenanceRequest(
            reporter_id=maintenance_data['reporter_id'],
            reporter_name=maintenance_data['reporter_name'],
            description=maintenance_data['description'],
            location=maintenance_data['location'],
            photo_urls=maintenance_data['photo_urls']
        )
        
        # Set additional fields
        maintenance_request.status = MaintenanceStatus.PENDING
        maintenance_request.maintenance_notified = maintenance_data.get('maintenance_notified', False)
        maintenance_request.yaffa_notified = maintenance_data.get('yaffa_notified', False)
        maintenance_request.created_at = datetime.utcnow()
        maintenance_request.updated_at = datetime.utcnow()
        
        return self.create(maintenance_request)
    
    def get_maintenance_requests(self, status: Optional[str] = None) -> List[MaintenanceRequest]:
        """
        Get maintenance requests with optional status filter.
        
        Args:
            status: Optional status filter
            
        Returns:
            List[MaintenanceRequest]: List of maintenance requests
        """
        query = self.collection
        
        if status:
            query = query.where('status', '==', status)
        
        docs = query.order_by('created_at', direction='DESCENDING').stream()
        results = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            results.append(MaintenanceRequest.from_dict(data))
        return results
    
    def get_maintenance_request_by_id(self, request_id: str) -> Optional[MaintenanceRequest]:
        """
        Get a maintenance request by ID.
        
        Args:
            request_id: ID of the maintenance request
            
        Returns:
            Optional[MaintenanceRequest]: Maintenance request or None
        """
        return self.get_by_id(request_id)
    
    def update_maintenance_request(self, request_id: str, update_data: dict) -> bool:
        """
        Update a maintenance request.
        
        Args:
            request_id: ID of the maintenance request
            update_data: Data to update
            
        Returns:
            bool: True if updated successfully
        """
        update_data['updated_at'] = datetime.utcnow()
        return self.update(request_id, update_data)
    
    def assign_maintenance_request(self, request_id: str, assigned_to_id: str, assigned_to_name: str) -> bool:
        """
        Assign a maintenance request to someone.
        
        Args:
            request_id: ID of the maintenance request
            assigned_to_id: ID of the person assigned
            assigned_to_name: Name of the person assigned
            
        Returns:
            bool: True if assigned successfully
        """
        update_data = {
            'assigned_to_id': assigned_to_id,
            'assigned_to_name': assigned_to_name,
            'status': 'in_progress',
            'updated_at': datetime.utcnow()
        }
        return self.update(request_id, update_data)
    
    def complete_maintenance_request(self, request_id: str, resolution_notes: str, 
                                   completed_by_id: str, completed_by_name: str) -> bool:
        """
        Mark a maintenance request as completed.
        
        Args:
            request_id: ID of the maintenance request
            resolution_notes: Notes about the resolution
            completed_by_id: ID of the user who marked it as complete
            completed_by_name: Name of the user who marked it as complete
            
        Returns:
            bool: True if completed successfully
        """
        update_data = {
            'status': 'completed',
            'resolution_notes': resolution_notes,
            'resolution_date': datetime.utcnow(),
            'completed_by_id': completed_by_id,
            'completed_by_name': completed_by_name,
            'updated_at': datetime.utcnow()
        }
        return self.update(request_id, update_data)
    
    def reopen_maintenance_request(self, request_id: str, reopen_reason: str, 
                                 reopened_by_id: str, reopened_by_name: str) -> bool:
        """
        Reopen a completed maintenance request.
        
        Args:
            request_id: ID of the maintenance request
            reopen_reason: Reason for reopening
            reopened_by_id: ID of the user who reopened it
            reopened_by_name: Name of the user who reopened it
            
        Returns:
            bool: True if reopened successfully
        """
        update_data = {
            'status': 'pending',
            'reopen_reason': reopen_reason,
            'reopened_by_id': reopened_by_id,
            'reopened_by_name': reopened_by_name,
            'reopened_date': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            # Clear completion data but keep history
            'resolution_date': None,
            'resolution_notes': None,
            'completed_by_id': None,
            'completed_by_name': None
        }
        return self.update(request_id, update_data) 