"""
Integration tests for push notification functionality.
Tests FCM token registration and notification sending.
"""

import pytest
from unittest.mock import patch, MagicMock
from src.services.notification_service import NotificationService
from src.repositories.user_repository import UserRepository
from src.models.user import User


class TestPushNotificationIntegration:
    """Integration tests for push notification functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.notification_service = NotificationService()
        self.user_repository = UserRepository()

    @patch('firebase_admin.messaging.send')
    def test_send_fcm_notification_success(self, mock_send):
        """Test successful FCM notification sending."""
        # Mock successful FCM send
        mock_send.return_value = "message-id-123"

        # Test FCM notification sending
        result = self.notification_service._send_fcm_notification(
            token="ExponentPushToken[test]",
            title="Test Notification",
            body="Test message",
            data={"type": "test"}
        )

        assert result is True
        mock_send.assert_called_once()

    @patch('firebase_admin.messaging.send')
    def test_send_fcm_notification_failure(self, mock_send):
        """Test FCM notification sending failure handling."""
        # Mock FCM send failure
        mock_send.side_effect = Exception("FCM error")

        # Test FCM notification sending failure
        result = self.notification_service._send_fcm_notification(
            token="invalid-token",
            title="Test Notification",
            body="Test message",
            data={"type": "test"}
        )

        assert result is False
        mock_send.assert_called_once()

    def test_send_booking_confirmation(self):
        """Test booking confirmation notification."""
        # This tests the notification flow without actual FCM sending
        with patch.object(self.notification_service, '_send_fcm_notification', return_value=True) as mock_send:
            with patch.object(self.user_repository, 'get_user_by_id') as mock_get_user:
                # Mock user with FCM token
                mock_user = MagicMock()
                mock_user.fcm_token = "ExponentPushToken[test]"
                mock_user.name = "Test User"
                mock_get_user.return_value = mock_user

                result = self.notification_service.send_booking_confirmation("user-123", "booking-456")

                assert result is True
                mock_send.assert_called_once()
                # Verify notification content
                call_args = mock_send.call_args
                assert "Booking Confirmed" in call_args[1]['title']
                assert call_args[1]['data']['type'] == 'booking_confirmation'
                assert call_args[1]['data']['booking_id'] == 'booking-456'

    def test_send_maintenance_notification(self):
        """Test maintenance notification sending."""
        with patch.object(self.notification_service, '_send_fcm_notification', return_value=True) as mock_send:
            with patch.object(self.user_repository, 'get_maintenance_person') as mock_get_maintenance:
                # Mock maintenance person with FCM token
                mock_user = MagicMock()
                mock_user.fcm_token = "ExponentPushToken[maintenance]"
                mock_user.name = "Maintenance Person"
                mock_get_maintenance.return_value = mock_user

                result = self.notification_service.send_maintenance_notification(
                    "request-123", "New maintenance request: Broken faucet"
                )

                assert result is True
                mock_send.assert_called_once()
                # Verify notification content
                call_args = mock_send.call_args
                assert "New Maintenance Request" in call_args[1]['title']
                assert call_args[1]['data']['type'] == 'maintenance_notification'
                assert call_args[1]['data']['request_id'] == 'request-123'

    def test_send_exit_reminder(self):
        """Test exit reminder notification."""
        with patch.object(self.notification_service, '_send_fcm_notification', return_value=True) as mock_send:
            with patch.object(self.user_repository, 'get_user_by_id') as mock_get_user:
                # Mock user with FCM token
                mock_user = MagicMock()
                mock_user.fcm_token = "ExponentPushToken[user]"
                mock_user.name = "Test User"
                mock_get_user.return_value = mock_user

                result = self.notification_service.send_exit_reminder("user-123", "booking-456")

                assert result is True
                mock_send.assert_called_once()
                # Verify notification content
                call_args = mock_send.call_args
                assert "Exit Checklist Reminder" in call_args[1]['title']
                assert call_args[1]['data']['type'] == 'exit_reminder'
                assert call_args[1]['data']['booking_id'] == 'booking-456'

    def test_send_notification_without_fcm_token(self):
        """Test notification sending when user has no FCM token."""
        with patch.object(self.user_repository, 'get_user_by_id') as mock_get_user:
            # Mock user without FCM token
            mock_user = MagicMock()
            mock_user.fcm_token = None
            mock_user.name = "Test User"
            mock_get_user.return_value = mock_user

            result = self.notification_service.send_booking_confirmation("user-123", "booking-456")

            assert result is False

    def test_send_notification_user_not_found(self):
        """Test notification sending when user is not found."""
        with patch.object(self.user_repository, 'get_user_by_id', return_value=None):
            result = self.notification_service.send_booking_confirmation("nonexistent-user", "booking-456")
            assert result is False

    def test_notification_graceful_failure(self):
        """Test that notification failures don't break main functionality."""
        with patch.object(self.notification_service, '_send_fcm_notification', side_effect=Exception("Network error")):
            with patch.object(self.user_repository, 'get_user_by_id') as mock_get_user:
                mock_user = MagicMock()
                mock_user.fcm_token = "ExponentPushToken[test]"
                mock_user.name = "Test User"
                mock_get_user.return_value = mock_user

                # Should not raise exception, just return False
                result = self.notification_service.send_booking_confirmation("user-123", "booking-456")
                assert result is False

    @patch('src.services.notification_service.messaging.send')
    def test_notification_data_structure(self, mock_send):
        """Test that notification data structure is correct for FCM."""
        mock_send.return_value = "message-id"

        # Test the actual FCM message structure
        result = self.notification_service._send_fcm_notification(
            token="ExponentPushToken[test]",
            title="Test Title",
            body="Test Body",
            data={"type": "test", "id": "123"}
        )

        assert result is True
        # Verify the FCM message structure
        call_args = mock_send.call_args
        message = call_args[0][0]
        
        # Check notification structure
        assert message.notification.title == "Test Title"
        assert message.notification.body == "Test Body"
        assert message.data == {"type": "test", "id": "123"}
        assert message.token == "ExponentPushToken[test]"