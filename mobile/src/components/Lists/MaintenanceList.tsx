/**
 * Maintenance request list component for mobile.
 * Displays maintenance requests in a card-based layout.
 */

import React from 'react'
import { View, StyleSheet, FlatList } from 'react-native'
import { Card, Text, Chip, IconButton } from 'react-native-paper'
import { useTheme } from '../../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { MaintenanceRequest, MaintenanceStatus } from '../../types'
import EmptyState from '../Layout/EmptyState'

interface MaintenanceListProps {
  requests: MaintenanceRequest[]
  onItemPress?: (request: MaintenanceRequest) => void
  onRefresh?: () => void
  refreshing?: boolean
  loading?: boolean
}

export default function MaintenanceList({
  requests,
  onItemPress,
  onRefresh,
  refreshing = false,
  loading = false,
}: MaintenanceListProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()

  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case MaintenanceStatus.COMPLETED:
        return theme.colors.secondary
      case MaintenanceStatus.IN_PROGRESS:
        return theme.colors.tertiary
      case MaintenanceStatus.CANCELLED:
        return theme.colors.error
      default:
        return theme.colors.primary
    }
  }

  const getStatusText = (status: MaintenanceStatus) => {
    switch (status) {
      case MaintenanceStatus.COMPLETED:
        return t('maintenance.completed')
      case MaintenanceStatus.IN_PROGRESS:
        return t('maintenance.inProgress')
      case MaintenanceStatus.CANCELLED:
        return t('maintenance.cancelled')
      default:
        return t('maintenance.pending')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const renderMaintenanceItem = ({ item }: { item: MaintenanceRequest }) => (
    <Card 
      style={styles.card}
      onPress={() => onItemPress?.(item)}
      mode="outlined"
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
              {item.description}
            </Text>
            <Text 
              variant="bodySmall" 
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
            >
              {item.location} • {formatDate(item.created_at)}
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            <Chip 
              mode="flat"
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
              textStyle={{ color: getStatusColor(item.status) }}
              compact
            >
              {getStatusText(item.status)}
            </Chip>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <Text 
            variant="bodySmall" 
            style={[styles.reporter, { color: theme.colors.onSurfaceVariant }]}
          >
            Reported by {item.reporter_name}
          </Text>
          
          {item.photo_urls && item.photo_urls.length > 0 && (
            <View style={styles.photosIndicator}>
              <IconButton
                icon="image-outline"
                size={16}
                iconColor={theme.colors.onSurfaceVariant}
              />
              <Text 
                variant="bodySmall" 
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {item.photo_urls.length} photo{item.photo_urls.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {item.assigned_to_name && (
          <Text 
            variant="bodySmall" 
            style={[styles.assignee, { color: theme.colors.primary }]}
          >
            Assigned to {item.assigned_to_name}
          </Text>
        )}
      </Card.Content>
    </Card>
  )

  if (requests.length === 0 && !loading) {
    return (
      <EmptyState
        icon="wrench-outline"
        title={t('maintenance.noRequests')}
        description="No maintenance requests found"
        actionText={t('maintenance.createRequest')}
        onActionPress={() => {
          // Will be handled in Phase 4
        }}
      />
    )
  }

  return (
    <FlatList
      data={requests}
      renderItem={renderMaintenanceItem}
      keyExtractor={(item) => item.id || ''}
      contentContainerStyle={styles.listContainer}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
    />
  )
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
  },
  statusChip: {
    height: 24,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reporter: {
    fontSize: 12,
  },
  photosIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignee: {
    fontSize: 12,
    fontWeight: '500',
  },
})