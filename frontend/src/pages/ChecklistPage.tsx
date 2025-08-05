/**
 * Exit checklist page for submitting house condition photos.
 * Handles photo uploads and checklist requirements.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material'
import { 
  PhotoCamera as PhotoCameraIcon,
  CheckCircle as CheckCircleIcon,
  History as HistoryIcon
} from '@mui/icons-material'
import { apiClient } from '@/services/api'
import { useNotification } from '@/contexts/NotificationContext'
import ChecklistForm from '@/components/ChecklistForm'

interface ExitChecklist {
  id: string
  user_name: string
  booking_id: string
  photos: Array<{
    photo_type: string
    photo_url: string
    notes: string
    created_at: string
  }>
  is_complete: boolean
  created_at: string
  submitted_at?: string
}

export default function ChecklistPage() {
  const { t } = useTranslation()
  const { showError } = useNotification()
  
  const [loading, setLoading] = useState(true)
  const [checklists, setChecklists] = useState<ExitChecklist[]>([])
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const fetchChecklists = async () => {
    try {
      setLoading(true)
      const data = await apiClient.get<ExitChecklist[]>('/checklists')
      setChecklists(data)
      setError('')
    } catch (err: any) {
      console.error('Failed to fetch checklists:', err)
      setError('Failed to load checklists')
      showError('Failed to load checklists')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChecklists()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getPhotoCount = (checklist: ExitChecklist, photoType: string) => {
    return checklist.photos.filter(photo => photo.photo_type === photoType).length
  }

  const getRequiredCount = (photoType: string) => {
    switch (photoType) {
      case 'refrigerator': return 2
      case 'freezer': return 2
      case 'closet': return 3
      default: return 0
    }
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Exit Checklists
        </Typography>
        <Button
          variant="contained"
          startIcon={<PhotoCameraIcon />}
          onClick={() => setShowForm(true)}
        >
          New Checklist
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Requirements Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PhotoCameraIcon sx={{ mr: 1 }} />
                Photo Requirements
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Before leaving the house, you must submit:
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <li>2 photos of the refrigerator</li>
                <li>2 photos of the freezer</li>
                <li>3 photos of the closets</li>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Each photo must include descriptive notes about what is present or missing.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Checklist History */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <HistoryIcon sx={{ mr: 1 }} />
                Checklist History
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : checklists.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No checklists submitted yet. Click "New Checklist" to start your first exit checklist.
                </Typography>
              ) : (
                <List>
                  {checklists.map((checklist) => (
                    <ListItem
                      key={checklist.id}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              Checklist by {checklist.user_name}
                            </Typography>
                            <Chip
                              icon={checklist.is_complete ? <CheckCircleIcon /> : undefined}
                              label={checklist.is_complete ? 'Complete' : 'Incomplete'}
                              size="small"
                              color={checklist.is_complete ? 'success' : 'warning'}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Refrigerator: {getPhotoCount(checklist, 'refrigerator')}/{getRequiredCount('refrigerator')} • 
                              Freezer: {getPhotoCount(checklist, 'freezer')}/{getRequiredCount('freezer')} • 
                              Closets: {getPhotoCount(checklist, 'closet')}/{getRequiredCount('closet')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Created: {formatDate(checklist.created_at)}
                              {checklist.submitted_at && ` • Submitted: ${formatDate(checklist.submitted_at)}`}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Checklist Form Dialog */}
      <ChecklistForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false)
          fetchChecklists()
        }}
        bookingId="current-booking" // TODO: Get from current booking context
      />
    </Box>
  )
}