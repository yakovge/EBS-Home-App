/**
 * Real-time service for live updates using Firebase listeners.
 * Provides real-time data synchronization for dashboard and notifications.
 */

import { onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from './firebase'
import { MaintenanceRequest, Booking, ExitChecklist } from '@/types'

interface RealtimeCallbacks {
  onDashboardUpdate?: (data: any) => void
  onMaintenanceUpdate?: (requests: MaintenanceRequest[]) => void
  onBookingUpdate?: (bookings: Booking[]) => void
  onChecklistUpdate?: (checklists: ExitChecklist[]) => void
  onError?: (error: Error) => void
}

class RealtimeService {
  private listeners: Map<string, () => void> = new Map()
  private callbacks: RealtimeCallbacks = {}

  constructor(callbacks: RealtimeCallbacks = {}) {
    this.callbacks = callbacks
  }

  /**
   * Start listening to maintenance requests
   */
  startMaintenanceListener(userId?: string) {
    const listenerKey = 'maintenance'
    
    // Stop existing listener if any
    this.stopListener(listenerKey)
    
    try {
      let q = query(
        collection(db, 'maintenance_requests'),
        orderBy('created_at', 'desc'),
        limit(10)
      )
      
      if (userId) {
        q = query(
          collection(db, 'maintenance_requests'),
          where('reporter_id', '==', userId),
          orderBy('created_at', 'desc'),
          limit(10)
        )
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests: MaintenanceRequest[] = []
        snapshot.forEach((doc) => {
          requests.push({
            id: doc.id,
            ...doc.data()
          } as MaintenanceRequest)
        })
        
        this.callbacks.onMaintenanceUpdate?.(requests)
      }, (error) => {
        console.error('Maintenance listener error:', error)
        this.callbacks.onError?.(error)
      })

      this.listeners.set(listenerKey, unsubscribe)
    } catch (error) {
      console.error('Failed to start maintenance listener:', error)
      this.callbacks.onError?.(error as Error)
    }
  }

  /**
   * Start listening to bookings
   */
  startBookingListener(userId?: string) {
    const listenerKey = 'bookings'
    
    // Stop existing listener if any
    this.stopListener(listenerKey)
    
    try {
      let q = query(
        collection(db, 'bookings'),
        orderBy('start_date', 'asc'),
        limit(20)
      )
      
      if (userId) {
        q = query(
          collection(db, 'bookings'),
          where('user_id', '==', userId),
          orderBy('start_date', 'asc'),
          limit(20)
        )
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const bookings: Booking[] = []
        snapshot.forEach((doc) => {
          bookings.push({
            id: doc.id,
            ...doc.data()
          } as Booking)
        })
        
        this.callbacks.onBookingUpdate?.(bookings)
      }, (error) => {
        console.error('Booking listener error:', error)
        this.callbacks.onError?.(error)
      })

      this.listeners.set(listenerKey, unsubscribe)
    } catch (error) {
      console.error('Failed to start booking listener:', error)
      this.callbacks.onError?.(error as Error)
    }
  }

  /**
   * Start listening to checklists
   */
  startChecklistListener(userId?: string) {
    const listenerKey = 'checklists'
    
    // Stop existing listener if any
    this.stopListener(listenerKey)
    
    try {
      let q = query(
        collection(db, 'exit_checklists'),
        orderBy('created_at', 'desc'),
        limit(10)
      )
      
      if (userId) {
        q = query(
          collection(db, 'exit_checklists'),
          where('user_id', '==', userId),
          orderBy('created_at', 'desc'),
          limit(10)
        )
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const checklists: ExitChecklist[] = []
        snapshot.forEach((doc) => {
          checklists.push({
            id: doc.id,
            ...doc.data()
          } as ExitChecklist)
        })
        
        this.callbacks.onChecklistUpdate?.(checklists)
      }, (error) => {
        console.error('Checklist listener error:', error)
        this.callbacks.onError?.(error)
      })

      this.listeners.set(listenerKey, unsubscribe)
    } catch (error) {
      console.error('Failed to start checklist listener:', error)
      this.callbacks.onError?.(error as Error)
    }
  }

  /**
   * Start all listeners for dashboard
   */
  startDashboardListeners(userId?: string) {
    this.startMaintenanceListener(userId)
    this.startBookingListener(userId)
    this.startChecklistListener(userId)
  }

  /**
   * Stop a specific listener
   */
  stopListener(listenerKey: string) {
    const unsubscribe = this.listeners.get(listenerKey)
    if (unsubscribe) {
      unsubscribe()
      this.listeners.delete(listenerKey)
    }
  }

  /**
   * Stop all listeners
   */
  stopAllListeners() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe()
    })
    this.listeners.clear()
  }

  /**
   * Update callbacks
   */
  updateCallbacks(callbacks: RealtimeCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }
}

export const realtimeService = new RealtimeService() 