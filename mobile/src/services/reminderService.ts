/**
 * Reminder service for scheduling exit checklist notifications
 * Based on booking calendar and check-out dates
 */

import { apiClient } from './api'
import { notificationService } from './notifications'
import { Booking } from '../types'

export interface ExitReminder {
  id: string
  bookingId: string
  reminderDate: Date
  notificationId: string | null
  isScheduled: boolean
}

class ReminderService {
  private reminders: Map<string, ExitReminder> = new Map()

  /**
   * Schedule exit reminders for all upcoming bookings
   */
  async scheduleExitReminders(): Promise<void> {
    try {
      console.log('📅 Scheduling exit reminders...')
      
      // Get upcoming bookings
      const bookings = await this.getUpcomingBookings()
      
      for (const booking of bookings) {
        await this.scheduleReminderForBooking(booking)
      }
      
      console.log(`✅ Scheduled ${bookings.length} exit reminders`)
    } catch (error) {
      console.error('Failed to schedule exit reminders:', error)
    }
  }

  /**
   * Schedule reminder for a specific booking
   */
  async scheduleReminderForBooking(booking: Booking): Promise<ExitReminder | null> {
    try {
      const endDate = new Date(booking.end_date)
      
      // Schedule reminder for the morning of check-out day (9 AM)
      const reminderDate = new Date(endDate)
      reminderDate.setHours(9, 0, 0, 0)
      
      // Don't schedule if the reminder date is in the past
      const now = new Date()
      if (reminderDate <= now) {
        console.log(`⏰ Skipping past reminder for booking ${booking.id} (${reminderDate.toISOString()} <= ${now.toISOString()})`)
        return null
      }
      
      // Check if reminder already exists (cancel it if so)
      const existingReminder = this.reminders.get(booking.id)
      
      // Cancel existing notification if any
      if (existingReminder?.notificationId) {
        await notificationService.cancelNotification(existingReminder.notificationId)
      }
      
      // Schedule new notification
      const title = 'Exit Checklist Reminder'
      const body = `Don't forget to complete your exit checklist before leaving today! Your check-out is scheduled for ${endDate.toLocaleDateString()}.`
      
      const notificationId = await notificationService.scheduleChecklistReminder(
        booking.id,
        title,
        body,
        reminderDate
      )
      
      const reminder: ExitReminder = {
        id: `reminder-${booking.id}`,
        bookingId: booking.id,
        reminderDate,
        notificationId,
        isScheduled: true,
      }
      
      this.reminders.set(booking.id, reminder)
      
      console.log(`📅 Exit reminder scheduled for ${booking.user_name} on ${reminderDate.toLocaleString()}`)
      return reminder
      
    } catch (error) {
      console.error(`Failed to schedule reminder for booking ${booking.id}:`, error)
      return null
    }
  }

  /**
   * Cancel reminder for a specific booking
   */
  async cancelReminderForBooking(bookingId: string): Promise<void> {
    try {
      const reminder = this.reminders.get(bookingId)
      if (reminder && reminder.notificationId) {
        await notificationService.cancelNotification(reminder.notificationId)
        reminder.isScheduled = false
        reminder.notificationId = null
        console.log(`❌ Cancelled reminder for booking ${bookingId}`)
      }
    } catch (error) {
      console.error(`Failed to cancel reminder for booking ${bookingId}:`, error)
    }
  }

  /**
   * Update reminders when bookings change
   */
  async updateRemindersForBooking(booking: Booking): Promise<void> {
    try {
      // Cancel existing reminder
      await this.cancelReminderForBooking(booking.id)
      
      // Schedule new reminder if booking is not cancelled and hasn't completed checklist
      if (!booking.is_cancelled && !booking.exit_checklist_completed) {
        await this.scheduleReminderForBooking(booking)
      }
    } catch (error) {
      console.error(`Failed to update reminder for booking ${booking.id}:`, error)
    }
  }

  /**
   * Get all active reminders
   */
  getActiveReminders(): ExitReminder[] {
    return Array.from(this.reminders.values()).filter(r => r.isScheduled)
  }

  /**
   * Clear all scheduled reminders
   */
  async clearAllReminders(): Promise<void> {
    try {
      for (const reminder of this.reminders.values()) {
        if (reminder.notificationId) {
          await notificationService.cancelNotification(reminder.notificationId)
        }
      }
      
      this.reminders.clear()
      console.log('🗑️ All exit reminders cleared')
    } catch (error) {
      console.error('Failed to clear reminders:', error)
    }
  }

  /**
   * Schedule daily reminder to check bookings
   * This should run periodically to handle new bookings
   */
  async scheduleDailyReminderCheck(): Promise<void> {
    try {
      // Schedule a daily check at 8 AM
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(8, 0, 0, 0)
      
      await notificationService.scheduleChecklistReminder(
        'daily-check',
        'Reminder Service',
        'Checking for new bookings requiring exit reminders...',
        tomorrow
      )
      
      console.log(`⏰ Daily reminder check scheduled for ${tomorrow.toLocaleString()}`)
    } catch (error) {
      console.error('Failed to schedule daily reminder check:', error)
    }
  }

  /**
   * Handle notification when user taps on reminder
   */
  async handleReminderNotification(bookingId: string): Promise<void> {
    try {
      console.log(`📱 User tapped reminder notification for booking ${bookingId}`)
      
      // Mark reminder as acknowledged
      const reminder = this.reminders.get(bookingId)
      if (reminder) {
        reminder.isScheduled = false
      }
      
      // Could navigate to checklist form here
      // This would need to be implemented in the app's navigation handler
    } catch (error) {
      console.error(`Failed to handle reminder notification for booking ${bookingId}:`, error)
    }
  }

  /**
   * Get statistics about reminders
   */
  getReminderStats(): {
    totalReminders: number
    activeReminders: number
    overdueBookings: number
  } {
    const now = new Date()
    const activeReminders = this.getActiveReminders()
    
    const overdueBookings = activeReminders.filter(reminder => {
      const booking = this.reminders.get(reminder.bookingId)
      if (!booking) return false
      
      // Check if check-out date has passed without completing checklist
      const endDate = new Date(reminder.reminderDate)
      endDate.setHours(23, 59, 59, 999) // End of check-out day
      
      return now > endDate
    }).length

    return {
      totalReminders: this.reminders.size,
      activeReminders: activeReminders.length,
      overdueBookings,
    }
  }

  private async getUpcomingBookings(): Promise<Booking[]> {
    try {
      const now = new Date()
      const futureDate = new Date()
      futureDate.setDate(now.getDate() + 30) // Next 30 days
      
      const bookings = await apiClient.get<Booking[]>('/bookings')
      
      return (bookings || []).filter(booking => {
        const endDate = new Date(booking.end_date)
        return (
          !booking.is_cancelled &&
          !booking.exit_checklist_completed &&
          endDate >= now &&
          endDate <= futureDate
        )
      })
    } catch (error) {
      console.error('Failed to fetch upcoming bookings:', error)
      return []
    }
  }
}

export const reminderService = new ReminderService()