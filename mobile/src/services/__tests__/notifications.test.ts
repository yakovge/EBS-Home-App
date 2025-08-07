/**
 * Tests for notification service
 */

// Mock expo-notifications module
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  setNotificationHandler: jest.fn(),
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
  },
}))

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}))

// Mock expo-constants
jest.mock('expo-constants', () => ({
  isDevice: true,
  expoConfig: {
    extra: {
      eas: {
        projectId: 'test-project-id',
      },
    },
  },
}))

import { notificationService } from '../notifications'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as apiModule from '../api'

// Mock API client spy
let mockPost: jest.SpyInstance

// External library spies
let getPermissionsAsyncSpy: jest.SpyInstance
let requestPermissionsAsyncSpy: jest.SpyInstance
let setNotificationChannelAsyncSpy: jest.SpyInstance
let getExpoPushTokenAsyncSpy: jest.SpyInstance
let scheduleNotificationAsyncSpy: jest.SpyInstance
let cancelScheduledNotificationAsyncSpy: jest.SpyInstance
let cancelAllScheduledNotificationsAsyncSpy: jest.SpyInstance
let getBadgeCountAsyncSpy: jest.SpyInstance
let setBadgeCountAsyncSpy: jest.SpyInstance
let addNotificationReceivedListenerSpy: jest.SpyInstance
let addNotificationResponseReceivedListenerSpy: jest.SpyInstance
let removeNotificationSubscriptionSpy: jest.SpyInstance

