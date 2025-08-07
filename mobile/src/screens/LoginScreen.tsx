/**
 * Login screen for user authentication.
 * Uses the LoginForm component for token-based authentication.
 */

import React from 'react'
import { View, StyleSheet, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import LoginForm from '../components/Auth/LoginForm'

export default function LoginScreen() {
  const { theme, isDark } = useTheme()

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background}
      />
      <LoginForm />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})