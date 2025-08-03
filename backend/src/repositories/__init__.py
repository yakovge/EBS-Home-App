"""
Repositories package implementing the repository pattern for data access.
Provides abstraction layer between services and Firebase Firestore.
"""

from .base_repository import BaseRepository
from .user_repository import UserRepository
from .maintenance_repository import MaintenanceRepository
from .booking_repository import BookingRepository
from .checklist_repository import ChecklistRepository

__all__ = [
    'BaseRepository',
    'UserRepository',
    'MaintenanceRepository',
    'BookingRepository',
    'ChecklistRepository'
]