/**
 * Mobile exit checklist form component.
 * Handles creating exit checklists with photos and notes for each category.
 */

import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { Button, Text, Card, Chip } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { apiClient } from '../services/api'
import { PhotoType } from '../types'
import FormField from './Forms/FormField'
import FormSection from './Forms/FormSection'
import PhotoUpload from './PhotoUpload'
import LoadingSpinner from './Layout/LoadingSpinner'
import ErrorMessage from './Layout/ErrorMessage'

interface ChecklistFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  bookingId?: string
}

interface ChecklistCategory {
  type: PhotoType
  title: string
  textNotes: string
  photos: PhotoEntry[]
  isOptional?: boolean
}

interface PhotoEntry {
  uri: string
  notes: string
}

const CHECKLIST_CATEGORIES: Omit<ChecklistCategory, 'textNotes' | 'photos'>[] = [
  {
    type: PhotoType.REFRIGERATOR,
    title: 'Refrigerator',
  },
  {
    type: PhotoType.FREEZER,
    title: 'Freezer', 
  },
  {
    type: PhotoType.CLOSET,
    title: 'Closets',
  },
  {
    type: PhotoType.GENERAL,
    title: 'General Notes',
    isOptional: true,
  },
]

export default function ChecklistForm({ onSuccess, onCancel, bookingId }: ChecklistFormProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  // Initialize categories with empty data
  const [categories, setCategories] = useState<ChecklistCategory[]>(
    CHECKLIST_CATEGORIES.map(cat => ({
      ...cat,
      textNotes: '',
      photos: [],
    }))
  )
  
  const [importantNotes, setImportantNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Validation
  const isValid = () => {
    // Check required categories have text notes (photos are optional)
    for (const category of categories) {
      if (!category.isOptional && category.textNotes.trim().length < 5) {
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!isValid()) {
      Alert.alert(
        t('common.error'),
        'Please provide text notes for all required categories (minimum 5 characters)'
      )
      return
    }

    try {
      setLoading(true)
      setError('')

      const checklistData = {
        booking_id: bookingId,
        categories: categories.map(cat => ({
          type: cat.type,
          text_notes: cat.textNotes,
          photos: cat.photos.map(photo => ({
            photo_url: photo.uri,
            notes: photo.notes,
          })),
        })),
        important_notes: importantNotes.trim(),
      }

      await apiClient.post('/checklists', checklistData)
      
      Alert.alert(
        t('common.success'),
        t('checklist.checklistSubmitted'),
        [
          {
            text: t('common.confirm'),
            onPress: () => onSuccess?.()
          }
        ]
      )
      
    } catch (error) {
      console.error('Failed to submit checklist:', error)
      const errorMessage = error instanceof Error ? error.message : t('errors.serverError')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const updateCategoryTextNotes = (categoryIndex: number, notes: string) => {
    setCategories(prev => prev.map((cat, index) => 
      index === categoryIndex 
        ? { ...cat, textNotes: notes }
        : cat
    ))
  }

  const handlePhotoUpload = (categoryIndex: number, url: string) => {
    setCategories(prev => prev.map((cat, index) => 
      index === categoryIndex 
        ? { 
            ...cat, 
            photos: [...cat.photos, { uri: url, notes: '' }]
          }
        : cat
    ))
  }

  const handlePhotoError = (error: string) => {
    Alert.alert(t('common.error'), error)
  }

  const updatePhotoNotes = (categoryIndex: number, photoIndex: number, notes: string) => {
    setCategories(prev => prev.map((cat, index) => 
      index === categoryIndex 
        ? {
            ...cat,
            photos: cat.photos.map((photo, pIndex) =>
              pIndex === photoIndex ? { ...photo, notes } : photo
            )
          }
        : cat
    ))
  }

  const removePhoto = (categoryIndex: number, photoIndex: number) => {
    setCategories(prev => prev.map((cat, index) => 
      index === categoryIndex 
        ? {
            ...cat,
            photos: cat.photos.filter((_, pIndex) => pIndex !== photoIndex)
          }
        : cat
    ))
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
            {t('checklist.submitChecklist')}
          </Text>

          <Text 
            variant="bodyMedium" 
            style={[styles.instructions, { color: theme.colors.onSurfaceVariant }]}
          >
            Please provide text notes for each category. Photos are optional but helpful.
          </Text>

          {/* Category Sections */}
          {categories.map((category, categoryIndex) => (
            <FormSection
              key={category.type}
              title={category.isOptional ? `${category.title} (Optional)` : category.title}
              description={
                category.type === PhotoType.GENERAL 
                  ? t('checklist.generalNotesDescription')
                  : `Document the condition of the ${category.title.toLowerCase()}`
              }
            >
              {/* Text Notes */}
              <FormField
                label={`${category.title} Notes`}
                value={category.textNotes}
                onChangeText={(text) => updateCategoryTextNotes(categoryIndex, text)}
                placeholder={`Describe the condition of the ${category.title.toLowerCase()}...`}
                multiline
                numberOfLines={3}
                required={!category.isOptional}
                maxLength={500}
                error={
                  !category.isOptional && 
                  category.textNotes.length > 0 && 
                  category.textNotes.length < 5
                    ? 'Notes must be at least 5 characters'
                    : undefined
                }
              />

              {/* Photos Section */}
              <Text variant="titleSmall" style={styles.photoSectionTitle}>
                Photos (Optional)
              </Text>
              
              {/* Existing Photos */}
              {category.photos.map((photo, photoIndex) => (
                <Card key={photoIndex} style={styles.photoCard}>
                  <Card.Content>
                    <View style={styles.photoHeader}>
                      <Text variant="bodyMedium">Photo {photoIndex + 1}</Text>
                      <Button
                        mode="text"
                        onPress={() => removePhoto(categoryIndex, photoIndex)}
                        textColor={theme.colors.error}
                        compact
                      >
                        Remove
                      </Button>
                    </View>
                    
                    <FormField
                      label="Photo Notes"
                      value={photo.notes}
                      onChangeText={(text) => updatePhotoNotes(categoryIndex, photoIndex, text)}
                      placeholder="Optional notes about this photo..."
                      multiline
                      numberOfLines={2}
                      maxLength={200}
                    />
                  </Card.Content>
                </Card>
              ))}

              {/* Add Photo Button */}
              {category.photos.length < 3 && (
                <PhotoUpload
                  onUploadComplete={(url) => handlePhotoUpload(categoryIndex, url)}
                  onUploadError={handlePhotoError}
                  uploadPath="checklists"
                  label={`Add Photo to ${category.title}`}
                />
              )}
            </FormSection>
          ))}

          {/* Important Notes Section */}
          <FormSection 
            title="Important Notes"
            description="Any additional important information for the next guests"
          >
            <FormField
              label="Important Notes"
              value={importantNotes}
              onChangeText={setImportantNotes}
              placeholder="Any special instructions, issues, or observations..."
              multiline
              numberOfLines={3}
              maxLength={500}
            />
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
          disabled={!isValid() || loading}
          style={[styles.actionButton, styles.submitButton]}
        >
          {t('checklist.submitChecklist')}
        </Button>
      </View>
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
    marginBottom: 16,
  },
  instructions: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  photoSectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  photoCard: {
    marginBottom: 12,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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