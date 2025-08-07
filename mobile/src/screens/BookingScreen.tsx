/**
 * Booking screen for viewing and managing house bookings.
 * Displays calendar view and booking list with navigation options.
 */

import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Card, Text, Chip, Button } from 'react-native-paper'
import { Calendar } from 'react-native-calendars'
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
  
  // State
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedDate, setSelectedDate] = useState('')

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
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={{
              ...markedDates,
              [selectedDate]: {
                ...markedDates[selectedDate],
                selected: true,
                selectedColor: theme.colors.primary,
              }
            }}
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

      {/* Booking List */}
      <Card style={styles.listCard}>
        <Card.Content>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            {t('booking.title')}
          </Text>

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
    height: 24,
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
    height: 24,
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
})