"""
Checklist service for handling exit checklist business logic.
Manages checklist creation, photo uploads, and completion.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from ..models.checklist import ExitChecklist, ChecklistPhoto
from ..repositories.checklist_repository import ChecklistRepository
from ..repositories.booking_repository import BookingRepository
from ..repositories.user_repository import UserRepository


class ChecklistService:
    """Service for checklist-related operations."""
    
    def __init__(self):
        self.checklist_repository = ChecklistRepository()
        self.booking_repository = BookingRepository()
        self.user_repository = UserRepository()
    
    def create_checklist(self, user_id: str, booking_id: str) -> str:
        """
        Create a new exit checklist.
        
        Args:
            user_id: ID of the user creating the checklist
            booking_id: ID of the booking
            
        Returns:
            str: ID of the created checklist
        """
        user = self.user_repository.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        
        booking = self.booking_repository.get_booking_by_id(booking_id)
        if not booking:
            raise ValueError("Booking not found")
        
        checklist_data = {
            'user_id': user_id,
            'user_name': user.name,
            'booking_id': booking_id,
            'photos': []
        }
        
        return self.checklist_repository.create_checklist(checklist_data)
    
    def get_checklists(self, user_id: Optional[str] = None) -> List[ExitChecklist]:
        """
        Get checklists with optional user filter.
        
        Args:
            user_id: Optional user ID filter
            
        Returns:
            List[ExitChecklist]: List of checklists
        """
        return self.checklist_repository.get_checklists(user_id)
    
    def get_checklist_by_id(self, checklist_id: str) -> Optional[ExitChecklist]:
        """
        Get a checklist by ID.
        
        Args:
            checklist_id: ID of the checklist
            
        Returns:
            Optional[ExitChecklist]: Checklist or None
        """
        return self.checklist_repository.get_checklist_by_id(checklist_id)
    
    def get_checklist_by_booking(self, booking_id: str) -> Optional[ExitChecklist]:
        """
        Get checklist by booking ID.
        
        Args:
            booking_id: ID of the booking
            
        Returns:
            Optional[ExitChecklist]: Checklist or None
        """
        return self.checklist_repository.get_checklist_by_booking(booking_id)
    
    def add_photo_to_checklist(self, checklist_id: str, photo_type: str, photo_url: str, notes: str) -> bool:
        """
        Add a photo to a checklist.
        
        Args:
            checklist_id: ID of the checklist
            photo_type: Type of photo (refrigerator, freezer, closet)
            photo_url: URL of the uploaded photo
            notes: Notes about the photo
            
        Returns:
            bool: True if added successfully
        """
        checklist = self.get_checklist_by_id(checklist_id)
        if not checklist:
            return False
        
        photo_data = {
            'photo_type': photo_type,
            'photo_url': photo_url,
            'notes': notes,
            'order': len(checklist.photos) + 1,
            'created_at': datetime.utcnow().isoformat()
        }
        
        return self.checklist_repository.add_photo_to_checklist(checklist_id, photo_data)
    
    def submit_checklist(self, checklist_id: str) -> bool:
        """
        Submit a completed checklist.
        
        Args:
            checklist_id: ID of the checklist to submit
            
        Returns:
            bool: True if submitted successfully
        """
        checklist = self.get_checklist_by_id(checklist_id)
        if not checklist:
            return False
        
        # Validate that all required photos are present
        required_photos = {
            'refrigerator': 2,
            'freezer': 2,
            'closet': 3
        }
        
        photo_counts = {}
        for photo in checklist.photos:
            photo_type = photo.get('photo_type', '')
            photo_counts[photo_type] = photo_counts.get(photo_type, 0) + 1
        
        # Check if all required photos are present
        for photo_type, required_count in required_photos.items():
            if photo_counts.get(photo_type, 0) < required_count:
                raise ValueError(f"Missing required photos for {photo_type}")
        
        # Submit the checklist
        success = self.checklist_repository.submit_checklist(checklist_id)
        
        if success:
            # Mark the booking as having completed exit checklist
            self.booking_repository.mark_exit_checklist_completed(
                checklist.booking_id, 
                checklist_id
            )
        
        return success
    
    def update_checklist(self, checklist_id: str, update_data: Dict[str, Any]) -> bool:
        """
        Update a checklist.
        
        Args:
            checklist_id: ID of the checklist
            update_data: Data to update
            
        Returns:
            bool: True if updated successfully
        """
        return self.checklist_repository.update_checklist(checklist_id, update_data)
    
    def get_incomplete_checklists(self, user_id: Optional[str] = None) -> List[ExitChecklist]:
        """
        Get incomplete checklists.
        
        Args:
            user_id: Optional user ID filter
            
        Returns:
            List[ExitChecklist]: List of incomplete checklists
        """
        all_checklists = self.get_checklists(user_id)
        return [checklist for checklist in all_checklists if not checklist.is_complete]
    
    def get_completed_checklists(self, user_id: Optional[str] = None) -> List[ExitChecklist]:
        """
        Get completed checklists.
        
        Args:
            user_id: Optional user ID filter
            
        Returns:
            List[ExitChecklist]: List of completed checklists
        """
        all_checklists = self.get_checklists(user_id)
        return [checklist for checklist in all_checklists if checklist.is_complete]
    
    def get_recent_checklists_count(self) -> int:
        """
        Get count of recent checklists.
        
        Returns:
            int: Number of recent checklists
        """
        recent_checklists = self.get_recent_checklists(limit=10)
        return len(recent_checklists)
    
    def get_recent_checklists(self, limit: int = 5) -> List[ExitChecklist]:
        """
        Get recent checklists.
        
        Args:
            limit: Maximum number of checklists to return
            
        Returns:
            List[ExitChecklist]: List of recent checklists
        """
        all_checklists = self.checklist_repository.get_checklists()
        # Sort by creation date (newest first) and limit
        sorted_checklists = sorted(all_checklists, key=lambda x: x.created_at, reverse=True)
        return sorted_checklists[:limit] 