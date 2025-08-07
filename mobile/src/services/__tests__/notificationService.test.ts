/**
 * Tests for notification service functionality
 */

import { notificationService, NotificationData } from '../notificationService';

// Mock Expo modules
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  setBadgeCountAsync: jest.fn(),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FCM Token Registration', () => {
    it('should handle token registration with backend', async () => {
      const mockApiPost = require('../api').apiClient.post;
      const mockAsyncStorage = require('@react-native-async-storage/async-storage');
      const mockNotifications = require('expo-notifications');

      // Mock successful permission and token retrieval
      mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[test-token]' });
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockApiPost.mockResolvedValue({ data: { success: true } });

      const result = await notificationService.initialize();

      expect(result).toBe(true);
      expect(mockApiPost).toHaveBeenCalledWith('/users/fcm-token', {
        fcm_token: 'ExponentPushToken[test-token]',
      });
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('expo_push_token', 'ExponentPushToken[test-token]');
    });

    it('should handle permission denied', async () => {
      const mockNotifications = require('expo-notifications');

      mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
      mockNotifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const result = await notificationService.initialize();

      expect(result).toBe(false);
    });

    it('should handle token retrieval failure gracefully', async () => {
      const mockApiPost = require('../api').apiClient.post;
      const mockNotifications = require('expo-notifications');

      mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'test-token' });
      mockApiPost.mockRejectedValue(new Error('Network error'));

      const result = await notificationService.initialize();

      // Should still return true even if backend registration fails
      expect(result).toBe(true);
    });
  });

  describe('Local Notifications', () => {
    it('should show local notification with correct data', async () => {
      const mockNotifications = require('expo-notifications');
      mockNotifications.scheduleNotificationAsync.mockResolvedValue('notification-id');

      const notificationData: NotificationData = {
        type: 'maintenance',
        id: 'maint-123',
        title: 'New Maintenance Request',
        message: 'A new maintenance request has been created',
        data: { location: 'Kitchen' }
      };

      await notificationService.showLocalNotification(notificationData);

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'New Maintenance Request',
          body: 'A new maintenance request has been created',
          data: {
            type: 'maintenance',
            id: 'maint-123',
            location: 'Kitchen',
          },
        },
        trigger: null,
      });
    });
  });

  describe('Notification Handling', () => {
    it('should handle notification interactions correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {
                type: 'maintenance',
                id: 'maint-123'
              }
            }
          }
        }
      } as any;

      notificationService.handleNotificationInteraction(mockResponse);

      expect(consoleSpy).toHaveBeenCalledWith('Navigate to maintenance:', 'maint-123');
      
      consoleSpy.mockRestore();
    });

    it('should handle unknown notification types', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {
                type: 'unknown',
                id: 'test-123'
              }
            }
          }
        }
      } as any;

      notificationService.handleNotificationInteraction(mockResponse);

      expect(consoleSpy).toHaveBeenCalledWith('Unknown notification type:', 'unknown');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Scheduled Notifications', () => {
    it('should schedule exit reminder for future date', async () => {
      const mockNotifications = require('expo-notifications');
      mockNotifications.scheduleNotificationAsync.mockResolvedValue('reminder-id');

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

      await notificationService.scheduleExitReminder('booking-123', futureDate);

      const expectedReminderTime = new Date(futureDate);
      expectedReminderTime.setHours(10, 0, 0, 0);

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Exit Checklist Reminder',
          body: 'Please complete your exit checklist before leaving the house.',
          data: {
            type: 'reminder',
            bookingId: 'booking-123',
          },
        },
        trigger: {
          date: expectedReminderTime,
        },
      });
    });

    it('should not schedule exit reminder for past date', async () => {
      const mockNotifications = require('expo-notifications');
      mockNotifications.scheduleNotificationAsync.mockResolvedValue('reminder-id');

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      await notificationService.scheduleExitReminder('booking-123', pastDate);

      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('Token Management', () => {
    it('should retrieve token from storage if not in memory', async () => {
      const mockAsyncStorage = require('@react-native-async-storage/async-storage');
      const mockNotifications = require('expo-notifications');
      
      // Clear any cached token by resetting the service state
      (notificationService as any).expoPushToken = null;
      
      mockAsyncStorage.getItem.mockResolvedValue('stored-token');
      mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'stored-token' });

      const token = await notificationService.getPushToken();

      expect(token).toBe('stored-token');
    });

    it('should return null if no token available', async () => {
      const mockAsyncStorage = require('@react-native-async-storage/async-storage');
      const mockNotifications = require('expo-notifications');
      
      // Clear any cached token by resetting the service state
      (notificationService as any).expoPushToken = null;
      
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
      mockNotifications.getExpoPushTokenAsync.mockRejectedValue(new Error('No token'));

      const token = await notificationService.getPushToken();

      expect(token).toBeNull();
    });
  });
});