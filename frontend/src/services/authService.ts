/**
 * Authentication service for handling login, logout, and session management.
 * Interfaces with the backend auth API endpoints.
 */

import { apiClient } from './api'
import { User, LoginForm } from '@/types'

interface LoginResponse {
  user: User
  session_token: string
}

interface VerifyResponse {
  valid: boolean
  user?: User
}

interface DeviceInfo {
  deviceId: string
  deviceName: string
  platform: string
}

class AuthService {
  async login(token: string, deviceInfo: DeviceInfo): Promise<LoginResponse> {
    const data: LoginForm = {
      token,
      deviceInfo,
    }

    return apiClient.post<LoginResponse>('/auth/login', data)
  }

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  }

  async verifySession(token: string): Promise<VerifyResponse> {
    // Temporarily set token for verification
    const originalToken = localStorage.getItem('session_token')
    localStorage.setItem('session_token', token)

    try {
      const response = await apiClient.get<VerifyResponse>('/auth/verify')
      return response
    } catch (error) {
      // Restore original token on error
      if (originalToken) {
        localStorage.setItem('session_token', originalToken)
      } else {
        localStorage.removeItem('session_token')
      }
      throw error
    }
  }

  async refreshToken(): Promise<{ session_token: string }> {
    return apiClient.post('/auth/refresh')
  }

  getDeviceInfo(): DeviceInfo {
    const deviceId = this.getDeviceId()
    const deviceName = this.getDeviceName()
    const platform = this.getPlatform()

    return {
      deviceId,
      deviceName,
      platform,
    }
  }

  private getDeviceId(): string {
    // Try to get from localStorage first
    let deviceId = localStorage.getItem('device_id')
    
    if (!deviceId) {
      // Generate a new device ID based on browser fingerprint
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      ctx?.fillText('Device fingerprint', 10, 10)
      
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL(),
      ].join('|')

      // Create a simple hash
      let hash = 0
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
      }

      deviceId = `device_${Math.abs(hash)}_${Date.now()}`
      localStorage.setItem('device_id', deviceId)
    }

    return deviceId
  }

  private getDeviceName(): string {
    const userAgent = navigator.userAgent
    
    if (userAgent.includes('Chrome')) return 'Chrome Browser'
    if (userAgent.includes('Firefox')) return 'Firefox Browser'
    if (userAgent.includes('Safari')) return 'Safari Browser'
    if (userAgent.includes('Edge')) return 'Edge Browser'
    
    return 'Unknown Browser'
  }

  private getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('win')) return 'Windows'
    if (userAgent.includes('mac')) return 'macOS'
    if (userAgent.includes('linux')) return 'Linux'
    if (userAgent.includes('android')) return 'Android'
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS'
    
    return 'Unknown'
  }
}

export const authService = new AuthService()