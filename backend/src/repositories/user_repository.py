"""
User repository for managing user data in Firestore.
Handles user-specific queries and operations.
"""

from typing import Optional, List
from ..models.user import User
from .base_repository import BaseRepository


class UserRepository(BaseRepository):
    """
    Repository for User model operations.
    Extends base repository with user-specific methods.
    """
    
    def __init__(self):
        super().__init__('users', User)
    
    def get_by_email(self, email: str) -> Optional[User]:
        """
        Find user by email address.
        Returns None if not found.
        """
        users = self.list(filters={'email': email}, limit=1)
        return users[0] if users else None
    
    def get_by_firebase_uid(self, firebase_uid: str) -> Optional[User]:
        """
        Find user by Firebase UID.
        Returns None if not found.
        """
        users = self.list(filters={'firebase_uid': firebase_uid}, limit=1)
        return users[0] if users else None
    
    def get_maintenance_users(self) -> List[User]:
        """
        Get all users marked as maintenance persons.
        """
        return self.list(filters={'is_maintenance_person': True})
    
    def get_yaffa(self) -> Optional[User]:
        """
        Get the user marked as Yaffa (receives maintenance completion notifications).
        """
        users = self.list(filters={'is_yaffa': True}, limit=1)
        return users[0] if users else None
    
    def get_active_users(self) -> List[User]:
        """
        Get all active users.
        """
        return self.list(filters={'is_active': True})