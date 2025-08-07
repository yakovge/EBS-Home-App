/**
 * Empty state component for displaying when no data is available.
 * Consistent empty state design across the mobile app.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Button, Icon } from 'react-native-paper'
import { useTheme } from '../../contexts/ThemeContext'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  actionText?: string
  onActionPress?: () => void
}

export default function EmptyState({
  icon = 'inbox-outline',
  title,
  description,
  actionText,
  onActionPress,
}: EmptyStateProps) {
  const { theme } = useTheme()

  return (
    <View style={styles.container}>
      <Icon 
        source={icon} 
        size={80} 
        color={theme.colors.outline}
      />
      
      <Text 
        style={[
          styles.title, 
          { color: theme.colors.onSurface, marginTop: 24 }
        ]}
        variant="headlineSmall"
      >
        {title}
      </Text>
      
      {description && (
        <Text 
          style={[
            styles.description, 
            { color: theme.colors.onSurfaceVariant, marginTop: 8 }
          ]}
          variant="bodyMedium"
        >
          {description}
        </Text>
      )}
      
      {actionText && onActionPress && (
        <Button
          mode="contained"
          onPress={onActionPress}
          style={styles.action}
        >
          {actionText}
        </Button>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    textAlign: 'center',
    fontWeight: '600',
  },
  description: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  action: {
    marginTop: 24,
  },
})