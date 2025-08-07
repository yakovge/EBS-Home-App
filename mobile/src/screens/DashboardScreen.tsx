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
import { useOfflineContext } from '../contexts/OfflineContext'
import { Booking, MaintenanceRequest, ExitChecklist } from '../types'
import LoadingSpinner from '../components/Layout/LoadingSpinner'
import ErrorMessage from '../components/Layout/ErrorMessage'
import OfflineIndicator from '../components/Common/OfflineIndicator'

export default function DashboardScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const { user } = useAuthContext()
  const { getData, isOnline } = useOfflineContext()
  const navigation = useNavigation()
  
  // State
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [currentBookings, setCurrentBookings] = useState<Booking[]>([])
  const [pendingMaintenance, setPendingMaintenance] = useState<MaintenanceRequest[]>([])
  const [recentChecklists, setRecentChecklists] = useState<ExitChecklist[]>([])

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true)
      setError('')

      // Fetch current bookings, pending maintenance, and recent checklists in parallel
      const [bookingsResponse, maintenanceResponse, checklistsResponse] = await Promise.all([
        getData<Booking[]>('/bookings?status=active', 'dashboard_bookings', { 
          cacheTTL: 5 * 60 * 1000, // 5 minutes cache
          skipCache: isRefresh 
        }),
        getData<MaintenanceRequest[]>('/maintenance?status=pending&limit=5', 'dashboard_maintenance', { 
          cacheTTL: 3 * 60 * 1000, // 3 minutes cache
          skipCache: isRefresh 
        }),
        getData<ExitChecklist[]>('/checklists?limit=1&sort=created_at&order=desc', 'dashboard_checklists', { 
          cacheTTL: 10 * 60 * 1000, // 10 minutes cache
          skipCache: isRefresh 
        })
      ])

      setCurrentBookings(bookingsResponse || [])
      setPendingMaintenance(maintenanceResponse || [])
      setRecentChecklists(checklistsResponse || [])
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      let errorMessage: string
      
      if (error instanceof Error && error.message.includes('queued')) {
        // Operation was queued for offline sync - show different message
        errorMessage = isOnline ? t('errors.requestQueued') : t('offline.dataUnavailableOffline')
      } else {
        errorMessage = error instanceof Error ? error.message : t('errors.networkError')
      }
      
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
              onPress={() => {
                navigation.navigate('Maintenance' as never);
                // Note: MaintenanceScreen will need a "Create" button to navigate to MaintenanceForm
              }}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
            >
              Report Issue
            </Button>
            
            <Button
              mode="outlined"
              icon="clipboard-check"
              onPress={() => {
                navigation.navigate('Checklist' as never);
                // Note: ChecklistScreen will need a "Create" button to navigate to ChecklistForm
              }}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
            >
              Exit Checklist
            </Button>
            
            <Button
              mode="outlined"
              icon="calendar-plus"
              onPress={() => {
                navigation.navigate('Booking' as never);
              }}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
            >
              Booking
            </Button>
          </View>
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

      {/* Recent Checklists */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Last Checklist
            </Text>
            <IconButton
              icon="clipboard-check"
              size={20}
              iconColor={theme.colors.primary}
              onPress={() => navigation.navigate('Checklist' as never)}
            />
          </View>
          
          {recentChecklists.length === 0 ? (
            <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No checklists yet
            </Text>
          ) : (
            recentChecklists.slice(0, 1).map((checklist) => (
              <View key={checklist.id} style={styles.checklistItem}>
                <View style={styles.checklistInfo}>
                  <Text variant="bodyMedium" style={[styles.checklistTitle, { color: theme.colors.onSurface }]}>
                    Exit Checklist - {checklist.userName}
                    {checklist.bookingId && ` (Booking ${checklist.bookingId.slice(-4)})`}
                  </Text>
                  <Text variant="bodySmall" style={[styles.checklistDate, { color: theme.colors.onSurfaceVariant }]}>
                    {checklist.submittedAt ? 
                      `Submitted ${formatDate(checklist.submittedAt)}` : 
                      `Created ${formatDate(checklist.createdAt)}`
                    }
                  </Text>
                </View>
                <Chip 
                  mode="flat"
                  style={[
                    styles.statusChip, 
                    { 
                      backgroundColor: checklist.isComplete ? 
                        theme.colors.tertiary + '20' : theme.colors.primary + '20' 
                    }
                  ]}
                  textStyle={{ 
                    color: checklist.isComplete ? 
                      theme.colors.tertiary : theme.colors.primary 
                  }}
                  compact
                >
                  {checklist.isComplete ? 'Complete' : 'Pending'}
                </Chip>
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
      
      {/* Offline Indicator */}
      <OfflineIndicator />
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
    height: 32,
    alignSelf: 'center',
    justifyContent: 'center',
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
  checklistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  checklistInfo: {
    flex: 1,
    marginRight: 12,
  },
  checklistTitle: {
    fontWeight: '500',
    marginBottom: 2,
  },
  checklistDate: {
    fontSize: 12,
  },
  statusChip: {
    height: 32,
    alignSelf: 'center',
    justifyContent: 'center',
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