// Constants and Platform spies  
let constantsIsDeviceSpy: jest.SpyInstance
let constantsExpoConfigSpy: jest.SpyInstance
let platformOSSpy: jest.SpyInstance

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock API client
    mockPost = jest.spyOn(apiModule.apiClient, 'post')
      .mockResolvedValue({ success: true })
    
    // Get references to the already mocked functions
    getPermissionsAsyncSpy = Notifications.getPermissionsAsync as jest.Mock
    requestPermissionsAsyncSpy = Notifications.requestPermissionsAsync as jest.Mock
    setNotificationChannelAsyncSpy = Notifications.setNotificationChannelAsync as jest.Mock
    getExpoPushTokenAsyncSpy = Notifications.getExpoPushTokenAsync as jest.Mock
    scheduleNotificationAsyncSpy = Notifications.scheduleNotificationAsync as jest.Mock
    cancelScheduledNotificationAsyncSpy = Notifications.cancelScheduledNotificationAsync as jest.Mock
    cancelAllScheduledNotificationsAsyncSpy = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock
    getBadgeCountAsyncSpy = Notifications.getBadgeCountAsync as jest.Mock
    setBadgeCountAsyncSpy = Notifications.setBadgeCountAsync as jest.Mock
    addNotificationReceivedListenerSpy = Notifications.addNotificationReceivedListener as jest.Mock
    addNotificationResponseReceivedListenerSpy = Notifications.addNotificationResponseReceivedListener as jest.Mock
    removeNotificationSubscriptionSpy = Notifications.removeNotificationSubscription as jest.Mock
    
    // Set up default mock implementations
    getPermissionsAsyncSpy.mockResolvedValue({ status: 'granted' })
    requestPermissionsAsyncSpy.mockResolvedValue({ status: 'granted' })
    setNotificationChannelAsyncSpy.mockResolvedValue()
    getExpoPushTokenAsyncSpy.mockResolvedValue({ data: 'test-token' })
    scheduleNotificationAsyncSpy.mockResolvedValue('notification-id')
    cancelScheduledNotificationAsyncSpy.mockResolvedValue()
    cancelAllScheduledNotificationsAsyncSpy.mockResolvedValue()
    getBadgeCountAsyncSpy.mockResolvedValue(0)
    setBadgeCountAsyncSpy.mockResolvedValue()
    addNotificationReceivedListenerSpy.mockReturnValue({ remove: jest.fn() })
    addNotificationResponseReceivedListenerSpy.mockReturnValue({ remove: jest.fn() })
    removeNotificationSubscriptionSpy.mockReturnValue()
    
    // Reset service state for each test
    notificationService.resetForTesting()
  })

  describe('initialize', () => {
    it('should initialize successfully with granted permissions', async () => {
      // Spies are already set up in beforeEach
      getPermissionsAsyncSpy.mockResolvedValue({
        status: 'granted',
      })
      getExpoPushTokenAsyncSpy.mockResolvedValue({
        data: 'test-token',
      })

      const result = await notificationService.initialize()

      expect(result).toBe(true)
      expect(getPermissionsAsyncSpy).toHaveBeenCalled()
      expect(getExpoPushTokenAsyncSpy).toHaveBeenCalled()
      expect(mockPost).toHaveBeenCalledWith('/notifications/token', {
        token: 'test-token',
        platform: 'ios',
      })
    })

    it('should request permissions if not granted', async () => {
      getPermissionsAsyncSpy.mockResolvedValue({
        status: 'denied',
      })
      requestPermissionsAsyncSpy.mockResolvedValue({
        status: 'granted',
      })
      getExpoPushTokenAsyncSpy.mockResolvedValue({
        data: 'test-token',
      })

      const result = await notificationService.initialize()

      expect(result).toBe(true)
      expect(requestPermissionsAsyncSpy).toHaveBeenCalled()
    })

    it('should fail if permissions are not granted', async () => {
      getPermissionsAsyncSpy.mockResolvedValue({
        status: 'denied',
      })
      requestPermissionsAsyncSpy.mockResolvedValue({
        status: 'denied',
      })

      const result = await notificationService.initialize()

      expect(result).toBe(false)
    })

    it('should set up Android notification channels', async () => {
      // Mock Platform.OS to be android for this test
      const originalOS = Platform.OS
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        configurable: true,
      })

      getPermissionsAsyncSpy.mockResolvedValue({
        status: 'granted',
      })
      getExpoPushTokenAsyncSpy.mockResolvedValue({
        data: 'test-token',
      })

      await notificationService.initialize()

      expect(setNotificationChannelAsyncSpy).toHaveBeenCalledWith(
        'maintenance',
        expect.objectContaining({
          name: 'Maintenance Requests',
          importance: Notifications.AndroidImportance.HIGH,
        })
      )
      expect(setNotificationChannelAsyncSpy).toHaveBeenCalledWith(
        'bookings',
        expect.objectContaining({
          name: 'Booking Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
        })
      )
      expect(setNotificationChannelAsyncSpy).toHaveBeenCalledWith(
        'checklists',
        expect.objectContaining({
          name: 'Exit Checklists',
          importance: Notifications.AndroidImportance.HIGH,
        })
      )
      
      // Restore original OS
      Object.defineProperty(Platform, 'OS', {
        value: originalOS,
        configurable: true,
      })
    })

    it('should handle initialization errors gracefully', async () => {
      getPermissionsAsyncSpy.mockRejectedValue(
        new Error('Permission error')
      )

      const result = await notificationService.initialize()

      expect(result).toBe(false)
    })
  })

  describe('updatePushToken', () => {
    it('should get and send push token successfully', async () => {
      // Constants.isDevice is already mocked as true in the module mock
      getExpoPushTokenAsyncSpy.mockResolvedValue({
        data: 'new-test-token',
      })

      const token = await notificationService.updatePushToken()

      expect(token).toBe('new-test-token')
      expect(mockPost).toHaveBeenCalledWith('/notifications/token', {
        token: 'new-test-token',
        platform: 'ios',
      })
    })

    it('should return null on simulator/emulator', async () => {
      // Mock Constants.isDevice to be false for this test
      const originalIsDevice = Constants.isDevice
      Object.defineProperty(Constants, 'isDevice', {
        value: false,
        configurable: true,
      })

      const token = await notificationService.updatePushToken()

      expect(token).toBeNull()
      expect(getExpoPushTokenAsyncSpy).not.toHaveBeenCalled()
      
      // Restore original value
      Object.defineProperty(Constants, 'isDevice', {
        value: originalIsDevice,
        configurable: true,
      })
    })

    it('should handle token errors gracefully', async () => {
      getExpoPushTokenAsyncSpy.mockRejectedValue(
        new Error('Token error')
      )

      const token = await notificationService.updatePushToken()

      expect(token).toBeNull()
    })
  })

  describe('scheduleMaintenanceNotification', () => {
    it('should schedule maintenance notification successfully', async () => {
      scheduleNotificationAsyncSpy.mockResolvedValue(
        'notification-id-123'
      )

      const notificationId = await notificationService.scheduleMaintenanceNotification(
        'request-123',
        'Test Title',
        'Test Body',
        10
      )

      expect(notificationId).toBe('notification-id-123')
      expect(scheduleNotificationAsyncSpy).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          data: {
            type: 'maintenance_request',
            requestId: 'request-123',
          },
        },
        trigger: { seconds: 10 },
      })
    })

    it('should schedule immediate notification with no delay', async () => {
      scheduleNotificationAsyncSpy.mockResolvedValue(
        'notification-id-456'
      )

      const notificationId = await notificationService.scheduleMaintenanceNotification(
        'request-456',
        'Test Title',
        'Test Body'
      )

      expect(notificationId).toBe('notification-id-456')
      expect(scheduleNotificationAsyncSpy).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          data: {
            type: 'maintenance_request',
            requestId: 'request-456',
          },
        },
        trigger: null,
      })
    })

    it('should handle scheduling errors', async () => {
      scheduleNotificationAsyncSpy.mockRejectedValue(
        new Error('Scheduling error')
      )

      const notificationId = await notificationService.scheduleMaintenanceNotification(
        'request-error',
        'Test Title',
        'Test Body'
      )

      expect(notificationId).toBeNull()
    })
  })

  describe('scheduleBookingReminder', () => {
    it('should schedule booking reminder successfully', async () => {
      const triggerDate = new Date('2025-01-15T10:00:00Z')
      scheduleNotificationAsyncSpy.mockResolvedValue(
        'booking-notification-123'
      )

      const notificationId = await notificationService.scheduleBookingReminder(
        'booking-123',
        'Booking Reminder',
        'Your stay starts tomorrow',
        triggerDate
      )

      expect(notificationId).toBe('booking-notification-123')
      expect(scheduleNotificationAsyncSpy).toHaveBeenCalledWith({
        content: {
          title: 'Booking Reminder',
          body: 'Your stay starts tomorrow',
          data: {
            type: 'booking_reminder',
            bookingId: 'booking-123',
          },
        },
        trigger: {
          date: triggerDate,
        },
      })
    })
  })

  describe('scheduleChecklistReminder', () => {
    it('should schedule checklist reminder successfully', async () => {
      const triggerDate = new Date('2025-01-16T09:00:00Z')
      scheduleNotificationAsyncSpy.mockResolvedValue(
        'checklist-notification-123'
      )

      const notificationId = await notificationService.scheduleChecklistReminder(
        'booking-456',
        'Exit Checklist Required',
        'Please complete your exit checklist before leaving',
        triggerDate
      )

      expect(notificationId).toBe('checklist-notification-123')
      expect(scheduleNotificationAsyncSpy).toHaveBeenCalledWith({
        content: {
          title: 'Exit Checklist Required',
          body: 'Please complete your exit checklist before leaving',
          data: {
            type: 'checklist_reminder',
            bookingId: 'booking-456',
          },
        },
        trigger: {
          date: triggerDate,
        },
      })
    })
  })

  describe('badge management', () => {
    it('should get badge count', async () => {
      getBadgeCountAsyncSpy.mockResolvedValue(5)

      const count = await notificationService.getBadgeCount()

      expect(count).toBe(5)
      expect(getBadgeCountAsyncSpy).toHaveBeenCalled()
    })

    it('should set badge count', async () => {
      await notificationService.setBadgeCount(10)

      expect(setBadgeCountAsyncSpy).toHaveBeenCalledWith(10)
    })

    it('should clear badge', async () => {
      await notificationService.clearBadge()

      expect(setBadgeCountAsyncSpy).toHaveBeenCalledWith(0)
    })

    it('should handle badge errors gracefully', async () => {
      getBadgeCountAsyncSpy.mockRejectedValue(
        new Error('Badge error')
      )

      const count = await notificationService.getBadgeCount()

      expect(count).toBe(0)
    })
  })

  describe('notification cancellation', () => {
    it('should cancel single notification', async () => {
      await notificationService.cancelNotification('test-id')

      expect(cancelScheduledNotificationAsyncSpy).toHaveBeenCalledWith(
        'test-id'
      )
    })

    it('should cancel all notifications', async () => {
      await notificationService.cancelAllNotifications()

      expect(cancelAllScheduledNotificationsAsyncSpy).toHaveBeenCalled()
    })

    it('should handle cancellation errors gracefully', async () => {
      cancelScheduledNotificationAsyncSpy.mockRejectedValue(
        new Error('Cancel error')
      )

      // Should not throw
      await notificationService.cancelNotification('test-id')
      expect(cancelScheduledNotificationAsyncSpy).toHaveBeenCalled()
    })
  })

  describe('listener management', () => {
    it('should add notification received listener', () => {
      const mockListener = jest.fn()
      const mockSubscription = { remove: jest.fn() }
      addNotificationReceivedListenerSpy.mockReturnValue(
        mockSubscription
      )

      const subscription = notificationService.addNotificationReceivedListener(mockListener)

      expect(subscription).toBe(mockSubscription)
      expect(addNotificationReceivedListenerSpy).toHaveBeenCalledWith(
        mockListener
      )
    })

    it('should add notification response listener', () => {
      const mockListener = jest.fn()
      const mockSubscription = { remove: jest.fn() }
      addNotificationResponseReceivedListenerSpy.mockReturnValue(
        mockSubscription
      )

      const subscription = notificationService.addNotificationResponseReceivedListener(
        mockListener
      )

      expect(subscription).toBe(mockSubscription)
      expect(addNotificationResponseReceivedListenerSpy).toHaveBeenCalledWith(
        mockListener
      )
    })

    it('should remove notification subscription', () => {
      const mockSubscription = { remove: jest.fn() }

      notificationService.removeNotificationSubscription(mockSubscription)

      expect(removeNotificationSubscriptionSpy).toHaveBeenCalledWith(
        mockSubscription
      )
    })
  })

  describe('getCurrentToken', () => {
    it('should return current token after initialization', async () => {
      // Constants.isDevice is already mocked as true
      getPermissionsAsyncSpy.mockResolvedValue({
        status: 'granted',
      })
      getExpoPushTokenAsyncSpy.mockResolvedValue({
        data: 'current-token',
      })

      await notificationService.initialize()
      const token = notificationService.getCurrentToken()

      expect(token).toBe('current-token')
    })

    it('should return null before initialization', () => {
      // Token should be null before initialization
      const token = notificationService.getCurrentToken()
      expect(token).toBeNull()
    })
  })
})