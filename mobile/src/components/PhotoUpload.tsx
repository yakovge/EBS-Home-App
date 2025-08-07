/**
 * Mobile photo upload component using React Native Image Picker.
 * Handles camera capture, gallery selection, and upload to backend.
 */

import React, { useState } from 'react'
import { View, StyleSheet, Alert, Image } from 'react-native'
import { Button, Text, Card, IconButton, ProgressBar, Menu } from 'react-native-paper'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { uploadService } from '../services/uploadService'

interface PhotoUploadProps {
  onUploadComplete: (url: string) => void
  onUploadError: (error: string) => void
  onRemove?: () => void
  currentImageUrl?: string
  uploadPath: string
  label?: string
  disabled?: boolean
}

export default function PhotoUpload({
  onUploadComplete,
  onUploadError,
  onRemove,
  currentImageUrl,
  uploadPath,
  label,
  disabled = false,
}: PhotoUploadProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUri, setPreviewUri] = useState<string | null>(currentImageUrl || null)
  const [menuVisible, setMenuVisible] = useState(false)

  const requestPermissions = async () => {
    // Request camera permissions
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync()
    if (cameraPermission.status !== 'granted') {
      Alert.alert(
        t('permissions.camera'),
        'Sorry, we need camera permissions to take photos!'
      )
      return false
    }

    // Request media library permissions
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (mediaPermission.status !== 'granted') {
      Alert.alert(
        t('permissions.photoLibrary'),
        'Sorry, we need photo library permissions to select photos!'
      )
      return false
    }

    return true
  }

  const handleImageResult = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return
    }

    const asset = result.assets[0]
    
    try {
      setUploading(true)
      setUploadProgress(0)
      setPreviewUri(asset.uri)

      // Upload photo using the upload service
      const photoUrl = await uploadService.uploadChecklistPhoto(
        asset.uri,
        'general', // Default photo type for uploads
        (progress) => {
          setUploadProgress(progress)
        }
      )

      onUploadComplete(photoUrl)
      setPreviewUri(photoUrl)
      
    } catch (error) {
      console.error('Upload failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      onUploadError(errorMessage)
      setPreviewUri(null)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const takePhoto = async () => {
    setMenuVisible(false)
    
    const hasPermission = await requestPermissions()
    if (!hasPermission) return

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })

    await handleImageResult(result)
  }

  const selectFromGallery = async () => {
    setMenuVisible(false)
    
    const hasPermission = await requestPermissions()
    if (!hasPermission) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })

    await handleImageResult(result)
  }

  const handleRemove = () => {
    setPreviewUri(null)
    if (onRemove) {
      onRemove()
    }
  }

  const openMenu = () => setMenuVisible(true)
  const closeMenu = () => setMenuVisible(false)

  return (
    <View style={styles.container}>
      {previewUri ? (
        // Image Preview
        <Card style={styles.previewCard}>
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: previewUri }} 
              style={styles.previewImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <IconButton
                icon="delete"
                iconColor={theme.colors.onError}
                containerColor={theme.colors.error}
                size={20}
                onPress={handleRemove}
                disabled={uploading}
              />
            </View>
          </View>
          
          {uploading && (
            <View style={styles.progressContainer}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                {t('common.loading')}... {Math.round(uploadProgress)}%
              </Text>
              <ProgressBar 
                progress={uploadProgress / 100} 
                color={theme.colors.primary}
                style={styles.progressBar}
              />
            </View>
          )}
        </Card>
      ) : (
        // Upload Interface
        <Card style={[styles.uploadCard, { borderColor: theme.colors.outline }]}>
          <View style={styles.uploadContent}>
            <IconButton
              icon="camera-plus"
              size={48}
              iconColor={theme.colors.onSurfaceVariant}
              disabled={disabled}
            />
            
            <Text 
              variant="titleMedium" 
              style={[styles.uploadTitle, { color: theme.colors.onSurface }]}
            >
              {label || t('maintenance.addPhoto')}
            </Text>
            
            <Text 
              variant="bodyMedium" 
              style={[styles.uploadDescription, { color: theme.colors.onSurfaceVariant }]}
            >
              {t('maintenance.takePhoto')} or {t('maintenance.selectFromLibrary')}
            </Text>

            <Menu
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={
                <Button
                  mode="outlined"
                  onPress={openMenu}
                  disabled={disabled || uploading}
                  style={styles.uploadButton}
                  icon="camera-plus"
                >
                  {t('maintenance.addPhoto')}
                </Button>
              }
            >
              <Menu.Item
                onPress={takePhoto}
                title={t('maintenance.takePhoto')}
                leadingIcon="camera"
              />
              <Menu.Item
                onPress={selectFromGallery}
                title={t('maintenance.selectFromLibrary')}
                leadingIcon="image"
              />
            </Menu>
          </View>
        </Card>
      )}
      
      {uploading && !previewUri && (
        <View style={styles.loadingContainer}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
            {t('common.loading')}... {Math.round(uploadProgress)}%
          </Text>
          <ProgressBar 
            progress={uploadProgress / 100} 
            color={theme.colors.primary}
            style={styles.progressBar}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  uploadCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  uploadContent: {
    padding: 24,
    alignItems: 'center',
  },
  uploadTitle: {
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  uploadDescription: {
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadButton: {
    marginTop: 16,
  },
  previewCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  progressContainer: {
    padding: 16,
  },
  loadingContainer: {
    marginTop: 16,
  },
  progressBar: {
    marginTop: 8,
    height: 4,
    borderRadius: 2,
  },
})