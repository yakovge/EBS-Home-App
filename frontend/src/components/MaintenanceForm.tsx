/**
 * Maintenance request form component.
 * Handles creating new maintenance requests with photo upload.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { PhotoCamera } from '@mui/icons-material'
import { useNotification } from '@/contexts/NotificationContext'
import { uploadService } from '@/services/uploadService'
import { apiClient } from '@/services/api'

interface MaintenanceFormProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
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

export default function MaintenanceForm({ open, onClose, onSuccess }: MaintenanceFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()
  
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newPhotos = Array.from(event.target.files)
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 5)) // Max 5 photos
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!description.trim()) {
      setError('Description is required')
      return
    }
    if (!location) {
      setError('Location is required')
      return
    }
    if (photos.length === 0) {
      setError('At least one photo is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Upload photos first
      const photoUrls: string[] = []
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        const url = await uploadService.uploadMaintenancePhoto(
          photo,
          (progress) => setUploadProgress(Math.round((i + progress / 100) / photos.length * 100))
        )
        photoUrls.push(url)
      }

      // Create maintenance request
      const response = await apiClient.post('/maintenance', {
        description: description.trim(),
        location,
        photo_urls: photoUrls
      })

      showSuccess('Maintenance request created successfully')
      onSuccess?.()
      handleClose()
    } catch (err: any) {
      console.error('Failed to create maintenance request:', err)
      showError(err.response?.data?.message || 'Failed to create maintenance request')
      setError(err.response?.data?.message || 'Failed to create maintenance request')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setDescription('')
      setLocation('')
      setPhotos([])
      setError('')
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('maintenance.createRequest')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label={t('maintenance.description')}
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('maintenance.location')}</InputLabel>
            <Select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={loading}
              label={t('maintenance.location')}
            >
              {LOCATIONS.map((loc) => (
                <MenuItem key={loc} value={loc}>
                  {loc}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mb: 2 }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="photo-upload"
              multiple
              type="file"
              onChange={handlePhotoChange}
              disabled={loading}
            />
            <label htmlFor="photo-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<PhotoCamera />}
                disabled={loading}
                fullWidth
              >
                {t('maintenance.uploadPhotos')} ({photos.length}/5)
              </Button>
            </label>
          </Box>

          {photos.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Selected photos: {photos.map(p => p.name).join(', ')}
              </Typography>
            </Box>
          )}

          {loading && uploadProgress > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CircularProgress
                variant="determinate"
                value={uploadProgress}
                size={24}
                sx={{ mr: 1 }}
              />
              <Typography variant="body2">
                Uploading photos... {uploadProgress}%
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !description || !location || photos.length === 0}
        >
          {loading ? t('common.submitting') : t('common.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}