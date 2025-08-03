"""
API package containing all Flask blueprints for different features.
Each blueprint handles a specific domain of the application.
"""

from .auth import auth_bp
from .maintenance import maintenance_bp
from .booking import booking_bp
from .checklist import checklist_bp
from .user import user_bp

__all__ = [
    'auth_bp',
    'maintenance_bp', 
    'booking_bp',
    'checklist_bp',
    'user_bp'
]