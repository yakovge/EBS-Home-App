/**
 * Booking page for managing house reservations.
 * Shows calendar view and allows creating/editing bookings.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Grid,
  Button,
} from '@mui/material'
import { 
  Event as EventIcon,
  Cancel as CancelIcon
} from '@mui/icons-material'
import { apiClient } from '@/services/api'
import { useNotification } from '@/contexts/NotificationContext'
import Calendar from '@/components/Calendar'

interface Booking {
  id: string
  user_id: string
  user_name: string
  start_date: string
  end_date: string
  notes?: string
  is_cancelled: boolean
  exit_checklist_completed: boolean
  created_at: string
}

export default function BookingPage() {
  const { t } = useTranslation()
  const { showSuccess, showError } = useNotification()
  
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [error, setError] = useState('')

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<{bookings: Booking[], total: number}>('/bookings')
      setBookings(response.bookings || [])
      setError('')
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err)
      setError('Failed to load bookings')
      showError('Failed to load bookings')
      setBookings([]) // Ensure bookings is always an array
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const handleCreateBooking = async (bookingData: { start_date: string; end_date: string; notes: string }) => {
    try {
      setLoading(true) // Show loading state during creation
      const response = await apiClient.post<{id: string, message: string}>('/bookings', bookingData)
      showSuccess(response.message || 'Booking created successfully')
      
      // Refresh bookings to show the new booking
      await fetchBookings()
      
      // Log success for debugging
      console.log('Booking created successfully:', response)
    } catch (err: any) {
      console.error('Failed to create booking:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create booking'
      showError(errorMessage)
    } finally {
      setLoading(false) // Hide loading state
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await apiClient.put(`/bookings/${bookingId}`, { is_cancelled: true })
      showSuccess('Booking cancelled successfully')
      fetchBookings() // Refresh bookings
    } catch (err: any) {
      console.error('Failed to cancel booking:', err)
      showError(err.response?.data?.message || 'Failed to cancel booking')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getUpcomingBookings = () => {
    const today = new Date()
    return bookings.filter(booking => 
      !booking.is_cancelled && new Date(booking.start_date) >= today
    ).slice(0, 5)
  }

  const getBookingStatus = (booking: Booking) => {
    if (booking.is_cancelled) return 'Cancelled'
    
    const today = new Date()
    const startDate = new Date(booking.start_date)
    const endDate = new Date(booking.end_date)
    
    if (endDate < today) return 'Past'
    if (startDate <= today && endDate >= today) return 'Active'
    return 'Upcoming'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'success'
      case 'Upcoming': return 'primary'
      case 'Past': return 'default'
      case 'Cancelled': return 'error'
      default: return 'default'
    }
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          House Calendar
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Manage your bookings with Hebrew and Gregorian dates
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Main Calendar */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Calendar 
                  bookings={bookings}
                  onCreateBooking={handleCreateBooking}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Upcoming Bookings Sidebar */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <EventIcon sx={{ mr: 1 }} />
                  Upcoming Bookings
                </Typography>

                {getUpcomingBookings().length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No upcoming bookings. Click on the calendar to create your first booking.
                  </Typography>
                ) : (
                  <List>
                    {getUpcomingBookings().map((booking) => (
                      <ListItem
                        key={booking.id}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          p: 2
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle2">
                                {booking.user_name}
                              </Typography>
                              <Chip
                                label={getBookingStatus(booking)}
                                size="small"
                                color={getStatusColor(getBookingStatus(booking)) as any}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                              </Typography>
                              {booking.notes && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {booking.notes}
                                </Typography>
                              )}
                              {booking.exit_checklist_completed && (
                                <Chip 
                                  label="Exit checklist completed" 
                                  size="small" 
                                  color="success" 
                                  sx={{ mt: 1 }}
                                />
                              )}
                              <Box sx={{ mt: 1 }}>
                                <Button
                                  size="small"
                                  startIcon={<CancelIcon />}
                                  onClick={() => handleCancelBooking(booking.id)}
                                  disabled={getBookingStatus(booking) === 'Past' || booking.is_cancelled}
                                >
                                  Cancel
                                </Button>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>

            {/* Booking Statistics */}
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Statistics
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Total Bookings:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {bookings.filter(b => !b.is_cancelled).length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Upcoming:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {getUpcomingBookings().length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Exit Checklists:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {bookings.filter(b => b.exit_checklist_completed).length}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}