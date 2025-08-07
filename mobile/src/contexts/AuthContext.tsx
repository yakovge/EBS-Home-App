/**
 * Authentication context providing user state and auth methods for React Native.
 * Manages login, logout, and user session across the mobile application.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Device from 'expo-device'
import { User } from '../types'
import { authService } from '../services/authService'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (token: string, deviceInfo?: { deviceId: string; deviceName: string; platform: string }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on app load
    checkExistingSession()
  }, [])

  const getDeviceInfo = () => {
    return {
      deviceId: Device.deviceName || 'Unknown Device',
      deviceName: Device.modelName || 'Unknown Model',
      platform: Device.osName || 'Unknown Platform'
    }
  }

  const checkExistingSession = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await authService.verifySession(token)
      if (response.valid && response.user) {
        setUser(response.user)
      } else {
        // Invalid session, clear token
        await AsyncStorage.removeItem('session_token')
        setUser(null)
      }
    } catch (error: any) {
      console.error('Session verification failed:', error)
      // Clear invalid token
      await AsyncStorage.removeItem('session_token')
      setUser(null)
      
      // Only show error if it's not a 401 (expected for expired tokens)
      if (error.response?.status !== 401) {
        console.error('Unexpected session verification error:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (token: string, deviceInfo?: { deviceId: string; deviceName: string; platform: string }) => {
    try {
      setLoading(true)
      
      // Use provided device info or get it automatically
      const finalDeviceInfo = deviceInfo || getDeviceInfo()
      
      const response = await authService.login(token, finalDeviceInfo)
      
      if (response.user && response.session_token) {
        setUser(response.user)
        await AsyncStorage.setItem('session_token', response.session_token)
      } else {
        throw new Error('Invalid login response: missing user or session token')
      }
    } catch (error: any) {
      console.error('Login failed:', error)
      // Clear any stale data
      setUser(null)
      await AsyncStorage.removeItem('session_token')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      await AsyncStorage.removeItem('session_token')
    }
  }

  const refreshUser = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token')
      if (!token) {
        setUser(null)
        return
      }

      const response = await authService.verifySession(token)
      if (response.valid && response.user) {
        setUser(response.user)
      } else {
        // Session no longer valid
        setUser(null)
        await AsyncStorage.removeItem('session_token')
      }
    } catch (error: any) {
      console.error('Failed to refresh user:', error)
      // On refresh failure, clear user and token
      setUser(null)
      await AsyncStorage.removeItem('session_token')
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}