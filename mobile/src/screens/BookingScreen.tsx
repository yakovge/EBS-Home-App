/**
 * Booking screen for viewing and managing house bookings.
 * Displays calendar view and booking list with navigation options.
 */

import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native'
import { Card, Text, Chip, Button, TextInput } from 'react-native-paper'
import { Calendar } from 'react-native-calendars'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../services/api'
import { Booking } from '../types'
import LoadingSpinner from '../components/Layout/LoadingSpinner'
import ErrorMessage from '../components/Layout/ErrorMessage'
import EmptyState from '../components/Layout/EmptyState'

export default function BookingScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation()
  
  // State
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [quickBookingStart, setQuickBookingStart] = useState('')
  const [quickBookingEnd, setQuickBookingEnd] = useState('')
  const [showQuickBookButton, setShowQuickBookButton] = useState(false)
  const [quickBookingGuestName, setQuickBookingGuestName] = useState('')
  const [quickBookingLoading, setQuickBookingLoading] = useState(false)

  const fetchBookings = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true)
      setError('')

      const response = await apiClient.get<Booking[]>('/bookings')
      
      // Sort by start date
      const sortedBookings = (response || []).sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      )
      
      setBookings(sortedBookings)
      
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
      const errorMessage = error instanceof Error ? error.message : t('errors.networkError')
      setError(errorMessage)
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchBookings(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusColor = (booking: Booking) => {
    if (booking.is_cancelled) return theme.colors.error
    
    const now = new Date()
    const startDate = new Date(booking.start_date)
    const endDate = new Date(booking.end_date)
    
    if (now >= startDate && now <= endDate) {
      return theme.colors.secondary // Currently active
    } else if (now < startDate) {
      return theme.colors.primary // Upcoming
    } else {
      return theme.colors.outline // Past
    }
  }

  const getStatusText = (booking: Booking) => {
    if (booking.is_cancelled) return t('booking.cancelled')
    
    const now = new Date()
    const startDate = new Date(booking.start_date)
    const endDate = new Date(booking.end_date)
    
    if (now >= startDate && now <= endDate) {
      return t('booking.active')
    } else if (now < startDate) {
      return 'Upcoming'
    } else {
      return 'Past'
    }
  }

  // Create calendar marked dates
  const markedDates = bookings.reduce((marked, booking) => {
    if (booking.is_cancelled) return marked
    
    const startDate = new Date(booking.start_date)
    const endDate = new Date(booking.end_date)
    
    // Mark all dates in the booking range
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split('T')[0]
      marked[dateString] = {
        marked: true,
        dotColor: getStatusColor(booking),
        selectedColor: theme.colors.primary,
      }
    }
    
    return marked
  }, {} as any)

  const handleDayPress = (day: any) => {
    const dateString = day.dateString
    const selectedDateObj = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Don't allow selecting past dates
    if (selectedDateObj < today) {
      return
    }
    
    setSelectedDate(dateString)
    
    if (!quickBookingStart) {
      // First date selection
      setQuickBookingStart(dateString)
      setQuickBookingEnd('')
      setShowQuickBookButton(false)
    } else if (!quickBookingEnd) {
      // Second date selection
      const startDate = new Date(quickBookingStart)
      const endDate = new Date(dateString)
      
      if (endDate <= startDate) {
        // If second date is before or same as first, reset and start over
        setQuickBookingStart(dateString)
        setQuickBookingEnd('')
        setShowQuickBookButton(false)
      } else {
        // Valid range selected
        setQuickBookingEnd(dateString)
        setShowQuickBookButton(true)
      }
    } else {
      // Start over with new selection
      setQuickBookingStart(dateString)
      setQuickBookingEnd('')
      setShowQuickBookButton(false)
    }
  }

  const handleQuickBooking = async () => {
    if (quickBookingStart && quickBookingEnd && quickBookingGuestName.trim()) {
      try {
        setQuickBookingLoading(true)
        
        const bookingData = {
          start_date: quickBookingStart,
          end_date: quickBookingEnd,
          guest_name: quickBookingGuestName.trim(),
          notes: 'Quick booking from calendar'
        }
        
        await apiClient.post('/bookings', bookingData)
        
        // Clear quick booking state
        clearQuickBooking()
        
        // Refresh bookings list
        fetchBookings(true)
        
        // Show success message
        Alert.alert(
          'Booking Created!',
          `Successfully booked ${formatDate(quickBookingStart)} - ${formatDate(quickBookingEnd)} for ${quickBookingGuestName}`,
          [{ text: 'OK' }]
        )
        
      } catch (error) {
        console.error('Failed to create quick booking:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to create booking'
        Alert.alert('Error', errorMessage)
      } finally {
        setQuickBookingLoading(false)
      }
    }
  }

  const clearQuickBooking = () => {
    setQuickBookingStart('')
    setQuickBookingEnd('')
    setShowQuickBookButton(false)
    setSelectedDate('')
    setQuickBookingGuestName('')
  }

  const getDateRange = (startDate: string, endDate: string) => {
    const range: any = {}
    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start)
    
    while (current <= end) {
      const dateString = current.toISOString().split('T')[0]
      
      if (dateString === startDate) {
        range[dateString] = { startingDay: true, color: theme.colors.secondary, textColor: theme.colors.onSecondary }
      } else if (dateString === endDate) {
        range[dateString] = { endingDay: true, color: theme.colors.secondary, textColor: theme.colors.onSecondary }
      } else {
        range[dateString] = { color: theme.colors.secondary + '60', textColor: theme.colors.onSecondary }
      }
      
      current.setDate(current.getDate() + 1)
    }
    
    return range
  }

  if (loading) {
    return <LoadingSpinner text={t('common.loading')} fullScreen />
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      {error && (
        <ErrorMessage
          message={error}
          showRetry={true}
          onRetry={() => fetchBookings()}
        />
      )}

      {/* Calendar */}
      <Card style={styles.calendarCard}>
        <Card.Content>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Booking Calendar
          </Text>
          
          <Calendar
            onDayPress={handleDayPress}
            markedDates={{
              ...markedDates,
              [selectedDate]: {
                ...markedDates[selectedDate],
                selected: true,
                selectedColor: theme.colors.primary,
              },
              ...(quickBookingStart && {
                [quickBookingStart]: {
                  ...markedDates[quickBookingStart],
                  startingDay: true,
                  color: theme.colors.secondary,
                  textColor: theme.colors.onSecondary,
                }
              }),
              ...(quickBookingEnd && {
                [quickBookingEnd]: {
                  ...markedDates[quickBookingEnd],
                  endingDay: true,
                  color: theme.colors.secondary,
                  textColor: theme.colors.onSecondary,
                }
              }),
              ...(quickBookingStart && quickBookingEnd && getDateRange(quickBookingStart, quickBookingEnd))
            }}
            markingType="period"
            theme={{
              backgroundColor: theme.colors.background,
              calendarBackground: theme.colors.surface,
              textSectionTitleColor: theme.colors.onSurface,
              dayTextColor: theme.colors.onSurface,
              todayTextColor: theme.colors.primary,
              selectedDayTextColor: theme.colors.onPrimary,
              monthTextColor: theme.colors.onSurface,
              arrowColor: theme.colors.primary,
            }}
            style={styles.calendar}
          />
        </Card.Content>
      </Card>

      {/* Quick Booking */}
      {(quickBookingStart || showQuickBookButton) && (
        <Card style={styles.quickBookingCard}>
          <Card.Content>
            <View style={styles.quickBookingContent}>
              <View style={styles.quickBookingInfo}>
                <Text variant="bodyMedium" style={[styles.quickBookingTitle, { color: theme.colors.onSurface }]}>
                  {quickBookingStart && quickBookingEnd ? (
                    `${formatDate(quickBookingStart)} - ${formatDate(quickBookingEnd)}`
                  ) : quickBookingStart ? (
                    `Selected: ${formatDate(quickBookingStart)} (select end date)`
                  ) : (
                    'Select dates'
                  )}
                </Text>
                {showQuickBookButton && (
                  <Text variant="bodySmall" style={[styles.quickBookingSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                    Enter guest name to book these dates
                  </Text>
                )}
              </View>
              
              {showQuickBookButton && (
                <View style={styles.quickBookingForm}>
                  <TextInput
                    mode="outlined"
                    label="Guest Name"
                    value={quickBookingGuestName}
                    onChangeText={setQuickBookingGuestName}
                    placeholder="Enter guest name"
                    style={styles.guestNameInput}
                    compact
                  />
                </View>
              )}
              
              <View style={styles.quickBookingActions}>
                {showQuickBookButton && (
                  <Button
                    mode="contained"
                    onPress={handleQuickBooking}
                    style={styles.quickBookButton}
                    disabled={!quickBookingGuestName.trim() || quickBookingLoading}
                    loading={quickBookingLoading}
                    compact
                  >
                    {quickBookingLoading ? 'Booking...' : 'Book These Days'}
                  </Button>
                )}
                <Button
                  mode="outlined"
                  onPress={clearQuickBooking}
                  style={styles.clearButton}
                  compact
                >
                  Clear
                </Button>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Booking List */}
      <Card style={styles.listCard}>
        <Card.Content>
          <View style={styles.listHeader}>
            <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {t('booking.title')}
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('BookingForm' as never)}
              icon="plus"
              compact
            >
              {t('booking.createBooking')}
            </Button>
          </View>

          {bookings.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title={t('booking.noBookings')}
              description="No bookings scheduled"
            />
          ) : (
            bookings.map((booking) => (
              <View key={booking.id} style={styles.bookingItem}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingInfo}>
                    <Text variant="titleMedium" style={[styles.bookingTitle, { color: theme.colors.onSurface }]}>
                      {booking.user_name}
                    </Text>
                    <Text variant="bodySmall" style={[styles.bookingDates, { color: theme.colors.onSurfaceVariant }]}>
                      {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                    </Text>
                  </View>
                  
                  <Chip 
                    mode="flat"
                    style={[styles.statusChip, { backgroundColor: getStatusColor(booking) + '20' }]}
                    textStyle={{ color: getStatusColor(booking) }}
                    compact
                  >
                    {getStatusText(booking)}
                  </Chip>
                </View>

                {booking.notes && (
                  <Text variant="bodySmall" style={[styles.bookingNotes, { color: theme.colors.onSurfaceVariant }]}>
                    Notes: {booking.notes}
                  </Text>
                )}

                <View style={styles.bookingFooter}>
                  {booking.exit_checklist_completed ? (
                    <Chip 
                      icon="check-circle" 
                      mode="flat"
                      style={[styles.checklistChip, { backgroundColor: theme.colors.secondary + '20' }]}
                      textStyle={{ color: theme.colors.secondary }}
                      compact
                    >
                      Exit checklist completed
                    </Chip>
                  ) : (
                    <Chip 
                      icon="alert-circle" 
                      mode="flat"
                      style={[styles.checklistChip, { backgroundColor: theme.colors.tertiary + '20' }]}
                      textStyle={{ color: theme.colors.tertiary }}
                      compact
                    >
                      {t('booking.exitChecklistRequired')}
                    </Chip>
                  )}
                </View>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Legend */}
      <Card style={styles.legendCard}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.legendTitle, { color: theme.colors.onSurface }]}>
            Legend
          </Text>
          
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.secondary }]} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>Active</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>Upcoming</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.outline }]} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>Past</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarCard: {
    margin: 16,
    marginBottom: 8,
  },
  calendar: {
    marginTop: 12,
  },
  listCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  legendCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookingInfo: {
    flex: 1,
    marginRight: 12,
  },
  bookingTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  bookingDates: {
    fontSize: 12,
  },
  statusChip: {
    height: 32,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  bookingNotes: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  bookingFooter: {
    alignItems: 'flex-start',
  },
  checklistChip: {
    height: 32,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  legendTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  quickBookingCard: {
    margin: 16,
    marginVertical: 8,
  },
  quickBookingContent: {
    flexDirection: 'column',
    gap: 12,
  },
  quickBookingInfo: {
    alignItems: 'flex-start',
  },
  quickBookingForm: {
    width: '100%',
  },
  guestNameInput: {
    fontSize: 14,
  },
  quickBookingTitle: {
    fontWeight: '500',
    marginBottom: 2,
  },
  quickBookingSubtitle: {
    fontSize: 12,
  },
  quickBookingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBookButton: {
    minWidth: 100,
  },
  clearButton: {
    minWidth: 60,
  },
})