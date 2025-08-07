/**
 * Maintenance form screen for creating new maintenance requests.
 * Uses the MaintenanceForm component with navigation integration.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import MaintenanceForm from '../components/MaintenanceForm'

export default function MaintenanceFormScreen() {
  const { theme } = useTheme()
  const navigation = useNavigation()

  const handleSuccess = () => {
    // Navigate back to the maintenance list
    navigation.goBack()
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <MaintenanceForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})