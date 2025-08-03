"""
Exit checklist model for tracking house condition when leaving.
Ensures house is left in proper state with photo documentation.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum
from .base import BaseModel


class PhotoType(Enum):
    """Types of photos required for exit checklist."""
    REFRIGERATOR = "refrigerator"
    FREEZER = "freezer"
    CLOSET = "closet"


class ChecklistPhoto(BaseModel):
    """
    Represents a single photo in the exit checklist.
    Includes photo URL, type, and descriptive notes.
    """
    
    def __init__(self,
                 photo_type: PhotoType,
                 photo_url: str,
                 notes: str,
                 order: int = 0):
        super().__init__()
        self.photo_type = photo_type
        self.photo_url = photo_url
        self.notes = notes
        self.order = order
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'photo_type': self.photo_type.value,
            'photo_url': self.photo_url,
            'notes': self.notes,
            'order': self.order,
            'created_at': self.created_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ChecklistPhoto':
        photo = cls(
            photo_type=PhotoType(data['photo_type']),
            photo_url=data['photo_url'],
            notes=data['notes'],
            order=data.get('order', 0)
        )
        photo.created_at = data.get('created_at', datetime.utcnow())
        return photo


class ExitChecklist(BaseModel):
    """
    Represents a complete exit checklist submission.
    Ensures all required photos and notes are provided.
    """
    
    REQUIRED_PHOTOS = {
        PhotoType.REFRIGERATOR: 2,
        PhotoType.FREEZER: 2,
        PhotoType.CLOSET: 3
    }
    
    def __init__(self,
                 user_id: str,
                 user_name: str,
                 booking_id: str,
                 id: Optional[str] = None):
        super().__init__(id)
        self.user_id = user_id
        self.user_name = user_name
        self.booking_id = booking_id
        self.photos: List[ChecklistPhoto] = []
        self.is_complete = False
        self.submitted_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'user_id': self.user_id,
            'user_name': self.user_name,
            'booking_id': self.booking_id,
            'photos': [photo.to_dict() for photo in self.photos],
            'is_complete': self.is_complete,
            'submitted_at': self.submitted_at,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ExitChecklist':
        checklist = cls(
            user_id=data['user_id'],
            user_name=data['user_name'],
            booking_id=data['booking_id'],
            id=data.get('id')
        )
        
        checklist.photos = [
            ChecklistPhoto.from_dict(photo_data)
            for photo_data in data.get('photos', [])
        ]
        checklist.is_complete = data.get('is_complete', False)
        checklist.submitted_at = data.get('submitted_at')
        checklist.created_at = data.get('created_at', datetime.utcnow())
        checklist.updated_at = data.get('updated_at', datetime.utcnow())
        
        return checklist
    
    def add_photo(self, photo: ChecklistPhoto) -> None:
        """Add a photo to the checklist."""
        self.photos.append(photo)
        self.update_timestamp()
    
    def validate(self) -> bool:
        """
        Validate that all required photos are present.
        Returns True if valid, raises ValueError if not.
        """
        photo_counts = {photo_type: 0 for photo_type in PhotoType}
        
        for photo in self.photos:
            if not photo.notes or len(photo.notes.strip()) < 5:
                raise ValueError(f"Photo notes must be at least 5 characters for {photo.photo_type.value}")
            photo_counts[photo.photo_type] += 1
        
        for photo_type, required_count in self.REQUIRED_PHOTOS.items():
            actual_count = photo_counts.get(photo_type, 0)
            if actual_count < required_count:
                raise ValueError(
                    f"Missing {required_count - actual_count} {photo_type.value} photo(s). "
                    f"Required: {required_count}, Provided: {actual_count}"
                )
        
        return True
    
    def submit(self) -> None:
        """
        Submit the checklist after validation.
        Marks as complete and sets submission timestamp.
        """
        if self.validate():
            self.is_complete = True
            self.submitted_at = datetime.utcnow()
            self.update_timestamp()
    
    def get_photos_by_type(self, photo_type: PhotoType) -> List[ChecklistPhoto]:
        """Get all photos of a specific type."""
        return [photo for photo in self.photos if photo.photo_type == photo_type]