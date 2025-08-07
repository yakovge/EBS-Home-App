/**
 * Push notification service for React Native mobile app.
 * Handles Expo notifications, FCM tokens, and notification display.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api';
import { Config } from '../config';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationData {
  type: 'maintenance' | 'booking' | 'reminder' | 'completion';
  id?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

class NotificationService {
  private expoPushToken: string | null = null;

  /**
   * Initialize notification service and request permissions
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if running on physical device (required for push notifications)
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return false;
      }

      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      // Get Expo push token
      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: Config.NOTIFICATION_PROJECT_ID,
        });
        this.expoPushToken = token.data;
        console.log('Expo push token:', this.expoPushToken);

        // Save token to storage
        await AsyncStorage.setItem('expo_push_token', this.expoPushToken);

        // Send token to backend for user registration
        await this.registerTokenWithBackend();

        return true;
      } catch (error) {
        console.error('Error getting Expo push token:', error);
        return false;
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  /**
   * Register FCM token with the backend for the current user
   */
  private async registerTokenWithBackend(): Promise<void> {
    if (!this.expoPushToken) {
      console.log('No push token available to register');
      return;
    }

    try {
      await apiClient.post('/users/fcm-token', {
        fcm_token: this.expoPushToken,
      });
      console.log('FCM token registered with backend');
    } catch (error) {
      console.error('Failed to register FCM token with backend:', error);
    }
  }

  /**
   * Get current Expo push token
   */
  async getPushToken(): Promise<string | null> {
    if (this.expoPushToken) {
      return this.expoPushToken;
    }

    // Try to get from storage
    const storedToken = await AsyncStorage.getItem('expo_push_token');
    if (storedToken) {
      this.expoPushToken = storedToken;
      return storedToken;
    }

    return null;
  }

  /**
   * Show local notification (for testing or immediate feedback)
   */
  async showLocalNotification(data: NotificationData): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.message,
          data: {
            type: data.type,
            id: data.id,
            ...data.data,
          },
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  /**
   * Schedule exit reminder notification
   */
  async scheduleExitReminder(bookingId: string, exitDate: Date): Promise<void> {
    try {
      // Schedule reminder for the day of checkout
      const reminderTime = new Date(exitDate);
      reminderTime.setHours(10, 0, 0, 0); // 10 AM on checkout day

      if (reminderTime > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Exit Checklist Reminder',
            body: 'Please complete your exit checklist before leaving the house.',
            data: {
              type: 'reminder',
              bookingId,
            },
          },
          trigger: {
            date: reminderTime,
          },
        });

        console.log(`Exit reminder scheduled for ${reminderTime.toISOString()}`);
      }
    } catch (error) {
      console.error('Error scheduling exit reminder:', error);
    }
  }

  /**
   * Cancel all scheduled notifications for a booking
   */
  async cancelBookingNotifications(bookingId: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.bookingId === bookingId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      console.log(`Cancelled notifications for booking ${bookingId}`);
    } catch (error) {
      console.error('Error cancelling booking notifications:', error);
    }
  }

  /**
   * Handle notification tap/interaction
   */
  handleNotificationInteraction(notification: Notifications.NotificationResponse): void {
    const { type, id } = notification.notification.request.content.data || {};
    
    console.log('Notification tapped:', type, id);

    // Handle different notification types
    switch (type) {
      case 'maintenance':
        // Navigate to maintenance detail
        console.log('Navigate to maintenance:', id);
        break;
      case 'booking':
        // Navigate to booking detail
        console.log('Navigate to booking:', id);
        break;
      case 'reminder':
        // Navigate to checklist
        console.log('Navigate to checklist:', id);
        break;
      case 'completion':
        // Navigate to maintenance or show completion message
        console.log('Maintenance completed:', id);
        break;
      default:
        console.log('Unknown notification type:', type);
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received in foreground:', notification);
    });

    // Handle notification tap when app is in background/closed
    Notifications.addNotificationResponseReceivedListener((response) => {
      this.handleNotificationInteraction(response);
    });

    console.log('Notification listeners set up');
  }

  /**
   * Get notification permission status
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  /**
   * Clear app badge number
   */
  async clearBadge(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(0);
    }
  }

  /**
   * Get all scheduled notifications (for debugging)
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();