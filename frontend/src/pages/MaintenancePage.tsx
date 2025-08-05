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
} from '@mui/material'
import { Add as AddIcon, Build as BuildIcon } from '@mui/icons-material'
import { apiClient } from '@/services/api'
import { useNotification } from '@/contexts/NotificationContext'
import MaintenanceForm from '@/components/MaintenanceForm'

interface MaintenanceRequest {
  id: string
  description: string
  location: string
  status: 'pending' | 'in_progress' | 'completed'
  reporter_name: string
  created_at: string
  photo_urls: string[]
}

export default function MaintenancePage() {
  const { t } = useTranslation()
  const { showError } = useNotification()
  
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

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
            <List>
              {requests.map((request) => (
                <ListItem
                  key={request.id}
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
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
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
    </Box>
  )
}