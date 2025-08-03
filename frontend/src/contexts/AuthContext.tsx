/**
 * Authentication context providing user state and auth methods.
 * Manages login, logout, and user session across the application.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@/types'
import { authService } from '@/services/authService'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (token: string, deviceInfo: any) => Promise<void>
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

  const checkExistingSession = async () => {
    try {
      const token = localStorage.getItem('session_token')
      if (token) {
        const response = await authService.verifySession(token)
        if (response.valid && response.user) {
          setUser(response.user)
        } else {
          localStorage.removeItem('session_token')
        }
      }
    } catch (error) {
      console.error('Session verification failed:', error)
      localStorage.removeItem('session_token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (token: string, deviceInfo: any) => {
    try {
      setLoading(true)
      const response = await authService.login(token, deviceInfo)
      
      if (response.user && response.session_token) {
        setUser(response.user)
        localStorage.setItem('session_token', response.session_token)
      } else {
        throw new Error('Invalid login response')
      }
    } catch (error) {
      console.error('Login failed:', error)
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
      localStorage.removeItem('session_token')
    }
  }

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('session_token')
      if (token) {
        const response = await authService.verifySession(token)
        if (response.valid && response.user) {
          setUser(response.user)
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
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