/**
 * Checklist form screen for creating exit checklists.
 * Uses the ChecklistForm component with navigation and route parameters.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import ChecklistForm from '../components/ChecklistForm'

type ChecklistFormRouteProp = RouteProp<{
  ChecklistForm: { bookingId?: string }
}, 'ChecklistForm'>

export default function ChecklistFormScreen() {
  const { theme } = useTheme()
  const navigation = useNavigation()
  const route = useRoute<ChecklistFormRouteProp>()
  
  const { bookingId } = route.params || {}

  const handleSuccess = () => {
    // Navigate back to the checklist list
    navigation.goBack()
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ChecklistForm
        bookingId={bookingId}
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