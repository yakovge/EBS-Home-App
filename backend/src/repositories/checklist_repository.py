"""
Checklist repository for handling exit checklist data operations.
Extends BaseRepository with checklist-specific functionality.
"""

from typing import List, Optional
from datetime import datetime
from ..models.checklist import ExitChecklist
from .base_repository import BaseRepository


class ChecklistRepository(BaseRepository):
    """Repository for exit checklist operations."""
    
    def __init__(self):
        super().__init__('exit_checklists', ExitChecklist)
    
    def create_checklist(self, checklist_data: dict) -> str:
        """
        Create a new exit checklist.
        
        Args:
            checklist_data: Dictionary containing checklist data
            
        Returns:
            str: Document ID of the created checklist
        """
        checklist_data['created_at'] = datetime.utcnow().isoformat()
        checklist_data['updated_at'] = datetime.utcnow().isoformat()
        checklist_data['is_complete'] = False
        return self.create(checklist_data)
    
    def get_checklists(self, user_id: Optional[str] = None) -> List[ExitChecklist]:
        """
        Get checklists with optional user filter.
        
        Args:
            user_id: Optional user ID filter
            
        Returns:
            List[ExitChecklist]: List of checklists
        """
        query = self.collection
        
        if user_id:
            query = query.where('user_id', '==', user_id)
        
        docs = query.order_by('created_at', direction='DESCENDING').stream()
        return [ExitChecklist(**doc.to_dict()) for doc in docs]
    
    def get_checklist_by_id(self, checklist_id: str) -> Optional[ExitChecklist]:
        """
        Get a checklist by ID.
        
        Args:
            checklist_id: ID of the checklist
            
        Returns:
            Optional[ExitChecklist]: Checklist or None
        """
        doc = self.get_by_id(checklist_id)
        if doc:
            return ExitChecklist(**doc)
        return None
    
    def update_checklist(self, checklist_id: str, update_data: dict) -> bool:
        """
        Update a checklist.
        
        Args:
            checklist_id: ID of the checklist
            update_data: Data to update
            
        Returns:
            bool: True if updated successfully
        """
        update_data['updated_at'] = datetime.utcnow().isoformat()
        return self.update(checklist_id, update_data)
    
    def submit_checklist(self, checklist_id: str) -> bool:
        """
        Submit a completed checklist.
        
        Args:
            checklist_id: ID of the checklist to submit
            
        Returns:
            bool: True if submitted successfully
        """
        update_data = {
            'is_complete': True,
            'submitted_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        return self.update(checklist_id, update_data)
    
    def get_checklist_by_booking(self, booking_id: str) -> Optional[ExitChecklist]:
        """
        Get checklist by booking ID.
        
        Args:
            booking_id: ID of the booking
            
        Returns:
            Optional[ExitChecklist]: Checklist or None
        """
        docs = self.collection.where('booking_id', '==', booking_id).limit(1).stream()
        for doc in docs:
            return ExitChecklist(**doc.to_dict())
        return None
    
    def add_photo_to_checklist(self, checklist_id: str, photo_data: dict) -> bool:
        """
        Add a photo to a checklist.
        
        Args:
            checklist_id: ID of the checklist
            photo_data: Photo data to add
            
        Returns:
            bool: True if added successfully
        """
        checklist = self.get_checklist_by_id(checklist_id)
        if not checklist:
            return False
        
        # Add photo to the checklist
        photos = checklist.photos if hasattr(checklist, 'photos') else []
        photos.append(photo_data)
        
        update_data = {
            'photos': photos,
            'updated_at': datetime.utcnow().isoformat()
        }
        return self.update(checklist_id, update_data) 