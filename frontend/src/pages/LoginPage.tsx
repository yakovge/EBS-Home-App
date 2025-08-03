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

import { useAuth } from '@/hooks/useAuth'
import { useNotification } from '@/contexts/NotificationContext'
import { authService } from '@/services/authService'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const { showError } = useNotification()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      // This is a placeholder for Google Sign-In
      // In a real implementation, you would use Firebase Auth or Google's OAuth
      console.log('Google login clicked - implement Firebase Auth here')
      
      // For demo purposes, show error about Firebase setup
      setError('Google Sign-In requires Firebase configuration. Please set up Firebase Auth.')
      
    } catch (err: any) {
      console.error('Login error:', err)
      const errorMessage = err.message || 'Login failed'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
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