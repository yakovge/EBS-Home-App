/**
 * TypeScript type definitions for the EBS Home mobile application.
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
  reporter_id: string
  reporter_name: string
  description: string
  location: string
  photo_urls: string[]
  status: MaintenanceStatus
  assigned_to_id?: string
  assigned_to_name?: string
  resolution_date?: string
  resolution_notes?: string
  maintenance_notified: boolean
  yaffa_notified: boolean
  created_at: string
  updated_at: string
}

// Booking types
export interface Booking {
  id?: string
  user_id: string
  user_name: string
  start_date: string
  end_date: string
  notes?: string
  is_cancelled: boolean
  exit_checklist_completed: boolean
  exit_checklist_id?: string
  reminder_sent: boolean
  created_at: string
  updated_at: string
}

// Checklist types
export enum PhotoType {
  REFRIGERATOR = 'refrigerator',
  FREEZER = 'freezer',
  CLOSET = 'closet',
  GENERAL = 'general'
}

export interface ChecklistEntry {
  id?: string
  checklistId: string
  photoType: PhotoType
  notes: string
  photoUrl?: string
  createdAt: string
  updatedAt: string
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
  bookingId?: string
  entries: ChecklistEntry[]
  importantNotes?: string
  isComplete: boolean
  submittedAt?: string
  createdAt: string
  updatedAt: string
}

// Mobile-specific types
export interface ImagePickerResult {
  uri: string
  width: number
  height: number
  type?: string
  fileName?: string
}

export interface CameraOptions {
  mediaTypes: 'photo' | 'video' | 'mixed'
  allowsEditing: boolean
  aspect?: [number, number]
  quality: number
}

// Navigation types
export type RootStackParamList = {
  Login: undefined
  MainTabs: undefined
  MaintenanceForm: { requestId?: string }
  ChecklistForm: { bookingId?: string }
  MaintenanceDetail: { requestId: string }
  ChecklistDetail: { checklistId: string }
  Profile: undefined
}

export type MainTabParamList = {
  Dashboard: undefined
  Maintenance: undefined
  Checklist: undefined
  Booking: undefined
  Profile: undefined
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
  bookingId?: string
  categories: ChecklistCategory[]
  importantNotes?: string
}

export interface ChecklistCategory {
  type: PhotoType
  title: string
  textNotes: string
  photos: PhotoEntry[]
}

export interface PhotoEntry {
  uri: string
  notes: string
}

export interface ChecklistPhotoForm {
  photoType: PhotoType
  photoUrl: string
  notes: string
}