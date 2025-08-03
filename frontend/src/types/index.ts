/**
 * TypeScript type definitions for the EBS Home application.
 * Central location for all shared types and interfaces.
 */

// User types
export interface User {
  id: string
  email: string
  name: string
  role: 'family_member' | 'maintenance' | 'admin'
  preferredLanguage: 'en' | 'he'
  isActive: boolean
  currentDevice?: UserDevice
  deviceHistory: UserDevice[]
  firebaseUid?: string
  isYaffa: boolean
  isMaintenancePerson: boolean
  createdAt: string
  updatedAt: string
}

export interface UserDevice {
  deviceId: string
  deviceName: string
  platform: string
  lastLogin: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Maintenance types
export enum MaintenanceStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface MaintenanceRequest {
  id?: string
  reporterId: string
  reporterName: string
  description: string
  location: string
  photoUrls: string[]
  status: MaintenanceStatus
  assignedToId?: string
  assignedToName?: string
  resolutionDate?: string
  resolutionNotes?: string
  maintenanceNotified: boolean
  yaffaNotified: boolean
  createdAt: string
  updatedAt: string
}

// Booking types
export interface Booking {
  id?: string
  userId: string
  userName: string
  startDate: string
  endDate: string
  notes?: string
  isCancelled: boolean
  exitChecklistCompleted: boolean
  exitChecklistId?: string
  reminderSent: boolean
  createdAt: string
  updatedAt: string
}

// Checklist types
export enum PhotoType {
  REFRIGERATOR = 'refrigerator',
  FREEZER = 'freezer',
  CLOSET = 'closet'
}

export interface ChecklistPhoto {
  photoType: PhotoType
  photoUrl: string
  notes: string
  order: number
  createdAt: string
}

export interface ExitChecklist {
  id?: string
  userId: string
  userName: string
  bookingId: string
  photos: ChecklistPhoto[]
  isComplete: boolean
  submittedAt?: string
  createdAt: string
  updatedAt: string
}

// API types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// Form types
export interface LoginForm {
  token: string
  deviceInfo: {
    deviceId: string
    deviceName: string
    platform: string
  }
}

export interface MaintenanceForm {
  description: string
  location: string
  photoUrls: string[]
}

export interface BookingForm {
  startDate: string
  endDate: string
  notes?: string
}

export interface ChecklistForm {
  bookingId: string
  photos: ChecklistPhotoForm[]
}

export interface ChecklistPhotoForm {
  photoType: PhotoType
  photoUrl: string
  notes: string
}