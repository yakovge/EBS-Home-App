/**
 * Form section component for grouping related form fields.
 * Provides consistent section styling and organization.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Divider } from 'react-native-paper'
import { useTheme } from '../../contexts/ThemeContext'

interface FormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  showDivider?: boolean
}

export default function FormSection({
  title,
  description,
  children,
  showDivider = true,
}: FormSectionProps) {
  const { theme } = useTheme()

  return (
    <View style={styles.container}>
      {showDivider && <Divider style={styles.topDivider} />}
      
      <View style={styles.header}>
        <Text 
          variant="titleMedium" 
          style={[styles.title, { color: theme.colors.onSurface }]}
        >
          {title}
        </Text>
        
        {description && (
          <Text 
            variant="bodyMedium" 
            style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
          >
            {description}
          </Text>
        )}
      </View>
      
      <View style={styles.content}>
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  topDivider: {
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    lineHeight: 20,
  },
  content: {
    // Content styles
  },
})