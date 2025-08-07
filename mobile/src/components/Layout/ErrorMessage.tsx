/**
 * Error message component for displaying error states.
 * Consistent error handling across the mobile app.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Button, Icon, Card } from 'react-native-paper'
import { useTheme } from '../../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'

interface ErrorMessageProps {
  title?: string
  message: string
  showRetry?: boolean
  onRetry?: () => void
  fullScreen?: boolean
}

export default function ErrorMessage({
  title,
  message,
  showRetry = false,
  onRetry,
  fullScreen = false,
}: ErrorMessageProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()

  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.container

  return (
    <View style={containerStyle}>
      <Card style={[styles.card, { backgroundColor: theme.colors.errorContainer }]}>
        <Card.Content style={styles.cardContent}>
          <Icon 
            source="alert-circle-outline" 
            size={48} 
            color={theme.colors.error}
          />
          
          {title && (
            <Text 
              style={[
                styles.title, 
                { color: theme.colors.onErrorContainer, marginTop: 16 }
              ]}
              variant="titleMedium"
            >
              {title}
            </Text>
          )}
          
          <Text 
            style={[
              styles.message, 
              { color: theme.colors.onErrorContainer, marginTop: title ? 8 : 16 }
            ]}
            variant="bodyMedium"
          >
            {message}
          </Text>
          
          {showRetry && onRetry && (
            <Button
              mode="contained"
              onPress={onRetry}
              style={styles.retryButton}
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
            >
              {t('common.retry')}
            </Button>
          )}
        </Card.Content>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    elevation: 2,
  },
  cardContent: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    textAlign: 'center',
    fontWeight: '600',
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
  },
})