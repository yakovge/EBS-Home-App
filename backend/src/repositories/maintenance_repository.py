"""
Maintenance repository for handling maintenance request data operations.
Extends BaseRepository with maintenance-specific functionality.
"""

from typing import List, Optional
from datetime import datetime
from ..models.maintenance import MaintenanceRequest
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
        maintenance_request.created_at = datetime.utcnow().isoformat()
        maintenance_request.updated_at = datetime.utcnow().isoformat()
        
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
        return [MaintenanceRequest(**doc.to_dict()) for doc in docs]
    
    def get_maintenance_request_by_id(self, request_id: str) -> Optional[MaintenanceRequest]:
        """
        Get a maintenance request by ID.
        
        Args:
            request_id: ID of the maintenance request
            
        Returns:
            Optional[MaintenanceRequest]: Maintenance request or None
        """
        doc = self.get_by_id(request_id)
        if doc:
            return MaintenanceRequest(**doc)
        return None
    
    def update_maintenance_request(self, request_id: str, update_data: dict) -> bool:
        """
        Update a maintenance request.
        
        Args:
            request_id: ID of the maintenance request
            update_data: Data to update
            
        Returns:
            bool: True if updated successfully
        """
        update_data['updated_at'] = datetime.utcnow().isoformat()
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
            'updated_at': datetime.utcnow().isoformat()
        }
        return self.update(request_id, update_data)
    
    def complete_maintenance_request(self, request_id: str, resolution_notes: str) -> bool:
        """
        Mark a maintenance request as completed.
        
        Args:
            request_id: ID of the maintenance request
            resolution_notes: Notes about the resolution
            
        Returns:
            bool: True if completed successfully
        """
        update_data = {
            'status': 'completed',
            'resolution_notes': resolution_notes,
            'resolution_date': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        return self.update(request_id, update_data) 