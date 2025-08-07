/**
 * Dashboard screen showing overview of app features.
 * Displays current bookings, pending maintenance, and exit reminders.
 */

import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Card, Text, Button, IconButton, Chip } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useAuthContext } from '../contexts/AuthContext'
import { apiClient } from '../services/api'
import { Booking, MaintenanceRequest } from '../types'
import LoadingSpinner from '../components/Layout/LoadingSpinner'
import ErrorMessage from '../components/Layout/ErrorMessage'

export default function DashboardScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const { user } = useAuthContext()
  const navigation = useNavigation()
  
  // State
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [currentBookings, setCurrentBookings] = useState<Booking[]>([])
  const [pendingMaintenance, setPendingMaintenance] = useState<MaintenanceRequest[]>([])

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true)
      setError('')

      // Fetch current bookings and pending maintenance in parallel
      const [bookingsResponse, maintenanceResponse] = await Promise.all([
        apiClient.get<Booking[]>('/bookings?status=active'),
        apiClient.get<MaintenanceRequest[]>('/maintenance?status=pending&limit=5')
      ])

      setCurrentBookings(bookingsResponse || [])
      setPendingMaintenance(maintenanceResponse || [])
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      const errorMessage = error instanceof Error ? error.message : t('errors.networkError')
      setError(errorMessage)
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboardData(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getDaysUntilDate = (dateString: string) => {
    const targetDate = new Date(dateString)
    const today = new Date()
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return <LoadingSpinner text={t('common.loading')} fullScreen />
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
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
          onRetry={() => fetchDashboardData()}
        />
      )}

      {/* Welcome Header */}
      <Card style={styles.welcomeCard}>
        <Card.Content>
          <Text variant="headlineMedium" style={[styles.welcome, { color: theme.colors.onSurface }]}>
            {t('dashboard.welcome')}
          </Text>
          <Text variant="bodyLarge" style={[styles.userName, { color: theme.colors.primary }]}>
            {user?.name}
          </Text>
        </Card.Content>
      </Card>

      {/* Current Bookings */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {t('dashboard.currentBookings')}
            </Text>
            <IconButton
              icon="calendar"
              size={20}
              iconColor={theme.colors.primary}
              onPress={() => navigation.navigate('Booking' as never)}
            />
          </View>
          
          {currentBookings.length === 0 ? (
            <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              {t('dashboard.noBookings')}
            </Text>
          ) : (
            currentBookings.slice(0, 3).map((booking) => (
              <View key={booking.id} style={styles.bookingItem}>
                <View style={styles.bookingInfo}>
                  <Text variant="bodyLarge" style={[styles.bookingTitle, { color: theme.colors.onSurface }]}>
                    {booking.user_name}
                  </Text>
                  <Text variant="bodySmall" style={[styles.bookingDates, { color: theme.colors.onSurfaceVariant }]}>
                    {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                  </Text>
                </View>
                {!booking.exit_checklist_completed && getDaysUntilDate(booking.end_date) <= 1 && (
                  <Chip 
                    icon="alert-circle" 
                    mode="flat"
                    style={[styles.reminderChip, { backgroundColor: theme.colors.tertiary + '20' }]}
                    textStyle={{ color: theme.colors.tertiary }}
                    compact
                  >
                    Exit Reminder
                  </Chip>
                )}
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Pending Maintenance */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {t('dashboard.pendingMaintenance')}
            </Text>
            <IconButton
              icon="wrench"
              size={20}
              iconColor={theme.colors.primary}
              onPress={() => navigation.navigate('Maintenance' as never)}
            />
          </View>
          
          {pendingMaintenance.length === 0 ? (
            <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              {t('dashboard.noMaintenance')}
            </Text>
          ) : (
            pendingMaintenance.map((request) => (
              <View key={request.id} style={styles.maintenanceItem}>
                <View style={styles.maintenanceInfo}>
                  <Text variant="bodyMedium" style={[styles.maintenanceTitle, { color: theme.colors.onSurface }]} numberOfLines={2}>
                    {request.description}
                  </Text>
                  <Text variant="bodySmall" style={[styles.maintenanceLocation, { color: theme.colors.onSurfaceVariant }]}>
                    {request.location} • {formatDate(request.created_at)}
                  </Text>
                </View>
                <Chip 
                  mode="flat"
                  style={[styles.statusChip, { backgroundColor: theme.colors.primary + '20' }]}
                  textStyle={{ color: theme.colors.primary }}
                  compact
                >
                  Pending
                </Chip>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Quick Actions
          </Text>
          
          <View style={styles.actionsContainer}>
            <Button
              mode="contained"
              icon="wrench"
              onPress={() => navigation.navigate('MaintenanceForm' as never)}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
            >
              Report Issue
            </Button>
            
            <Button
              mode="outlined"
              icon="clipboard-check"
              onPress={() => navigation.navigate('ChecklistForm' as never)}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
            >
              Exit Checklist
            </Button>
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
  contentContainer: {
    padding: 16,
  },
  welcomeCard: {
    marginBottom: 16,
  },
  welcome: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
  userName: {
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 16,
  },
  bookingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontWeight: '500',
    marginBottom: 2,
  },
  bookingDates: {
    fontSize: 12,
  },
  reminderChip: {
    height: 24,
  },
  maintenanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  maintenanceInfo: {
    flex: 1,
    marginRight: 12,
  },
  maintenanceTitle: {
    fontWeight: '500',
    marginBottom: 2,
  },
  maintenanceLocation: {
    fontSize: 12,
  },
  statusChip: {
    height: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
})