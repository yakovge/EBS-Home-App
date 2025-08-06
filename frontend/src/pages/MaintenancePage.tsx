/**
 * Maintenance page for managing house maintenance requests.
 * Allows creating, viewing, and tracking maintenance issues.
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
  IconButton,
  Tooltip,
} from '@mui/material'
import { 
  Add as AddIcon, 
  Build as BuildIcon,
  Image as ImageIcon,
  CheckCircle as CheckCircleIcon,
  Undo as UndoIcon,
} from '@mui/icons-material'
import { apiClient } from '@/services/api'
import { useNotification } from '@/contexts/NotificationContext'
import MaintenanceForm from '@/components/MaintenanceForm'
import MaintenancePhotoModal from '@/components/MaintenancePhotoModal'

interface MaintenanceRequest {
  id: string
  description: string
  location: string
  status: 'pending' | 'in_progress' | 'completed'
  reporter_name: string
  created_at: string
  photo_urls: string[]
  completed_by_name?: string
  resolution_date?: string
  resolution_notes?: string
}

export default function MaintenancePage() {
  const { t } = useTranslation()
  const { showError, showSuccess } = useNotification()
  
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const data = await apiClient.get<MaintenanceRequest[]>('/maintenance')
      setRequests(data)
      setError('')
    } catch (err: any) {
      console.error('Failed to fetch maintenance requests:', err)
      setError('Failed to load maintenance requests')
      showError('Failed to load maintenance requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'in_progress': return 'info'
      case 'completed': return 'success'
      default: return 'default'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleMarkAsFixed = async (requestId: string) => {
    try {
      await apiClient.post(`/maintenance/${requestId}/complete`, {
        resolution_notes: 'Marked as fixed by family member'
      })
      showSuccess('Maintenance request marked as fixed')
      fetchRequests() // Refresh the list
    } catch (err: any) {
      console.error('Failed to mark as fixed:', err)
      showError(err.response?.data?.message || 'Failed to mark maintenance as fixed')
    }
  }

  const handleMarkAsUnfixed = async (requestId: string) => {
    try {
      await apiClient.post(`/maintenance/${requestId}/reopen`, {
        reopen_reason: 'Issue not fully resolved - needs more attention'
      })
      showSuccess('Maintenance request reopened')
      fetchRequests() // Refresh the list
    } catch (err: any) {
      console.error('Failed to reopen maintenance:', err)
      showError(err.response?.data?.message || 'Failed to reopen maintenance request')
    }
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          {t('maintenance.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowForm(true)}
        >
          {t('maintenance.createRequest')}
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Content */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BuildIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              Maintenance Requests
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : requests.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No maintenance requests yet. Click "New Request" to report an issue.
            </Typography>
          ) : (
            <>
              {/* Pending Requests Section */}
              {(() => {
                const pendingRequests = requests.filter(req => req.status === 'pending' || req.status === 'in_progress');
                return pendingRequests.length > 0 ? (
                  <>
                    <Typography variant="h6" sx={{ mb: 2, color: 'warning.main', fontWeight: 'bold' }}>
                      🔧 Pending Requests
                    </Typography>
                    <List sx={{ mb: 4 }}>
                      {pendingRequests.map((request) => (
                        <ListItem
                          key={request.id}
                          sx={{
                            border: 1,
                            borderColor: 'warning.light',
                            backgroundColor: 'warning.50',
                            borderRadius: 1,
                            mb: 1,
                            pr: 2,
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                                  {request.description}
                                </Typography>
                                <Chip
                                  label={request.status}
                                  size="small"
                                  color={getStatusColor(request.status) as any}
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Location: {request.location} • By: {request.reporter_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Created: {formatDate(request.created_at)}
                                </Typography>
                                {request.photo_urls && request.photo_urls.length > 0 && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <ImageIcon fontSize="small" color="action" />
                                    <Typography variant="body2" color="primary">
                                      {request.photo_urls.length} photo{request.photo_urls.length > 1 ? 's' : ''}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            }
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {request.photo_urls && request.photo_urls.length > 0 && (
                              <Tooltip title="View Photos">
                                <IconButton
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    setShowPhotoModal(true)
                                  }}
                                  color="primary"
                                >
                                  <ImageIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {request.status === 'pending' && (
                              <Tooltip title="Mark as Fixed">
                                <IconButton
                                  onClick={() => handleMarkAsFixed(request.id)}
                                  color="success"
                                >
                                  <CheckCircleIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </>
                ) : null;
              })()}

              {/* Completed Requests Section (History) */}
              {(() => {
                const completedRequests = requests.filter(req => req.status === 'completed');
                return completedRequests.length > 0 ? (
                  <>
                    <Typography variant="h6" sx={{ mb: 2, color: 'success.main', fontWeight: 'bold' }}>
                      📋 Fixed History
                    </Typography>
                    <List>
                      {completedRequests.map((request) => (
                        <ListItem
                          key={request.id}
                          sx={{
                            border: 1,
                            borderColor: 'success.light',
                            backgroundColor: 'success.50',
                            borderRadius: 1,
                            mb: 1,
                            pr: 2,
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" sx={{ opacity: 0.8 }}>
                                  {request.description}
                                </Typography>
                                <Chip
                                  label={request.status}
                                  size="small"
                                  color={getStatusColor(request.status) as any}
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Location: {request.location} • By: {request.reporter_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Created: {formatDate(request.created_at)}
                                </Typography>
                                {request.completed_by_name && (
                                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'medium' }}>
                                    Fixed by {request.completed_by_name} on {request.resolution_date ? formatDate(request.resolution_date) : 'N/A'}
                                  </Typography>
                                )}
                                {request.photo_urls && request.photo_urls.length > 0 && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <ImageIcon fontSize="small" color="action" />
                                    <Typography variant="body2" color="primary">
                                      {request.photo_urls.length} photo{request.photo_urls.length > 1 ? 's' : ''}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            }
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {request.photo_urls && request.photo_urls.length > 0 && (
                              <Tooltip title="View Photos">
                                <IconButton
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    setShowPhotoModal(true)
                                  }}
                                  color="primary"
                                >
                                  <ImageIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Mark as Unfixed">
                              <IconButton
                                onClick={() => handleMarkAsUnfixed(request.id)}
                                color="warning"
                              >
                                <UndoIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </>
                ) : null;
              })()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Form Dialog */}
      <MaintenanceForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false)
          fetchRequests()
        }}
      />

      {/* Photo Viewer Modal */}
      {selectedRequest && (
        <MaintenancePhotoModal
          open={showPhotoModal}
          onClose={() => {
            setShowPhotoModal(false)
            setSelectedRequest(null)
          }}
          photos={selectedRequest.photo_urls}
          title={`Maintenance Request Photos`}
          description={selectedRequest.description}
          location={selectedRequest.location}
        />
      )}
    </Box>
  )
}