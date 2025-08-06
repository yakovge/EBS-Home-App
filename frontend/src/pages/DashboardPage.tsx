/**
 * Dashboard page showing overview of house status and activities.
 * Main landing page after login with quick access to key features.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Skeleton,
  Alert,
  Chip,
} from '@mui/material'
import {
  Build as BuildIcon,
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Warning as WarningIcon,
  PhotoLibrary as PhotoLibraryIcon,
} from '@mui/icons-material'

import { useAuth } from '@/hooks/useAuth'
import { useNotification } from '@/contexts/NotificationContext'
import { dashboardService } from '@/services/dashboardService'
import { realtimeService } from '@/services/realtimeService'
import { apiClient } from '@/services/api'
import { MaintenanceRequest, Booking } from '@/types'

interface DashboardStats {
  currentBookings: number
  pendingMaintenance: number
  exitChecklists: number
}

interface CurrentOccupant {
  booking_id: string
  user_name: string
  start_date: string
  end_date: string
  notes?: string
}

interface RecentChecklist {
  id: string
  user_name: string
  submitted_at: string
  photos: Array<{
    photo_type: string
    notes: string
    photo_url?: string
  }>
  important_notes?: string
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showError } = useNotification()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [stats, setStats] = useState<DashboardStats>({
    currentBookings: 0,
    pendingMaintenance: 0,
    exitChecklists: 0,
  })
  const [recentMaintenance, setRecentMaintenance] = useState<MaintenanceRequest[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
  const [currentOccupants, setCurrentOccupants] = useState<CurrentOccupant[]>([])
  const [recentChecklist, setRecentChecklist] = useState<RecentChecklist | null>(null)

  useEffect(() => {
    fetchDashboardData()
    
    // Set up real-time listeners
    const userId = user?.id
    
    realtimeService.updateCallbacks({
      onMaintenanceUpdate: (requests) => {
        setRecentMaintenance(requests.slice(0, 5))
        setStats(prev => ({
          ...prev,
          pendingMaintenance: requests.filter(r => r.status === 'pending').length
        }))
      },
      onBookingUpdate: (bookings) => {
        const upcoming = bookings.filter(b => !b.is_cancelled).slice(0, 5)
        setUpcomingBookings(upcoming)
        setStats(prev => ({
          ...prev,
          currentBookings: bookings.filter(b => !b.is_cancelled).length
        }))
      },
      onError: (error) => {
        console.error('Real-time update error:', error)
        showError('Failed to get real-time updates')
      }
    })
    
    realtimeService.startDashboardListeners(userId)
    
    // Cleanup listeners on unmount
    return () => {
      realtimeService.stopAllListeners()
    }
  }, [user?.id])

  const fetchCurrentOccupants = async (): Promise<CurrentOccupant[]> => {
    try {
      // Get bookings that are currently active (today is between start and end date)
      const response = await apiClient.get<{bookings: Booking[], total: number}>('/bookings')
      const bookings = response.bookings || []
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const currentOccupants: CurrentOccupant[] = []
      
      for (const booking of bookings) {
        if (booking.is_cancelled) continue
        
        const startDate = new Date(booking.start_date + 'T00:00:00')
        const endDate = new Date(booking.end_date + 'T23:59:59')
        
        // Check if today falls within the booking dates
        if (today >= startDate && today <= endDate) {
          currentOccupants.push({
            booking_id: booking.id,
            user_name: booking.user_name || 'Unknown User',
            start_date: booking.start_date,
            end_date: booking.end_date,
            notes: booking.notes
          })
        }
      }
      return currentOccupants
    } catch (err: any) {
      console.error('Failed to fetch current occupants:', err)
      return []
    }
  }

  const fetchRecentChecklist = async (): Promise<RecentChecklist | null> => {
    try {
      const checklists = await apiClient.get<any[]>('/checklists')
      
      // Find the most recent completed checklist
      const completedChecklists = checklists
        .filter((checklist: any) => checklist.is_complete)
        .sort((a: any, b: any) => new Date(b.submitted_at || b.created_at).getTime() - new Date(a.submitted_at || a.created_at).getTime())
      
      if (completedChecklists.length === 0) {
        return null
      }
      
      const latest = completedChecklists[0]
      return {
        id: latest.id,
        user_name: latest.user_name,
        submitted_at: latest.submitted_at || latest.created_at,
        photos: latest.photos || [],
        important_notes: latest.important_notes
      }
    } catch (err: any) {
      console.error('Failed to fetch recent checklist:', err)
      return null
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch all dashboard data in parallel
      const [statsData, maintenanceData, bookingsData, occupantsData, checklistData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentMaintenance(),
        dashboardService.getUpcomingBookings(),
        fetchCurrentOccupants(),
        fetchRecentChecklist(),
      ])

      setStats(statsData)
      setRecentMaintenance(maintenanceData)
      setUpcomingBookings(bookingsData)
      setCurrentOccupants(occupantsData)
      setRecentChecklist(checklistData)
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err)
      const errorMessage = err.message || 'Failed to load dashboard data'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    {
      title: 'Current Bookings',
      value: stats.currentBookings.toString(),
      icon: <EventIcon />,
      color: 'primary',
    },
    {
      title: 'Pending Maintenance',
      value: stats.pendingMaintenance.toString(),
      icon: <BuildIcon />,
      color: 'warning',
    },
    {
      title: 'Exit Checklists',
      value: stats.exitChecklists.toString(),
      icon: <CheckCircleIcon />,
      color: 'success',
    },
  ]

  const renderMaintenanceItem = (item: MaintenanceRequest) => (
    <Box key={item.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        {item.reporter_name}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {item.description}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {item.location} • {item.status}
      </Typography>
    </Box>
  )

  const renderBookingItem = (item: Booking) => (
    <Box key={item.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        {item.user_name}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
      </Typography>
      {item.notes && (
        <Typography variant="caption" color="text.secondary">
          {item.notes}
        </Typography>
      )}
    </Box>
  )

  const renderCurrentOccupant = (occupant: CurrentOccupant) => (
    <Box key={occupant.booking_id} sx={{ mb: 2, p: 2, border: '1px solid #e3f2fd', borderRadius: 1, backgroundColor: '#f8fcff' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="subtitle2">
          {occupant.user_name}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {new Date(occupant.start_date).toLocaleDateString()} - {new Date(occupant.end_date).toLocaleDateString()}
      </Typography>
      {occupant.notes && (
        <Typography variant="caption" color="text.secondary">
          {occupant.notes}
        </Typography>
      )}
    </Box>
  )

  const renderRecentChecklist = (checklist: RecentChecklist) => (
    <Box sx={{ p: 2, border: '1px solid #e8f5e8', borderRadius: 1, backgroundColor: '#f9fdf9' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
        <Typography variant="subtitle2">
          Last checklist by {checklist.user_name}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Submitted: {new Date(checklist.submitted_at).toLocaleDateString()}
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {['refrigerator', 'freezer', 'closet'].map(type => {
          const count = checklist.photos.filter(p => p.photo_type === type).length
          return (
            <Chip
              key={type}
              size="small"
              icon={<PhotoLibraryIcon />}
              label={`${type}: ${count}`}
              color={count > 0 ? 'success' : 'default'}
            />
          )
        })}
      </Box>
      
      {checklist.important_notes && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, p: 1, backgroundColor: '#fff3cd', borderRadius: 1 }}>
          <WarningIcon sx={{ mr: 1, color: 'warning.main', fontSize: 16 }} />
          <Typography variant="caption" color="warning.dark">
            Important notes: {checklist.important_notes}
          </Typography>
        </Box>
      )}
    </Box>
  )

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="40%" height={30} sx={{ mb: 4 }} />
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="60%" height={40} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('dashboard.title')}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Welcome back, {user?.name}!
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {stat.icon}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {stat.title}
                  </Typography>
                </Box>
                <Typography variant="h3" color={`${stat.color}.main`}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<AddIcon />}
              onClick={() => navigate('/maintenance')}
              sx={{ py: 2 }}
            >
              Report Maintenance
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<CalendarIcon />}
              onClick={() => navigate('/bookings')}
              sx={{ py: 2 }}
            >
              View Calendar
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<AssignmentIcon />}
              onClick={() => navigate('/checklist')}
              sx={{ py: 2 }}
            >
              Exit Checklist
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<EventIcon />}
              onClick={() => navigate('/bookings')}
              sx={{ py: 2 }}
            >
              Book Stay
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* House Status */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <HomeIcon sx={{ mr: 1 }} />
          House Status
        </Typography>
        <Grid container spacing={3}>
          {/* Current Occupants */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Currently in BS Home
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {currentOccupants.length > 0 ? (
                    currentOccupants.map(renderCurrentOccupant)
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No one is currently staying at the house
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Checklist */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Most Recent Exit Checklist
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {recentChecklist ? (
                    renderRecentChecklist(recentChecklist)
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No exit checklists submitted yet
                    </Typography>
                  )}
                </Box>
              </CardContent>
              {recentChecklist && (
                <CardActions>
                  <Button 
                    size="small" 
                    onClick={() => navigate('/checklist')}
                  >
                    View All Checklists
                  </Button>
                </CardActions>
              )}
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Maintenance Requests
              </Typography>
              <Box sx={{ mt: 2 }}>
                {recentMaintenance.length > 0 ? (
                  recentMaintenance.map(renderMaintenanceItem)
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No recent maintenance requests
                  </Typography>
                )}
              </Box>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                onClick={() => navigate('/maintenance')}
              >
                View All
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Bookings
              </Typography>
              <Box sx={{ mt: 2 }}>
                {upcomingBookings.length > 0 ? (
                  upcomingBookings.map(renderBookingItem)
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No upcoming bookings
                  </Typography>
                )}
              </Box>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                onClick={() => navigate('/bookings')}
              >
                View Calendar
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Exit Checklist Section */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Exit Checklist
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Complete your exit checklist before leaving. Required photos: refrigerator, freezer, and closets.
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                onClick={() => navigate('/checklist')}
                startIcon={<AssignmentIcon />}
              >
                Complete Checklist
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}