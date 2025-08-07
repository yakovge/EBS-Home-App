/**
 * Demo login button for testing without Firebase
 */

import React, { useState } from 'react'
import { Alert } from 'react-native'
import { Button } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthContext } from '../../contexts/AuthContext'
import { Config } from '../../config'

export default function DemoLoginButton() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const authContext = useAuthContext()

  const handleDemoLogin = async () => {
    try {
      setLoading(true)
      
      const demoToken = Config.DEMO_TOKEN
      
      // Use the AuthContext login method directly - it handles demo mode now
      const mockDeviceInfo = {
        deviceId: 'demo_device_123',
        deviceName: 'Demo iPhone',
        platform: 'iOS'
      }
      
      await authContext.login(demoToken, mockDeviceInfo)
      
      // Success message
      Alert.alert(
        'Demo Login Successful!',
        'You are now logged in as Demo User. You can now test all app features!',
        [{ text: 'OK' }]
      )
      
    } catch (error) {
      console.error('Demo login failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      Alert.alert('Error', 'Demo login failed: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      mode="outlined"
      onPress={handleDemoLogin}
      disabled={loading}
      icon="account-circle"
      style={{ marginBottom: 16 }}
    >
      {loading ? 'Setting up...' : 'Demo Login (Skip Auth)'}
    </Button>
  )
}