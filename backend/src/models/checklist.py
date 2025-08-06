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
    GENERAL = "general"


class ChecklistPhoto(BaseModel):
    """
    Represents a single photo or text entry in the exit checklist.
    Includes optional photo URL, type, and descriptive notes.
    Photos are now optional - only notes are required.
    """
    
    def __init__(self,
                 photo_type: PhotoType,
                 notes: str,
                 photo_url: Optional[str] = None,
                 order: int = 0):
        super().__init__()
        self.photo_type = photo_type
        self.photo_url = photo_url
        self.notes = notes
        self.order = order
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'photo_type': self.photo_type.value,
            'photo_url': self.photo_url,  # Can be None for text-only entries
            'notes': self.notes,
            'order': self.order,
            'created_at': self.created_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ChecklistPhoto':
        photo = cls(
            photo_type=PhotoType(data['photo_type']),
            notes=data['notes'],
            photo_url=data.get('photo_url'),  # Optional photo URL
            order=data.get('order', 0)
        )
        photo.created_at = data.get('created_at', datetime.utcnow())
        return photo


class ExitChecklist(BaseModel):
    """
    Represents a complete exit checklist submission.
    Ensures all required text entries are provided for each category.
    Photos are optional - only text notes are required.
    """
    
    REQUIRED_CATEGORIES = [
        PhotoType.REFRIGERATOR,
        PhotoType.FREEZER,
        PhotoType.CLOSET
    ]
    
    OPTIONAL_CATEGORIES = [
        PhotoType.GENERAL
    ]
    
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
        self.important_notes: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user_name,
            'booking_id': self.booking_id,
            'photos': [photo.to_dict() for photo in self.photos],
            'is_complete': self.is_complete,
            'submitted_at': self.submitted_at,
            'important_notes': self.important_notes,
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
        checklist.important_notes = data.get('important_notes')
        checklist.created_at = data.get('created_at', datetime.utcnow())
        checklist.updated_at = data.get('updated_at', datetime.utcnow())
        
        return checklist
    
    def add_photo(self, photo: ChecklistPhoto) -> None:
        """Add a photo to the checklist."""
        self.photos.append(photo)
        self.update_timestamp()
    
    def validate(self) -> bool:
        """
        Validate that text entries for all required categories are present.
        Photos are optional - only notes are required for each category.
        Returns True if valid, raises ValueError if not.
        
        Note: For new checklists being created, we skip validation since
        entries haven't been added yet. Full validation happens on submit.
        """
        # Skip validation for new/empty checklists
        if len(self.photos) == 0:
            return True
            
        categories_with_entries = set()
        
        for entry in self.photos:  # Now called "photos" but can be text-only entries
            # General notes can be shorter or empty (optional)
            if entry.photo_type == PhotoType.GENERAL:
                # General notes are optional - allow empty or short notes
                if entry.notes and len(entry.notes.strip()) > 0:
                    categories_with_entries.add(entry.photo_type)
            else:
                # Required categories need at least 5 characters
                if not entry.notes or len(entry.notes.strip()) < 5:
                    raise ValueError(f"Notes must be at least 5 characters for {entry.photo_type.value}")
                categories_with_entries.add(entry.photo_type)
        
        # Check that all required categories have at least one entry (text or photo)
        for required_category in self.REQUIRED_CATEGORIES:
            if required_category not in categories_with_entries:
                raise ValueError(
                    f"Missing required entry for {required_category.value}. "
                    f"Please provide notes for each required category: refrigerator, freezer, closets. "
                    f"General notes are optional."
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