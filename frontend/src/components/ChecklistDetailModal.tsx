/**
 * Modal component for viewing exit checklist details.
 * Displays checklist entries with photos and notes.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Divider,
  Button,
  TextField,
} from '@mui/material'
import {
  Close as CloseIcon,
  Kitchen as KitchenIcon,
  AcUnit as AcUnitIcon,
  Checkroom as CheckroomIcon,
  Image as ImageIcon,
  Notes as NotesIcon,
} from '@mui/icons-material'

interface ChecklistEntry {
  photo_type: 'refrigerator' | 'freezer' | 'closet'
  notes: string
  photo_url?: string
  created_at: string
}

interface ChecklistDetailModalProps {
  open: boolean
  onClose: () => void
  checklist: {
    id: string
    user_name: string
    booking_id?: string
    photos: ChecklistEntry[]
    is_complete: boolean
    submitted_at?: string
    important_notes?: string
  } | null
  onUpdateImportantNotes?: (notes: string) => void
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'refrigerator':
      return <KitchenIcon />
    case 'freezer':
      return <AcUnitIcon />
    case 'closet':
      return <CheckroomIcon />
    default:
      return <ImageIcon />
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'refrigerator':
      return 'Refrigerator'
    case 'freezer':
      return 'Freezer'
    case 'closet':
      return 'Closets'
    default:
      return type
  }
}

export default function ChecklistDetailModal({
  open,
  onClose,
  checklist,
  onUpdateImportantNotes,
}: ChecklistDetailModalProps) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [importantNotes, setImportantNotes] = useState('')
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  if (!checklist) return null

  // Ensure photos array exists
  const photos = checklist.photos || []

  // Debug logging for troubleshooting (can be removed in production)
  console.log('ChecklistDetailModal: Checklist data:', checklist)
  console.log('ChecklistDetailModal: Photos array:', photos)
  if (photos.length === 0) {
    console.warn('ChecklistDetailModal: No entries found for checklist', checklist.id)
  }

  // Group entries by type
  const entriesByType = photos.reduce((acc, entry) => {
    if (!acc[entry.photo_type]) {
      acc[entry.photo_type] = []
    }
    acc[entry.photo_type].push(entry)
    return acc
  }, {} as Record<string, ChecklistEntry[]>)

  const handleSaveNotes = () => {
    if (onUpdateImportantNotes) {
      onUpdateImportantNotes(importantNotes)
    }
    setEditingNotes(false)
  }

  const handleStartEditNotes = () => {
    setImportantNotes(checklist.important_notes || '')
    setEditingNotes(true)
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">Exit Checklist Details</Typography>
            <Typography variant="body2" color="text.secondary">
              By {checklist.user_name} • {checklist.submitted_at ? new Date(checklist.submitted_at).toLocaleDateString() : 'Not submitted'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {checklist.is_complete && (
              <Chip label="Completed" color="success" size="small" />
            )}
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {/* Important Notes Section */}
          {(checklist.important_notes || editingNotes || onUpdateImportantNotes) && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <NotesIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Important Notes</Typography>
              </Box>
              {editingNotes ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={importantNotes}
                    onChange={(e) => setImportantNotes(e.target.value)}
                    placeholder="Add important notes about missing items or critical issues..."
                    sx={{ mb: 2, bgcolor: 'background.paper' }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="contained" onClick={handleSaveNotes}>
                      Save
                    </Button>
                    <Button size="small" onClick={() => setEditingNotes(false)}>
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  {checklist.important_notes ? (
                    <Typography variant="body2">{checklist.important_notes}</Typography>
                  ) : (
                    <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                      No important notes added
                    </Typography>
                  )}
                  {onUpdateImportantNotes && (
                    <Button 
                      size="small" 
                      onClick={handleStartEditNotes}
                      sx={{ mt: 1 }}
                    >
                      {checklist.important_notes ? 'Edit Notes' : 'Add Notes'}
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Checklist Entries */}
          <Grid container spacing={2}>
            {['refrigerator', 'freezer', 'closet'].map((type) => (
              <Grid item xs={12} key={type}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {getIconForType(type)}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {getTypeLabel(type)}
                    </Typography>
                  </Box>
                  
                  {entriesByType[type] && entriesByType[type].length > 0 ? (
                    <Grid container spacing={1}>
                      {entriesByType[type].map((entry, index) => (
                        <Grid item xs={12} sm={6} key={index}>
                          <Card variant="outlined">
                            {entry.photo_url ? (
                              <CardMedia
                                component="img"
                                height="200"
                                image={entry.photo_url}
                                alt={`${type} photo ${index + 1}`}
                                sx={{ cursor: 'pointer' }}
                                onClick={() => setExpandedImage(entry.photo_url!)}
                              />
                            ) : (
                              <Box
                                sx={{
                                  height: 100,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: 'grey.100',
                                }}
                              >
                                <Typography variant="body2" color="text.secondary">
                                  No photo
                                </Typography>
                              </Box>
                            )}
                            <CardContent>
                              <Typography variant="body2">
                                {entry.notes}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                {new Date(entry.created_at).toLocaleString()}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 3, fontStyle: 'italic' }}>
                      No photos uploaded yet for {getTypeLabel(type).toLowerCase()}
                    </Typography>
                  )}
                </Box>
                {type !== 'closet' && <Divider sx={{ my: 2 }} />}
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>

      {/* Image Expansion Dialog */}
      <Dialog
        open={!!expandedImage}
        onClose={() => setExpandedImage(null)}
        maxWidth="lg"
        PaperProps={{
          sx: { bgcolor: 'transparent', boxShadow: 'none' }
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setExpandedImage(null)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' }
            }}
          >
            <CloseIcon />
          </IconButton>
          {expandedImage && (
            <img
              src={expandedImage}
              alt="Expanded view"
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
              }}
            />
          )}
        </Box>
      </Dialog>
    </>
  )
}