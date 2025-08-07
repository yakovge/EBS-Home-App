/**
 * Maintenance screen for viewing and managing maintenance requests.
 * Displays list of maintenance requests with filtering and navigation options.
 */

import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { FAB, SegmentedButtons } from 'react-native-paper'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../services/api'
import { MaintenanceRequest, MaintenanceStatus } from '../types'
import MaintenanceList from '../components/Lists/MaintenanceList'
import LoadingSpinner from '../components/Layout/LoadingSpinner'
import ErrorMessage from '../components/Layout/ErrorMessage'

export default function MaintenanceScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation()
  
  // State
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<MaintenanceRequest[]>([])
  const [filter, setFilter] = useState('all')

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: t('maintenance.pending') },
    { value: 'in_progress', label: t('maintenance.inProgress') },
    { value: 'completed', label: t('maintenance.completed') },
  ]

  const fetchMaintenanceRequests = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true)
      setError('')

      const response = await apiClient.get<MaintenanceRequest[]>('/maintenance')
      setRequests(response || [])
      
    } catch (error) {
      console.error('Failed to fetch maintenance requests:', error)
      const errorMessage = error instanceof Error ? error.message : t('errors.networkError')
      setError(errorMessage)
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }

  // Fetch data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchMaintenanceRequests()
    }, [])
  )

  // Apply filter whenever requests or filter changes
  useEffect(() => {
    let filtered = requests
    
    if (filter !== 'all') {
      filtered = requests.filter(request => request.status === filter)
    }
    
    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    setFilteredRequests(filtered)
  }, [requests, filter])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchMaintenanceRequests(true)
  }

  const handleItemPress = (request: MaintenanceRequest) => {
    navigation.navigate('MaintenanceDetail' as never, { requestId: request.id } as never)
  }

  const handleCreateRequest = () => {
    navigation.navigate('MaintenanceForm' as never)
  }

  if (loading) {
    return <LoadingSpinner text={t('common.loading')} fullScreen />
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {error && (
        <ErrorMessage
          message={error}
          showRetry={true}
          onRetry={() => fetchMaintenanceRequests()}
        />
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={filterOptions}
          style={styles.filterButtons}
        />
      </View>

      {/* Maintenance List */}
      <View style={styles.listContainer}>
        <MaintenanceList
          requests={filteredRequests}
          onItemPress={handleItemPress}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          loading={loading}
        />
      </View>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleCreateRequest}
        label={t('maintenance.createRequest')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  filterButtons: {
    // Additional filter button styles
  },
  listContainer: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
})