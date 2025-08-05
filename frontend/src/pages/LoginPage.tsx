/**
 * Login page with Google authentication.
 * Handles user authentication and device verification.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
} from '@mui/material'
import { Google as GoogleIcon } from '@mui/icons-material'
import { signInWithPopup } from 'firebase/auth'

import { useAuth } from '@/hooks/useAuth'
import { useNotification } from '@/contexts/NotificationContext'
import { auth, googleProvider } from '@/services/firebase'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const { showError, showSuccess } = useNotification()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      // Sign in with Google using Firebase Auth
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user
      
      if (!user) {
        throw new Error('No user returned from Google Sign-In')
      }

      // Get the ID token for backend authentication
      const idToken = await user.getIdToken()
      
      // Get device information for backend
      const deviceInfo = {
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
        platform: getPlatform(),
      }

      // Call backend login endpoint
      await login(idToken, deviceInfo)
      
      showSuccess('Successfully signed in!')
      
    } catch (err: unknown) {
      console.error('Login error:', err)
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Login failed'
      
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled'
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage = 'Sign-in popup was blocked. Please allow popups for this site.'
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Device fingerprinting functions
  const getDeviceId = (): string => {
    let deviceId = localStorage.getItem('device_id')
    
    if (!deviceId) {
      // Generate a device fingerprint
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

  const getDeviceName = (): string => {
    const userAgent = navigator.userAgent
    
    if (userAgent.includes('Chrome')) return 'Chrome Browser'
    if (userAgent.includes('Firefox')) return 'Firefox Browser'
    if (userAgent.includes('Safari')) return 'Safari Browser'
    if (userAgent.includes('Edge')) return 'Edge Browser'
    
    return 'Unknown Browser'
  }

  const getPlatform = (): string => {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('win')) return 'Windows'
    if (userAgent.includes('mac')) return 'macOS'
    if (userAgent.includes('linux')) return 'Linux'
    if (userAgent.includes('android')) return 'Android'
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS'
    
    return 'Unknown'
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Logo/Title */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                EBS Home
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Family Vacation House Management
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Google Sign-In Button */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? 'Signing in...' : t('auth.loginWithGoogle')}
            </Button>

            {/* Instructions */}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Sign in with your Google account to access the family vacation house
              management system. You can only be logged in from one device at a time.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}