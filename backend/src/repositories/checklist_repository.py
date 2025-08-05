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
        # Create ExitChecklist model from dictionary
        checklist = ExitChecklist(
            user_id=checklist_data['user_id'],
            user_name=checklist_data['user_name'],
            booking_id=checklist_data.get('booking_id', '')
        )
        
        # Set additional fields
        checklist.photos = []  # Start with empty photos list
        checklist.is_complete = False
        checklist.created_at = datetime.utcnow()
        checklist.updated_at = datetime.utcnow()
        
        return self.create(checklist)
    
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
        results = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            results.append(ExitChecklist.from_dict(data))
        return results
    
    def get_checklist_by_id(self, checklist_id: str) -> Optional[ExitChecklist]:
        """
        Get a checklist by ID.
        
        Args:
            checklist_id: ID of the checklist
            
        Returns:
            Optional[ExitChecklist]: Checklist or None
        """
        # Base repository already returns the correct ExitChecklist object
        return self.get_by_id(checklist_id)
    
    def update_checklist(self, checklist_id: str, update_data: dict) -> bool:
        """
        Update a checklist.
        
        Args:
            checklist_id: ID of the checklist
            update_data: Data to update
            
        Returns:
            bool: True if updated successfully
        """
        update_data['updated_at'] = datetime.utcnow()
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
            'submitted_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
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
            data = doc.to_dict()
            data['id'] = doc.id
            return ExitChecklist.from_dict(data)
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
        
        # Convert existing photos to dictionaries for storage
        photos_data = []
        for photo in checklist.photos:
            if hasattr(photo, 'to_dict'):
                photos_data.append(photo.to_dict())
            else:
                # It's already a dict
                photos_data.append(photo)
        
        # Add the new photo data
        photos_data.append(photo_data)
        
        update_data = {
            'photos': photos_data,
            'updated_at': datetime.utcnow()
        }
        return self.update(checklist_id, update_data) 