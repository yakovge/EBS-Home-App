"""
Booking repository for handling booking data operations.
Extends BaseRepository with booking-specific functionality.
"""

from typing import List, Optional
from datetime import datetime, date
from ..models.booking import Booking
from .base_repository import BaseRepository


class BookingRepository(BaseRepository):
    """Repository for booking operations."""
    
    def __init__(self):
        super().__init__('bookings', Booking)
    
    def create_booking(self, booking_data: dict) -> str:
        """
        Create a new booking.
        
        Args:
            booking_data: Dictionary containing booking data
            
        Returns:
            str: Document ID of the created booking
        """
        # Parse dates if they're strings
        start_date = booking_data['start_date']
        end_date = booking_data['end_date']
        
        if isinstance(start_date, str):
            start_date = date.fromisoformat(start_date)
        if isinstance(end_date, str):
            end_date = date.fromisoformat(end_date)
        
        # Create Booking model from dictionary
        booking = Booking(
            user_id=booking_data['user_id'],
            user_name=booking_data['user_name'], 
            start_date=start_date,
            end_date=end_date,
            notes=booking_data.get('notes', '')
        )
        
        # Set additional fields with defaults
        booking.is_cancelled = False
        booking.exit_checklist_completed = False
        booking.reminder_sent = False
        booking.created_at = datetime.utcnow()
        booking.updated_at = datetime.utcnow()
        
        return self.create(booking)
    
    def get_bookings(self, user_id: Optional[str] = None) -> List[Booking]:
        """
        Get bookings with optional user filter.
        
        Args:
            user_id: Optional user ID filter
            
        Returns:
            List[Booking]: List of bookings
        """
        query = self.collection
        
        if user_id:
            query = query.where('user_id', '==', user_id)
        
        docs = query.order_by('start_date', direction='ASCENDING').stream()
        results = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            results.append(Booking.from_dict(data))
        return results
    
    def get_booking_by_id(self, booking_id: str) -> Optional[Booking]:
        """
        Get a booking by ID.
        
        Args:
            booking_id: ID of the booking
            
        Returns:
            Optional[Booking]: Booking or None
        """
        return self.get_by_id(booking_id)
    
    def update_booking(self, booking_id: str, update_data: dict) -> bool:
        """
        Update a booking.
        
        Args:
            booking_id: ID of the booking
            update_data: Data to update
            
        Returns:
            bool: True if updated successfully
        """
        update_data['updated_at'] = datetime.utcnow()
        return self.update(booking_id, update_data)
    
    def cancel_booking(self, booking_id: str) -> bool:
        """
        Cancel a booking.
        
        Args:
            booking_id: ID of the booking to cancel
            
        Returns:
            bool: True if cancelled successfully
        """
        update_data = {
            'is_cancelled': True,
            'updated_at': datetime.utcnow()
        }
        return self.update(booking_id, update_data)
    
    def mark_exit_checklist_completed(self, booking_id: str, checklist_id: str) -> bool:
        """
        Mark exit checklist as completed for a booking.
        
        Args:
            booking_id: ID of the booking
            checklist_id: ID of the completed checklist
            
        Returns:
            bool: True if updated successfully
        """
        update_data = {
            'exit_checklist_completed': True,
            'exit_checklist_id': checklist_id,
            'updated_at': datetime.utcnow()
        }
        return self.update(booking_id, update_data)
    
    def get_conflicting_bookings(self, start_date: str, end_date: str, exclude_booking_id: Optional[str] = None) -> List[Booking]:
        """
        Get bookings that conflict with the given date range.
        
        Args:
            start_date: Start date of the booking
            end_date: End date of the booking
            exclude_booking_id: Optional booking ID to exclude from conflict check
            
        Returns:
            List[Booking]: List of conflicting bookings
        """
        query = self.collection.where('is_cancelled', '==', False)
        
        if exclude_booking_id:
            query = query.where('id', '!=', exclude_booking_id)
        
        # Get bookings that overlap with the given date range
        docs = query.stream()
        conflicting_bookings = []
        
        for doc in docs:
            booking_data = doc.to_dict()
            booking_data['id'] = doc.id
            booking = Booking.from_dict(booking_data)
            
            # Check for date overlap
            if (booking.start_date <= end_date and booking.end_date >= start_date):
                conflicting_bookings.append(booking)
        
        return conflicting_bookings 