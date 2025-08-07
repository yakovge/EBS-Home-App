/**
 * Checklist screen for viewing exit checklists.
 * Displays list of exit checklists with navigation options.
 */

import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { FAB } from 'react-native-paper'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../services/api'
import { ExitChecklist } from '../types'
import ChecklistList from '../components/Lists/ChecklistList'
import LoadingSpinner from '../components/Layout/LoadingSpinner'
import ErrorMessage from '../components/Layout/ErrorMessage'

export default function ChecklistScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation()
  
  // State
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [checklists, setChecklists] = useState<ExitChecklist[]>([])

  const fetchChecklists = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true)
      setError('')

      const response = await apiClient.get<ExitChecklist[]>('/checklists')
      
      // Sort by creation date (newest first)
      const sortedChecklists = (response || []).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setChecklists(sortedChecklists)
      
    } catch (error) {
      console.error('Failed to fetch checklists:', error)
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
      fetchChecklists()
    }, [])
  )

  const handleRefresh = () => {
    setRefreshing(true)
    fetchChecklists(true)
  }

  const handleItemPress = (checklist: ExitChecklist) => {
    navigation.navigate('ChecklistDetail' as never, { checklist } as never)
  }

  const handleCreateChecklist = () => {
    navigation.navigate('ChecklistForm' as never)
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
          onRetry={() => fetchChecklists()}
        />
      )}

      {/* Checklist List */}
      <View style={styles.listContainer}>
        <ChecklistList
          checklists={checklists}
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
        onPress={handleCreateChecklist}
        label={t('checklist.submitChecklist')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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