/**
 * Tests for reminder service
 */

import { reminderService } from '../reminderService'
import { Booking } from '../../types'

// Import the actual services for spying  
import * as notificationModule from '../notifications'
import * as apiModule from '../api'

// Store API client spy
let mockGet: jest.SpyInstance

// Store references to spies for reuse across tests
let scheduleReminderSpy: jest.SpyInstance
let cancelNotificationSpy: jest.SpyInstance

describe('ReminderService', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    
    // Use spyOn to mock the API client
    mockGet = jest.spyOn(apiModule.apiClient, 'get')
      .mockImplementation(() => Promise.resolve([]))
    
    // Use spyOn to mock the notification service methods
    scheduleReminderSpy = jest.spyOn(notificationModule.notificationService, 'scheduleChecklistReminder')
      .mockImplementation(() => Promise.resolve('notification-id-123'))
    
    cancelNotificationSpy = jest.spyOn(notificationModule.notificationService, 'cancelNotification')
      .mockImplementation(() => Promise.resolve())
    
    // Clear all reminders to ensure clean state between tests
    await reminderService.clearAllReminders()
  })

  // Helper function to get future date in YYYY-MM-DD format
  // Ensures the reminder time (9 AM on the end date) is well in the future
  const getFutureDateString = (daysFromNow: number): string => {
    const date = new Date()
    date.setDate(date.getDate() + daysFromNow)
    // Set to late in the day to ensure 9 AM on this date is definitely future
    date.setHours(23, 59, 59, 999)
    return date.toISOString().split('T')[0]
  }

  const mockBooking: Booking = {
    id: 'booking-123',
    user_name: 'John Doe',
    start_date: getFutureDateString(1),
    end_date: getFutureDateString(3),
    notes: '',
    is_cancelled: false,
    exit_checklist_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  describe('scheduleReminderForBooking', () => {
    it('should schedule reminder for upcoming booking', async () => {
      // Create a fresh booking with future end date for this test  
      const futureEndDate = getFutureDateString(7) // 7 days in the future to be safe
      
      const futureBooking = {
        ...mockBooking,
        id: 'future-booking-123',
        end_date: futureEndDate,
      }

      const reminder = await reminderService.scheduleReminderForBooking(futureBooking)

      expect(reminder).toBeTruthy()
      expect(reminder?.bookingId).toBe(futureBooking.id)
      expect(reminder?.isScheduled).toBe(true)
      
      expect(scheduleReminderSpy).toHaveBeenCalledWith(
        futureBooking.id,
        'Exit Checklist Reminder',
        expect.stringContaining('Don\'t forget to complete your exit checklist'),
        expect.any(Date)
      )
    })

    it('should not schedule reminder for past booking', async () => {
      const pastBooking = {
        ...mockBooking,
        end_date: '2025-01-01', // Past date
      }

      const reminder = await reminderService.scheduleReminderForBooking(pastBooking)

      expect(reminder).toBeNull()
      expect(scheduleReminderSpy).not.toHaveBeenCalled()
    })

    it('should cancel existing reminder when rescheduling', async () => {
      const futureBooking = {
        ...mockBooking,
        id: 'reschedule-booking-123',
        end_date: getFutureDateString(7),
      }

      // Schedule first reminder
      await reminderService.scheduleReminderForBooking(futureBooking)
      
      // Schedule second reminder (should cancel first)
      await reminderService.scheduleReminderForBooking(futureBooking)

      expect(cancelNotificationSpy).toHaveBeenCalledWith('notification-id-123')
      expect(scheduleReminderSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('cancelReminderForBooking', () => {
    it('should cancel existing reminder', async () => {
      const futureBooking = {
        ...mockBooking,
        id: 'cancel-booking-123',
        end_date: getFutureDateString(7),
      }

      // First schedule a reminder
      await reminderService.scheduleReminderForBooking(futureBooking)
      
      // Then cancel it
      await reminderService.cancelReminderForBooking(futureBooking.id)

      expect(cancelNotificationSpy).toHaveBeenCalledWith('notification-id-123')
    })

    it('should handle canceling non-existent reminder gracefully', async () => {
      await reminderService.cancelReminderForBooking('non-existent-booking')
      expect(cancelNotificationSpy).not.toHaveBeenCalled()
    })
  })

  describe('updateRemindersForBooking', () => {
    it('should cancel and reschedule reminder for updated booking', async () => {
      const futureBooking = {
        ...mockBooking,
        id: 'update-booking-123',
        end_date: getFutureDateString(7),
      }

      // First schedule a reminder
      await reminderService.scheduleReminderForBooking(futureBooking)
      
      // Update the booking
      await reminderService.updateRemindersForBooking(futureBooking)

      expect(cancelNotificationSpy).toHaveBeenCalled()
      expect(scheduleReminderSpy).toHaveBeenCalledTimes(2)
    })

    it('should not reschedule for cancelled booking', async () => {
      const cancelledBooking = {
        ...mockBooking,
        id: 'cancelled-booking-123',
        end_date: getFutureDateString(7),
        is_cancelled: true,
      }

      await reminderService.updateRemindersForBooking(cancelledBooking)

      // Should only cancel, not reschedule
      expect(scheduleReminderSpy).not.toHaveBeenCalled()
    })

    it('should not reschedule for booking with completed checklist', async () => {
      const completedBooking = {
        ...mockBooking,
        id: 'completed-booking-123',
        end_date: getFutureDateString(7),
        exit_checklist_completed: true,
      }

      await reminderService.updateRemindersForBooking(completedBooking)

      expect(scheduleReminderSpy).not.toHaveBeenCalled()
    })
  })

  describe('scheduleExitReminders', () => {
    it('should schedule reminders for all upcoming bookings', async () => {
      const upcomingBookings = [
        {
          ...mockBooking,
          id: 'booking-1',
          end_date: getFutureDateString(7),
        },
        {
          ...mockBooking,
          id: 'booking-2', 
          end_date: getFutureDateString(8),
        },
      ]

      mockGet.mockResolvedValue(upcomingBookings)

      await reminderService.scheduleExitReminders()

      expect(mockGet).toHaveBeenCalledWith('/bookings')
      expect(scheduleReminderSpy).toHaveBeenCalledTimes(2)
    })

    it('should handle API errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('API error'))

      // Should not throw
      await expect(reminderService.scheduleExitReminders()).resolves.toBeUndefined()
    })
  })

  describe('getActiveReminders', () => {
    it('should return only scheduled reminders', async () => {
      const futureBooking = {
        ...mockBooking,
        id: 'active-booking-123',
        end_date: getFutureDateString(7),
      }

      await reminderService.scheduleReminderForBooking(futureBooking)
      const activeReminders = reminderService.getActiveReminders()

      expect(activeReminders).toHaveLength(1)
      expect(activeReminders[0].bookingId).toBe(futureBooking.id)
      expect(activeReminders[0].isScheduled).toBe(true)
    })
  })

  describe('getReminderStats', () => {
    it('should return correct statistics', async () => {
      const futureBooking = {
        ...mockBooking,
        id: 'stats-booking-123',
        end_date: getFutureDateString(7),
      }

      await reminderService.scheduleReminderForBooking(futureBooking)
      const stats = reminderService.getReminderStats()

      expect(stats.totalReminders).toBe(1)
      expect(stats.activeReminders).toBe(1)
      expect(stats.overdueBookings).toBe(0)
    })
  })

  describe('clearAllReminders', () => {
    it('should clear all reminders and cancel notifications', async () => {
      const futureBooking = {
        ...mockBooking,
        id: 'clear-booking-123',
        end_date: getFutureDateString(7),
      }

      await reminderService.scheduleReminderForBooking(futureBooking)
      await reminderService.clearAllReminders()

      expect(cancelNotificationSpy).toHaveBeenCalledWith('notification-id-123')
      
      const stats = reminderService.getReminderStats()
      expect(stats.totalReminders).toBe(0)
    })
  })
})