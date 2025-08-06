/**
 * Modal component for viewing maintenance request photos.
 * Displays photos in a lightbox-style overlay with navigation.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  MobileStepper,
  Button,
} from '@mui/material'
import {
  Close as CloseIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material'

interface MaintenancePhotoModalProps {
  open: boolean
  onClose: () => void
  photos: string[]
  title?: string
  description?: string
  location?: string
}

export default function MaintenancePhotoModal({
  open,
  onClose,
  photos,
  title = 'Maintenance Photos',
  description,
  location,
}: MaintenancePhotoModalProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [zoom, setZoom] = useState(1)
  const maxSteps = photos.length

  // Log when modal opens to help debug the photo viewing issue
  if (open) {
    console.log('MaintenancePhotoModal opened:', {
      photosCount: photos?.length || 0,
      firstPhotoUrl: photos?.[0] || 'No photos',
      hasValidPhotos: photos && photos.length > 0
    })
  }

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
    setZoom(1) // Reset zoom when changing photos
    setLoading(true) // Show loading for next image
    setImageError(false) // Reset error state
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
    setZoom(1) // Reset zoom when changing photos
    setLoading(true) // Show loading for previous image
    setImageError(false) // Reset error state
  }

  const handleZoomIn = () => {
    setZoom((prevZoom) => Math.min(prevZoom + 0.2, 3))
  }

  const handleZoomOut = () => {
    setZoom((prevZoom) => Math.max(prevZoom - 0.2, 0.5))
  }

  const handleImageLoad = () => {
    setLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    console.error('Failed to load image:', photos[activeStep])
    console.error('Image error details:', {
      activeStep,
      totalPhotos: photos.length,
      allPhotos: photos,
      currentPhoto: photos[activeStep]
    })
    setLoading(false)
    setImageError(true)
  }

  const handleClose = () => {
    setActiveStep(0)
    setZoom(1)
    setLoading(true)
    setImageError(false)
    onClose()
  }

  if (!photos || photos.length === 0) {
    console.warn('MaintenancePhotoModal: No photos provided', { photos, photosLength: photos?.length, photosType: typeof photos })
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm">
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6">No Photos Available</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            This maintenance request doesn't have any photos attached.
          </Typography>
          <Button variant="contained" onClick={onClose}>
            Close
          </Button>
        </Box>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        }
      }}
    >
      <Box sx={{ position: 'relative' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h6" component="h2">
              {title}
            </Typography>
            {location && (
              <Typography variant="body2" color="text.secondary">
                Location: {location}
              </Typography>
            )}
          </Box>
          <IconButton onClick={handleClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Description */}
        {description && (
          <Box sx={{ px: 2, pt: 2 }}>
            <Typography variant="body1" color="text.secondary">
              {description}
            </Typography>
          </Box>
        )}

        {/* Photo Viewer */}
        <DialogContent sx={{ p: 0, position: 'relative', bgcolor: 'grey.100' }}>
          <Box
            sx={{
              minHeight: 400,
              maxHeight: '70vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {loading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1,
                }}
              >
                <CircularProgress />
              </Box>
            )}
            
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: zoom > 1 ? 'move' : 'default',
              }}
            >
              {imageError ? (
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <Typography variant="h6" color="error" gutterBottom>
                    Failed to Load Image
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    The image could not be displayed. It may have been moved, deleted, or the URL is invalid.
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    URL: {photos[activeStep]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    This could be due to: expired URL, network issues, or permission problems.
                  </Typography>
                </Box>
              ) : (
                <img
                  src={photos[activeStep]}
                  alt={`Maintenance photo ${activeStep + 1}`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    transform: `scale(${zoom})`,
                    transition: 'transform 0.2s ease-in-out',
                    display: loading ? 'none' : 'block',
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Zoom Controls */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 60,
              right: 16,
              display: 'flex',
              gap: 1,
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 1,
              p: 0.5,
            }}
          >
            <IconButton
              size="small"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              sx={{ color: 'white' }}
            >
              <ZoomOutIcon />
            </IconButton>
            <Typography
              variant="body2"
              sx={{
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                px: 1,
                minWidth: 50,
                textAlign: 'center',
              }}
            >
              {Math.round(zoom * 100)}%
            </Typography>
            <IconButton
              size="small"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              sx={{ color: 'white' }}
            >
              <ZoomInIcon />
            </IconButton>
          </Box>
        </DialogContent>

        {/* Navigation */}
        {maxSteps > 1 && (
          <MobileStepper
            variant="text"
            steps={maxSteps}
            position="static"
            activeStep={activeStep}
            sx={{ bgcolor: 'background.paper' }}
            nextButton={
              <Button
                size="small"
                onClick={handleNext}
                disabled={activeStep === maxSteps - 1}
              >
                Next
                <ChevronRight />
              </Button>
            }
            backButton={
              <Button
                size="small"
                onClick={handleBack}
                disabled={activeStep === 0}
              >
                <ChevronLeft />
                Back
              </Button>
            }
          />
        )}
      </Box>
    </Dialog>
  )
}