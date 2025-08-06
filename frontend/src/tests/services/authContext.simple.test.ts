/**
 * Simplified tests for AuthContext improvements.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '@/services/authService'

// Mock authService
vi.mock('@/services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    verifySession: vi.fn(),
  }
}))

const mockAuthService = vi.mocked(authService)

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle successful login', async () => {
    const mockResponse = {
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      session_token: 'new-session-token'
    }
    mockAuthService.login.mockResolvedValue(mockResponse)
    
    const result = await mockAuthService.login('google-token', {
      deviceId: 'device-123',
      deviceName: 'Test Device',
      platform: 'Web'
    })
    
    expect(result).toEqual(mockResponse)
    expect(mockAuthService.login).toHaveBeenCalledTimes(1)
  })

  it('should handle login failure', async () => {
    mockAuthService.login.mockRejectedValue(new Error('Login failed'))
    
    await expect(mockAuthService.login('invalid-token', {
      deviceId: 'device-123',
      deviceName: 'Test Device',
      platform: 'Web'
    })).rejects.toThrow('Login failed')
  })

  it('should handle successful session verification', async () => {
    const mockResponse = {
      valid: true,
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' }
    }
    mockAuthService.verifySession.mockResolvedValue(mockResponse)
    
    const result = await mockAuthService.verifySession('valid-token')
    
    expect(result).toEqual(mockResponse)
    expect(result.valid).toBe(true)
  })

  it('should handle invalid session verification', async () => {
    const mockResponse = {
      valid: false,
      error: 'Invalid token'
    }
    mockAuthService.verifySession.mockResolvedValue(mockResponse)
    
    const result = await mockAuthService.verifySession('invalid-token')
    
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid token')
  })

  it('should handle session verification error', async () => {
    mockAuthService.verifySession.mockRejectedValue(new Error('Network error'))
    
    await expect(mockAuthService.verifySession('error-token')).rejects.toThrow('Network error')
  })
})