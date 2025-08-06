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
  type: 'refrigerator' | 'freezer' | 'closet' | 'general'
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
    },
    {
      type: 'general',
      title: 'General Notes',
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
    // Clear any previous errors
    setError('')
    
    // Check if all REQUIRED categories have text notes (general is optional)
    const requiredCategories = categories.filter(cat => cat.type !== 'general')
    for (const category of requiredCategories) {
      if (!category.textNotes.trim() || category.textNotes.trim().length < 5) {
        setError(`${category.title} requires descriptive notes (at least 5 characters)`)
        return false
      }
    }
    
    // For all categories (including optional general), check photo notes
    for (const category of categories) {
      // Optional: Check if photos without notes should be removed or warned about
      // For now, we allow photos without notes - photos are optional enhancements
      const photosWithoutNotes = category.photos.filter(photo => !photo.notes.trim())
      if (photosWithoutNotes.length > 0) {
        console.warn(`${category.title} has ${photosWithoutNotes.length} photo(s) without notes. These will be submitted without descriptions.`)
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
        // Skip empty general notes (they're optional)
        if (category.type === 'general' && (!category.textNotes || category.textNotes.trim().length === 0)) {
          continue
        }
        
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
        for (const [photoIndex, photo] of category.photos.entries()) {
          try {
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
            // Use photo notes if provided, or a default message
            const photoNotes = photo.notes.trim() || `Photo of ${category.title.toLowerCase()}`
            
            await apiClient.post(`/checklists/${checklistId}/entries`, {
              photo_type: category.type,
              photo_url: photoUrl,
              notes: photoNotes
            })
            
            uploadedCount++
          } catch (photoError) {
            console.error(`Failed to process photo ${photoIndex + 1} for ${category.type}:`, photoError)
            
            // Check for specific error types to provide better user feedback
            let errorMessage = `Failed to upload photo ${photoIndex + 1} for ${category.type}`
            
            if (photoError.message.includes('Authentication required') || 
                photoError.message.includes('401')) {
              errorMessage = 'Authentication failed. Please log in again and try uploading the photo.'
            } else if (photoError.message.includes('Network')) {
              errorMessage = 'Network error. Please check your connection and try again.'
            } else if (photoError.message.includes('File size')) {
              errorMessage = 'Photo file is too large. Please use a smaller image (under 5MB).'
            } else if (photoError.message.includes('Invalid file type')) {
              errorMessage = 'Invalid photo format. Please use JPEG, PNG, or WebP images.'
            } else if (photoError.message.includes('Failed to upload photo to storage') ||
                      photoError.message.includes('Firebase Storage bucket may not exist')) {
              errorMessage = 'Cloud storage is not properly configured. Please contact support or try again later.'
            } else {
              errorMessage = `${errorMessage}: ${photoError.message}`
            }
            
            throw new Error(errorMessage)
          }
        }
      }

      // Submit checklist
      await apiClient.post(`/checklists/${checklistId}/submit`)

      showSuccess('Exit checklist submitted successfully')
      onSuccess?.()
      handleClose()
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit checklist'
      console.error('Checklist submission failed:', errorMessage)
      
      showError(errorMessage)
      setError(errorMessage)
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
        { type: 'closet', title: 'Closets', textNotes: '', photos: [] },
        { type: 'general', title: 'General Notes', textNotes: '', photos: [] }
      ])
      setError('')
      onClose()
    }
  }

  const getCompletionStatus = () => {
    // Required categories: refrigerator, freezer, closet (general is optional)
    const requiredCategories = categories.filter(cat => cat.type !== 'general')
    const categoriesWithText = categories.filter(cat => cat.textNotes.trim().length >= 5).length
    const requiredCategoriesWithText = requiredCategories.filter(cat => cat.textNotes.trim().length >= 5).length
    
    const totalPhotos = categories.reduce((sum, cat) => sum + cat.photos.length, 0)
    const photosWithoutNotes = categories.reduce((sum, cat) => 
      sum + cat.photos.filter(photo => !photo.notes.trim()).length, 0
    )
    
    // Checklist is complete when all REQUIRED categories have text notes
    // General notes are optional, photos and photo notes are optional
    const isComplete = requiredCategoriesWithText === requiredCategories.length
    
    return {
      categoriesWithText,
      totalCategories: categories.length,
      requiredCategoriesWithText,
      totalRequiredCategories: requiredCategories.length,
      totalPhotos,
      photosWithoutNotes,
      isComplete
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
            label={`${status.requiredCategoriesWithText}/${status.totalRequiredCategories} required • ${status.categoriesWithText - status.requiredCategoriesWithText} optional • ${status.totalPhotos} photos${status.photosWithoutNotes > 0 ? ` (${status.photosWithoutNotes} no notes)` : ''}`}
            color={status.isComplete ? 'success' : 'default'}
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Please provide notes for refrigerator, freezer, and closets describing the current state. 
            General notes are optional. Photos are optional but helpful.
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
            <Grid item xs={12} md={6} key={category.type}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {category.title}
                    </Typography>
                    <Chip 
                      icon={category.textNotes.trim().length >= 5 ? <CheckCircleIcon /> : <TextFieldsIcon />}
                      label={
                        category.type === 'general' 
                          ? (category.textNotes.trim().length >= 5 ? 'Added' : 'Optional')
                          : (category.textNotes.trim().length >= 5 ? 'Complete' : 'Required')
                      }
                      color={category.textNotes.trim().length >= 5 ? 'success' : (category.type === 'general' ? 'info' : 'default')}
                      size="small"
                    />
                  </Box>

                  {/* Required text notes */}
                  <TextField
                    fullWidth
                    label={category.type === 'general' ? 'General Notes (optional)' : 'Notes (required)'}
                    placeholder={
                      category.type === 'general' 
                        ? 'Add any additional notes about the house condition, observations, or special instructions...'
                        : `Describe the current state of the ${category.title.toLowerCase()}...`
                    }
                    value={category.textNotes}
                    onChange={(e) => handleTextNotesChange(categoryIndex, e.target.value)}
                    multiline
                    rows={3}
                    required={category.type !== 'general'}
                    sx={{ mb: 2 }}
                    helperText={
                      category.type === 'general' 
                        ? `Optional: ${category.textNotes.length} characters`
                        : `${category.textNotes.length}/5 minimum characters`
                    }
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