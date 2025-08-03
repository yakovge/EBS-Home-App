"""
Booking model for managing house occupancy calendar.
Supports both Gregorian and Hebrew date display.
"""

from typing import Dict, Any, Optional
from datetime import datetime, date
from .base import BaseModel


class Booking(BaseModel):
    """
    Represents a booking/reservation for the vacation house.
    Manages scheduling and prevents conflicts.
    """
    
    def __init__(self,
                 user_id: str,
                 user_name: str,
                 start_date: date,
                 end_date: date,
                 notes: Optional[str] = None,
                 id: Optional[str] = None):
        super().__init__(id)
        self.user_id = user_id
        self.user_name = user_name
        self.start_date = start_date
        self.end_date = end_date
        self.notes = notes
        self.is_cancelled = False
        
        # Exit checklist tracking
        self.exit_checklist_completed = False
        self.exit_checklist_id: Optional[str] = None
        self.reminder_sent = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'user_id': self.user_id,
            'user_name': self.user_name,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'notes': self.notes,
            'is_cancelled': self.is_cancelled,
            'exit_checklist_completed': self.exit_checklist_completed,
            'exit_checklist_id': self.exit_checklist_id,
            'reminder_sent': self.reminder_sent,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Booking':
        booking = cls(
            user_id=data['user_id'],
            user_name=data['user_name'],
            start_date=date.fromisoformat(data['start_date']),
            end_date=date.fromisoformat(data['end_date']),
            notes=data.get('notes'),
            id=data.get('id')
        )
        
        booking.is_cancelled = data.get('is_cancelled', False)
        booking.exit_checklist_completed = data.get('exit_checklist_completed', False)
        booking.exit_checklist_id = data.get('exit_checklist_id')
        booking.reminder_sent = data.get('reminder_sent', False)
        booking.created_at = data.get('created_at', datetime.utcnow())
        booking.updated_at = data.get('updated_at', datetime.utcnow())
        
        return booking
    
    def validate(self) -> bool:
        """Validate booking data."""
        if self.start_date >= self.end_date:
            raise ValueError("End date must be after start date")
        if self.start_date < date.today():
            raise ValueError("Cannot create booking in the past")
        if (self.end_date - self.start_date).days > 30:
            raise ValueError("Booking cannot exceed 30 days")
        return True
    
    def overlaps_with(self, other_booking: 'Booking') -> bool:
        """Check if this booking overlaps with another booking."""
        if self.is_cancelled or other_booking.is_cancelled:
            return False
        
        return not (self.end_date < other_booking.start_date or 
                   self.start_date > other_booking.end_date)
    
    def is_active_today(self) -> bool:
        """Check if booking is active today."""
        today = date.today()
        return self.start_date <= today <= self.end_date and not self.is_cancelled
    
    def is_ending_today(self) -> bool:
        """Check if booking ends today."""
        return self.end_date == date.today() and not self.is_cancelled
    
    def cancel(self) -> None:
        """Cancel this booking."""
        self.is_cancelled = True
        self.update_timestamp()
    
    def mark_checklist_completed(self, checklist_id: str) -> None:
        """Mark exit checklist as completed."""
        self.exit_checklist_completed = True
        self.exit_checklist_id = checklist_id
        self.update_timestamp()
    
    def mark_reminder_sent(self) -> None:
        """Mark that exit reminder has been sent."""
        self.reminder_sent = True
        self.update_timestamp()