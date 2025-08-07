/**
 * Profile screen for user settings and information.
 * Placeholder implementation - will be fully implemented in Phase 4.
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'

export default function ProfileScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>
        {t('profile.title')}
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.onBackground }]}>
        Placeholder - Phase 4 Implementation
      </Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
})