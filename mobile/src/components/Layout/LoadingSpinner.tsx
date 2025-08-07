/**
 * Loading spinner component for displaying loading states.
 * Consistent loading indicator across the mobile app.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { ActivityIndicator, Text } from 'react-native-paper'
import { useTheme } from '../../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'

interface LoadingSpinnerProps {
  size?: 'small' | 'large'
  text?: string
  fullScreen?: boolean
}

export default function LoadingSpinner({ 
  size = 'large', 
  text, 
  fullScreen = false 
}: LoadingSpinnerProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()

  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.container

  return (
    <View style={[
      containerStyle, 
      { backgroundColor: fullScreen ? theme.colors.background : 'transparent' }
    ]}>
      <ActivityIndicator 
        animating={true} 
        color={theme.colors.primary} 
        size={size}
      />
      {text && (
        <Text 
          style={[
            styles.text, 
            { color: theme.colors.onBackground, marginTop: 16 }
          ]}
        >
          {text}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
    fontSize: 16,
  },
})