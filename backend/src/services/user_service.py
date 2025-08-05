"""
User service for handling user-related business logic.
Manages user creation, updates, and device verification.
"""

from typing import Optional, Dict, Any
from datetime import datetime
from ..models.user import User
from ..repositories.user_repository import UserRepository
from ..utils.firebase_config import get_auth_client


class UserService:
    """Service for user-related operations."""
    
    def __init__(self):
        self.user_repository = UserRepository()
        self.auth_client = get_auth_client()
    
    def get_or_create_user(self, email: str, name: str, firebase_uid: str) -> User:
        """
        Get existing user or create new one.
        
        Args:
            email: User's email address
            name: User's display name
            firebase_uid: Firebase user ID
            
        Returns:
            User: User object
        """
        # Try to find existing user by Firebase UID
        existing_user = self.user_repository.get_by_firebase_uid(firebase_uid)
        if existing_user:
            return existing_user
        
        # Create new user
        user = User(
            email=email,
            name=name,
            role='family_member',
            preferred_language='en'
        )
        
        # Set additional attributes
        user.firebase_uid = firebase_uid
        user.is_active = True
        user.is_yaffa = False
        user.is_maintenance_person = False
        user.device_history = []  # Keep as empty list initially
        
        # Save user to repository
        user_id = self.user_repository.create(user)
        user.id = user_id
        return user
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """
        Get user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            Optional[User]: User object or None
        """
        return self.user_repository.get_by_id(user_id)
    
    def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[User]:
        """
        Get user by Firebase UID.
        
        Args:
            firebase_uid: Firebase user ID
            
        Returns:
            Optional[User]: User object or None
        """
        return self.user_repository.get_by_firebase_uid(firebase_uid)
    
    def update_user_device(self, user_id: str, device_info: Dict[str, Any]) -> bool:
        """
        Update user's device information.
        
        Args:
            user_id: User ID
            device_info: Device information dictionary
            
        Returns:
            bool: True if updated successfully
        """
        user = self.user_repository.get_by_id(user_id)
        if not user:
            return False
        
        # Update current device
        device_data = {
            'device_id': device_info['device_id'],
            'device_name': device_info['device_name'],
            'platform': device_info['platform'],
            'last_login': datetime.utcnow().isoformat(),
            'is_active': True,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Convert device_history to plain dictionaries if they're UserDevice objects
        device_history = []
        if hasattr(user, 'device_history') and user.device_history:
            for device in user.device_history:
                if hasattr(device, 'to_dict'):
                    # It's a UserDevice object, convert to dict
                    device_history.append(device.to_dict())
                else:
                    # It's already a dict
                    device_history.append(device)
        
        # Add new device to history
        device_history.append(device_data)
        
        update_data = {
            'current_device': device_data,
            'device_history': device_history,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        return self.user_repository.update(user_id, update_data)
    
    def verify_device_access(self, user_id: str, device_id: str) -> bool:
        """
        Verify if user can access from the given device.
        
        Args:
            user_id: User ID
            device_id: Device ID
            
        Returns:
            bool: True if device access is allowed
        """
        user = self.user_repository.get_by_id(user_id)
        if not user:
            return False
        
        # Check if device is in user's device history
        device_history = user.device_history if hasattr(user, 'device_history') else []
        for device in device_history:
            if device.get('device_id') == device_id and device.get('is_active', False):
                return True
        
        return False
    
    def update_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> bool:
        """
        Update user preferences.
        
        Args:
            user_id: User ID
            preferences: Preferences to update
            
        Returns:
            bool: True if updated successfully
        """
        update_data = {
            **preferences,
            'updated_at': datetime.utcnow().isoformat()
        }
        return self.user_repository.update(user_id, update_data)
    
    def get_all_users(self) -> list[User]:
        """
        Get all users.
        
        Returns:
            list[User]: List of all users
        """
        return self.user_repository.get_all() 