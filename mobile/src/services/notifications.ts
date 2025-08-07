/**
 * Push notification service for handling Firebase Cloud Messaging
 * Manages notification permissions, token handling, and message processing
 */

import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { apiClient } from './api'

export interface NotificationData {
  type: 'maintenance_request' | 'maintenance_update' | 'booking_reminder' | 'checklist_reminder'
  id?: string
  title: string
  body: string
  data?: Record<string, any>
}

export interface PushNotificationToken {
  token: string
  platform: 'ios' | 'android' | 'web'
}

class NotificationService {
  private isInitialized = false
  private currentToken: string | null = null

  constructor() {
    this.setupNotificationHandler()
  }

  // Test helper method to reset state
  resetForTesting() {
    this.isInitialized = false
    this.currentToken = null
  }

  private setupNotificationHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
  }

  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permission not granted')
        return false
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('maintenance', {
          name: 'Maintenance Requests',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6F00',
        })

        await Notifications.setNotificationChannelAsync('bookings', {
          name: 'Booking Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6200EE',
        })

        await Notifications.setNotificationChannelAsync('checklists', {
          name: 'Exit Checklists',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#03DAC6',
        })
      }

      // Get push notification token
      await this.updatePushToken()

      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Failed to initialize notifications:', error)
      return false
    }
  }

  async updatePushToken(): Promise<string | null> {
    try {
      if (!Constants.isDevice) {
        console.warn('Push notifications are not supported on simulator/emulator')
        return null
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })

      this.currentToken = token.data

      // Send token to backend
      await this.sendTokenToBackend(token.data)

      return token.data
    } catch (error) {
      console.error('Failed to get push token:', error)
      return null
    }
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      await apiClient.post('/notifications/token', {
        token,
        platform: Platform.OS,
      })
    } catch (error) {
      console.error('Failed to send push token to backend:', error)
    }
  }

  async scheduleMaintenanceNotification(
    requestId: string,
    title: string,
    body: string,
    delay: number = 0
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'maintenance_request',
            requestId,
          },
        },
        trigger: delay > 0 ? { seconds: delay } : null,
      })

      return notificationId
    } catch (error) {
      console.error('Failed to schedule maintenance notification:', error)
      return null
    }
  }

  async scheduleBookingReminder(
    bookingId: string,
    title: string,
    body: string,
    triggerDate: Date
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'booking_reminder',
            bookingId,
          },
        },
        trigger: {
          date: triggerDate,
        },
      })

      return notificationId
    } catch (error) {
      console.error('Failed to schedule booking reminder:', error)
      return null
    }
  }

  async scheduleChecklistReminder(
    bookingId: string,
    title: string,
    body: string,
    triggerDate: Date
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'checklist_reminder',
            bookingId,
          },
        },
        trigger: {
          date: triggerDate,
        },
      })

      return notificationId
    } catch (error) {
      console.error('Failed to schedule checklist reminder:', error)
      return null
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId)
    } catch (error) {
      console.error('Failed to cancel notification:', error)
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync()
    } catch (error) {
      console.error('Failed to cancel all notifications:', error)
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync()
    } catch (error) {
      console.error('Failed to get badge count:', error)
      return 0
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count)
    } catch (error) {
      console.error('Failed to set badge count:', error)
    }
  }

  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0)
  }

  getCurrentToken(): string | null {
    return this.currentToken
  }

  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener)
  }

  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener)
  }

  removeNotificationSubscription(subscription: Notifications.Subscription): void {
    Notifications.removeNotificationSubscription(subscription)
  }
}

export const notificationService = new NotificationService()