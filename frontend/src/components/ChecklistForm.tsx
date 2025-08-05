/**
 * Exit checklist form component.
 * Handles structured photo uploads for refrigerator, freezer, and closets.
 */

import { useState } from 'react'
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
  Card,
  CardContent,
  CardActions,
  LinearProgress,
  Alert,
  Chip,
  Grid,
  IconButton,
} from '@mui/material'
import { 
  PhotoCamera, 
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon 
} from '@mui/icons-material'
import { useNotification } from '@/contexts/NotificationContext'
import { uploadService } from '@/services/uploadService'
import { apiClient } from '@/services/api'

interface ChecklistFormProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  bookingId?: string
}

interface PhotoItem {
  file: File
  url: string
  notes: string
  uploaded: boolean
}

interface PhotoCategory {
  type: 'refrigerator' | 'freezer' | 'closet'
  title: string
  required: number
  photos: PhotoItem[]
}

export default function ChecklistForm({ open, onClose, onSuccess, bookingId }: ChecklistFormProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useNotification()
  
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  
  const [categories, setCategories] = useState<PhotoCategory[]>([
    {
      type: 'refrigerator',
      title: 'Refrigerator Photos',
      required: 2,
      photos: []
    },
    {
      type: 'freezer', 
      title: 'Freezer Photos',
      required: 2,
      photos: []
    },
    {
      type: 'closet',
      title: 'Closet Photos', 
      required: 3,
      photos: []
    }
  ])

  const handlePhotoChange = (categoryIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0]
      const category = categories[categoryIndex]
      
      // Check if we've reached the limit
      if (category.photos.length >= category.required) {
        showError(`Maximum ${category.required} photos allowed for ${category.title}`)
        return
      }
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      
      const newPhoto: PhotoItem = {
        file,
        url,
        notes: '',
        uploaded: false
      }
      
      setCategories(prev => prev.map((cat, idx) => 
        idx === categoryIndex 
          ? { ...cat, photos: [...cat.photos, newPhoto] }
          : cat
      ))
    }
  }

  const handleNotesChange = (categoryIndex: number, photoIndex: number, notes: string) => {
    setCategories(prev => prev.map((cat, catIdx) => 
      catIdx === categoryIndex 
        ? {
            ...cat, 
            photos: cat.photos.map((photo, photoIdx) => 
              photoIdx === photoIndex ? { ...photo, notes } : photo
            )
          }
        : cat
    ))
  }

  const handleRemovePhoto = (categoryIndex: number, photoIndex: number) => {
    setCategories(prev => prev.map((cat, catIdx) => 
      catIdx === categoryIndex 
        ? { ...cat, photos: cat.photos.filter((_, idx) => idx !== photoIndex) }
        : cat
    ))
  }

  const validateChecklist = (): boolean => {
    // Check if all required photos are present
    for (const category of categories) {
      if (category.photos.length < category.required) {
        setError(`${category.title} requires ${category.required} photos, but only ${category.photos.length} provided`)
        return false
      }
      
      // Check if all photos have notes
      for (const photo of category.photos) {
        if (!photo.notes.trim()) {
          setError(`All photos must have descriptive notes. Missing notes in ${category.title}`)
          return false
        }
      }
    }
    
    return true
  }

  const handleSubmit = async () => {
    if (!validateChecklist()) {
      return
    }

    if (!bookingId) {
      setError('Booking ID is required to submit checklist')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create checklist first
      const checklistResponse = await apiClient.post('/checklists', {
        booking_id: bookingId
      })
      
      const checklistId = checklistResponse.id

      // Upload all photos and add them to checklist
      let totalPhotos = categories.reduce((sum, cat) => sum + cat.photos.length, 0)
      let uploadedCount = 0

      for (const category of categories) {
        for (const photo of category.photos) {
          // Upload photo
          const photoUrl = await uploadService.uploadChecklistPhoto(
            photo.file,
            category.type,
            (progress) => {
              const overallProgress = Math.round(((uploadedCount + progress / 100) / totalPhotos) * 100)
              setUploadProgress(overallProgress)
            }
          )
          
          // Add photo to checklist
          await apiClient.post(`/checklists/${checklistId}/photos`, {
            photo_type: category.type,
            photo_url: photoUrl,
            notes: photo.notes
          })
          
          uploadedCount++
        }
      }

      // Submit checklist
      await apiClient.post(`/checklists/${checklistId}/submit`)

      showSuccess('Exit checklist submitted successfully')
      onSuccess?.()
      handleClose()
    } catch (err: any) {
      console.error('Failed to submit checklist:', err)
      showError(err.response?.data?.message || 'Failed to submit checklist')
      setError(err.response?.data?.message || 'Failed to submit checklist')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const handleClose = () => {
    if (!loading) {
      // Clean up preview URLs
      categories.forEach(category => {
        category.photos.forEach(photo => {
          URL.revokeObjectURL(photo.url)
        })
      })
      
      // Reset form
      setCategories([
        { type: 'refrigerator', title: 'Refrigerator Photos', required: 2, photos: [] },
        { type: 'freezer', title: 'Freezer Photos', required: 2, photos: [] },
        { type: 'closet', title: 'Closet Photos', required: 3, photos: [] }
      ])
      setError('')
      onClose()
    }
  }

  const getCompletionStatus = () => {
    const totalRequired = categories.reduce((sum, cat) => sum + cat.required, 0)
    const totalUploaded = categories.reduce((sum, cat) => sum + cat.photos.length, 0)
    const hasAllNotes = categories.every(cat => 
      cat.photos.every(photo => photo.notes.trim().length > 0)
    )
    
    return {
      totalRequired,
      totalUploaded,
      isComplete: totalUploaded === totalRequired && hasAllNotes
    }
  }

  const status = getCompletionStatus()

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Exit Checklist</Typography>
          <Chip 
            icon={status.isComplete ? <CheckCircleIcon /> : <UncheckedIcon />}
            label={`${status.totalUploaded}/${status.totalRequired} photos`}
            color={status.isComplete ? 'success' : 'default'}
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Before leaving the house, you must upload photos of all areas with descriptive notes about what is present or missing.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && uploadProgress > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Uploading photos... {uploadProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}

        <Grid container spacing={3}>
          {categories.map((category, categoryIndex) => (
            <Grid item xs={12} md={4} key={category.type}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {category.title}
                    </Typography>
                    <Chip 
                      label={`${category.photos.length}/${category.required}`}
                      color={category.photos.length === category.required ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>

                  {category.photos.map((photo, photoIndex) => (
                    <Box key={photoIndex} sx={{ mb: 2, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <img 
                          src={photo.url} 
                          alt={`${category.type} ${photoIndex + 1}`}
                          style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
                        />
                        <IconButton 
                          size="small" 
                          onClick={() => handleRemovePhoto(categoryIndex, photoIndex)}
                          sx={{ ml: 'auto' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      <TextField
                        fullWidth
                        size="small"
                        label="Notes (required)"
                        placeholder="Describe what you see or what's missing..."
                        value={photo.notes}
                        onChange={(e) => handleNotesChange(categoryIndex, photoIndex, e.target.value)}
                        multiline
                        rows={2}
                        required
                      />
                    </Box>
                  ))}
                </CardContent>
                
                <CardActions>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id={`photo-upload-${category.type}`}
                    type="file"
                    onChange={(e) => handlePhotoChange(categoryIndex, e)}
                    disabled={loading || category.photos.length >= category.required}
                  />
                  <label htmlFor={`photo-upload-${category.type}`}>
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<PhotoCamera />}
                      disabled={loading || category.photos.length >= category.required}
                      size="small"
                      fullWidth
                    >
                      Add Photo
                    </Button>
                  </label>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !status.isComplete}
        >
          {loading ? 'Submitting...' : 'Submit Checklist'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}