"""
Notification service for handling push notifications and messaging.
Manages FCM notifications, real-time WebSocket notifications for maintenance, bookings, and reminders.
"""

import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from firebase_admin import messaging
from ..repositories.user_repository import UserRepository
from ..utils.firebase_config import initialize_firebase


class NotificationService:
    """Service for notification-related operations."""
    
    def __init__(self):
        self.user_repository = UserRepository()
        self._realtime_service = None  # Will be injected later to avoid circular imports
        initialize_firebase()  # Ensure Firebase is initialized
    
    def set_realtime_service(self, realtime_service):
        """Inject the real-time service to avoid circular imports."""
        self._realtime_service = realtime_service
    
    def send_maintenance_notification(self, maintenance_request_id: str, message: str) -> bool:
        """
        Send notification to maintenance person about new request.
        Sends both FCM push notification and real-time WebSocket notification.
        
        Args:
            maintenance_request_id: ID of the maintenance request
            message: Notification message
            
        Returns:
            bool: True if sent successfully
        """
        try:
            # Get maintenance person users
            maintenance_users = self.get_users_for_notification('maintenance')
            
            if not maintenance_users:
                print("No maintenance users found to notify")
                return False
            
            notification_data = {
                'type': 'maintenance_notification',
                'request_id': maintenance_request_id,
                'title': 'New Maintenance Request',
                'message': message,
                'timestamp': datetime.now().isoformat()
            }
            
            fcm_sent = False
            realtime_sent = False
            
            # Send FCM notifications to individual users
            for user in maintenance_users:
                if user.get('fcm_token'):
                    success = self._send_fcm_notification(
                        token=user['fcm_token'],
                        title="New Maintenance Request",
                        body=message,
                        data={
                            'type': 'maintenance_notification',
                            'request_id': maintenance_request_id
                        }
                    )
                    if success:
                        fcm_sent = True
            
            # Send real-time notification to maintenance role
            if self._realtime_service:
                realtime_sent = self._realtime_service.broadcast_to_role(
                    'maintenance', 
                    'maintenance_notification', 
                    notification_data
                )
            
            result = fcm_sent or realtime_sent
            if result:
                print(f"Maintenance notification sent successfully (FCM: {fcm_sent}, Real-time: {realtime_sent})")
            
            return result
            
        except Exception as e:
            print(f"Error sending maintenance notification: {str(e)}")
            return False
    
    def send_completion_notification(self, maintenance_request_id: str, message: str) -> bool:
        """
        Send notification to Yaffa about completed maintenance.
        
        Args:
            maintenance_request_id: ID of the maintenance request
            message: Notification message
            
        Returns:
            bool: True if sent successfully
        """
        try:
            # Get Yaffa users
            yaffa_users = self.get_users_for_notification('completion')
            
            if not yaffa_users:
                print("No Yaffa users found to notify")
                return False
                
            for user in yaffa_users:
                if user.get('fcm_token'):
                    self._send_fcm_notification(
                        token=user['fcm_token'],
                        title="Maintenance Completed",
                        body=message,
                        data={
                            'type': 'completion',
                            'maintenance_id': maintenance_request_id
                        }
                    )
            
            return True
        except Exception as e:
            print(f"Error sending completion notification: {str(e)}")
            return False
    
    def send_exit_reminder(self, user_id: str, booking_id: str) -> bool:
        """
        Send exit checklist reminder to user.
        Sends both FCM push notification and real-time WebSocket notification.
        
        Args:
            user_id: ID of the user
            booking_id: ID of the booking
            
        Returns:
            bool: True if sent successfully
        """
        try:
            # Get specific user
            user = self.user_repository.get_user_by_id(user_id)
            
            notification_data = {
                'type': 'exit_reminder',
                'booking_id': booking_id,
                'title': 'Exit Checklist Reminder',
                'message': 'Please complete your exit checklist before leaving the house.',
                'timestamp': datetime.now().isoformat()
            }
            
            fcm_sent = False
            realtime_sent = False
            
            # Send FCM notification
            if user and hasattr(user, 'fcm_token') and user.fcm_token:
                fcm_sent = self._send_fcm_notification(
                    token=user.fcm_token,
                    title="Exit Checklist Reminder",
                    body="Please complete your exit checklist before leaving the house.",
                    data={
                        'type': 'exit_reminder',
                        'booking_id': booking_id
                    }
                )
            
            # Send real-time notification to user
            if self._realtime_service:
                realtime_sent = self._realtime_service.broadcast_to_user(
                    user_id,
                    'exit_reminder',
                    notification_data
                )
            
            result = fcm_sent or realtime_sent
            if result:
                print(f"Exit reminder sent successfully (FCM: {fcm_sent}, Real-time: {realtime_sent})")
            
            return result
            
        except Exception as e:
            print(f"Error sending exit reminder: {str(e)}")
            return False
    
    def send_booking_confirmation(self, user_id: str, booking_id: str) -> bool:
        """
        Send booking confirmation to user.
        Sends both FCM push notification and real-time WebSocket notification.
        
        Args:
            user_id: ID of the user
            booking_id: ID of the booking
            
        Returns:
            bool: True if sent successfully
        """
        try:
            # Get specific user
            user = self.user_repository.get_user_by_id(user_id)
            
            notification_data = {
                'type': 'booking_confirmation',
                'booking_id': booking_id,
                'title': 'Booking Confirmed',
                'message': 'Your booking has been confirmed successfully!',
                'timestamp': datetime.now().isoformat()
            }
            
            fcm_sent = False
            realtime_sent = False
            
            # Send FCM notification
            if user and hasattr(user, 'fcm_token') and user.fcm_token:
                fcm_sent = self._send_fcm_notification(
                    token=user.fcm_token,
                    title="Booking Confirmed",
                    body="Your booking has been confirmed successfully!",
                    data={
                        'type': 'booking_confirmation',
                        'booking_id': booking_id
                    }
                )
            
            # Send real-time notification to user
            if self._realtime_service:
                realtime_sent = self._realtime_service.broadcast_to_user(
                    user_id,
                    'booking_confirmation',
                    notification_data
                )
            
            result = fcm_sent or realtime_sent
            if result:
                print(f"Booking confirmation sent successfully (FCM: {fcm_sent}, Real-time: {realtime_sent})")
            
            return result
        except Exception as e:
            print(f"Error sending booking confirmation: {str(e)}")
            return False
    
    def send_booking_conflict_notification(self, user_id: str, conflicting_dates: List[str]) -> bool:
        """
        Send notification about booking conflicts.
        
        Args:
            user_id: ID of the user
            conflicting_dates: List of conflicting dates
            
        Returns:
            bool: True if sent successfully
        """
        try:
            # Get specific user
            user = self.user_repository.get_user_by_id(user_id)
            if not user or not hasattr(user, 'fcm_token') or not user.fcm_token:
                print(f"No FCM token found for user {user_id}")
                return False
                
            dates_str = ", ".join(conflicting_dates[:3])  # Show first 3 dates
            if len(conflicting_dates) > 3:
                dates_str += f" (+{len(conflicting_dates) - 3} more)"
                
            self._send_fcm_notification(
                token=user.fcm_token,
                title="Booking Conflict",
                body=f"Your booking conflicts with existing reservations on: {dates_str}",
                data={
                    'type': 'booking',
                    'conflict': 'true'
                }
            )
            
            return True
        except Exception as e:
            print(f"Error sending booking conflict notification: {str(e)}")
            return False
    
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
    
    def _send_fcm_notification(self, token: str, title: str, body: str, data: Dict[str, str]) -> bool:
        """
        Send FCM notification to a specific token.
        
        Args:
            token: FCM token
            title: Notification title
            body: Notification body
            data: Additional data payload
            
        Returns:
            bool: True if sent successfully
        """
        try:
            # Create FCM message
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data,
                token=token
            )
            
            # Send message
            response = messaging.send(message)
            print(f"FCM notification sent successfully: {response}")
            return True
            
        except messaging.InvalidArgumentError as e:
            print(f"Invalid FCM token or message: {str(e)}")
            # Consider removing invalid token from database
            return False
        except messaging.UnregisteredError as e:
            print(f"FCM token is unregistered: {str(e)}")
            # Consider removing unregistered token from database
            return False
        except Exception as e:
            print(f"Error sending FCM notification: {str(e)}")
            return False
    
    def send_to_multiple_tokens(self, tokens: List[str], title: str, body: str, data: Dict[str, str]) -> Dict[str, bool]:
        """
        Send notification to multiple FCM tokens.
        
        Args:
            tokens: List of FCM tokens
            title: Notification title
            body: Notification body
            data: Additional data payload
            
        Returns:
            Dict[str, bool]: Results for each token
        """
        results = {}
        
        for token in tokens:
            results[token] = self._send_fcm_notification(token, title, body, data)
        
        return results