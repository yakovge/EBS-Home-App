/**
 * Tests for authService.
 * Tests authentication service methods and device management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '@/services/authService'

// Mock API client
vi.mock('@/services/api', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should call API with correct data', async () => {
      const { apiClient } = require('@/services/api')
      const mockResponse = {
        user: { id: 'user-123', email: 'test@example.com' },
        session_token: 'mock-token',
      }
      apiClient.post.mockResolvedValue(mockResponse)

      const deviceInfo = {
        deviceId: 'device-123',
        deviceName: 'Test Device',
        platform: 'Windows',
      }

      const result = await authService.login('google-token', deviceInfo)

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        token: 'google-token',
        deviceInfo,
      })
      expect(result).toEqual(mockResponse)
    })

    it('should throw error on API failure', async () => {
      const { apiClient } = require('@/services/api')
      apiClient.post.mockRejectedValue(new Error('API Error'))

      const deviceInfo = {
        deviceId: 'device-123',
        deviceName: 'Test Device',
        platform: 'Windows',
      }

      await expect(
        authService.login('invalid-token', deviceInfo)
      ).rejects.toThrow('API Error')
    })
  })

  describe('logout', () => {
    it('should call logout API endpoint', async () => {
      const { apiClient } = require('@/services/api')
      apiClient.post.mockResolvedValue({})

      await authService.logout()

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout')
    })
  })

  describe('verifySession', () => {
    it('should verify valid session', async () => {
      const { apiClient } = require('@/services/api')
      const mockResponse = {
        valid: true,
        user: { id: 'user-123', email: 'test@example.com' },
      }
      apiClient.get.mockResolvedValue(mockResponse)

      localStorageMock.getItem.mockReturnValue('existing-token')

      const result = await authService.verifySession('test-token')

      expect(localStorageMock.setItem).toHaveBeenCalledWith('session_token', 'test-token')
      expect(apiClient.get).toHaveBeenCalledWith('/auth/verify')
      expect(result).toEqual(mockResponse)
    })

    it('should restore original token on error', async () => {
      const { apiClient } = require('@/services/api')
      apiClient.get.mockRejectedValue(new Error('Invalid token'))

      localStorageMock.getItem.mockReturnValue('original-token')

      await expect(
        authService.verifySession('invalid-token')
      ).rejects.toThrow('Invalid token')

      expect(localStorageMock.setItem).toHaveBeenCalledWith('session_token', 'original-token')
    })
  })

  describe('getDeviceInfo', () => {
    it('should return device information', () => {
      localStorageMock.getItem.mockReturnValue(null) // No existing device ID

      const deviceInfo = authService.getDeviceInfo()

      expect(deviceInfo).toHaveProperty('deviceId')
      expect(deviceInfo).toHaveProperty('deviceName')
      expect(deviceInfo).toHaveProperty('platform')
      expect(typeof deviceInfo.deviceId).toBe('string')
      expect(deviceInfo.deviceId.length).toBeGreaterThan(0)
    })

    it('should reuse existing device ID', () => {
      const existingDeviceId = 'existing-device-123'
      localStorageMock.getItem.mockReturnValue(existingDeviceId)

      const deviceInfo = authService.getDeviceInfo()

      expect(deviceInfo.deviceId).toBe(existingDeviceId)
    })

    it('should detect browser type', () => {
      // Mock user agent for Chrome
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      })

      localStorageMock.getItem.mockReturnValue(null)

      const deviceInfo = authService.getDeviceInfo()

      expect(deviceInfo.deviceName).toBe('Chrome Browser')
    })

    it('should detect platform', () => {
      // Mock user agent for Windows
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true,
      })

      localStorageMock.getItem.mockReturnValue(null)

      const deviceInfo = authService.getDeviceInfo()

      expect(deviceInfo.platform).toBe('Windows')
    })
  })
})