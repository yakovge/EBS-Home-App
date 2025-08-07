"""
Scheduler service for handling background tasks and scheduled notifications.
Manages exit reminders, booking conflicts, and maintenance follow-ups.
"""

import threading
import time
from datetime import datetime, timedelta, date
from typing import List
from .booking_service import BookingService
from .notification_service import NotificationService


class SchedulerService:
    """Service for managing scheduled background tasks."""
    
    def __init__(self):
        self.booking_service = BookingService()
        self.notification_service = NotificationService()
        self.running = False
        self.thread = None
    
    def start(self):
        """Start the scheduler service in a background thread."""
        if self.running:
            print("Scheduler service is already running")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        print("Scheduler service started")
    
    def stop(self):
        """Stop the scheduler service."""
        if not self.running:
            return
        
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)  # Wait up to 5 seconds
        print("Scheduler service stopped")
    
    def _run_scheduler(self):
        """Main scheduler loop."""
        while self.running:
            try:
                # Check for exit reminders every hour
                self._check_exit_reminders()
                
                # Sleep for 1 hour (3600 seconds)
                # In production, this could be more sophisticated with cron-like scheduling
                time.sleep(3600)
                
            except Exception as e:
                print(f"Error in scheduler loop: {e}")
                # Continue running even if there's an error
                time.sleep(60)  # Wait 1 minute before retrying
    
    def _check_exit_reminders(self):
        """Check for bookings that need exit reminders."""
        try:
            today = date.today()
            tomorrow = today + timedelta(days=1)
            
            # Get all active bookings ending today or tomorrow
            all_bookings = self.booking_service.get_bookings()
            
            for booking in all_bookings:
                if booking.is_cancelled:
                    continue
                
                # Parse booking end date
                try:
                    end_date = datetime.fromisoformat(booking.end_date).date()
                except ValueError:
                    # Try parsing as date string without time
                    end_date = datetime.strptime(booking.end_date, '%Y-%m-%d').date()
                
                # Check if booking ends today and exit checklist not completed
                if end_date == today and not booking.exit_checklist_completed:
                    self._send_exit_reminder(booking)
                
                # Check if booking ends tomorrow (advance notice)
                elif end_date == tomorrow and not booking.exit_checklist_completed:
                    self._send_advance_exit_reminder(booking)
                    
        except Exception as e:
            print(f"Error checking exit reminders: {e}")
    
    def _send_exit_reminder(self, booking):
        """Send exit reminder for booking ending today."""
        try:
            message = f"Your stay ends today. Please complete the exit checklist before leaving."
            
            success = self.notification_service.send_exit_reminder(
                booking.user_id, 
                booking.id
            )
            
            if success:
                print(f"Exit reminder sent to user {booking.user_id} for booking {booking.id}")
            else:
                print(f"Failed to send exit reminder to user {booking.user_id}")
                
        except Exception as e:
            print(f"Error sending exit reminder: {e}")
    
    def _send_advance_exit_reminder(self, booking):
        """Send advance exit reminder for booking ending tomorrow."""
        try:
            # Only send advance reminder once per booking
            # In a real implementation, you'd track which reminders have been sent
            
            # For now, just log that we would send an advance reminder
            print(f"Advance exit reminder due for user {booking.user_id}, booking {booking.id}")
            # Could implement actual sending if needed
            
        except Exception as e:
            print(f"Error sending advance exit reminder: {e}")
    
    def send_immediate_exit_reminder(self, booking_id: str):
        """Send immediate exit reminder for a specific booking (for testing)."""
        try:
            bookings = self.booking_service.get_bookings()
            booking = next((b for b in bookings if b.id == booking_id), None)
            
            if booking and not booking.is_cancelled:
                self._send_exit_reminder(booking)
            else:
                print(f"Booking {booking_id} not found or cancelled")
                
        except Exception as e:
            print(f"Error sending immediate exit reminder: {e}")
    
    def check_booking_conflicts(self, user_id: str, start_date: str, end_date: str) -> List[str]:
        """
        Check for booking conflicts and return list of conflicting dates.
        
        Args:
            user_id: ID of the user making the booking
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            
        Returns:
            List of conflicting dates
        """
        try:
            conflicting_dates = []
            
            # Parse dates
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            # Get all active bookings
            all_bookings = self.booking_service.get_bookings()
            
            for booking in all_bookings:
                if booking.is_cancelled or booking.user_id == user_id:
                    continue
                
                # Parse booking dates
                booking_start = datetime.strptime(booking.start_date, '%Y-%m-%d').date()
                booking_end = datetime.strptime(booking.end_date, '%Y-%m-%d').date()
                
                # Check for overlap
                if start <= booking_end and end >= booking_start:
                    # Find overlapping dates
                    overlap_start = max(start, booking_start)
                    overlap_end = min(end, booking_end)
                    
                    current_date = overlap_start
                    while current_date <= overlap_end:
                        conflicting_dates.append(current_date.strftime('%Y-%m-%d'))
                        current_date += timedelta(days=1)
            
            return conflicting_dates
            
        except Exception as e:
            print(f"Error checking booking conflicts: {e}")
            return []


# Global scheduler instance
scheduler_service = SchedulerService()