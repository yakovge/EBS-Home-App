/**
 * Login form component for mobile authentication.
 * Handles token-based authentication with device registration.
 */

import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { Text, Button, Card } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuthContext } from '../../contexts/AuthContext'
import { authService } from '../../services/authService'
import FormField from '../Forms/FormField'
import LoadingSpinner from '../Layout/LoadingSpinner'
import GoogleSignInButton from './GoogleSignInButton'
import DemoLoginButton from './DemoLoginButton'

export default function LoginForm() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const { login, clearDemoSession } = useAuthContext()
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!token.trim()) {
      setError(t('auth.enterToken'))
      return
    }

    try {
      setLoading(true)
      setError('')

      // Get device information
      const deviceInfo = await authService.getDeviceInfo()
      
      // Attempt login
      await login(token.trim(), deviceInfo)
      
    } catch (error) {
      console.error('Login failed:', error)
      const errorMessage = error instanceof Error ? error.message : t('errors.authenticationFailed')
      setError(errorMessage)
      
      Alert.alert(
        t('common.error'),
        errorMessage,
        [{ text: t('common.confirm') }]
      )
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text={t('common.loading')} fullScreen />
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logoContainer}>
        <Text 
          variant="displaySmall" 
          style={[styles.appTitle, { color: theme.colors.primary }]}
        >
          EBS Home
        </Text>
        <Text 
          variant="titleMedium" 
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          {t('dashboard.welcome')}
        </Text>
      </View>

      <Card style={styles.formCard}>
        <Card.Content style={styles.formContent}>
          <Text 
            variant="headlineSmall" 
            style={[styles.formTitle, { color: theme.colors.onSurface }]}
          >
            {t('auth.login')}
          </Text>
          
          {/* Demo and Google Sign-In Options */}
          <DemoLoginButton />
          <Button
            mode="text"
            onPress={clearDemoSession}
            icon="logout"
            style={{ marginBottom: 8 }}
            textColor={theme.colors.error}
          >
            Clear Stored Session
          </Button>
          <GoogleSignInButton />
          
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.outline }]} />
            <Text style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>
              OR
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.outline }]} />
          </View>
          
          <Text 
            variant="bodyMedium" 
            style={[styles.instructions, { color: theme.colors.onSurfaceVariant }]}
          >
            {t('auth.loginInstructor')}
          </Text>

          <FormField
            label={t('auth.enterToken')}
            value={token}
            onChangeText={setToken}
            placeholder={t('auth.tokenPlaceholder')}
            multiline
            numberOfLines={4}
            error={error}
            required
            autoCapitalize="none"
            keyboardType="default"
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            disabled={loading || !token.trim()}
            style={styles.loginButton}
            contentStyle={styles.loginButtonContent}
          >
            {loading ? t('common.loading') : t('auth.login')}
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.footer}>
        <Text 
          variant="bodySmall" 
          style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}
        >
          EBS Home Mobile v1.0.0
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  formCard: {
    marginBottom: 24,
  },
  formContent: {
    padding: 24,
  },
  formTitle: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
  },
  instructions: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  loginButton: {
    marginTop: 16,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 12,
  },
})