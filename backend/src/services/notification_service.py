"""
Notification service for handling push notifications and messaging.
Manages FCM notifications for maintenance, bookings, and reminders.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from ..repositories.user_repository import UserRepository


class NotificationService:
    """Service for notification-related operations."""
    
    def __init__(self):
        self.user_repository = UserRepository()
    
    def send_maintenance_notification(self, maintenance_request_id: str, message: str) -> bool:
        """
        Send notification to maintenance person about new request.
        
        Args:
            maintenance_request_id: ID of the maintenance request
            message: Notification message
            
        Returns:
            bool: True if sent successfully
        """
        # TODO: Implement FCM notification to maintenance person
        print(f"Maintenance notification: {message}")
        return True
    
    def send_completion_notification(self, maintenance_request_id: str, message: str) -> bool:
        """
        Send notification to Yaffa about completed maintenance.
        
        Args:
            maintenance_request_id: ID of the maintenance request
            message: Notification message
            
        Returns:
            bool: True if sent successfully
        """
        # TODO: Implement FCM notification to Yaffa
        print(f"Completion notification to Yaffa: {message}")
        return True
    
    def send_exit_reminder(self, user_id: str, booking_id: str) -> bool:
        """
        Send exit checklist reminder to user.
        
        Args:
            user_id: ID of the user
            booking_id: ID of the booking
            
        Returns:
            bool: True if sent successfully
        """
        # TODO: Implement FCM notification to user
        print(f"Exit reminder sent to user {user_id} for booking {booking_id}")
        return True
    
    def send_booking_confirmation(self, user_id: str, booking_id: str) -> bool:
        """
        Send booking confirmation to user.
        
        Args:
            user_id: ID of the user
            booking_id: ID of the booking
            
        Returns:
            bool: True if sent successfully
        """
        # TODO: Implement FCM notification to user
        print(f"Booking confirmation sent to user {user_id} for booking {booking_id}")
        return True
    
    def send_booking_conflict_notification(self, user_id: str, conflicting_dates: List[str]) -> bool:
        """
        Send notification about booking conflicts.
        
        Args:
            user_id: ID of the user
            conflicting_dates: List of conflicting dates
            
        Returns:
            bool: True if sent successfully
        """
        # TODO: Implement FCM notification to user
        print(f"Booking conflict notification sent to user {user_id}")
        return True
    
    def update_user_fcm_token(self, user_id: str, fcm_token: str) -> bool:
        """
        Update user's FCM token for notifications.
        
        Args:
            user_id: ID of the user
            fcm_token: FCM token
            
        Returns:
            bool: True if updated successfully
        """
        update_data = {
            'fcm_token': fcm_token,
            'updated_at': datetime.utcnow().isoformat()
        }
        return self.user_repository.update_user(user_id, update_data)
    
    def get_users_for_notification(self, notification_type: str) -> List[Dict[str, Any]]:
        """
        Get users who should receive a specific type of notification.
        
        Args:
            notification_type: Type of notification (maintenance, booking, etc.)
            
        Returns:
            List[Dict[str, Any]]: List of users with their FCM tokens
        """
        all_users = self.user_repository.get_all_users()
        target_users = []
        
        for user in all_users:
            if notification_type == 'maintenance' and user.is_maintenance_person:
                target_users.append({
                    'user_id': user.id,
                    'fcm_token': getattr(user, 'fcm_token', None),
                    'name': user.name
                })
            elif notification_type == 'completion' and user.is_yaffa:
                target_users.append({
                    'user_id': user.id,
                    'fcm_token': getattr(user, 'fcm_token', None),
                    'name': user.name
                })
        
        return target_users 