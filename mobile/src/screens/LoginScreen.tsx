/**
 * Login screen for user authentication.
 * Placeholder implementation - will be fully implemented in Phase 4.
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Button } from 'react-native-paper'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'

export default function LoginScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>
        {t('auth.login')}
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.onBackground }]}>
        Placeholder - Phase 4 Implementation
      </Text>
      <Button mode="contained" onPress={() => {}}>
        {t('auth.loginWithGoogle')}
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
})