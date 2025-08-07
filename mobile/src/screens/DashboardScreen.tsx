/**
 * Dashboard screen showing overview of app features.
 * Placeholder implementation - will be fully implemented in Phase 4.
 */

import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { Card, Title, Paragraph } from 'react-native-paper'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'

export default function DashboardScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.welcome, { color: theme.colors.onBackground }]}>
        {t('dashboard.welcome')}
      </Text>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title>{t('dashboard.currentBookings')}</Title>
          <Paragraph>Placeholder - Phase 4 Implementation</Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>{t('dashboard.pendingMaintenance')}</Title>
          <Paragraph>Placeholder - Phase 4 Implementation</Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>{t('dashboard.exitReminders')}</Title>
          <Paragraph>Placeholder - Phase 4 Implementation</Paragraph>
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
  },
})