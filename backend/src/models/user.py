"""
User model representing family members in the system.
Includes device tracking for single-device login enforcement.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from .base import BaseModel


class UserDevice(BaseModel):
    """Represents a device associated with a user."""
    
    def __init__(self, device_id: str, device_name: str, 
                 platform: str, last_login: Optional[datetime] = None):
        super().__init__()
        self.device_id = device_id
        self.device_name = device_name
        self.platform = platform
        self.last_login = last_login or datetime.utcnow()
        self.is_active = True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'device_id': self.device_id,
            'device_name': self.device_name,
            'platform': self.platform,
            'last_login': self.last_login,
            'is_active': self.is_active,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserDevice':
        device = cls(
            device_id=data['device_id'],
            device_name=data['device_name'],
            platform=data['platform'],
            last_login=data.get('last_login')
        )
        device.is_active = data.get('is_active', True)
        device.created_at = data.get('created_at', datetime.utcnow())
        device.updated_at = data.get('updated_at', datetime.utcnow())
        return device


class User(BaseModel):
    """
    Represents a family member user in the EBS Home system.
    Handles authentication, profile data, and device management.
    """
    
    def __init__(self, email: str, name: str, role: str = 'family_member',
                 preferred_language: str = 'en', id: Optional[str] = None):
        super().__init__(id)
        self.email = email
        self.name = name
        self.role = role  # 'family_member', 'maintenance', 'admin'
        self.preferred_language = preferred_language
        self.is_active = True
        self.current_device: Optional[UserDevice] = None
        self.device_history: List[UserDevice] = []
        self.firebase_uid: Optional[str] = None
        
        # Special flags
        self.is_yaffa = False  # Gets notifications for completed maintenance
        self.is_maintenance_person = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'preferred_language': self.preferred_language,
            'is_active': self.is_active,
            'current_device': self.current_device.to_dict() if self.current_device else None,
            'device_history': [device.to_dict() for device in self.device_history],
            'firebase_uid': self.firebase_uid,
            'is_yaffa': self.is_yaffa,
            'is_maintenance_person': self.is_maintenance_person,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        user = cls(
            email=data['email'],
            name=data['name'],
            role=data.get('role', 'family_member'),
            preferred_language=data.get('preferred_language', 'en'),
            id=data.get('id')
        )
        user.is_active = data.get('is_active', True)
        user.firebase_uid = data.get('firebase_uid')
        user.is_yaffa = data.get('is_yaffa', False)
        user.is_maintenance_person = data.get('is_maintenance_person', False)
        
        if data.get('current_device'):
            user.current_device = UserDevice.from_dict(data['current_device'])
        
        user.device_history = [
            UserDevice.from_dict(device_data) 
            for device_data in data.get('device_history', [])
        ]
        
        user.created_at = data.get('created_at', datetime.utcnow())
        user.updated_at = data.get('updated_at', datetime.utcnow())
        return user
    
    def validate(self) -> bool:
        """Validate user data."""
        if not self.email or '@' not in self.email:
            raise ValueError("Invalid email address")
        if not self.name or len(self.name.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        if self.role not in ['family_member', 'maintenance', 'admin']:
            raise ValueError("Invalid role")
        if self.preferred_language not in ['en', 'he']:
            raise ValueError("Invalid language preference")
        return True
    
    def is_valid(self) -> bool:
        """Check if user data is valid (alias for validate for compatibility)."""
        try:
            return self.validate()
        except ValueError:
            return False
    
    def can_login_from_device(self, device_id: str) -> bool:
        """Check if user can login from a specific device."""
        if not self.current_device:
            return True
        return self.current_device.device_id == device_id
    
    def set_device(self, device: UserDevice) -> None:
        """Set new device for user, moving current to history."""
        if self.current_device:
            self.current_device.is_active = False
            self.device_history.append(self.current_device)
        self.current_device = device
        self.update_timestamp()