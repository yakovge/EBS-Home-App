/**
 * Booking form screen for creating new house reservations.
 * Includes date picker, guest information, and notes.
 */

import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { Card, Text, Button, TextInput } from 'react-native-paper'
import { Calendar } from 'react-native-calendars'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../services/api'
import { reminderService } from '../services/reminderService'
import FormField from '../components/Forms/FormField'
import LoadingSpinner from '../components/Layout/LoadingSpinner'

interface BookingFormData {
  start_date: string
  end_date: string
  guest_name: string
  notes: string
}

export default function BookingFormScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const { startDate: prefilledStartDate, endDate: prefilledEndDate } = (route.params as any) || {}
  
  // Form state
  const [formData, setFormData] = useState<BookingFormData>({
    start_date: prefilledStartDate || '',
    end_date: prefilledEndDate || '',
    guest_name: '',
    notes: ''
  })
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [calendarKey, setCalendarKey] = useState(0)
  const [selectedDates, setSelectedDates] = useState<{[key: string]: any}>(() => {
    if (prefilledStartDate && prefilledEndDate) {
      const dates: {[key: string]: any} = {}
      const start = new Date(prefilledStartDate)
      const end = new Date(prefilledEndDate)
      const current = new Date(start)
      
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]
        const isStart = dateStr === prefilledStartDate
        const isEnd = dateStr === prefilledEndDate
        
        dates[dateStr] = {
          color: theme.colors.primary,
          startingDay: isStart,
          endingDay: isEnd,
          ...(isStart && isEnd ? {} : { textColor: theme.colors.onPrimary })
        }
        
        current.setDate(current.getDate() + 1)
      }
      return dates
    }
    return {}
  })
  const [isSelectingEndDate, setIsSelectingEndDate] = useState(false)

  const handleDateSelect = (day: any) => {
    const dateString = day.dateString
    
    if (!formData.start_date || isSelectingEndDate) {
      if (!formData.start_date) {
        // First selection - set start date
        setFormData(prev => ({ ...prev, start_date: dateString, end_date: '' }))
        setSelectedDates({ [dateString]: { startingDay: true, color: theme.colors.primary } })
        setIsSelectingEndDate(true)
      } else {
        // Second selection - set end date
        const startDate = new Date(formData.start_date)
        const endDate = new Date(dateString)
        
        if (endDate < startDate) {
          Alert.alert(t('common.error'), t('booking.endDateError'))
          return
        }
        
        setFormData(prev => ({ ...prev, end_date: dateString }))
        
        // Update calendar selection to show range
        const newSelectedDates: {[key: string]: any} = {}
        let currentDate = new Date(startDate)
        
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0]
          const isStart = dateStr === formData.start_date
          const isEnd = dateStr === dateString
          
          newSelectedDates[dateStr] = {
            color: theme.colors.primary,
            startingDay: isStart,
            endingDay: isEnd,
            ...(isStart && isEnd ? {} : { textColor: theme.colors.onPrimary })
          }
          
          currentDate.setDate(currentDate.getDate() + 1)
        }
        
        setSelectedDates(newSelectedDates)
        setIsSelectingEndDate(false)
      }
    } else {
      // Reset and start over
      setFormData(prev => ({ ...prev, start_date: dateString, end_date: '' }))
      setSelectedDates({ [dateString]: { startingDay: true, color: theme.colors.primary } })
      setIsSelectingEndDate(true)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.start_date) {
      newErrors.start_date = t('booking.startDateRequired')
    }
    
    if (!formData.end_date) {
      newErrors.end_date = t('booking.endDateRequired')
    }
    
    if (!formData.guest_name.trim()) {
      newErrors.guest_name = t('booking.guestNameRequired')
    }
    
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date)
      const endDate = new Date(formData.end_date)
      if (endDate < startDate) {
        newErrors.end_date = t('booking.endDateError')
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }
    
    try {
      setLoading(true)
      
      const bookingData = {
        start_date: formData.start_date,
        end_date: formData.end_date,
        guest_name: formData.guest_name.trim(),
        notes: formData.notes.trim()
      }
      
      const response = await apiClient.post('/bookings', bookingData)
      
      // Schedule exit reminder for the new booking
      if (response && response.id) {
        await reminderService.scheduleReminderForBooking({
          id: response.id,
          user_name: bookingData.guest_name,
          start_date: bookingData.start_date,
          end_date: bookingData.end_date,
          notes: bookingData.notes,
          is_cancelled: false,
          exit_checklist_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
      
      Alert.alert(
        t('common.success'),
        t('booking.bookingCreated'),
        [
          {
            text: t('common.confirm'),
            onPress: () => navigation.goBack()
          }
        ]
      )
      
    } catch (error) {
      console.error('Failed to create booking:', error)
      const errorMessage = error instanceof Error ? error.message : t('errors.networkError')
      Alert.alert(t('common.error'), errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const resetDates = () => {
    setFormData(prev => ({ ...prev, start_date: '', end_date: '' }))
    setSelectedDates({})
    setIsSelectingEndDate(false)
    setErrors(prev => ({ ...prev, start_date: '', end_date: '' }))
  }

  const goToCurrentMonth = () => {
    // Force calendar to re-render with current month
    setCalendarKey(prev => prev + 1)
  }

  if (loading) {
    return <LoadingSpinner text={t('booking.creatingBooking')} fullScreen />
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            {t('booking.createBooking')}
          </Text>
          
          {/* Date Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                {t('booking.selectDates')}
              </Text>
              <Button
                mode="outlined"
                onPress={goToCurrentMonth}
                icon="calendar-today"
                compact
                style={styles.todayButton}
              >
                Today
              </Button>
            </View>
            
            <View style={styles.dateInfo}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {formData.start_date ? 
                  `${t('booking.checkIn')}: ${formData.start_date}` : 
                  t('booking.selectCheckIn')
                }
              </Text>
              {formData.end_date && (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {`${t('booking.checkOut')}: ${formData.end_date}`}
                </Text>
              )}
            </View>
            
            <Calendar
              key={calendarKey}
              current={new Date().toISOString().split('T')[0]}
              onDayPress={handleDateSelect}
              markedDates={selectedDates}
              markingType="period"
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: theme.colors.onPrimary,
                todayTextColor: theme.colors.primary,
                arrowColor: theme.colors.primary,
                monthTextColor: theme.colors.onSurface,
                dayTextColor: theme.colors.onSurface,
                textDisabledColor: theme.colors.onSurfaceVariant,
              }}
            />
            
            {(errors.start_date || errors.end_date) && (
              <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.start_date || errors.end_date}
              </Text>
            )}
            
            <Button
              mode="outlined"
              onPress={resetDates}
              style={styles.resetButton}
              icon="refresh"
            >
              {t('booking.resetDates')}
            </Button>
          </View>
          
          {/* Guest Information */}
          <View style={styles.section}>
            <FormField
              label={t('booking.guestName')}
              value={formData.guest_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, guest_name: text }))}
              error={errors.guest_name}
              required
              placeholder={t('booking.guestNamePlaceholder')}
            />
            
            <FormField
              label={t('booking.notes')}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              placeholder={t('booking.notesPlaceholder')}
              multiline
              numberOfLines={3}
            />
          </View>
          
          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={loading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
          >
            {loading ? t('common.loading') : t('booking.createBooking')}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 32,
  },
  cardContent: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 0,
    fontWeight: '500',
  },
  todayButton: {
    minWidth: 70,
  },
  dateInfo: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
  },
  resetButton: {
    marginTop: 12,
  },
  submitButton: {
    marginTop: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
})