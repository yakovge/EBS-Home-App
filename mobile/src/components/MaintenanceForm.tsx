/**
 * Mobile maintenance request form component.
 * Handles creating new maintenance requests with photo upload using native UI.
 */

import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { Button, Text, Card, Menu } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { useOfflineContext } from '../contexts/OfflineContext'
import { notificationService } from '../services/notifications'
import FormField from './Forms/FormField'
import FormSection from './Forms/FormSection'
import PhotoUpload from './PhotoUpload'
import LoadingSpinner from './Layout/LoadingSpinner'
import ErrorMessage from './Layout/ErrorMessage'
import OfflineIndicator from './Common/OfflineIndicator'

interface MaintenanceFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const LOCATIONS = [
  'Kitchen',
  'Living Room',
  'Master Bedroom',
  'Guest Bedroom',
  'Bathroom',
  'Guest Bathroom',
  'Garden',
  'Pool',
  'Garage',
  'Other'
]

export default function MaintenanceForm({ onSuccess, onCancel }: MaintenanceFormProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const { postData, isOnline } = useOfflineContext()
  
  // Form state
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [customLocation, setCustomLocation] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [locationMenuVisible, setLocationMenuVisible] = useState(false)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Validation
  const isValid = description.trim().length >= 10 && 
                  (location !== '' || customLocation.trim() !== '')

  const getLocationValue = () => {
    return location === 'Other' ? customLocation : location
  }

  const handleSubmit = async () => {
    if (!isValid) return

    try {
      setLoading(true)
      setError('')

      const maintenanceData = {
        description: description.trim(),
        location: getLocationValue(),
        photo_urls: photoUrls
      }

      const response = await postData('/maintenance', maintenanceData, {
        priority: 'high' // Maintenance requests are high priority
      })
      
      // Schedule local notification for confirmation
      await notificationService.scheduleMaintenanceNotification(
        response?.id || 'new-request',
        'Maintenance Request Submitted',
        `Your request for "${description.trim()}" has been ${isOnline ? 'submitted' : 'queued for sync'} and will be reviewed by the maintenance team.`,
        2 // 2 seconds delay
      )
      
      const successMessage = isOnline ? 
        t('maintenance.requestSubmitted') : 
        t('maintenance.requestQueued')
      
      Alert.alert(
        t('common.success'),
        successMessage,
        [
          {
            text: t('common.confirm'),
            onPress: () => onSuccess?.()
          }
        ]
      )
      
    } catch (error) {
      console.error('Failed to create maintenance request:', error)
      
      let errorMessage: string
      if (error instanceof Error && error.message.includes('queued')) {
        // Operation was queued for offline sync
        errorMessage = t('maintenance.requestQueued')
        
        // Still show success since it was queued
        Alert.alert(
          t('common.success'),
          errorMessage,
          [
            {
              text: t('common.confirm'),
              onPress: () => onSuccess?.()
            }
          ]
        )
        return
      } else {
        errorMessage = error instanceof Error ? error.message : t('errors.serverError')
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpload = (url: string) => {
    setPhotoUrls(prev => [...prev, url])
  }

  const handlePhotoError = (error: string) => {
    Alert.alert(t('common.error'), error)
  }

  const handlePhotoRemove = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleLocationSelect = (selectedLocation: string) => {
    setLocation(selectedLocation)
    setLocationMenuVisible(false)
    
    // Clear custom location if not "Other"
    if (selectedLocation !== 'Other') {
      setCustomLocation('')
    }
  }

  if (loading) {
    return <LoadingSpinner text={t('common.loading')} fullScreen />
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {error && (
        <ErrorMessage
          message={error}
          showRetry={true}
          onRetry={() => setError('')}
        />
      )}

      <Card style={styles.formCard}>
        <Card.Content style={styles.formContent}>
          <Text 
            variant="headlineSmall" 
            style={[styles.formTitle, { color: theme.colors.onSurface }]}
          >
            {t('maintenance.createRequest')}
          </Text>

          <FormSection 
            title={t('maintenance.description')}
            description="Describe the maintenance issue in detail"
            showDivider={false}
          >
            <FormField
              label={t('maintenance.description')}
              value={description}
              onChangeText={setDescription}
              placeholder="Please describe the maintenance issue..."
              multiline
              numberOfLines={4}
              required
              maxLength={1000}
              error={description.length > 0 && description.length < 10 ? 
                'Description must be at least 10 characters' : undefined}
            />
          </FormSection>

          <FormSection 
            title={t('maintenance.location')}
            description="Select or specify the location of the issue"
          >
            <Menu
              visible={locationMenuVisible}
              onDismiss={() => setLocationMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setLocationMenuVisible(true)}
                  style={styles.locationButton}
                  contentStyle={styles.locationButtonContent}
                >
                  {location || 'Select Location *'}
                </Button>
              }
            >
              {LOCATIONS.map((loc) => (
                <Menu.Item
                  key={loc}
                  onPress={() => handleLocationSelect(loc)}
                  title={loc}
                />
              ))}
            </Menu>

            {location === 'Other' && (
              <FormField
                label="Custom Location"
                value={customLocation}
                onChangeText={setCustomLocation}
                placeholder="Specify the location..."
                required
                maxLength={100}
              />
            )}
          </FormSection>

          <FormSection 
            title={t('maintenance.photos')}
            description="Add photos to help explain the issue (optional)"
          >
            {/* Add up to 3 photos */}
            {Array.from({ length: 3 }, (_, index) => (
              <View key={index}>
                {index < photoUrls.length ? (
                  <Card style={styles.photoCard}>
                    <View style={styles.photoHeader}>
                      <Text variant="bodyMedium">Photo {index + 1}</Text>
                      <Button
                        mode="text"
                        onPress={() => handlePhotoRemove(index)}
                        textColor={theme.colors.error}
                      >
                        Remove
                      </Button>
                    </View>
                  </Card>
                ) : index === photoUrls.length && index < 3 ? (
                  <PhotoUpload
                    onUploadComplete={handlePhotoUpload}
                    onUploadError={handlePhotoError}
                    uploadPath="maintenance"
                    label={`Add Photo ${index + 1} (Optional)`}
                  />
                ) : null}
              </View>
            ))}
          </FormSection>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Button
          mode="outlined"
          onPress={onCancel}
          style={[styles.actionButton, styles.cancelButton]}
          disabled={loading}
        >
          {t('common.cancel')}
        </Button>
        
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!isValid || loading}
          style={[styles.actionButton, styles.submitButton]}
        >
          {t('maintenance.createRequest')}
        </Button>
      </View>
      
      {/* Offline Indicator */}
      <OfflineIndicator position="bottom" />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  formCard: {
    marginBottom: 16,
  },
  formContent: {
    padding: 20,
  },
  formTitle: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 24,
  },
  locationButton: {
    marginBottom: 16,
  },
  locationButtonContent: {
    paddingVertical: 8,
  },
  photoCard: {
    marginBottom: 12,
    padding: 12,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  cancelButton: {
    // Additional cancel button styles
  },
  submitButton: {
    // Additional submit button styles
  },
})