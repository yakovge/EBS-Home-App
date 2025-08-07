/**
 * Authentication service for handling login, logout, and session management in React Native.
 * Interfaces with the backend auth API endpoints.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Device from 'expo-device'
import { apiClient } from './api'
import { User } from '../types'

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
    // Debug logging
    console.log('DEBUG: Token length:', token.length)
    console.log('DEBUG: Token preview:', token.substring(0, 20) + '...')
    console.log('DEBUG: Device info:', deviceInfo)
    
    const data = {
      token,
      device_info: {
        device_id: deviceInfo.deviceId,
        device_name: deviceInfo.deviceName,
        platform: deviceInfo.platform,
      },
    }

    return apiClient.post<LoginResponse>('/auth/login', data)
  }

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  }

  async verifySession(token: string): Promise<VerifyResponse> {
    // Temporarily set token for verification
    const originalToken = await AsyncStorage.getItem('session_token')
    await AsyncStorage.setItem('session_token', token)

    try {
      const response = await apiClient.get<VerifyResponse>('/auth/verify')
      return response
    } catch (error) {
      // Restore original token on error
      if (originalToken) {
        await AsyncStorage.setItem('session_token', originalToken)
      } else {
        await AsyncStorage.removeItem('session_token')
      }
      throw error
    }
  }

  async refreshToken(): Promise<{ session_token: string }> {
    return apiClient.post('/auth/refresh')
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceId = await this.getDeviceId()
    const deviceName = this.getDeviceName()
    const platform = this.getPlatform()

    return {
      deviceId,
      deviceName,
      platform,
    }
  }

  private async getDeviceId(): Promise<string> {
    // Try to get from AsyncStorage first
    let deviceId = await AsyncStorage.getItem('device_id')
    
    if (!deviceId) {
      // Generate a new device ID using device information
      const deviceName = Device.deviceName || 'Unknown'
      const modelName = Device.modelName || 'Unknown'
      const osVersion = Device.osVersion || 'Unknown'
      const timestamp = Date.now()

      // Create a simple hash
      const fingerprint = `${deviceName}_${modelName}_${osVersion}_${timestamp}`
      let hash = 0
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
      }

      deviceId = `mobile_device_${Math.abs(hash)}`
      await AsyncStorage.setItem('device_id', deviceId)
    }

    return deviceId
  }

  private getDeviceName(): string {
    return Device.modelName || Device.deviceName || 'Unknown Device'
  }

  private getPlatform(): string {
    return Device.osName || 'Unknown'
  }
}

export const authService = new AuthService()