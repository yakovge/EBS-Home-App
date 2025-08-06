"""
Maintenance request model for tracking house maintenance issues.
Follows single responsibility principle for maintenance-related data.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum
from .base import BaseModel


class MaintenanceStatus(Enum):
    """Enum for maintenance request statuses."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MaintenanceRequest(BaseModel):
    """
    Represents a maintenance request for the vacation house.
    Handles issue reporting, tracking, and resolution.
    """
    
    def __init__(self, 
                 reporter_id: str,
                 reporter_name: str,
                 description: str,
                 location: str,
                 photo_urls: List[str],
                 id: Optional[str] = None):
        super().__init__(id)
        self.reporter_id = reporter_id
        self.reporter_name = reporter_name
        self.description = description
        self.location = location
        self.photo_urls = photo_urls
        self.status = MaintenanceStatus.PENDING
        
        # Resolution tracking
        self.assigned_to_id: Optional[str] = None
        self.assigned_to_name: Optional[str] = None
        self.resolution_date: Optional[datetime] = None
        self.resolution_notes: Optional[str] = None
        self.completed_by_id: Optional[str] = None
        self.completed_by_name: Optional[str] = None
        
        # Notification tracking
        self.maintenance_notified = False
        self.yaffa_notified = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'reporter_id': self.reporter_id,
            'reporter_name': self.reporter_name,
            'description': self.description,
            'location': self.location,
            'photo_urls': self.photo_urls,
            'status': self.status.value,
            'assigned_to_id': self.assigned_to_id,
            'assigned_to_name': self.assigned_to_name,
            'resolution_date': self.resolution_date,
            'resolution_notes': self.resolution_notes,
            'completed_by_id': self.completed_by_id,
            'completed_by_name': self.completed_by_name,
            'maintenance_notified': self.maintenance_notified,
            'yaffa_notified': self.yaffa_notified,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MaintenanceRequest':
        request = cls(
            reporter_id=data['reporter_id'],
            reporter_name=data['reporter_name'],
            description=data['description'],
            location=data['location'],
            photo_urls=data.get('photo_urls', []),
            id=data.get('id')
        )
        
        request.status = MaintenanceStatus(data.get('status', MaintenanceStatus.PENDING.value))
        request.assigned_to_id = data.get('assigned_to_id')
        request.assigned_to_name = data.get('assigned_to_name')
        request.resolution_date = data.get('resolution_date')
        request.resolution_notes = data.get('resolution_notes')
        request.completed_by_id = data.get('completed_by_id')
        request.completed_by_name = data.get('completed_by_name')
        request.maintenance_notified = data.get('maintenance_notified', False)
        request.yaffa_notified = data.get('yaffa_notified', False)
        request.created_at = data.get('created_at', datetime.utcnow())
        request.updated_at = data.get('updated_at', datetime.utcnow())
        
        return request
    
    def validate(self) -> bool:
        """Validate maintenance request data."""
        if not self.description or len(self.description.strip()) < 10:
            raise ValueError("Description must be at least 10 characters")
        if not self.location or len(self.location.strip()) < 2:
            raise ValueError("Location must be specified")
        # Photos are now optional - allow empty photo_urls
        if self.photo_urls and len(self.photo_urls) > 5:
            raise ValueError("Maximum 5 photos allowed")
        return True
    
    def assign_to(self, user_id: str, user_name: str) -> None:
        """Assign maintenance request to a user."""
        self.assigned_to_id = user_id
        self.assigned_to_name = user_name
        self.status = MaintenanceStatus.IN_PROGRESS
        self.update_timestamp()
    
    def complete(self, resolution_notes: str) -> None:
        """Mark maintenance request as completed."""
        if not resolution_notes or len(resolution_notes.strip()) < 5:
            raise ValueError("Resolution notes must be provided")
        
        self.status = MaintenanceStatus.COMPLETED
        self.resolution_date = datetime.utcnow()
        self.resolution_notes = resolution_notes
        self.update_timestamp()
    
    def cancel(self) -> None:
        """Cancel maintenance request."""
        self.status = MaintenanceStatus.CANCELLED
        self.update_timestamp()