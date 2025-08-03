"""
Base model class following OOP principles.
All models inherit from this base class.
"""

from datetime import datetime
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod


class BaseModel(ABC):
    """
    Abstract base class for all data models.
    Implements common functionality and enforces structure.
    """
    
    def __init__(self, id: Optional[str] = None):
        self.id = id
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        """Convert model instance to dictionary for Firestore."""
        pass
    
    @classmethod
    @abstractmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BaseModel':
        """Create model instance from Firestore document."""
        pass
    
    def update_timestamp(self) -> None:
        """Update the updated_at timestamp."""
        self.updated_at = datetime.utcnow()
    
    def validate(self) -> bool:
        """
        Validate model data. Override in subclasses for specific validation.
        Returns True if valid, raises ValueError if not.
        """
        return True