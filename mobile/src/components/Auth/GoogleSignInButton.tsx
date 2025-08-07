/**
 * Google Sign-In button component for mobile authentication.
 * Simplified version for demo/development purposes.
 */

import React, { useState } from 'react'
import { View, Alert } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { useAuthContext } from '../../contexts/AuthContext'
import { authService } from '../../services/authService'

export default function GoogleSignInButton() {
  const { t } = useTranslation()
  const { login } = useAuthContext()
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      
      // For development/demo purposes, create a simple test token
      // This simulates what Firebase Auth would provide
      const demoToken = `test_token_${Date.now()}_mobile_demo`
      
      // Get device info
      const deviceInfo = await authService.getDeviceInfo()
      
      // Attempt login with demo token
      await login(demoToken, deviceInfo)
      
    } catch (error) {
      console.error('Google Sign-In failed:', error)
      Alert.alert(
        t('common.error'),
        'Demo sign-in failed. This is expected in development mode. Please use a real Firebase token from the web app.',
        [{ text: t('common.confirm') }]
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <View>
      <Button
        mode="contained"
        onPress={handleGoogleSignIn}
        disabled={loading}
        icon="google"
        style={{ marginBottom: 16 }}
      >
        {loading ? t('common.loading') : 'Sign in with Google (Demo)'}
      </Button>
      
      <Text variant="bodySmall" style={{ textAlign: 'center', marginBottom: 16 }}>
        Demo mode - for development testing
      </Text>
    </View>
  )
}