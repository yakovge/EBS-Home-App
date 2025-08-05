/**
 * Dashboard service for fetching overview data and statistics.
 * Handles API calls for dashboard metrics and recent activity.
 */

import { apiClient } from './api'
import { cacheService } from './cacheService'
import { MaintenanceRequest, Booking, ExitChecklist } from '@/types'

interface DashboardStats {
  currentBookings: number
  pendingMaintenance: number
  exitChecklists: number
}

interface DashboardData {
  stats: DashboardStats
  recentMaintenance: MaintenanceRequest[]
  upcomingBookings: Booking[]
  recentChecklists: ExitChecklist[]
}

class DashboardService {
  async getDashboardData(): Promise<DashboardData> {
    const cacheKey = 'dashboard_data'
    
    // Check cache first
    const cached = cacheService.get<DashboardData>(cacheKey)
    if (cached) {
      return cached
    }
    
    try {
      const response = await apiClient.get<DashboardData>('/dashboard')
      
      // Cache the response for 2 minutes
      cacheService.set(cacheKey, response, 2 * 60 * 1000)
      
      return response
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      // Return default data on error
      return {
        stats: {
          currentBookings: 0,
          pendingMaintenance: 0,
          exitChecklists: 0,
        },
        recentMaintenance: [],
        upcomingBookings: [],
        recentChecklists: [],
      }
    }
  }

  async getStats(): Promise<DashboardStats> {
    const cacheKey = 'dashboard_stats'
    
    // Check cache first
    const cached = cacheService.get<DashboardStats>(cacheKey)
    if (cached) {
      return cached
    }
    
    try {
      const response = await apiClient.get<DashboardStats>('/dashboard/stats')
      
      // Cache the response for 1 minute
      cacheService.set(cacheKey, response, 60 * 1000)
      
      return response
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      return {
        currentBookings: 0,
        pendingMaintenance: 0,
        exitChecklists: 0,
      }
    }
  }

  async getRecentMaintenance(): Promise<MaintenanceRequest[]> {
    try {
      // Get maintenance requests from main endpoint (returns array directly)
      const response = await apiClient.get<MaintenanceRequest[]>('/maintenance')
      
      // Sort by created date and limit to 5 most recent
      return response
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    } catch (error) {
      console.error('Failed to fetch recent maintenance:', error)
      return []
    }
  }

  async getUpcomingBookings(): Promise<Booking[]> {
    try {
      // Get bookings from main bookings endpoint and filter for upcoming
      const response = await apiClient.get<{bookings: Booking[], total: number}>('/bookings')
      const bookings = response.bookings || []
      
      // Filter for upcoming bookings (not cancelled, start date in future)
      const now = new Date()
      return bookings
        .filter(booking => !booking.is_cancelled && new Date(booking.start_date) > now)
        .slice(0, 5) // Limit to 5 items
    } catch (error) {
      console.error('Failed to fetch upcoming bookings:', error)
      return []
    }
  }
}

export const dashboardService = new DashboardService() 