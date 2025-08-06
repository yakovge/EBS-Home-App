"""
Booking service for handling booking business logic.
Manages bookings, conflicts, and exit reminders.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
from ..models.booking import Booking
from ..repositories.booking_repository import BookingRepository
from ..repositories.user_repository import UserRepository
from ..utils.exceptions import ConflictError


class BookingService:
    """Service for booking-related operations."""
    
    def __init__(self):
        self.booking_repository = BookingRepository()
        self.user_repository = UserRepository()
    
    def create_booking(self, user_id: str, start_date: str, end_date: str, notes: Optional[str] = None) -> str:
        """
        Create a new booking.
        
        Args:
            user_id: ID of the user creating the booking
            start_date: Start date of the booking (YYYY-MM-DD format)
            end_date: End date of the booking (YYYY-MM-DD format)
            notes: Optional notes for the booking
            
        Returns:
            str: ID of the created booking
            
        Raises:
            ValueError: If validation fails, dates are invalid, or conflicts exist
            Exception: If repository operation fails
        """
        # Validate inputs
        if not user_id or not user_id.strip():
            raise ValueError("User ID is required")
        if not start_date or not start_date.strip():
            raise ValueError("Start date is required")
        if not end_date or not end_date.strip():
            raise ValueError("End date is required")
        
        # Parse and validate dates
        try:
            start_date_obj = date.fromisoformat(start_date.strip())
            end_date_obj = date.fromisoformat(end_date.strip())
        except ValueError as e:
            raise ValueError(f"Invalid date format. Use YYYY-MM-DD: {str(e)}")
        
        # Validate date logic
        if start_date_obj >= end_date_obj:
            raise ValueError("End date must be after start date")
        
        # Check if booking is in the past
        today = date.today()
        if start_date_obj < today:
            raise ValueError("Cannot create bookings for past dates")
        
        # Check booking duration (max 30 days)
        duration = (end_date_obj - start_date_obj).days
        if duration > 30:
            raise ValueError("Booking duration cannot exceed 30 days")
        
        # Get user and validate
        try:
            user = self.user_repository.get_by_id(user_id)
            if not user:
                raise ValueError(f"User with ID {user_id} not found")
        except Exception as e:
            print(f"Error: Failed to get user {user_id}: {str(e)}")
            raise ValueError("Failed to validate user") from e
        
        # Check for conflicts
        try:
            # Convert date objects to strings for the repository method
            conflicts = self.booking_repository.get_conflicting_bookings(
                start_date_obj.isoformat(), 
                end_date_obj.isoformat()
            )
            if conflicts:
                conflict_details = []
                for conflict in conflicts:
                    conflict_details.append(f"{conflict.user_name} ({conflict.start_date} - {conflict.end_date})")
                raise ConflictError(f"Booking conflicts with existing bookings: {', '.join(conflict_details)}")
        except (ValueError, ConflictError):
            raise  # Re-raise validation errors
        except Exception as e:
            print(f"Error: Failed to check booking conflicts: {str(e)}")
            raise Exception("Failed to check booking availability") from e
        
        # Prepare booking data
        booking_data = {
            'user_id': user_id,
            'user_name': user.name,
            'start_date': start_date.strip(),
            'end_date': end_date.strip(),
            'notes': notes.strip() if notes else ''
        }
        
        # Create booking
        try:
            booking_id = self.booking_repository.create_booking(booking_data)
            print(f"Info: Created booking {booking_id} for user {user_id} from {start_date} to {end_date}")
            return booking_id
        except Exception as e:
            print(f"Error: Failed to create booking for user {user_id}: {str(e)}")
            raise Exception("Failed to create booking") from e
    
    def get_bookings(self, user_id: Optional[str] = None) -> List[Booking]:
        """
        Get bookings with optional user filter.
        
        Args:
            user_id: Optional user ID filter
            
        Returns:
            List[Booking]: List of bookings
        """
        return self.booking_repository.get_bookings(user_id)
    
    def get_booking_by_id(self, booking_id: str) -> Optional[Booking]:
        """
        Get a booking by ID.
        
        Args:
            booking_id: ID of the booking
            
        Returns:
            Optional[Booking]: Booking or None
        """
        return self.booking_repository.get_booking_by_id(booking_id)
    
    def update_booking(self, booking_id: str, update_data: Dict[str, Any]) -> bool:
        """
        Update a booking.
        
        Args:
            booking_id: ID of the booking
            update_data: Data to update
            
        Returns:
            bool: True if updated successfully
        """
        return self.booking_repository.update_booking(booking_id, update_data)
    
    def cancel_booking(self, booking_id: str) -> Optional[Booking]:
        """
        Cancel a booking.
        
        Args:
            booking_id: ID of the booking to cancel
            
        Returns:
            Optional[Booking]: The cancelled booking if successful, None otherwise
        """
        success = self.booking_repository.cancel_booking(booking_id)
        if success:
            return self.booking_repository.get_booking_by_id(booking_id)
        return None
    
    def mark_exit_checklist_completed(self, booking_id: str, checklist_id: str) -> bool:
        """
        Mark exit checklist as completed for a booking.
        
        Args:
            booking_id: ID of the booking
            checklist_id: ID of the completed checklist
            
        Returns:
            bool: True if updated successfully
        """
        return self.booking_repository.mark_exit_checklist_completed(booking_id, checklist_id)
    
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
        return self.booking_repository.get_conflicting_bookings(start_date, end_date, exclude_booking_id)
    
    def get_upcoming_bookings(self, days: int = 30) -> List[Booking]:
        """
        Get upcoming bookings within the specified number of days.
        
        Args:
            days: Number of days to look ahead
            
        Returns:
            List[Booking]: List of upcoming bookings
        """
        today = datetime.now().date()
        future_date = today + timedelta(days=days)
        
        all_bookings = self.get_bookings()
        upcoming_bookings = []
        
        for booking in all_bookings:
            if not booking.is_cancelled:
                booking_start = datetime.fromisoformat(booking.start_date.replace('Z', '+00:00')).date()
                if today <= booking_start <= future_date:
                    upcoming_bookings.append(booking)
        
        return upcoming_bookings
    
    def get_today_bookings(self) -> List[Booking]:
        """
        Get bookings for today.
        
        Returns:
            List[Booking]: List of today's bookings
        """
        today = datetime.now().date()
        all_bookings = self.get_bookings()
        today_bookings = []
        
        for booking in all_bookings:
            if not booking.is_cancelled:
                booking_start = datetime.fromisoformat(booking.start_date.replace('Z', '+00:00')).date()
                booking_end = datetime.fromisoformat(booking.end_date.replace('Z', '+00:00')).date()
                if booking_start <= today <= booking_end:
                    today_bookings.append(booking)
        
        return today_bookings
    
    def get_bookings_needing_exit_reminder(self) -> List[Booking]:
        """
        Get bookings that need exit reminders (ending today without completed checklist).
        
        Returns:
            List[Booking]: List of bookings needing exit reminders
        """
        today = datetime.now().date()
        all_bookings = self.get_bookings()
        reminder_bookings = []
        
        for booking in all_bookings:
            if not booking.is_cancelled and not booking.exit_checklist_completed:
                booking_end = datetime.fromisoformat(booking.end_date.replace('Z', '+00:00')).date()
                if booking_end == today:
                    reminder_bookings.append(booking)
        
        return reminder_bookings
    
    def get_current_bookings_count(self) -> int:
        """
        Get count of current (active) bookings.
        
        Returns:
            int: Number of current bookings
        """
        current_bookings = self.get_today_bookings()
        return len(current_bookings)
    
    def get_upcoming_bookings_limited(self, limit: int = 5) -> List[Booking]:
        """
        Get upcoming bookings with limit.
        
        Args:
            limit: Maximum number of bookings to return
            
        Returns:
            List[Booking]: List of upcoming bookings
        """
        upcoming_bookings = self.get_upcoming_bookings(days=30)
        return upcoming_bookings[:limit] 