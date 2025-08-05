/**
 * Calendar component with Hebrew and Gregorian date display.
 * Handles booking creation, editing, and conflict detection.
 */

import { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material'
import { 
  ChevronLeft, 
  ChevronRight, 
  Add as AddIcon,
  Event as EventIcon 
} from '@mui/icons-material'
import { HDate, months } from '@hebcal/core'

interface Booking {
  id: string
  user_name: string
  start_date: string
  end_date: string
  notes?: string
  is_cancelled: boolean
}

interface CalendarProps {
  bookings: Booking[]
  onCreateBooking: (booking: { start_date: string; end_date: string; notes: string }) => void
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => void
  loading?: boolean
}

export default function Calendar({ bookings, onCreateBooking, onUpdateBooking, loading }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState<{ start?: Date; end?: Date }>({})
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [bookingNotes, setBookingNotes] = useState('')
  const [conflictError, setConflictError] = useState('')

  const today = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  // Hebrew month names
  const getHebrewDate = (date: Date) => {
    try {
      const hDate = new HDate(date)
      return {
        day: hDate.getDate(),
        month: hDate.getMonthName(),
        year: hDate.getFullYear()
      }
    } catch (error) {
      console.error('Error converting to Hebrew date:', error)
      return null
    }
  }

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  // Check if date has bookings
  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      if (booking.is_cancelled) return false
      
      const bookingStart = new Date(booking.start_date)
      const bookingEnd = new Date(booking.end_date)
      
      return date >= bookingStart && date <= bookingEnd
    })
  }

  // Handle date selection for booking creation
  const handleDateClick = (date: Date) => {
    if (date < today) return // Can't book in the past
    
    if (!selectedDates.start || (selectedDates.start && selectedDates.end)) {
      // Start new selection
      setSelectedDates({ start: date })
    } else if (date >= selectedDates.start) {
      // Complete selection
      setSelectedDates({ ...selectedDates, end: date })
      setShowBookingDialog(true)
    } else {
      // Selected date is before start, reset
      setSelectedDates({ start: date })
    }
  }

  // Check for booking conflicts
  const hasConflict = (startDate: Date, endDate: Date) => {
    return bookings.some(booking => {
      if (booking.is_cancelled) return false
      
      const bookingStart = new Date(booking.start_date)
      const bookingEnd = new Date(booking.end_date)
      
      return (startDate <= bookingEnd && endDate >= bookingStart)
    })
  }

  // Handle booking creation
  const handleCreateBooking = () => {
    if (!selectedDates.start || !selectedDates.end) {
      setConflictError('Please select start and end dates for your booking')
      return
    }
    
    // Validate date range
    if (selectedDates.end <= selectedDates.start) {
      setConflictError('End date must be after start date')
      return
    }
    
    // Check if start date is in the past (but allow today)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day
    if (selectedDates.start < today) {
      setConflictError('Start date cannot be in the past')
      return
    }
    
    // TEMPORARILY DISABLED - Let server handle conflict checking
    // Check for conflicts
    // if (hasConflict(selectedDates.start, selectedDates.end)) {
    //   setConflictError('Selected dates conflict with existing bookings')
    //   return
    // }
    
    const startDate = selectedDates.start.toISOString().split('T')[0]
    const endDate = selectedDates.end.toISOString().split('T')[0]
    
    onCreateBooking({
      start_date: startDate,
      end_date: endDate,
      notes: bookingNotes
    })
    
    // Reset form
    setSelectedDates({})
    setBookingNotes('')
    setConflictError('')
    setShowBookingDialog(false)
  }

  // Check if date is in selected range
  const isInSelectedRange = (date: Date) => {
    if (!selectedDates.start) return false
    if (!selectedDates.end) return date.getTime() === selectedDates.start.getTime()
    
    return date >= selectedDates.start && date <= selectedDates.end
  }

  // Render calendar days
  const renderCalendarDays = () => {
    const days = []
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<Box key={`empty-${i}`} sx={{ height: 80 }} />)
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const hebrewDate = getHebrewDate(date)
      const dayBookings = getBookingsForDate(date)
      const isPast = date < today
      const isToday = date.toDateString() === today.toDateString()
      const isSelected = isInSelectedRange(date)
      
      days.push(
        <Paper 
          key={day}
          elevation={isSelected ? 3 : 1}
          sx={{
            height: 80,
            p: 1,
            cursor: isPast ? 'not-allowed' : 'pointer',
            bgcolor: isSelected ? 'primary.light' : 'background.paper',
            opacity: isPast ? 0.5 : 1,
            border: isToday ? 2 : 0,
            borderColor: 'primary.main',
            '&:hover': {
              bgcolor: isPast ? 'background.paper' : 'action.hover'
            }
          }}
          onClick={() => !isPast && handleDateClick(date)}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="body2" fontWeight={isToday ? 'bold' : 'normal'}>
              {day}
            </Typography>
            {dayBookings.length > 0 && (
              <Chip 
                size="small" 
                label={dayBookings.length}
                color="primary"
                sx={{ height: 16, fontSize: '0.7rem' }}
              />
            )}
          </Box>
          
          {hebrewDate && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              {hebrewDate.day} {hebrewDate.month}
            </Typography>
          )}
          
          {dayBookings.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              {dayBookings.slice(0, 2).map((booking, index) => (
                <Typography 
                  key={booking.id}
                  variant="caption" 
                  sx={{ 
                    display: 'block',
                    fontSize: '0.6rem',
                    color: 'primary.main',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {booking.user_name}
                </Typography>
              ))}
              {dayBookings.length > 2 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  +{dayBookings.length - 2} more
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      )
    }
    
    return days
  }

  return (
    <Box>
      {/* Calendar Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={goToPreviousMonth}>
            <ChevronLeft />
          </IconButton>
          <Box sx={{ mx: 2, textAlign: 'center', minWidth: 200 }}>
            <Typography variant="h5" component="h2">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Typography>
            {(() => {
              const hebrewDate = getHebrewDate(currentDate)
              return hebrewDate ? (
                <Typography variant="body2" color="text.secondary">
                  {hebrewDate.month} {hebrewDate.year}
                </Typography>
              ) : null
            })()}
          </Box>
          <IconButton onClick={goToNextMonth}>
            <ChevronRight />
          </IconButton>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowBookingDialog(true)}
          disabled={loading}
        >
          New Booking
        </Button>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: 'primary.main', borderRadius: 1 }} />
          <Typography variant="caption">Booked</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: 'primary.light', borderRadius: 1 }} />
          <Typography variant="caption">Selected</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: 'action.disabled', borderRadius: 1 }} />
          <Typography variant="caption">Past</Typography>
        </Box>
      </Box>

      {/* Day Headers */}
      <Grid container spacing={1} sx={{ mb: 1 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Grid item xs key={day}>
            <Typography variant="subtitle2" align="center" color="text.secondary">
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Calendar Grid */}
      <Grid container spacing={1}>
        {renderCalendarDays().map((day, index) => (
          <Grid item xs key={index}>
            {day}
          </Grid>
        ))}
      </Grid>

      {/* Booking Creation Dialog */}
      <Dialog open={showBookingDialog} onClose={() => setShowBookingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Booking</DialogTitle>
        <DialogContent>
          {conflictError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {conflictError}
            </Alert>
          )}
          
          {selectedDates.start && selectedDates.end ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Booking from {selectedDates.start.toLocaleDateString()} to {selectedDates.end.toLocaleDateString()}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select dates by clicking on the calendar, or enter them manually:
              </Typography>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={selectedDates.start ? selectedDates.start.toISOString().split('T')[0] : ''}
                inputProps={{ min: today.toISOString().split('T')[0] }}
                onChange={(e) => {
                  const date = new Date(e.target.value)
                  if (!isNaN(date.getTime())) {
                    setSelectedDates(prev => ({ ...prev, start: date }))
                    setConflictError('')
                  }
                }}
                sx={{ mb: 2 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={selectedDates.end ? selectedDates.end.toISOString().split('T')[0] : ''}
                inputProps={{ min: selectedDates.start ? selectedDates.start.toISOString().split('T')[0] : today.toISOString().split('T')[0] }}
                onChange={(e) => {
                  const date = new Date(e.target.value)
                  if (!isNaN(date.getTime())) {
                    setSelectedDates(prev => ({ ...prev, end: date }))
                    setConflictError('')
                  }
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
          
          <TextField
            fullWidth
            label="Notes (optional)"
            multiline
            rows={3}
            value={bookingNotes}
            onChange={(e) => setBookingNotes(e.target.value)}
            placeholder="Add any notes about your stay..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowBookingDialog(false)
            setSelectedDates({})
            setBookingNotes('')
            setConflictError('')
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateBooking}
            variant="contained"
            disabled={!selectedDates.start || !selectedDates.end}
          >
            Create Booking
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}