/**
 * Exit checklist form component - Text-first with optional photos.
 * Users must provide text notes for each category. Photos are optional.
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
  RadioButtonUnchecked as UncheckedIcon,
  TextFields as TextFieldsIcon
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

interface PhotoEntry {
  file: File
  url: string
  notes: string
  uploaded: boolean
}

interface ChecklistCategory {
  type: 'refrigerator' | 'freezer' | 'closet'
  title: string
  textNotes: string  // Required text notes for the category
  photos: PhotoEntry[]  // Optional photos
}

export default function ChecklistForm({ open, onClose, onSuccess, bookingId }: ChecklistFormProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useNotification()
  
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  
  const [categories, setCategories] = useState<ChecklistCategory[]>([
    {
      type: 'refrigerator',
      title: 'Refrigerator',
      textNotes: '',
      photos: []
    },
    {
      type: 'freezer', 
      title: 'Freezer',
      textNotes: '',
      photos: []
    },
    {
      type: 'closet',
      title: 'Closets', 
      textNotes: '',
      photos: []
    }
  ])

  const handleTextNotesChange = (categoryIndex: number, notes: string) => {
    setCategories(prev => prev.map((cat, idx) => 
      idx === categoryIndex ? { ...cat, textNotes: notes } : cat
    ))
  }

  const handlePhotoChange = (categoryIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0]
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      
      const newPhoto: PhotoEntry = {
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

  const handlePhotoNotesChange = (categoryIndex: number, photoIndex: number, notes: string) => {
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
    const category = categories[categoryIndex]
    const photo = category.photos[photoIndex]
    
    // Clean up preview URL
    if (photo.url) {
      URL.revokeObjectURL(photo.url)
    }
    
    setCategories(prev => prev.map((cat, catIdx) => 
      catIdx === categoryIndex 
        ? { ...cat, photos: cat.photos.filter((_, idx) => idx !== photoIndex) }
        : cat
    ))
  }

  const validateChecklist = (): boolean => {
    // Check if all categories have text notes (primary requirement)
    for (const category of categories) {
      if (!category.textNotes.trim() || category.textNotes.trim().length < 5) {
        setError(`${category.title} requires descriptive notes (at least 5 characters)`)
        return false
      }
      
      // Check if optional photos have notes
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

    setLoading(true)
    setError('')

    try {
      // Create checklist first (booking_id is optional)
      const requestData: any = {}
      if (bookingId) {
        requestData.booking_id = bookingId
      }
      
      const checklistResponse = await apiClient.post<any>('/checklists', requestData)
      
      const checklistId = checklistResponse.id || checklistResponse.data?.id
      
      if (!checklistId) {
        throw new Error('Failed to get checklist ID from response')
      }

      // Submit text entries for each category (primary requirement)
      for (const category of categories) {
        // Add the main text entry for the category
        await apiClient.post(`/checklists/${checklistId}/entries`, {
          photo_type: category.type,
          notes: category.textNotes
          // No photo_url - text only
        })
      }

      // Upload and add any optional photos
      let totalPhotos = categories.reduce((sum, cat) => sum + cat.photos.length, 0)
      let uploadedCount = 0

      for (const category of categories) {
        for (const photo of category.photos) {
          // Upload photo
          const photoUrl = await uploadService.uploadChecklistPhoto(
            photo.file,
            category.type,
            (progress) => {
              const overallProgress = totalPhotos > 0 ? Math.round(((uploadedCount + progress / 100) / totalPhotos) * 100) : 100
              setUploadProgress(overallProgress)
            }
          )
          
          // Add photo entry to checklist (using new entries endpoint)
          await apiClient.post(`/checklists/${checklistId}/entries`, {
            photo_type: category.type,
            photo_url: photoUrl,
            notes: photo.notes
          })
          
          uploadedCount++
        }
      }

      // Submit checklist
      console.log('Submitting checklist:', checklistId)
      const submitResponse = await apiClient.post(`/checklists/${checklistId}/submit`)
      console.log('Submit response:', submitResponse)

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
          if (photo.url) {
            URL.revokeObjectURL(photo.url)
          }
        })
      })
      
      // Reset form
      setCategories([
        { type: 'refrigerator', title: 'Refrigerator', textNotes: '', photos: [] },
        { type: 'freezer', title: 'Freezer', textNotes: '', photos: [] },
        { type: 'closet', title: 'Closets', textNotes: '', photos: [] }
      ])
      setError('')
      onClose()
    }
  }

  const getCompletionStatus = () => {
    const categoriesWithText = categories.filter(cat => cat.textNotes.trim().length >= 5).length
    const totalPhotos = categories.reduce((sum, cat) => sum + cat.photos.length, 0)
    const hasAllPhotoNotes = categories.every(cat => 
      cat.photos.every(photo => photo.notes.trim().length > 0)
    )
    
    return {
      categoriesWithText,
      totalCategories: categories.length,
      totalPhotos,
      isComplete: categoriesWithText === categories.length && hasAllPhotoNotes
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
            label={`${status.categoriesWithText}/${status.totalCategories} required + ${status.totalPhotos} photos`}
            color={status.isComplete ? 'success' : 'default'}
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Please provide notes for each category describing the current state. Photos are optional but helpful.
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
                      icon={category.textNotes.trim().length >= 5 ? <CheckCircleIcon /> : <TextFieldsIcon />}
                      label={category.textNotes.trim().length >= 5 ? 'Complete' : 'Required'}
                      color={category.textNotes.trim().length >= 5 ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>

                  {/* Required text notes */}
                  <TextField
                    fullWidth
                    label="Notes (required)"
                    placeholder={`Describe the current state of the ${category.title.toLowerCase()}...`}
                    value={category.textNotes}
                    onChange={(e) => handleTextNotesChange(categoryIndex, e.target.value)}
                    multiline
                    rows={3}
                    required
                    sx={{ mb: 2 }}
                    helperText={`${category.textNotes.length}/5 minimum characters`}
                  />

                  {/* Optional photos */}
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
                        label="Photo notes"
                        placeholder="Describe what this photo shows..."
                        value={photo.notes}
                        onChange={(e) => handlePhotoNotesChange(categoryIndex, photoIndex, e.target.value)}
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
                    disabled={loading}
                  />
                  <label htmlFor={`photo-upload-${category.type}`}>
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<PhotoCamera />}
                      disabled={loading}
                      size="small"
                      fullWidth
                    >
                      Add Photo (Optional)
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