/**
 * Upload service for handling file uploads to Firebase Storage.
 * Manages photo uploads for maintenance requests and checklists.
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'



class UploadService {
  async uploadPhoto(
    file: File,
    path: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      // Create a reference to the file location
      const storageRef = ref(storage, path)
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file)
      
      // Simulate progress (Firebase doesn't provide progress for uploadBytes)
      if (onProgress) {
        onProgress(100)
      }
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref)
      
      return downloadURL
    } catch (error) {
      console.error('Upload failed:', error)
      throw new Error('Failed to upload photo')
    }
  }

  async uploadMaintenancePhoto(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      // Validate file first
      const validation = this.validateImageFile(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Compress image if too large
      const compressedFile = await this.compressImage(file)
      
      // Create form data for multipart upload
      const formData = new FormData()
      formData.append('photo', compressedFile)
      
      // Call the backend API
      const response = await fetch('/api/maintenance/upload-photo', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('session_token')}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to upload photo')
      }

      const data = await response.json()
      
      // Simulate progress completion
      if (onProgress) {
        onProgress(100)
      }
      
      return data.photo_url
    } catch (error) {
      console.error('Upload failed:', error)
      throw error
    }
  }

  async uploadChecklistPhoto(
    file: File,
    photoType: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    console.log('Uploading checklist photo:', file.name, 'Type:', photoType)
    
    try {
      // Check session token
      const sessionToken = localStorage.getItem('session_token')
      
      if (!sessionToken) {
        throw new Error('Authentication required. Please log in to upload photos.')
      }
      
      if (sessionToken.length < 10) {  // Basic validation
        throw new Error('Invalid authentication token. Please log in again.')
      }
      
      // Validate file first
      const validation = this.validateImageFile(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Compress image if too large
      const compressedFile = await this.compressImage(file)
      
      // Create form data for multipart upload
      const formData = new FormData()
      formData.append('photo', compressedFile)
      formData.append('photo_type', photoType)
      
      const response = await fetch('/api/checklists/upload-photo', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (e) {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
        }
        throw new Error(errorData.message || `Upload failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // Simulate progress completion
      if (onProgress) {
        onProgress(100)
      }
      
      console.log('Photo uploaded successfully:', data.photo_url)
      return data.photo_url
    } catch (error) {
      console.error('Checklist photo upload failed:', error.message)
      throw error
    }
  }

  async uploadProfilePhoto(
    file: File,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `profile-${userId}-${timestamp}.jpg`
    const path = `profiles/${userId}/${fileName}`
    
    return this.uploadPhoto(file, path, onProgress)
  }

  validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 5MB' }
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' }
    }

    return { valid: true }
  }

  async compressImage(file: File, maxWidth: number = 1920): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        // Set canvas dimensions
        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          'image/jpeg',
          0.8 // Quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }
}

export const uploadService = new UploadService() 